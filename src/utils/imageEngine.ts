import {
  FramingState,
  LinePreset,
  LogoWatermarkAsset,
  OutputFormat,
  SampleAsset,
  SourceAsset,
  TextFontStyle,
  WatermarkAnchor,
} from '../types';
import {
  analyzeImageAutoCropAsync,
  detectClosestPresetMatch,
  getEffectiveSourceRect,
} from './autoFraming';
import { getProcessedBgRemovedCanvas } from './bgRemover';
import {
  MAX_IMAGE_FILE_BYTES,
  MAX_SOURCE_DIMENSION,
  computeLogoAnimationTransform,
  decodeAnimatedGifFrames,
  drawLogoSpriteWithShimmer,
  encodeAnimatedCompositeGif,
  getGifCycleDurationMs,
  getLogoDrawableForTime,
  hasGifMagicHeader,
} from './gifEngine';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function getFormatExtension(format: OutputFormat): string {
  switch (format) {
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'gif':
      return 'gif';
    case 'jpeg':
    default:
      return 'jpg';
  }
}

export function getFormatMime(format: OutputFormat): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

export function getFormatLabel(format: OutputFormat): string {
  switch (format) {
    case 'png':
      return 'PNG';
    case 'webp':
      return 'WebP';
    case 'gif':
      return 'GIF';
    case 'jpeg':
    default:
      return 'JPEG';
  }
}

export function getFormatShortLabel(format: OutputFormat): string {
  switch (format) {
    case 'png':
      return 'PNG';
    case 'webp':
      return 'WEBP';
    case 'gif':
      return 'GIF';
    case 'jpeg':
    default:
      return 'JPG';
  }
}

export function detectFormatLabel(mimeType: string, fileName: string): string {
  const lowerMime = mimeType.toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (lowerMime.includes('webp') || ext === 'webp') return 'WEBP';
  if (lowerMime.includes('png') || ext === 'png') return 'PNG';
  if (lowerMime.includes('jpeg') || lowerMime.includes('jpg') || ext === 'jpg' || ext === 'jpeg') {
    return 'JPEG';
  }
  if (lowerMime.includes('svg') || ext === 'svg') return 'SVG';
  if (lowerMime.includes('avif') || ext === 'avif') return 'AVIF';
  if (lowerMime.includes('gif') || ext === 'gif') return 'GIF';
  if (lowerMime.includes('bmp') || ext === 'bmp') return 'BMP';
  if (lowerMime.includes('icon') || ext === 'ico') return 'ICO';
  return ext ? ext.toUpperCase() : 'IMAGE';
}

export function buildOutputFilename(
  originalName: string,
  preset: LinePreset,
  outputFormat: OutputFormat = 'jpeg'
): string {
  const base = originalName
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const safeBase = base || 'linecard-export';
  const ext = getFormatExtension(outputFormat);
  return `${safeBase}_${preset.filenameSuffix}.${ext}`;
}

export function buildStandaloneLogoGifFilename(originalName: string): string {
  const base = originalName
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const safeBase = base || 'watermark-logo';
  return `${safeBase}_watermark.gif`;
}

export function supportsAlphaExport(
  framing: FramingState,
  source?: SourceAsset | null
): boolean {
  const formatSupportsAlpha =
    framing.outputFormat === 'png' ||
    framing.outputFormat === 'webp' ||
    framing.outputFormat === 'gif';
  if (!formatSupportsAlpha || !framing.preserveTransparency) return false;
  if (framing.fitMode === 'crop') {
    return framing.bgRemoval.enabled ? true : source ? source.hasTransparency : true;
  }
  return framing.padBackdrop === 'transparent';
}

export function resolveMatteColor(
  source: SourceAsset | null,
  framing: FramingState
): string {
  switch (framing.matteMode) {
    case 'edge':
      return source?.edgeColor || '#FFFFFF';
    case 'black':
      return '#0F172A';
    case 'custom':
      return framing.matteColor || '#FFFFFF';
    case 'white':
    default:
      return '#FFFFFF';
  }
}

export interface FormatRecommendation {
  format: OutputFormat;
  reason: string;
}

