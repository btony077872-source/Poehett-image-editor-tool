import {
  FramingState,
  LinePreset,
  OutputFormat,
  SampleAsset,
  SourceAsset,
} from '../types';

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

export function supportsAlphaExport(
  framing: FramingState,
  source?: SourceAsset | null
): boolean {
  const formatSupportsAlpha =
    framing.outputFormat === 'png' || framing.outputFormat === 'webp';
  if (!formatSupportsAlpha || !framing.preserveTransparency) return false;
  if (framing.fitMode === 'crop') {
    return source ? source.hasTransparency : true;
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
    const edgeColor = extractDominantEdgeColor(image);
    const { hasTransparency, transparencyPercent } = analyzeSourceTransparency(
      image,
      file.type,
      file.name
    );
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

/**
 * Renders the source image into a target canvas at exact dimensions with
 * either interactive Crop & Fill or Fit & Pad, preserving transparency for PNG/WebP
 * when enabled, and automatically applying the user-selected background color matte
 * when converting transparent images to JPEG (or opaque PNG/WebP).
 */
export function renderFramedCanvas(
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
    framing.outputFormat === 'png' || framing.outputFormat === 'webp';
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

  const img = source.image;
  const srcW = source.naturalWidth;
  const srcH = source.naturalHeight;

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
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
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
      ctx.drawImage(img, bgX, bgY, bgW, bgH);
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

    if (effectiveBackdrop === 'blur' && framing.padInset > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
      ctx.shadowBlur = Math.round(targetW * 0.024);
      ctx.shadowOffsetY = Math.round(targetH * 0.008);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
  }

  if (framing.sharpen && targetW * targetH <= 16_800_000) {
    applySubtleSharpen(ctx, targetW, targetH, 0.22);
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
  framing: FramingState
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

  const offscreen = document.createElement('canvas');
  renderFramedCanvas(offscreen, source, targetW, targetH, framing);

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

  const formatSupportsAlpha =
    framing.outputFormat === 'png' || framing.outputFormat === 'webp';
  const keepAlpha = formatSupportsAlpha && framing.preserveTransparency;
  const alphaPreserved =
    keepAlpha &&
    (source.hasTransparency ||
      (framing.fitMode === 'pad' && framing.padBackdrop === 'transparent')) &&
    (framing.fitMode === 'crop' || framing.padBackdrop === 'transparent');
  const matteApplied = source.hasTransparency && !keepAlpha;

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
