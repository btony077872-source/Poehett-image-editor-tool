import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { GifReader } from 'omggif';
import {
  LogoGifFrame,
  LogoGifMotion,
  LogoGifSpeed,
  LogoWatermarkAsset,
  LogoWatermarkState,
} from '../types';
import { getProcessedBgRemovedCanvasFromSource } from './bgRemover';

export const MAX_IMAGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB upload cap
export const MAX_SOURCE_DIMENSION = 16384; // Prevent browser OOM / canvas decompression bombs
export const MAX_GIF_DECODE_FRAMES = 60;
export const MAX_GIF_DECODE_PIXELS = 2048 * 2048;
export const MAX_COMPOSITE_GIF_DIM = 720;
export const MAX_STANDALONE_LOGO_GIF_DIM = 360;

export interface LogoAnimationTransform {
  scaleX: number;
  scaleY: number;
  offsetXFrac: number;
  offsetYFrac: number;
  rotateDeg: number;
  alphaMul: number;
  shimmerProgress: number | null; // 0..1 when shimmer active
}

export function hasGifMagicHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false;
  const header = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4],
    bytes[5]
  );
  return header === 'GIF87a' || header === 'GIF89a';
}

export function getGifCycleDurationMs(speed: LogoGifSpeed): number {
  switch (speed) {
    case 'slow':
      return 2400;
    case 'fast':
      return 900;
    case 'normal':
    default:
      return 1450;
  }
}

export function getSpeedMultiplier(speed: LogoGifSpeed): number {
  switch (speed) {
    case 'slow':
      return 1.65;
    case 'fast':
      return 0.62;
    case 'normal':
    default:
      return 1.0;
  }
}

export function computeLogoAnimationTransform(
  motion: LogoGifMotion,
  progress01: number
): LogoAnimationTransform {
  const t = ((progress01 % 1) + 1) % 1;
  const theta = t * Math.PI * 2;

  switch (motion) {
    case 'pulse': {
      const s = 1 + 0.12 * Math.sin(theta);
      return {
        scaleX: s,
        scaleY: s,
        offsetXFrac: 0,
        offsetYFrac: 0,
        rotateDeg: 0,
        alphaMul: 0.92 + 0.08 * Math.cos(theta),
        shimmerProgress: null,
      };
    }
    case 'float': {
      return {
        scaleX: 1,
        scaleY: 1,
        offsetXFrac: 0,
        offsetYFrac: -0.14 * Math.sin(theta),
        rotateDeg: 3.5 * Math.sin(theta),
        alphaMul: 1,
        shimmerProgress: null,
      };
    }
    case 'wiggle': {
      return {
        scaleX: 1 + 0.04 * Math.cos(theta * 2),
        scaleY: 1 + 0.04 * Math.cos(theta * 2),
        offsetXFrac: 0,
        offsetYFrac: -0.05 * Math.abs(Math.sin(theta)),
        rotateDeg: 14 * Math.sin(theta),
        alphaMul: 1,
        shimmerProgress: null,
      };
    }
    case 'spin': {
      return {
        scaleX: 1,
        scaleY: 1,
        offsetXFrac: 0,
        offsetYFrac: 0,
        rotateDeg: t * 360,
        alphaMul: 1,
        shimmerProgress: null,
      };
    }
    case 'orbit': {
      return {
        scaleX: 0.98 + 0.05 * Math.sin(theta),
        scaleY: 0.98 + 0.05 * Math.sin(theta),
        offsetXFrac: 0.14 * Math.cos(theta),
        offsetYFrac: 0.14 * Math.sin(theta),
        rotateDeg: 5 * Math.sin(theta),
        alphaMul: 1,
        shimmerProgress: null,
      };
    }
    case 'shimmer': {
      return {
        scaleX: 1 + 0.03 * Math.sin(theta),
        scaleY: 1 + 0.03 * Math.sin(theta),
        offsetXFrac: 0,
        offsetYFrac: 0,
        rotateDeg: 0,
        alphaMul: 1,
        shimmerProgress: t,
      };
    }
    case 'gif-frames':
    case 'none':
    default:
      return {
        scaleX: 1,
        scaleY: 1,
        offsetXFrac: 0,
        offsetYFrac: 0,
        rotateDeg: 0,
        alphaMul: 1,
        shimmerProgress: null,
      };
  }
}