export function recommendOutputFormat(source: SourceAsset): FormatRecommendation {
  if (source.hasTransparency) {
    const isGraphic =
      source.formatLabel === 'SVG' ||
      source.formatLabel === 'PNG' ||
      source.formatLabel === 'GIF' ||
      source.formatLabel === 'ICO';
    if (isGraphic && Math.max(source.naturalWidth, source.naturalHeight) <= 1600) {
      return {
        format: 'png',
        reason: `Alpha detected (${source.transparencyPercent}%) — PNG preserves crisp transparent edges losslessly.`,
      };
    }
    return {
      format: 'webp',
      reason: `Alpha detected (${source.transparencyPercent}%) — WebP preserves transparency at a compact file size.`,
    };
  }

  return {
    format: 'jpeg',
    reason: 'Opaque image detected — JPEG gives broad social & LINE OA compatibility at compact size.',
  };
}

/**
 * Inspects an image's alpha channel on an offscreen canvas to automatically detect
 * transparent or semi-transparent pixels.
 */
export function analyzeSourceTransparency(
  img: HTMLImageElement,
  mimeType: string,
  fileName: string
): { hasTransparency: boolean; transparencyPercent: number } {
  const lowerMime = mimeType.toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (
    lowerMime === 'image/jpeg' ||
    lowerMime === 'image/jpg' ||
    lowerMime === 'image/bmp' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'bmp'
  ) {
    return { hasTransparency: false, transparencyPercent: 0 };
  }

  try {
    const maxSample = 128;
    const natW = Math.max(1, img.naturalWidth || 128);
    const natH = Math.max(1, img.naturalHeight || 128);
    const scale = Math.min(1, maxSample / Math.max(natW, natH));
    const sampleW = Math.max(1, Math.round(natW * scale));
    const sampleH = Math.max(1, Math.round(natH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!ctx) return { hasTransparency: false, transparencyPercent: 0 };

    ctx.clearRect(0, 0, sampleW, sampleH);
    ctx.drawImage(img, 0, 0, sampleW, sampleH);

    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
    const totalPixels = sampleW * sampleH;
    let transparentPixels = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) {
        transparentPixels += 1;
      }
    }

    const hasTransparency = transparentPixels > 0;
    const transparencyPercent = hasTransparency
      ? Math.max(1, Math.round((transparentPixels / totalPixels) * 100))
      : 0;
    return { hasTransparency, transparencyPercent };
  } catch {
    return { hasTransparency: false, transparencyPercent: 0 };
  }
}

/**
 * Samples pixels along the outer border of the source image to compute
 * a balanced average edge hex color for seamless Fit & Pad framing.
 */
export function extractDominantEdgeColor(img: HTMLImageElement): string {
  try {
    const sampleSize = 64;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#F1F5F9';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sampleSize, sampleSize);
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    const addPixel = (x: number, y: number) => {
      const idx = (y * sampleSize + x) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count += 1;
    };

    for (let x = 0; x < sampleSize; x += 1) {
      addPixel(x, 0);
      addPixel(x, 1);
      addPixel(x, sampleSize - 1);
      addPixel(x, sampleSize - 2);
    }
    for (let y = 2; y < sampleSize - 2; y += 1) {
      addPixel(0, y);
      addPixel(1, y);
      addPixel(sampleSize - 1, y);
      addPixel(sampleSize - 2, y);
    }

    if (count === 0) return '#F1F5F9';
    const toHex = (v: number) => Math.round(v / count).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  } catch {
    return '#F1F5F9';
  }
}

export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          'Could not decode this image file. Please try a valid WebP, PNG, JPEG, SVG, GIF, or AVIF image.'
        )
      );
    img.src = url;
  });
}

