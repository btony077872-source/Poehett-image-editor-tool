import { LINE_PRESETS, PLATFORM_CATEGORIES, computeRatioLabel } from '../data/presets';
import {
  AspectOrientation,
  AspectPresetCandidate,
  AspectPresetMatch,
  AutoCropAnalysis,
  FramingState,
  LinePreset,
  NormalizedRect,
  SourceAsset,
  SubjectDetectionMethod,
} from '../types';

const PREFERRED_PRESET_PRIORITY: Record<string, number> = {
  'ig-portrait': 0.001,
  'fb-portrait': 0.0018,
  'tt-vertical': 0.0014,
  'ig-story': 0.0022,
  'ig-square': 0.001,
  'fb-square': 0.0016,
  'x-square': 0.0024,
  'card-person': 0.0032,
  'rich-square': 0.0036,
  'coupon-square': 0.0042,
  'yt-thumb': 0.0012,
  'x-landscape': 0.002,
  'card-product': 0.0024,
  'fb-link': 0.003,
  'ig-landscape': 0.0038,
  'rich-compact': 0.004,
  'yt-banner': 0.0075,
};

interface BrowserDetectedFace {
  boundingBox: DOMRectReadOnly;
}

interface BrowserFaceDetector {
  detect(image: CanvasImageSource): Promise<BrowserDetectedFace[]>;
}

interface WindowWithFaceDetector extends Window {
  FaceDetector?: new (options?: {
    fastMode?: boolean;
    maxDetectedFaces?: number;
  }) => BrowserFaceDetector;
}

export function classifyAspectOrientation(aspectRatio: number): AspectOrientation {
  if (aspectRatio <= 0.94) return 'portrait';
  if (aspectRatio >= 1.07) return 'landscape';
  return 'square';
}

export interface AspectMatchOptions {
  isPortraitSubject?: boolean;
}

/**
 * Computes the orientation-locked closest matching social media preset plus
 * the top 2 distinct alternatives across available platform categories.
 */