export function resolveLogoFrameAtTime(
  logoAsset: LogoWatermarkAsset,
  speed: LogoGifSpeed,
  animTimeMs: number
): { drawable: HTMLImageElement | HTMLCanvasElement; frameKey: string } {
  const frames = logoAsset.gifFrames;
  if (!frames || frames.length <= 1) {
    return {
      drawable: logoAsset.image,
      frameKey: logoAsset.objectUrl,
    };
  }

  const speedMul = getSpeedMultiplier(speed);
  let totalDuration = 0;
  for (let i = 0; i < frames.length; i += 1) {
    totalDuration += Math.max(20, Math.round(frames[i].delayMs * speedMul));
  }
  totalDuration = Math.max(100, totalDuration);

  const localT = ((animTimeMs % totalDuration) + totalDuration) % totalDuration;
  let elapsed = 0;
  for (let i = 0; i < frames.length; i += 1) {
    elapsed += Math.max(20, Math.round(frames[i].delayMs * speedMul));
    if (localT < elapsed) {
      return {
        drawable: frames[i].canvas,
        frameKey: `${logoAsset.objectUrl}#f${i}`,
      };
    }
  }

  const last = frames.length - 1;
  return {
    drawable: frames[last].canvas,
    frameKey: `${logoAsset.objectUrl}#f${last}`,
  };
}

export function getLogoDrawableForTime(
  logoAsset: LogoWatermarkAsset,
  logoWatermark: LogoWatermarkState,
  animTimeMs: number,
  maxWorkingDim = 1000
): CanvasImageSource {
  const { drawable, frameKey } = resolveLogoFrameAtTime(
    logoAsset,
    logoWatermark.gifSpeed,
    animTimeMs
  );

  if (logoWatermark.bgRemoval.enabled) {
    return getProcessedBgRemovedCanvasFromSource(
      drawable,
      frameKey,
      logoWatermark.bgRemoval,
      maxWorkingDim
    );
  }
  return drawable;
}

interface ShimmerBuffer {
  canvas: HTMLCanvasElement;
}
let shimmerBuf: ShimmerBuffer | null = null;

/**
 * Draws the logo (and optional shimmer highlight sweep strictly inside logo alpha).
 */
export function drawLogoSpriteWithShimmer(
  ctx: CanvasRenderingContext2D,
  drawable: CanvasImageSource,
  drawW: number,
  drawH: number,
  shimmerProgress: number | null
) {
  if (shimmerProgress === null) {
    ctx.drawImage(drawable, -drawW / 2, -drawH / 2, drawW, drawH);
    return;
  }

  const w = Math.max(8, Math.round(drawW));
  const h = Math.max(8, Math.round(drawH));
  if (!shimmerBuf) {
    shimmerBuf = { canvas: document.createElement('canvas') };
  }
  const off = shimmerBuf.canvas;
  if (off.width !== w) off.width = w;
  if (off.height !== h) off.height = h;
  const octx = off.getContext('2d');
  if (!octx) {
    ctx.drawImage(drawable, -drawW / 2, -drawH / 2, drawW, drawH);
    return;
  }

  octx.clearRect(0, 0, w, h);
  octx.globalCompositeOperation = 'source-over';
  octx.drawImage(drawable, 0, 0, w, h);

  // Sweep diagonal specular gleam bounded strictly to non-transparent logo pixels
  const sweepX = (shimmerProgress * 2.2 - 0.6) * w;
  const bandW = Math.max(12, w * 0.32);
  const grad = octx.createLinearGradient(sweepX - bandW, 0, sweepX + bandW, h);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.72)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  octx.globalCompositeOperation = 'source-atop';
  octx.fillStyle = grad;
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = 'source-over';

  ctx.drawImage(off, -drawW / 2, -drawH / 2, drawW, drawH);
}

/**
 * Decodes an animated GIF file into bounded composite frames using ImageDecoder
 * when available, with a full disposal-aware omggif fallback for universal support.
 */