export async function loadSourceFile(file: File): Promise<SourceAsset> {
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error(
      `File "${file.name}" exceeds the 50 MB browser processing limit.`
    );
  }
  if (
    !file.type.startsWith('image/') &&
    !/\.(webp|png|jpe?g|avif|gif|svg|bmp|ico|tiff?)$/i.test(file.name)
  ) {
    throw new Error(
      `Unsupported file "${file.name}". Please select an image file (.webp, .png, .jpg, .svg, .gif, .avif).`
    );
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(objectUrl);
    const naturalWidth = image.naturalWidth || 1080;
    const naturalHeight = image.naturalHeight || 1080;
    if (
      naturalWidth <= 0 ||
      naturalHeight <= 0 ||
      naturalWidth > MAX_SOURCE_DIMENSION ||
      naturalHeight > MAX_SOURCE_DIMENSION
    ) {
      throw new Error(
        `Image dimensions (${naturalWidth}×${naturalHeight}) exceed the safe 16,384 px limit.`
      );
    }
    const edgeColor = extractDominantEdgeColor(image);
    const { hasTransparency, transparencyPercent } = analyzeSourceTransparency(
      image,
      file.type,
      file.name
    );
    const autoCrop = await analyzeImageAutoCropAsync(image);
    const effectiveW = Math.max(1, Math.round(naturalWidth * autoCrop.trimBounds.width));
    const effectiveH = Math.max(1, Math.round(naturalHeight * autoCrop.trimBounds.height));
    const aspectMatch = detectClosestPresetMatch(effectiveW, effectiveH, {
      isPortraitSubject: autoCrop.isPortraitSubject,
    });

    return {
      image,
      objectUrl,
      fileName: file.name || 'pasted-image.png',
      mimeType: file.type || 'image/png',
      formatLabel: detectFormatLabel(file.type, file.name),
      originalBytes: file.size,
      naturalWidth,
      naturalHeight,
      edgeColor,
      hasTransparency,
      transparencyPercent,
      isSample: false,
      autoCrop,
      aspectMatch,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

/**
 * Loads one of the built-in studio sample images and converts it in-browser
 * to a real WebP Blob so merchants test the genuine WebP conversion flow.
 */
export async function loadSampleAsWebP(sample: SampleAsset): Promise<SourceAsset> {
  const baseImg = await loadImageFromUrl(sample.src);
  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas context is unavailable.');
  }
  ctx.drawImage(baseImg, 0, 0);

  const webpBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to prepare sample WebP asset.'));
        }
      },
      'image/webp',
      0.92
    );
  });

  const objectUrl = URL.createObjectURL(webpBlob);
  try {
    const webpImg = await loadImageFromUrl(objectUrl);
    const edgeColor = extractDominantEdgeColor(webpImg);
    const autoCrop = await analyzeImageAutoCropAsync(webpImg);
    const effectiveW = Math.max(
      1,
      Math.round(webpImg.naturalWidth * autoCrop.trimBounds.width)
    );
    const effectiveH = Math.max(
      1,
      Math.round(webpImg.naturalHeight * autoCrop.trimBounds.height)
    );
    const aspectMatch = detectClosestPresetMatch(effectiveW, effectiveH, {
      isPortraitSubject: autoCrop.isPortraitSubject,
    });
    return {
      image: webpImg,
      objectUrl,
      fileName: sample.webpFileName,
      mimeType: webpBlob.type || 'image/webp',
      formatLabel: 'WEBP',
      originalBytes: webpBlob.size,
      naturalWidth: webpImg.naturalWidth,
      naturalHeight: webpImg.naturalHeight,
      edgeColor,
      hasTransparency: false,
      transparencyPercent: 0,
      isSample: true,
      autoCrop,
      aspectMatch,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export interface CropGeometry {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  maxShiftX: number;
  maxShiftY: number;
}

export function computeCropGeometry(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  framing: FramingState
): CropGeometry {
  const scaleCover = Math.max(targetW / srcW, targetH / srcH);
  const drawWidth = srcW * scaleCover * framing.zoom;
  const drawHeight = srcH * scaleCover * framing.zoom;

  const maxShiftX = Math.max(0, (drawWidth - targetW) / 2);
  const maxShiftY = Math.max(0, (drawHeight - targetH) / 2);

  const clampedOffsetX = Math.max(-1, Math.min(1, framing.offsetX));
  const clampedOffsetY = Math.max(-1, Math.min(1, framing.offsetY));

  const drawX = (targetW - drawWidth) / 2 + clampedOffsetX * maxShiftX;
  const drawY = (targetH - drawHeight) / 2 + clampedOffsetY * maxShiftY;

  return { drawX, drawY, drawWidth, drawHeight, maxShiftX, maxShiftY };
}

/**
 * Applies a fast, subtle 3x3 unsharp-style sharpening convolution kernel
 * on the target canvas when the user enables Crisp Details.
 */
function applySubtleSharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount = 0.24
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const copy = new Uint8ClampedArray(src);

  const centerWeight = 1 + 4 * amount;
  const sideWeight = -amount;

  for (let y = 1; y < height - 1; y += 1) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (rowOffset + x) * 4;
      const top = idx - width * 4;
      const bottom = idx + width * 4;
      const left = idx - 4;
      const right = idx + 4;

      for (let c = 0; c < 3; c += 1) {
        const val =
          copy[idx + c] * centerWeight +
          (copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c]) *
            sideWeight;
        src[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export async function loadWatermarkLogoFile(file: File): Promise<LogoWatermarkAsset> {
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error(
      `Logo file "${file.name}" exceeds the 50 MB browser processing limit.`
    );
  }
  if (
    !file.type.startsWith('image/') &&
    !/\.(webp|png|jpe?g|avif|gif|svg|bmp|ico|tiff?)$/i.test(file.name)
  ) {
    throw new Error(`Unsupported logo file "${file.name}".`);
  }

  const isGifCandidate =
    file.type.toLowerCase() === 'image/gif' || /\.gif$/i.test(file.name);
  let gifFrames: LogoWatermarkAsset['gifFrames'];
  if (isGifCandidate) {
    try {
      const buffer = await file.arrayBuffer();
      if (hasGifMagicHeader(new Uint8Array(buffer))) {
        const decoded = await decodeAnimatedGifFrames(buffer);
        if (decoded.length > 1) {
          gifFrames = decoded;
        }
      }
    } catch {
      // Fallback to first-frame static image load if animated frames fail
      gifFrames = undefined;
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(objectUrl);
    const naturalWidth = image.naturalWidth || 512;
    const naturalHeight = image.naturalHeight || 512;
    if (
      naturalWidth <= 0 ||
      naturalHeight <= 0 ||
      naturalWidth > MAX_SOURCE_DIMENSION ||
      naturalHeight > MAX_SOURCE_DIMENSION
    ) {
      throw new Error(
        `Logo dimensions (${naturalWidth}×${naturalHeight}) exceed the safe 16,384 px limit.`
      );
    }
    const edgeColor = extractDominantEdgeColor(image);
    return {
      image,
      objectUrl,
      fileName: file.name || 'watermark-logo.png',
      naturalWidth,
      naturalHeight,
      edgeColor,
      isAnimatedGif: Boolean(gifFrames && gifFrames.length > 1),
      gifFrames,
    };
  } catch (err) {
    if (gifFrames) {
      for (const frame of gifFrames) {
        frame.canvas.width = 0;
        frame.canvas.height = 0;
      }
    }
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function resolveAnchorPoint(
  anchor: Exclude<WatermarkAnchor, 'tile'>,
  targetW: number,
  targetH: number,
  boxW: number,
  boxH: number,
  marginPx: number
): { cx: number; cy: number } {
  const halfW = boxW / 2;
  const halfH = boxH / 2;

  let cx = targetW / 2;
  if (anchor.endsWith('left')) cx = marginPx + halfW;
  else if (anchor.endsWith('right')) cx = targetW - marginPx - halfW;

  let cy = targetH / 2;
  if (anchor.startsWith('top')) cy = marginPx + halfH;
  else if (anchor.startsWith('bottom')) cy = targetH - marginPx - halfH;

  return { cx, cy };
}

function drawLogoWatermarkLayer(
  ctx: CanvasRenderingContext2D,
  targetW: number,
  targetH: number,
  framing: FramingState,
  logoAsset: LogoWatermarkAsset,
  animTimeMs = 0
) {
  const { logoWatermark } = framing;
  if (!logoWatermark.enabled) return;

  const drawable = getLogoDrawableForTime(logoAsset, logoWatermark, animTimeMs, 1200);
  const cycleMs = getGifCycleDurationMs(logoWatermark.gifSpeed);
  const progress = cycleMs > 0 ? (animTimeMs % cycleMs) / cycleMs : 0;
  const anim = computeLogoAnimationTransform(logoWatermark.gifMotion, progress);

  const srcW = Math.max(1, logoAsset.naturalWidth);
  const srcH = Math.max(1, logoAsset.naturalHeight);
  const minDim = Math.min(targetW, targetH);
  const maxLogoW = targetW * (logoWatermark.sizePercent / 100);
  const maxLogoH = targetH * (logoWatermark.sizePercent / 100);
  const scale = Math.min(maxLogoW / srcW, maxLogoH / srcH);
  const drawW = Math.max(8, srcW * scale);
  const drawH = Math.max(8, srcH * scale);
  const marginPx = minDim * (logoWatermark.marginPercent / 100);
  const baseRad = (logoWatermark.rotation * Math.PI) / 180;
  const animRad = (anim.rotateDeg * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1, logoWatermark.opacity * anim.alphaMul));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (logoWatermark.position === 'tile') {
    const stepX = Math.max(drawW * 1.85, targetW / 3.2);
    const stepY = Math.max(drawH * 1.85, targetH / 3.2);
    const tileRad = (baseRad === 0 ? (-18 * Math.PI) / 180 : baseRad) + animRad;

    for (let row = -1; row <= Math.ceil(targetH / stepY) + 1; row += 1) {
      const stagger = row % 2 === 0 ? 0 : stepX * 0.5;
      for (let col = -1; col <= Math.ceil(targetW / stepX) + 1; col += 1) {
        const cx = col * stepX + stagger + anim.offsetXFrac * drawW;
        const cy = row * stepY + anim.offsetYFrac * drawH;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tileRad);
        ctx.scale(anim.scaleX, anim.scaleY);
        drawLogoSpriteWithShimmer(ctx, drawable, drawW, drawH, anim.shimmerProgress);
        ctx.restore();
      }
    }
  } else {
    const { cx, cy } = resolveAnchorPoint(
      logoWatermark.position,
      targetW,
      targetH,
      drawW,
      drawH,
      marginPx
    );
    ctx.translate(cx + anim.offsetXFrac * drawW, cy + anim.offsetYFrac * drawH);
    ctx.rotate(baseRad + animRad);
    ctx.scale(anim.scaleX, anim.scaleY);
    drawLogoSpriteWithShimmer(ctx, drawable, drawW, drawH, anim.shimmerProgress);
  }

  ctx.restore();
}

function resolveFontFamily(style: TextFontStyle): string {
  switch (style) {
    case 'mono':
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
    case 'serif':
      return 'Georgia, "Noto Serif Myanmar", "Times New Roman", serif';
    case 'sans':
      return '"Inter", "Noto Sans Myanmar", system-ui, -apple-system, sans-serif';
    case 'display':
    default:
      return '"Space Grotesk", "Noto Sans Myanmar", system-ui, sans-serif';
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTextWatermarkLayer(
  ctx: CanvasRenderingContext2D,
  targetW: number,
  targetH: number,
  framing: FramingState
) {
  const tw = framing.textWatermark;
  if (!tw.enabled || !tw.text.trim()) return;

  const lines = tw.text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return;

  const minDim = Math.min(targetW, targetH);
  const fontSize = Math.max(14, Math.round(minDim * (tw.sizePercent / 100)));
  const lineHeight = Math.round(fontSize * 1.24);
  const fontWeight = tw.bold ? '700' : '500';
  const fontStylePrefix = tw.italic ? 'italic ' : '';
  const fontFamily = resolveFontFamily(tw.fontStyle);

  ctx.save();
  ctx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let maxLineWidth = 0;
  for (const line of lines) {
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
  }

  const padX = tw.badgeEnabled ? Math.round(fontSize * 0.65) : Math.round(fontSize * 0.16);
  const padY = tw.badgeEnabled ? Math.round(fontSize * 0.38) : Math.round(fontSize * 0.12);
  const boxW = maxLineWidth + padX * 2;
  const boxH = lines.length * lineHeight + padY * 2;
  const marginPx = minDim * (tw.marginPercent / 100);
  const rad = (tw.rotation * Math.PI) / 180;

  const renderSingleBlock = (cx: number, cy: number, angleRad: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);

    if (tw.badgeEnabled) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(1, tw.opacity * tw.badgeOpacity));
      ctx.fillStyle = tw.badgeColor || '#2B1E16';
      drawRoundedRectPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, Math.round(fontSize * 0.35));
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = Math.max(0.05, Math.min(1, tw.opacity));

    if (tw.shadowEnabled) {
      ctx.shadowColor = 'rgba(15, 10, 6, 0.48)';
      ctx.shadowBlur = Math.max(3, Math.round(fontSize * 0.18));
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.06));
    }

    const totalTextH = lines.length * lineHeight;
    const firstCenterY = -totalTextH / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i += 1) {
      const ly = firstCenterY + i * lineHeight;
      if (tw.strokeEnabled) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.13));
        ctx.strokeStyle = tw.strokeColor || '#2B1E16';
        ctx.strokeText(lines[i], 0, ly);
      }
      ctx.fillStyle = tw.color || '#FFFFFF';
      ctx.fillText(lines[i], 0, ly);
    }

    ctx.restore();
  };

  if (tw.position === 'tile') {
    const stepX = Math.max(boxW * 1.45, targetW / 2.8);
    const stepY = Math.max(boxH * 2.2, targetH / 3.4);
    const tileRad = rad === 0 ? (-24 * Math.PI) / 180 : rad;

    for (let row = -1; row <= Math.ceil(targetH / stepY) + 1; row += 1) {
      const stagger = row % 2 === 0 ? 0 : stepX * 0.5;
      for (let col = -1; col <= Math.ceil(targetW / stepX) + 1; col += 1) {
        renderSingleBlock(col * stepX + stagger, row * stepY, tileRad);
      }
    }
  } else {
    const { cx, cy } = resolveAnchorPoint(tw.position, targetW, targetH, boxW, boxH, marginPx);
    renderSingleBlock(cx, cy, rad);
  }

  ctx.restore();
}