export function detectClosestPresetMatch(
  width: number,
  height: number,
  options?: AspectMatchOptions
): AspectPresetMatch {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const sourceAspectRatio = safeW / safeH;
  const sourceRatioLabel = computeRatioLabel(safeW, safeH);
  const orientation = classifyAspectOrientation(sourceAspectRatio);

  const nonCustomPresets = LINE_PRESETS.filter((p) => p.platform !== 'custom');

  // Strict portrait vs landscape orientation lock
  let lockedCandidates: LinePreset[];
  if (orientation === 'portrait') {
    lockedCandidates = nonCustomPresets.filter(
      (p) => classifyAspectOrientation(p.width / p.height) === 'portrait'
    );
  } else if (orientation === 'landscape') {
    lockedCandidates = nonCustomPresets.filter(
      (p) => classifyAspectOrientation(p.width / p.height) === 'landscape'
    );
  } else if (options?.isPortraitSubject) {
    // Square portrait photos match 1:1 presets first while surfacing 4:5 portrait options
    lockedCandidates = nonCustomPresets.filter((p) => {
      const po = classifyAspectOrientation(p.width / p.height);
      return po === 'square' || (po === 'portrait' && p.ratioLabel === '4:5');
    });
  } else {
    lockedCandidates = nonCustomPresets.filter(
      (p) => classifyAspectOrientation(p.width / p.height) === 'square'
    );
  }

  if (lockedCandidates.length === 0) {
    lockedCandidates = nonCustomPresets;
  }

  const ranked = lockedCandidates
    .map((preset) => {
      const presetRatio = preset.width / preset.height;
      const distance = Math.abs(Math.log(sourceAspectRatio / presetRatio));
      const tieBias = PREFERRED_PRESET_PRIORITY[preset.id] ?? 0.008;
      // Gently boost portrait 4:5 presets for vertical portrait subjects
      const portraitSubjectBoost =
        options?.isPortraitSubject &&
        orientation === 'portrait' &&
        preset.ratioLabel === '4:5'
          ? -0.001
          : 0;
      const score = distance + tieBias + portraitSubjectBoost;
      const platformMeta = PLATFORM_CATEGORIES.find((c) => c.id === preset.platform);

      return {
        preset,
        platformLabel: platformMeta?.shortLabel ?? preset.platform.toUpperCase(),
        distance,
        score,
        isExactMatch: distance <= 0.045,
      };
    })
    .sort((a, b) => a.score - b.score);

  const primary = ranked[0];
  const alternatives: AspectPresetCandidate[] = [];
  const seenKeys = new Set<string>([
    `${primary.preset.platform}:${primary.preset.ratioLabel}`,
  ]);

  // First pass: pick runner-ups with distinct platform + ratio combinations
  for (const cand of ranked.slice(1)) {
    const key = `${cand.preset.platform}:${cand.preset.ratioLabel}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    alternatives.push({
      preset: cand.preset,
      platformLabel: cand.platformLabel,
      distance: cand.distance,
      isExactMatch: cand.isExactMatch,
    });
    if (alternatives.length >= 2) break;
  }

  // Fallback fill if fewer than 2 distinct combinations exist
  if (alternatives.length < 2) {
    for (const cand of ranked.slice(1)) {
      if (alternatives.some((a) => a.preset.id === cand.preset.id)) continue;
      alternatives.push({
        preset: cand.preset,
        platformLabel: cand.platformLabel,
        distance: cand.distance,
        isExactMatch: cand.isExactMatch,
      });
      if (alternatives.length >= 2) break;
    }
  }

  return {
    preset: primary.preset,
    platformLabel: primary.platformLabel,
    sourceRatioLabel,
    sourceAspectRatio,
    orientation,
    distance: primary.distance,
    isExactMatch: primary.isExactMatch,
    alternatives,
  };
}

/**
 * Computes normalized [-1..1] pan offsets that align subjectCenter with
 * targetAnchor (e.g. {0.5, 0.38} for headroom-safe portrait framing, {0.5, 0.5} standard).
 */
export function computeCenteredOffsetsForPreset(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  subjectCenter: { x: number; y: number },
  zoom = 1,
  targetAnchor: { x: number; y: number } = { x: 0.5, y: 0.5 }
): { offsetX: number; offsetY: number } {
  const safeSrcW = Math.max(1, srcW);
  const safeSrcH = Math.max(1, srcH);
  const scaleCover = Math.max(targetW / safeSrcW, targetH / safeSrcH);
  const drawWidth = safeSrcW * scaleCover * zoom;
  const drawHeight = safeSrcH * scaleCover * zoom;

  const maxShiftX = (drawWidth - targetW) / 2;
  const maxShiftY = (drawHeight - targetH) / 2;

  let offsetX = 0;
  let offsetY = 0;

  if (maxShiftX > 1) {
    const desiredShiftX =
      (targetAnchor.x - 0.5) * targetW + (0.5 - subjectCenter.x) * drawWidth;
    offsetX = Math.max(-1, Math.min(1, +(desiredShiftX / maxShiftX).toFixed(3)));
  }
  if (maxShiftY > 1) {
    const desiredShiftY =
      (targetAnchor.y - 0.5) * targetH + (0.5 - subjectCenter.y) * drawHeight;
    offsetY = Math.max(-1, Math.min(1, +(desiredShiftY / maxShiftY).toFixed(3)));
  }

  return { offsetX, offsetY };
}

/**
 * Resolves the active source crop rectangle (full raw image vs auto-trimmed bounds).
 */
export function getEffectiveSourceRect(
  source: SourceAsset,
  framing: Pick<FramingState, 'autoCropEnabled'>
): {
  trim: NormalizedRect;
  effectiveWidth: number;
  effectiveHeight: number;
} {
  const trim =
    framing.autoCropEnabled && source.autoCrop?.hasTrimmedMargins
      ? source.autoCrop.trimBounds
      : { x: 0, y: 0, width: 1, height: 1 };

  return {
    trim,
    effectiveWidth: Math.max(1, Math.round(source.naturalWidth * trim.width)),
    effectiveHeight: Math.max(1, Math.round(source.naturalHeight * trim.height)),
  };
}

function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

interface MarginTrimResult {
  trimBounds: NormalizedRect;
  trimmedPercent: number;
  hasTrimmedMargins: boolean;
  finalLeft: number;
  finalTop: number;
  finalRight: number;
  finalBottom: number;
  sw: number;
  sh: number;
  data: Uint8ClampedArray;
}

function detectBlankMargins(img: HTMLImageElement): MarginTrimResult | null {
  const natW = Math.max(1, img.naturalWidth || 100);
  const natH = Math.max(1, img.naturalHeight || 100);
  const maxSample = 160;
  const scale = Math.min(1, maxSample / Math.max(natW, natH));
  const sw = Math.max(8, Math.round(natW * scale));
  const sh = Math.max(8, Math.round(natH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, sw, sh);
  ctx.drawImage(img, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  const getPx = (x: number, y: number) => {
    const i = (y * sw + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };

  const isNeutralOrLetterbox = (r: number, g: number, b: number, a: number): boolean => {
    if (a < 24) return true;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;
    // Strict blank margins: transparent, near-black letterbox, near-white, or flat light neutral
    return maxC <= 24 || minC >= 232 || (chroma <= 24 && minC >= 200);
  };

  const isBlankRow = (
    y: number,
    refR: number,
    refG: number,
    refB: number,
    refTransparent: boolean
  ): boolean => {
    let matching = 0;
    for (let x = 0; x < sw; x += 1) {
      const [r, g, b, a] = getPx(x, y);
      if (refTransparent) {
        if (a < 24) matching += 1;
      } else if (a < 24 || colorDist(r, g, b, refR, refG, refB) <= 12) {
        matching += 1;
      }
    }
    return matching / sw >= 0.97;
  };

  const isBlankCol = (
    x: number,
    yStart: number,
    yEnd: number,
    refR: number,
    refG: number,
    refB: number,
    refTransparent: boolean
  ): boolean => {
    const span = Math.max(1, yEnd - yStart + 1);
    let matching = 0;
    for (let y = yStart; y <= yEnd; y += 1) {
      const [r, g, b, a] = getPx(x, y);
      if (refTransparent) {
        if (a < 24) matching += 1;
      } else if (a < 24 || colorDist(r, g, b, refR, refG, refB) <= 12) {
        matching += 1;
      }
    }
    return matching / span >= 0.97;
  };

  const topMid = getPx(Math.floor(sw / 2), 0);
  const botMid = getPx(Math.floor(sw / 2), sh - 1);
  const leftMid = getPx(0, Math.floor(sh / 2));
  const rightMid = getPx(sw - 1, Math.floor(sh / 2));

  let top = 0;
  const topTrans = topMid[3] < 24;
  if (isNeutralOrLetterbox(topMid[0], topMid[1], topMid[2], topMid[3])) {
    while (
      top < Math.floor(sh * 0.4) &&
      isBlankRow(top, topMid[0], topMid[1], topMid[2], topTrans)
    ) {
      top += 1;
    }
  }

  let bottom = sh - 1;
  const botTrans = botMid[3] < 24;
  if (isNeutralOrLetterbox(botMid[0], botMid[1], botMid[2], botMid[3])) {
    while (
      bottom > Math.ceil(sh * 0.6) &&
      bottom > top + Math.floor(sh * 0.25) &&
      isBlankRow(bottom, botMid[0], botMid[1], botMid[2], botTrans)
    ) {
      bottom -= 1;
    }
  }

  let left = 0;
  const leftTrans = leftMid[3] < 24;
  if (isNeutralOrLetterbox(leftMid[0], leftMid[1], leftMid[2], leftMid[3])) {
    while (
      left < Math.floor(sw * 0.4) &&
      isBlankCol(left, top, bottom, leftMid[0], leftMid[1], leftMid[2], leftTrans)
    ) {
      left += 1;
    }
  }

  let right = sw - 1;
  const rightTrans = rightMid[3] < 24;
  if (isNeutralOrLetterbox(rightMid[0], rightMid[1], rightMid[2], rightMid[3])) {
    while (
      right > Math.ceil(sw * 0.6) &&
      right > left + Math.floor(sw * 0.25) &&
      isBlankCol(right, top, bottom, rightMid[0], rightMid[1], rightMid[2], rightTrans)
    ) {
      right -= 1;
    }
  }

  if (top > 0) top = Math.max(0, top - 1);
  if (bottom < sh - 1) bottom = Math.min(sh - 1, bottom + 1);
  if (left > 0) left = Math.max(0, left - 1);
  if (right < sw - 1) right = Math.min(sw - 1, right + 1);

  const hasVerticalTrim = top > 2 || bottom < sh - 3;
  const hasHorizontalTrim = left > 2 || right < sw - 3;
  const allFourSaturatedBg =
    hasVerticalTrim &&
    hasHorizontalTrim &&
    !isNeutralOrLetterbox(topMid[0], topMid[1], topMid[2], topMid[3]) &&
    !isNeutralOrLetterbox(leftMid[0], leftMid[1], leftMid[2], leftMid[3]);

  const trimW = right - left + 1;
  const trimH = bottom - top + 1;
  const trimmedPercent = Math.max(
    0,
    Math.round((1 - (trimW * trimH) / (sw * sh)) * 100)
  );
  const hasTrimmedMargins =
    !allFourSaturatedBg &&
    trimmedPercent >= 4 &&
    trimW >= sw * 0.25 &&
    trimH >= sh * 0.25;

  const finalLeft = hasTrimmedMargins ? left : 0;
  const finalTop = hasTrimmedMargins ? top : 0;
  const finalRight = hasTrimmedMargins ? right : sw - 1;
  const finalBottom = hasTrimmedMargins ? bottom : sh - 1;
  const finalW = finalRight - finalLeft + 1;
  const finalH = finalBottom - finalTop + 1;

  return {
    trimBounds: {
      x: finalLeft / sw,
      y: finalTop / sh,
      width: finalW / sw,
      height: finalH / sh,
    },
    trimmedPercent: hasTrimmedMargins ? trimmedPercent : 0,
    hasTrimmedMargins,
    finalLeft,
    finalTop,
    finalRight,
    finalBottom,
    sw,
    sh,
    data,
  };
}

async function detectFacesViaBrowserApi(
  img: HTMLImageElement,
  trimBounds: NormalizedRect
): Promise<{ center: { x: number; y: number }; faceCount: number } | null> {
  if (typeof window === 'undefined') return null;
  const FaceDetectorCtor = (window as WindowWithFaceDetector).FaceDetector;
  if (!FaceDetectorCtor) return null;

  try {
    const natW = Math.max(1, img.naturalWidth || 100);
    const natH = Math.max(1, img.naturalHeight || 100);
    const srcX = trimBounds.x * natW;
    const srcY = trimBounds.y * natH;
    const srcW = Math.max(1, trimBounds.width * natW);
    const srcH = Math.max(1, trimBounds.height * natH);

    const maxFaceDim = 640;
    const scale = Math.min(1, maxFaceDim / Math.max(srcW, srcH));
    const cw = Math.max(32, Math.round(srcW * scale));
    const ch = Math.max(32, Math.round(srcH * scale));

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = cw;
    faceCanvas.height = ch;
    const ctx = faceCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, cw, ch);

    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 6 });
    const faces = await Promise.race([
      detector.detect(faceCanvas),
      new Promise<BrowserDetectedFace[]>((resolve) =>
        window.setTimeout(() => resolve([]), 350)
      ),
    ]);

    if (!faces || faces.length === 0) return null;

    const scored = faces
      .map((f) => {
        const b = f.boundingBox;
        const area = Math.max(1, b.width * b.height);
        const upperBias = 1.15 - 0.3 * Math.min(1, (b.y + b.height * 0.5) / ch);
        return { box: b, score: area * upperBias };
      })
      .sort((a, b) => b.score - a.score);

    const topScore = scored[0].score;
    const primaryGroup = scored.filter((item) => item.score >= topScore * 0.45);

    let sumX = 0;
    let sumY = 0;
    let totalW = 0;
    for (const item of primaryGroup) {
      const b = item.box;
      const cx = (b.x + b.width * 0.5) / cw;
      // Eye-line / upper-face anchor (42% from top of face box) protects headroom
      const cy = (b.y + b.height * 0.42) / ch;
      sumX += cx * item.score;
      sumY += cy * item.score;
      totalW += item.score;
    }

    return {
      center: {
        x: Math.max(0.08, Math.min(0.92, +(sumX / totalW).toFixed(3))),
        y: Math.max(0.08, Math.min(0.88, +(sumY / totalW).toFixed(3))),
      },
      faceCount: faces.length,
    };
  } catch {
    return null;
  }
}

function detectFocalPointFallback(margin: MarginTrimResult): {
  subjectCenter: { x: number; y: number };
  targetAnchor: { x: number; y: number };
  detectionMethod: SubjectDetectionMethod;
  isPortraitSubject: boolean;
} {
  const { finalLeft, finalTop, finalRight, finalBottom, sw, sh, data } = margin;
  const finalW = Math.max(1, finalRight - finalLeft + 1);
  const finalH = Math.max(1, finalBottom - finalTop + 1);

  const getPx = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(sw - 1, x));
    const cy = Math.max(0, Math.min(sh - 1, y));
    const i = (cy * sw + cx) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };

  const getLuma = (x: number, y: number) => {
    const [r, g, b] = getPx(x, y);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // Sample trimmed perimeter average to measure foreground contrast vs backdrop
  let edgeR = 0;
  let edgeG = 0;
  let edgeB = 0;
  let edgeN = 0;
  for (let x = finalLeft; x <= finalRight; x += 1) {
    const p1 = getPx(x, finalTop);
    const p2 = getPx(x, finalBottom);
    if (p1[3] > 20) {
      edgeR += p1[0];
      edgeG += p1[1];
      edgeB += p1[2];
      edgeN += 1;
    }
    if (p2[3] > 20) {
      edgeR += p2[0];
      edgeG += p2[1];
      edgeB += p2[2];
      edgeN += 1;
    }
  }
  const bgR = edgeN > 0 ? edgeR / edgeN : 255;
  const bgG = edgeN > 0 ? edgeG / edgeN : 255;
  const bgB = edgeN > 0 ? edgeB / edgeN : 255;

  const gridCols = 8;
  const gridRows = 8;
  const cellContrast = new Float64Array(gridCols * gridRows);
  const cellSkinDetail = new Float64Array(gridCols * gridRows);
  const cellWeight = new Float64Array(gridCols * gridRows);
  const cellSumX = new Float64Array(gridCols * gridRows);
  const cellSumY = new Float64Array(gridCols * gridRows);

  let skinPixelsTotal = 0;
  let opaquePixelsTotal = 0;

  for (let y = finalTop; y <= finalBottom; y += 1) {
    const ny = (y - finalTop + 0.5) / finalH;
    const gy = Math.min(gridRows - 1, Math.floor(ny * gridRows));

    for (let x = finalLeft; x <= finalRight; x += 1) {
      const [r, g, b, a] = getPx(x, y);
      if (a < 20) continue;
      opaquePixelsTotal += 1;

      const nx = (x - finalLeft + 0.5) / finalW;
      const gx = Math.min(gridCols - 1, Math.floor(nx * gridCols));
      const idx = gy * gridCols + gx;

      // 3x3 Sobel luminance gradient for high-contrast structure detection
      const tl = getLuma(x - 1, y - 1);
      const tc = getLuma(x, y - 1);
      const tr = getLuma(x + 1, y - 1);
      const ml = getLuma(x - 1, y);
      const mr = getLuma(x + 1, y);
      const bl = getLuma(x - 1, y + 1);
      const bc = getLuma(x, y + 1);
      const br = getLuma(x + 1, y + 1);

      const gxSobel = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gySobel = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const sobel = Math.sqrt(gxSobel * gxSobel + gySobel * gySobel) / 4;

      const bgDiff = colorDist(r, g, b, bgR, bgG, bgB);
      const centerDist = Math.hypot(nx - 0.5, ny - 0.45);
      const centerPrior = 1 - 0.22 * Math.min(1, centerDist);

      const contrastEnergy =
        (Math.max(0, sobel - 12) * 1.3 + Math.max(0, bgDiff - 18) * 0.9) *
        centerPrior *
        (a / 255);

      cellContrast[idx] += contrastEnergy;
      if (contrastEnergy > 0) {
        cellSumX[idx] += nx * contrastEnergy;
        cellSumY[idx] += ny * contrastEnergy;
        cellWeight[idx] += contrastEnergy;
      }

      // YCbCr skin-chroma portrait heuristic (paired with local edge detail to reject flat walls)
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkinTone =
        cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && r > g && r > b;
      if (isSkinTone) {
        skinPixelsTotal += 1;
        const upperPortraitBoost = ny <= 0.68 ? 1.35 : 0.7;
        const detailBoost = 0.35 + Math.min(2.2, sobel / 24);
        cellSkinDetail[idx] += upperPortraitBoost * detailBoost;
      }
    }
  }

  // Check for a compact upper-frame portrait skin+detail cluster
  const skinRatio = skinPixelsTotal / Math.max(1, opaquePixelsTotal);
  if (skinRatio >= 0.025 && skinRatio <= 0.62) {
    let bestSkinScore = 0;
    let bestSkinIdx = -1;
    for (let gy = 0; gy < 6; gy += 1) {
      for (let gx = 1; gx < gridCols - 1; gx += 1) {
        const idx = gy * gridCols + gx;
        // 3x3 smoothed cell neighborhood favors true face-sized clusters over speckles
        let neighborhood = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const ny = gy + dy;
            const nx = gx + dx;
            if (ny >= 0 && ny < gridRows && nx >= 0 && nx < gridCols) {
              neighborhood += cellSkinDetail[ny * gridCols + nx] * (dx === 0 && dy === 0 ? 1.6 : 0.65);
            }
          }
        }
        if (neighborhood > bestSkinScore) {
          bestSkinScore = neighborhood;
          bestSkinIdx = idx;
        }
      }
    }

    const pixelsPerCell = (finalW * finalH) / (gridCols * gridRows);
    if (bestSkinIdx >= 0 && bestSkinScore >= pixelsPerCell * 0.42) {
      const peakGy = Math.floor(bestSkinIdx / gridCols);
      const peakGx = bestSkinIdx % gridCols;
      let sx = 0;
      let sy = 0;
      let swSum = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const gy = peakGy + dy;
          const gx = peakGx + dx;
          if (gy < 0 || gy >= gridRows || gx < 0 || gx >= gridCols) continue;
          const idx = gy * gridCols + gx;
          const w = cellSkinDetail[idx];
          if (w > 0) {
            sx += ((gx + 0.5) / gridCols) * w;
            sy += ((gy + 0.42) / gridRows) * w;
            swSum += w;
          }
        }
      }

      if (swSum > 0) {
        return {
          subjectCenter: {
            x: Math.max(0.1, Math.min(0.9, +(sx / swSum).toFixed(3))),
            y: Math.max(0.1, Math.min(0.85, +(sy / swSum).toFixed(3))),
          },
          targetAnchor: { x: 0.5, y: 0.38 },
          detectionMethod: 'portrait-heuristic',
          isPortraitSubject: true,
        };
      }
    }
  }

  // High-contrast focal point detection across the 8x8 block grid
  let peakCellScore = 0;
  let peakIdx = -1;
  let totalContrast = 0;

  for (let i = 0; i < gridCols * gridRows; i += 1) {
    totalContrast += cellContrast[i];
    if (cellContrast[i] > peakCellScore) {
      peakCellScore = cellContrast[i];
      peakIdx = i;
    }
  }

  if (peakIdx >= 0 && totalContrast > 12) {
    // Blend pixels from high-energy focal cells (>= 32% of peak) so sharp subjects dominate
    const threshold = peakCellScore * 0.32;
    let fx = 0;
    let fy = 0;
    let fw = 0;

    for (let i = 0; i < gridCols * gridRows; i += 1) {
      if (cellContrast[i] >= threshold && cellWeight[i] > 0) {
        const w = cellContrast[i];
        fx += (cellSumX[i] / cellWeight[i]) * w;
        fy += (cellSumY[i] / cellWeight[i]) * w;
        fw += w;
      }
    }

    if (fw > 0) {
      return {
        subjectCenter: {
          x: Math.max(0.08, Math.min(0.92, +(fx / fw).toFixed(3))),
          y: Math.max(0.08, Math.min(0.92, +(fy / fw).toFixed(3))),
        },
        targetAnchor: { x: 0.5, y: 0.5 },
        detectionMethod: 'focal-contrast',
        isPortraitSubject: false,
      };
    }
  }

  return {
    subjectCenter: { x: 0.5, y: 0.5 },
    targetAnchor: { x: 0.5, y: 0.5 },
    detectionMethod: 'centered',
    isPortraitSubject: false,
  };
}

/**
 * Full async subject analyzer:
 * 1) Auto-trims blank/letterbox/alpha borders.
 * 2) Prioritizes browser FaceDetector API faces (with 350ms safety timeout).
 * 3) Falls back cleanly to high-contrast Sobel + YCbCr portrait saliency.
 */
export async function analyzeImageAutoCropAsync(
  img: HTMLImageElement,
  referenceTargetW = 1540,
  referenceTargetH = 1000
): Promise<AutoCropAnalysis> {
  const fallback: AutoCropAnalysis = {
    trimBounds: { x: 0, y: 0, width: 1, height: 1 },
    trimmedPercent: 0,
    subjectCenter: { x: 0.5, y: 0.5 },
    targetAnchor: { x: 0.5, y: 0.5 },
    detectionMethod: 'centered',
    isPortraitSubject: false,
    faceCount: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    hasTrimmedMargins: false,
  };

  try {
    const margin = detectBlankMargins(img);
    if (!margin) return fallback;

    const natW = Math.max(1, img.naturalWidth || 100);
    const natH = Math.max(1, img.naturalHeight || 100);

    const browserFaces = await detectFacesViaBrowserApi(img, margin.trimBounds);
    let subjectCenter: { x: number; y: number };
    let targetAnchor: { x: number; y: number };
    let detectionMethod: SubjectDetectionMethod;
    let isPortraitSubject: boolean;
    let faceCount = 0;

    if (browserFaces) {
      subjectCenter = browserFaces.center;
      targetAnchor = { x: 0.5, y: 0.38 };
      detectionMethod = 'face-api';
      isPortraitSubject = true;
      faceCount = browserFaces.faceCount;
    } else {
      const focal = detectFocalPointFallback(margin);
      subjectCenter = focal.subjectCenter;
      targetAnchor = focal.targetAnchor;
      detectionMethod = focal.detectionMethod;
      isPortraitSubject = focal.isPortraitSubject;
    }

    const effectivePxW = natW * margin.trimBounds.width;
    const effectivePxH = natH * margin.trimBounds.height;
    const { offsetX, offsetY } = computeCenteredOffsetsForPreset(
      effectivePxW,
      effectivePxH,
      referenceTargetW,
      referenceTargetH,
      subjectCenter,
      1,
      targetAnchor
    );

    return {
      trimBounds: margin.trimBounds,
      trimmedPercent: margin.trimmedPercent,
      subjectCenter,
      targetAnchor,
      detectionMethod,
      isPortraitSubject,
      faceCount,
      initialOffsetX: offsetX,
      initialOffsetY: offsetY,
      hasTrimmedMargins: margin.hasTrimmedMargins,
    };
  } catch {
    return fallback;
  }
}

/**
 * Synchronous wrapper preserved for immediate pixel-only calls.
 */
export function analyzeImageAutoCrop(
  img: HTMLImageElement,
  referenceTargetW = 1540,
  referenceTargetH = 1000
): AutoCropAnalysis {
  const fallback: AutoCropAnalysis = {
    trimBounds: { x: 0, y: 0, width: 1, height: 1 },
    trimmedPercent: 0,
    subjectCenter: { x: 0.5, y: 0.5 },
    targetAnchor: { x: 0.5, y: 0.5 },
    detectionMethod: 'centered',
    isPortraitSubject: false,
    faceCount: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    hasTrimmedMargins: false,
  };

  try {
    const margin = detectBlankMargins(img);
    if (!margin) return fallback;

    const focal = detectFocalPointFallback(margin);
    const natW = Math.max(1, img.naturalWidth || 100);
    const natH = Math.max(1, img.naturalHeight || 100);
    const effectivePxW = natW * margin.trimBounds.width;
    const effectivePxH = natH * margin.trimBounds.height;
    const { offsetX, offsetY } = computeCenteredOffsetsForPreset(
      effectivePxW,
      effectivePxH,
      referenceTargetW,
      referenceTargetH,
      focal.subjectCenter,
      1,
      focal.targetAnchor
    );

    return {
      trimBounds: margin.trimBounds,
      trimmedPercent: margin.trimmedPercent,
      subjectCenter: focal.subjectCenter,
      targetAnchor: focal.targetAnchor,
      detectionMethod: focal.detectionMethod,
      isPortraitSubject: focal.isPortraitSubject,
      faceCount: 0,
      initialOffsetX: offsetX,
      initialOffsetY: offsetY,
      hasTrimmedMargins: margin.hasTrimmedMargins,
    };
  } catch {
    return fallback;
  }
}