export async function decodeAnimatedGifFrames(
  buffer: ArrayBuffer
): Promise<LogoGifFrame[]> {
  const bytes = new Uint8Array(buffer);
  if (!hasGifMagicHeader(bytes)) {
    throw new Error('Invalid GIF header.');
  }

  // Try Chromium ImageDecoder first for native animated Web/GIF fidelity
  const ImageDecoderCtor = (
    window as unknown as {
      ImageDecoder?: new (init: { data: BufferSource; type: string }) => {
        tracks: {
          ready: Promise<void>;
          selectedTrack?: { frameCount: number } | null;
        };
        decode: (opts: { frameIndex: number }) => Promise<{
          image: {
            displayWidth: number;
            displayHeight: number;
            duration?: number | null;
            close: () => void;
          };
        }>;
        close: () => void;
      };
    }
  ).ImageDecoder;

  if (typeof ImageDecoderCtor === 'function') {
    let decoder: InstanceType<NonNullable<typeof ImageDecoderCtor>> | null = null;
    try {
      decoder = new ImageDecoderCtor({ data: bytes, type: 'image/gif' });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const rawCount = track ? Math.max(1, track.frameCount) : 1;
      const frameCount = Math.min(MAX_GIF_DECODE_FRAMES, rawCount);

      if (frameCount <= 1) {
        return [];
      }

      const frames: LogoGifFrame[] = [];
      for (let i = 0; i < frameCount; i += 1) {
        const result = await decoder.decode({ frameIndex: i });
        try {
          const vFrame = result.image;
          const natW = Math.max(1, vFrame.displayWidth);
          const natH = Math.max(1, vFrame.displayHeight);
          if (natW * natH > MAX_GIF_DECODE_PIXELS * 4) {
            throw new Error('GIF dimensions exceed safe memory limits.');
          }
          const scale = Math.min(1, 512 / Math.max(natW, natH));
          const w = Math.max(1, Math.round(natW * scale));
          const h = Math.max(1, Math.round(natH * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { alpha: true });
          if (ctx) {
            ctx.drawImage(vFrame as unknown as CanvasImageSource, 0, 0, w, h);
          }
          const delayMs = vFrame.duration
            ? Math.max(20, Math.round(vFrame.duration / 1000))
            : 90;
          frames.push({ canvas, delayMs });
        } finally {
          result.image.close();
        }
      }
      return frames;
    } catch {
      // Fall back to omggif reader below
    } finally {
      decoder?.close();
    }
  }

  // Universal fallback via omggif with proper GIF disposal handling
  const reader = new GifReader(bytes);
  const w = reader.width;
  const h = reader.height;
  if (w <= 0 || h <= 0 || w * h > MAX_GIF_DECODE_PIXELS) {
    throw new Error('GIF dimensions exceed safe decoding limits.');
  }
  const numFrames = reader.numFrames();
  if (numFrames <= 1) return [];

  const targetCount = Math.min(MAX_GIF_DECODE_FRAMES, numFrames);
  const scale = Math.min(1, 512 / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const wctx = workCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!wctx) return [];

  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = w;
  patchCanvas.height = h;
  const pctx = patchCanvas.getContext('2d', { alpha: true });
  if (!pctx) return [];

  const framePixels = new Uint8ClampedArray(w * h * 4);
  let previousSnapshot: ImageData | null = null;
  const frames: LogoGifFrame[] = [];

  for (let i = 0; i < targetCount; i += 1) {
    const info = reader.frameInfo(i);
    if (info.disposal === 3) {
      previousSnapshot = wctx.getImageData(0, 0, w, h);
    }

    framePixels.fill(0);
    reader.decodeAndBlitFrameRGBA(i, framePixels);
    const patchData = new ImageData(framePixels, w, h);
    pctx.putImageData(patchData, 0, 0);
    wctx.drawImage(patchCanvas, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const octx = outCanvas.getContext('2d', { alpha: true });
    if (octx) {
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(workCanvas, 0, 0, outW, outH);
    }

    frames.push({
      canvas: outCanvas,
      delayMs: Math.max(20, (info.delay || 9) * 10),
    });

    if (info.disposal === 2) {
      wctx.clearRect(info.x, info.y, info.width, info.height);
    } else if (info.disposal === 3 && previousSnapshot) {
      wctx.putImageData(previousSnapshot, 0, 0);
    }
  }

  workCanvas.width = 0;
  workCanvas.height = 0;
  patchCanvas.width = 0;
  patchCanvas.height = 0;

  return frames;
}

/**
 * Converts the user's uploaded logo image (static or animated GIF, with optional
 * background removal + chosen GIF animation style) into a standalone looping .gif.
 */
export async function encodeStandaloneLogoGif(
  logoAsset: LogoWatermarkAsset,
  logoWatermark: LogoWatermarkState
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  frameCount: number;
  encodeTimeMs: number;
}> {
  const startedAt = performance.now();
  const srcW = Math.max(1, logoAsset.naturalWidth);
  const srcH = Math.max(1, logoAsset.naturalHeight);
  const scale = Math.min(1, MAX_STANDALONE_LOGO_GIF_DIM / Math.max(srcW, srcH));
  const innerW = Math.max(24, Math.round(srcW * scale));
  const innerH = Math.max(24, Math.round(srcH * scale));

  const needsMotionPad =
    logoWatermark.gifMotion !== 'none' && logoWatermark.gifMotion !== 'gif-frames';
  const padFactor = needsMotionPad || logoWatermark.rotation !== 0 ? 1.32 : 1.04;
  const outW = Math.min(MAX_STANDALONE_LOGO_GIF_DIM, Math.max(32, Math.round(innerW * padFactor)));
  const outH = Math.min(MAX_STANDALONE_LOGO_GIF_DIM, Math.max(32, Math.round(innerH * padFactor)));

  const drawFitScale = Math.min(innerW / srcW, innerH / srcH);
  const drawW = Math.max(12, srcW * drawFitScale);
  const drawH = Math.max(12, srcH * drawFitScale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas context unavailable for GIF encoding.');
  }

  const gif = GIFEncoder();
  const hasUploadedFrames = (logoAsset.gifFrames?.length ?? 0) > 1;
  const useUploadedFrames =
    hasUploadedFrames &&
    (logoWatermark.gifMotion === 'gif-frames' || logoWatermark.gifMotion === 'none');

  const motionForLoop: LogoGifMotion =
    logoWatermark.gifMotion === 'none' && !hasUploadedFrames
      ? 'pulse'
      : logoWatermark.gifMotion;

  const speedMul = getSpeedMultiplier(logoWatermark.gifSpeed);
  let frameCount = 14;
  if (useUploadedFrames && logoAsset.gifFrames) {
    frameCount = Math.min(48, logoAsset.gifFrames.length);
  } else {
    const cycleMs = getGifCycleDurationMs(logoWatermark.gifSpeed);
    const fps = Math.max(6, Math.min(20, logoWatermark.gifFps || 12));
    frameCount = Math.max(8, Math.min(28, Math.round((cycleMs / 1000) * fps)));
  }

  const cycleMs = getGifCycleDurationMs(logoWatermark.gifSpeed);
  const baseRad = (logoWatermark.rotation * Math.PI) / 180;

  for (let i = 0; i < frameCount; i += 1) {
    const progress = i / frameCount;
    const animTimeMs = progress * cycleMs;

    let frameDelay = Math.max(30, Math.round(cycleMs / frameCount));
    let drawable: CanvasImageSource;

    if (useUploadedFrames && logoAsset.gifFrames) {
      const f = logoAsset.gifFrames[i];
      frameDelay = Math.max(20, Math.round(f.delayMs * speedMul));
      drawable = logoWatermark.bgRemoval.enabled
        ? getProcessedBgRemovedCanvasFromSource(
            f.canvas,
            `${logoAsset.objectUrl}#f${i}`,
            logoWatermark.bgRemoval,
            MAX_STANDALONE_LOGO_GIF_DIM
          )
        : f.canvas;
    } else {
      drawable = getLogoDrawableForTime(
        logoAsset,
        logoWatermark,
        animTimeMs,
        MAX_STANDALONE_LOGO_GIF_DIM
      );
    }

    const anim = useUploadedFrames
      ? computeLogoAnimationTransform('none', progress)
      : computeLogoAnimationTransform(motionForLoop, progress);

    ctx.clearRect(0, 0, outW, outH);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = Math.max(0.08, Math.min(1, logoWatermark.opacity * anim.alphaMul));
    ctx.translate(
      outW / 2 + anim.offsetXFrac * drawW,
      outH / 2 + anim.offsetYFrac * drawH
    );
    ctx.rotate(baseRad + (anim.rotateDeg * Math.PI) / 180);
    ctx.scale(anim.scaleX, anim.scaleY);
    drawLogoSpriteWithShimmer(ctx, drawable, drawW, drawH, anim.shimmerProgress);
    ctx.restore();

    const rgba = ctx.getImageData(0, 0, outW, outH).data;
    const palette = quantize(rgba, 256, {
      format: 'rgba4444',
      oneBitAlpha: true,
      clearAlpha: true,
    });
    const indexed = applyPalette(rgba, palette, 'rgba4444');
    const transparentIndex = palette.findIndex((p) => p[3] === 0);

    gif.writeFrame(indexed, outW, outH, {
      palette,
      delay: frameDelay,
      repeat: i === 0 ? 0 : undefined,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      dispose: 2,
    });
  }

  gif.finish();
  const outputBytes = gif.bytes();
  const blob = new Blob([new Uint8Array(outputBytes)], { type: 'image/gif' });

  canvas.width = 0;
  canvas.height = 0;

  return {
    blob,
    width: outW,
    height: outH,
    frameCount,
    encodeTimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}

/**
 * Encodes an animated GIF of the framed user image + animated watermark layers.
 * Base frame is rendered once for speed, then per-frame animated overlays are composited.
 */
export async function encodeAnimatedCompositeGif(
  targetW: number,
  targetH: number,
  keepAlpha: boolean,
  logoAsset: LogoWatermarkAsset | null | undefined,
  logoWatermark: LogoWatermarkState,
  renderBaseLayer: (canvas: HTMLCanvasElement, w: number, h: number) => void,
  renderOverlayAtTime: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    animTimeMs: number
  ) => void
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  frameCount: number;
  encodeTimeMs: number;
}> {
  const startedAt = performance.now();

  // Cap animated GIF export longest edge to 720px so client encoding stays fast & under LINE/social caps
  const scale = Math.min(1, MAX_COMPOSITE_GIF_DIM / Math.max(targetW, targetH));
  const outW = Math.max(32, Math.round(targetW * scale));
  const outH = Math.max(32, Math.round(targetH * scale));

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = outW;
  baseCanvas.height = outH;
  renderBaseLayer(baseCanvas, outW, outH);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = outW;
  frameCanvas.height = outH;
  const fctx = frameCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!fctx) {
    throw new Error('Canvas context unavailable for animated GIF export.');
  }

  const hasAnimatedLogo =
    Boolean(logoAsset) &&
    logoWatermark.enabled &&
    (logoWatermark.gifMotion !== 'none' || (logoAsset?.gifFrames?.length ?? 0) > 1);

  const cycleMs = getGifCycleDurationMs(logoWatermark.gifSpeed);
  const speedMul = getSpeedMultiplier(logoWatermark.gifSpeed);

  let frameCount = 1;
  let useGifFrameTimings = false;
  if (hasAnimatedLogo && logoAsset) {
    if (
      (logoWatermark.gifMotion === 'gif-frames' || logoWatermark.gifMotion === 'none') &&
      (logoAsset.gifFrames?.length ?? 0) > 1
    ) {
      frameCount = Math.min(40, logoAsset.gifFrames!.length);
      useGifFrameTimings = true;
    } else {
      const fps = Math.max(6, Math.min(20, logoWatermark.gifFps || 12));
      frameCount = Math.max(8, Math.min(24, Math.round((cycleMs / 1000) * fps)));
    }
  }

  const gif = GIFEncoder();
  const format = keepAlpha ? 'rgba4444' : 'rgb565';

  let runningMs = 0;
  for (let i = 0; i < frameCount; i += 1) {
    let delayMs = frameCount === 1 ? 100 : Math.max(35, Math.round(cycleMs / frameCount));
    let animTimeMs = frameCount === 1 ? 0 : (i / frameCount) * cycleMs;

    if (useGifFrameTimings && logoAsset?.gifFrames?.[i]) {
      animTimeMs = runningMs;
      delayMs = Math.max(25, Math.round(logoAsset.gifFrames[i].delayMs * speedMul));
      runningMs += delayMs;
    }

    fctx.clearRect(0, 0, outW, outH);
    fctx.drawImage(baseCanvas, 0, 0);
    renderOverlayAtTime(fctx, outW, outH, animTimeMs);

    const rgba = fctx.getImageData(0, 0, outW, outH).data;
    const palette = quantize(
      rgba,
      256,
      keepAlpha
        ? { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true }
        : { format: 'rgb565' }
    );
    const indexed = applyPalette(rgba, palette, format);
    const transparentIndex = keepAlpha ? palette.findIndex((p) => p[3] === 0) : -1;

    gif.writeFrame(indexed, outW, outH, {
      palette,
      delay: delayMs,
      repeat: i === 0 && frameCount > 1 ? 0 : undefined,
      transparent: keepAlpha && transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      dispose: keepAlpha ? 2 : 0,
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([new Uint8Array(bytes)], { type: 'image/gif' });

  baseCanvas.width = 0;
  baseCanvas.height = 0;
  frameCanvas.width = 0;
  frameCanvas.height = 0;

  return {
    blob,
    width: outW,
    height: outH,
    frameCount,
    encodeTimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}