export function renderFramedBaseLayer(
  canvas: HTMLCanvasElement,
  source: SourceAsset,
  targetW: number,
  targetH: number,
  framing: FramingState
): void {
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, targetW, targetH);

  const formatSupportsAlpha =
    framing.outputFormat === 'png' ||
    framing.outputFormat === 'webp' ||
    framing.outputFormat === 'gif';
  const keepAlpha = formatSupportsAlpha && framing.preserveTransparency;
  const matteHex = resolveMatteColor(source, framing);

  const effectiveBackdrop =
    framing.padBackdrop === 'transparent' && !keepAlpha
      ? 'matte'
      : framing.padBackdrop;

  const solidColor =
    effectiveBackdrop === 'matte'
      ? matteHex
      : effectiveBackdrop === 'white'
      ? '#FFFFFF'
      : effectiveBackdrop === 'edge'
      ? source.edgeColor
      : effectiveBackdrop === 'custom'
      ? framing.padColor || '#FFFFFF'
      : matteHex;

  const rawImg = source.image;
  const subjectDrawable: CanvasImageSource = framing.bgRemoval.enabled
    ? getProcessedBgRemovedCanvas(rawImg, framing.bgRemoval, Math.max(targetW, targetH, 1400))
    : rawImg;

  const { trim, effectiveWidth: srcW, effectiveHeight: srcH } = getEffectiveSourceRect(
    source,
    framing
  );

  const drawableW =
    subjectDrawable instanceof HTMLCanvasElement
      ? subjectDrawable.width
      : rawImg.naturalWidth || source.naturalWidth;
  const drawableH =
    subjectDrawable instanceof HTMLCanvasElement
      ? subjectDrawable.height
      : rawImg.naturalHeight || source.naturalHeight;

  const cropSrcX = trim.x * drawableW;
  const cropSrcY = trim.y * drawableH;
  const cropSrcW = Math.max(1, trim.width * drawableW);
  const cropSrcH = Math.max(1, trim.height * drawableH);

  const rawSrcX = trim.x * (rawImg.naturalWidth || source.naturalWidth);
  const rawSrcY = trim.y * (rawImg.naturalHeight || source.naturalHeight);
  const rawSrcW = Math.max(1, trim.width * (rawImg.naturalWidth || source.naturalWidth));
  const rawSrcH = Math.max(1, trim.height * (rawImg.naturalHeight || source.naturalHeight));

  if (framing.fitMode === 'crop') {
    if (!keepAlpha) {
      ctx.fillStyle = matteHex;
      ctx.fillRect(0, 0, targetW, targetH);
    }
    const { drawX, drawY, drawWidth, drawHeight } = computeCropGeometry(
      srcW,
      srcH,
      targetW,
      targetH,
      framing
    );
    ctx.drawImage(
      subjectDrawable,
      cropSrcX,
      cropSrcY,
      cropSrcW,
      cropSrcH,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  } else {
    // Fit & Pad Mode
    if (effectiveBackdrop === 'transparent' && keepAlpha) {
      // Keep full alpha background transparent
    } else if (effectiveBackdrop === 'blur') {
      if (!keepAlpha) {
        ctx.fillStyle = matteHex;
        ctx.fillRect(0, 0, targetW, targetH);
      }
      ctx.save();
      const blurScale = Math.max(targetW, targetH) / 1000;
      const effectiveBlur = Math.max(4, Math.round(framing.blurRadius * blurScale));
      const scaleCover = Math.max(targetW / srcW, targetH / srcH) * 1.12;
      const bgW = srcW * scaleCover;
      const bgH = srcH * scaleCover;
      const bgX = (targetW - bgW) / 2;
      const bgY = (targetH - bgH) / 2;

      ctx.filter = `blur(${effectiveBlur}px) saturate(1.08)`;
      ctx.drawImage(rawImg, rawSrcX, rawSrcY, rawSrcW, rawSrcH, bgX, bgY, bgW, bgH);
      ctx.filter = 'none';

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.restore();
    } else {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    const insetFraction = Math.max(0, Math.min(0.2, framing.padInset / 100));
    const availW = targetW * (1 - insetFraction * 2);
    const availH = targetH * (1 - insetFraction * 2);
    const scaleContain = Math.min(availW / srcW, availH / srcH);
    const drawW = srcW * scaleContain;
    const drawH = srcH * scaleContain;
    const drawX = (targetW - drawW) / 2;
    const drawY = (targetH - drawH) / 2;

    if (effectiveBackdrop === 'blur' && framing.padInset > 0 && !framing.bgRemoval.enabled) {
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
      ctx.shadowBlur = Math.round(targetW * 0.024);
      ctx.shadowOffsetY = Math.round(targetH * 0.008);
      ctx.drawImage(
        subjectDrawable,
        cropSrcX,
        cropSrcY,
        cropSrcW,
        cropSrcH,
        drawX,
        drawY,
        drawW,
        drawH
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        subjectDrawable,
        cropSrcX,
        cropSrcY,
        cropSrcW,
        cropSrcH,
        drawX,
        drawY,
        drawW,
        drawH
      );
    }
  }

  if (framing.sharpen && targetW * targetH <= 16_800_000) {
    applySubtleSharpen(ctx, targetW, targetH, 0.22);
  }
}

/**
 * Renders the source image into a target canvas at exact dimensions with
 * optional background removal, interactive Crop & Fill or Fit & Pad,
 * watermark logo overlay (static or animated GIF frame), and text generator layer.
 */
export function renderFramedCanvas(
  canvas: HTMLCanvasElement,
  source: SourceAsset,
  targetW: number,
  targetH: number,
  framing: FramingState,
  logoAsset?: LogoWatermarkAsset | null,
  animTimeMs = 0
): void {
  renderFramedBaseLayer(canvas, source, targetW, targetH, framing);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  if (logoAsset && framing.logoWatermark.enabled) {
    drawLogoWatermarkLayer(ctx, targetW, targetH, framing, logoAsset, animTimeMs);
  }

  if (framing.textWatermark.enabled && framing.textWatermark.text.trim()) {
    drawTextWatermarkLayer(ctx, targetW, targetH, framing);
  }
}

function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number | undefined,
  formatLabel: string
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error(`${formatLabel} encoding failed in this browser.`));
        }
      },
      mimeType,
      quality
    );
  });
}

export async function encodeImageOutput(
  source: SourceAsset,
  preset: LinePreset,
  framing: FramingState,
  logoAsset?: LogoWatermarkAsset | null
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  format: OutputFormat;
  mimeType: string;
  encodeTimeMs: number;
  optimizedQuality?: number;
  matteApplied: boolean;
  alphaPreserved: boolean;
}> {
  const startedAt = performance.now();
  const targetW = preset.width * framing.scale;
  const targetH = preset.height * framing.scale;

  const formatSupportsAlpha =
    framing.outputFormat === 'png' ||
    framing.outputFormat === 'webp' ||
    framing.outputFormat === 'gif';
  const keepAlpha = formatSupportsAlpha && framing.preserveTransparency;
  const hasEffectiveAlpha = source.hasTransparency || framing.bgRemoval.enabled;
  const alphaPreserved =
    keepAlpha &&
    (hasEffectiveAlpha ||
      (framing.fitMode === 'pad' && framing.padBackdrop === 'transparent')) &&
    (framing.fitMode === 'crop' || framing.padBackdrop === 'transparent');
  const matteApplied = hasEffectiveAlpha && !keepAlpha;

  if (framing.outputFormat === 'gif') {
    const gifRes = await encodeAnimatedCompositeGif(
      targetW,
      targetH,
      alphaPreserved,
      logoAsset,
      framing.logoWatermark,
      (baseCanvas, w, h) => renderFramedBaseLayer(baseCanvas, source, w, h, framing),
      (ctx, w, h, animTimeMs) => {
        if (logoAsset && framing.logoWatermark.enabled) {
          drawLogoWatermarkLayer(ctx, w, h, framing, logoAsset, animTimeMs);
        }
        if (framing.textWatermark.enabled && framing.textWatermark.text.trim()) {
          drawTextWatermarkLayer(ctx, w, h, framing);
        }
      }
    );

    return {
      blob: gifRes.blob,
      width: gifRes.width,
      height: gifRes.height,
      format: 'gif',
      mimeType: 'image/gif',
      encodeTimeMs: gifRes.encodeTimeMs,
      matteApplied,
      alphaPreserved,
    };
  }

  const offscreen = document.createElement('canvas');
  renderFramedCanvas(offscreen, source, targetW, targetH, framing, logoAsset, 0);

  const mimeType = getFormatMime(framing.outputFormat);
  const formatLabel = getFormatLabel(framing.outputFormat);
  const requestedQuality = Math.max(0.01, Math.min(1, framing.quality));
  const qualityArg = framing.outputFormat === 'png' ? undefined : requestedQuality;

  let blob = await canvasToBlobAsync(offscreen, mimeType, qualityArg, formatLabel);
  let optimizedQuality: number | undefined;

  // Automated platform cap optimization for lossy exports (e.g., YouTube 2 MB, LINE 10 MB)
  const maxBytes = preset.maxSizeMb * 1024 * 1024;
  if (
    framing.autoOptimize &&
    framing.outputFormat !== 'png' &&
    blob.size > maxBytes &&
    requestedQuality > 0.35
  ) {
    let low = 0.25;
    let high = requestedQuality;
    let bestBlob = blob;
    let bestQuality = requestedQuality;

    for (let step = 0; step < 5; step += 1) {
      const mid = Math.round(((low + high) / 2) * 100) / 100;
      const candidate = await canvasToBlobAsync(offscreen, mimeType, mid, formatLabel);
      if (candidate.size <= maxBytes) {
        bestBlob = candidate;
        bestQuality = mid;
        low = mid;
      } else {
        high = mid;
        if (bestBlob.size > maxBytes && candidate.size < bestBlob.size) {
          bestBlob = candidate;
          bestQuality = mid;
        }
      }
    }

    blob = bestBlob;
    if (Math.round(bestQuality * 100) < Math.round(requestedQuality * 100)) {
      optimizedQuality = Math.round(bestQuality * 100);
    }
  }

  const encodeTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
  return {
    blob,
    width: targetW,
    height: targetH,
    format: framing.outputFormat,
    mimeType,
    encodeTimeMs,
    optimizedQuality,
    matteApplied,
    alphaPreserved,
  };
}
