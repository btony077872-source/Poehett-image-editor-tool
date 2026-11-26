import { BgRemovalConfig } from '../types';

interface LabColor {
  l: number;
  a: number;
  b: number;
}

interface CacheEntry {
  key: string;
  canvas: HTMLCanvasElement;
}

const processedCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 12;

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labDistance(c1: LabColor, c2: LabColor): number {
  const dl = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return [r || 255, g || 255, b || 255];
  }
  const num = parseInt(cleaned.padEnd(6, 'F').slice(0, 6), 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  lab: LabColor;
  count: number;
}

/**
 * Extracts up to 3 dominant perimeter background colors (handles multi-tone
 * outer frames or slight checkerboard borders).
 */
function extractBorderPalette(data: Uint8ClampedArray, w: number, h: number): PaletteColor[] {
  const buckets = new Map<string, { rSum: number; gSum: number; bSum: number; count: number }>();

  const push = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 40) return;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
      existing.count += 1;
    } else {
      buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
    }
  };

  const stepX = Math.max(1, Math.floor(w / 80));
  const stepY = Math.max(1, Math.floor(h / 80));

  for (let x = 0; x < w; x += stepX) {
    push(x, 0);
    push(x, Math.min(h - 1, 2));
    push(x, h - 1);
    push(x, Math.max(0, h - 3));
  }
  for (let y = 0; y < h; y += stepY) {
    push(0, y);
    push(Math.min(w - 1, 2), y);
    push(w - 1, y);
    push(Math.max(0, w - 3), y);
  }

  // Always include exact corners
  push(0, 0);
  push(w - 1, 0);
  push(0, h - 1);
  push(w - 1, h - 1);

  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  const totalSamples = sorted.reduce((acc, s) => acc + s.count, 0) || 1;
  const palette: PaletteColor[] = [];

  for (const item of sorted) {
    if (palette.length >= 3) break;
    if (palette.length > 0 && item.count / totalSamples < 0.08) break;
    const r = Math.round(item.rSum / item.count);
    const g = Math.round(item.gSum / item.count);
    const b = Math.round(item.bSum / item.count);
    const lab = rgbToLab(r, g, b);
    // Avoid adding near-duplicate palette clusters
    if (palette.every((p) => labDistance(p.lab, lab) > 8)) {
      palette.push({ r, g, b, lab, count: item.count });
    }
  }

  if (palette.length === 0) {
    palette.push({ r: 255, g: 255, b: 255, lab: rgbToLab(255, 255, 255), count: 1 });
  }
  return palette;
}

function minLabDistanceToPalette(lab: LabColor, palette: PaletteColor[]): { dist: number; ref: PaletteColor } {
  let bestDist = Infinity;
  let bestRef = palette[0];
  for (let i = 0; i < palette.length; i += 1) {
    const d = labDistance(lab, palette[i].lab);
    if (d < bestDist) {
      bestDist = d;
      bestRef = palette[i];
    }
  }
  return { dist: bestDist, ref: bestRef };
}

function sampleEdgeColorAt(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number
): [number, number, number] {
  const cx = Math.max(0, Math.min(w - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(h - 1, Math.round(y)));
  const idx = (cy * w + cx) * 4;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

/**
 * Flood-fills from all image borders across pixels matching the detected
 * border palette (or global scan if removeInteriorHoles is enabled for trapped letters).
 */
function applyAutoEdgeRemoval(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  config: BgRemovalConfig
) {
  const palette = extractBorderPalette(data, w, h);
  const total = w * h;

  // Map tolerance (5..100) to CIE Lab Delta-E threshold (~6..62)
  const deltaMax = 4 + config.tolerance * 0.58;
  const featherSpan = Math.max(1.5, config.smoothness * 2.2);
  const deltaInner = Math.max(2, deltaMax - featherSpan * 0.45);
  const deltaOuter = deltaMax + featherSpan * 0.75;

  const labCache = new Array<LabColor>(total);
  const distArr = new Float32Array(total);
  const refIdxArr = new Uint8Array(total);

  for (let i = 0; i < total; i += 1) {
    const p = i * 4;
    if (data[p + 3] === 0) {
      distArr[i] = 0;
      continue;
    }
    const lab = rgbToLab(data[p], data[p + 1], data[p + 2]);
    labCache[i] = lab;
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let k = 0; k < palette.length; k += 1) {
      const d = labDistance(lab, palette[k].lab);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = k;
      }
    }
    distArr[i] = bestDist;
    refIdxArr[i] = bestIdx;
  }

  // BFS flood fill from perimeter so interior white highlights inside closed shapes
  // stay protected unless `removeInteriorHoles` is enabled.
  const isBg = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const trySeed = (idx: number) => {
    if (visited[idx]) return;
    visited[idx] = 1;
    if (data[idx * 4 + 3] === 0 || distArr[idx] <= deltaOuter) {
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x += 1) {
    trySeed(x);
    trySeed((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y += 1) {
    trySeed(y * w);
    trySeed(y * w + (w - 1));
  }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur - cx) / w;

    if (cx > 0) {
      const n = cur - 1;
      if (!visited[n]) {
        visited[n] = 1;
        if (data[n * 4 + 3] === 0 || distArr[n] <= deltaOuter) {
          isBg[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    if (cx < w - 1) {
      const n = cur + 1;
      if (!visited[n]) {
        visited[n] = 1;
        if (data[n * 4 + 3] === 0 || distArr[n] <= deltaOuter) {
          isBg[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    if (cy > 0) {
      const n = cur - w;
      if (!visited[n]) {
        visited[n] = 1;
        if (data[n * 4 + 3] === 0 || distArr[n] <= deltaOuter) {
          isBg[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    if (cy < h - 1) {
      const n = cur + w;
      if (!visited[n]) {
        visited[n] = 1;
        if (data[n * 4 + 3] === 0 || distArr[n] <= deltaOuter) {
          isBg[n] = 1;
          queue[tail++] = n;
        }
      }
    }
  }

  // Optionally knock out trapped interior background holes (e.g. inside 'O', 'A', 'R', 'P')
  if (config.removeInteriorHoles) {
    const holeThreshold = deltaMax * 0.86;
    for (let i = 0; i < total; i += 1) {
      if (!isBg[i] && distArr[i] <= holeThreshold) {
        isBg[i] = 1;
      }
    }
  }

  for (let i = 0; i < total; i += 1) {
    const p = i * 4;
    if (data[p + 3] === 0) continue;
    if (!isBg[i]) continue;

    const d = distArr[i];
    if (d <= deltaInner) {
      data[p + 3] = 0;
    } else {
      const alphaFactor = smoothstep(deltaInner, deltaOuter, d);
      data[p + 3] = Math.round(data[p + 3] * alphaFactor);
      if (config.defringe && alphaFactor > 0.05 && alphaFactor < 0.96) {
        const bgRef = palette[refIdxArr[i]];
        data[p] = Math.max(0, Math.min(255, Math.round((data[p] - bgRef.r * (1 - alphaFactor)) / alphaFactor)));
        data[p + 1] = Math.max(0, Math.min(255, Math.round((data[p + 1] - bgRef.g * (1 - alphaFactor)) / alphaFactor)));
        data[p + 2] = Math.max(0, Math.min(255, Math.round((data[p + 2] - bgRef.b * (1 - alphaFactor)) / alphaFactor)));
      }
    }
  }
}

/**
 * Removes smooth gradient backgrounds and fake-PNG checkerboard grids by comparing
 * each pixel against a bilinearly interpolated perimeter field AND border cluster palette.
 */
function applyGradientCheckerRemoval(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  config: BgRemovalConfig
) {
  const palette = extractBorderPalette(data, w, h);
  const tl = rgbToLab(...sampleEdgeColorAt(data, w, h, 1, 1));
  const tr = rgbToLab(...sampleEdgeColorAt(data, w, h, w - 2, 1));
  const bl = rgbToLab(...sampleEdgeColorAt(data, w, h, 1, h - 2));
  const br = rgbToLab(...sampleEdgeColorAt(data, w, h, w - 2, h - 2));

  const deltaMax = 6 + config.tolerance * 0.62;
  const featherSpan = Math.max(2, config.smoothness * 2.4);
  const deltaInner = Math.max(2, deltaMax - featherSpan * 0.45);
  const deltaOuter = deltaMax + featherSpan * 0.75;

  const total = w * h;
  const isCandidate = new Uint8Array(total);
  const distArr = new Float32Array(total);

  for (let y = 0; y < h; y += 1) {
    const ty = h > 1 ? y / (h - 1) : 0;
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const p = i * 4;
      if (data[p + 3] === 0) continue;

      const tx = w > 1 ? x / (w - 1) : 0;
      const interpLab: LabColor = {
        l: (tl.l * (1 - tx) + tr.l * tx) * (1 - ty) + (bl.l * (1 - tx) + br.l * tx) * ty,
        a: (tl.a * (1 - tx) + tr.a * tx) * (1 - ty) + (bl.a * (1 - tx) + br.a * tx) * ty,
        b: (tl.b * (1 - tx) + tr.b * tx) * (1 - ty) + (bl.b * (1 - tx) + br.b * tx) * ty,
      };

      const pxLab = rgbToLab(data[p], data[p + 1], data[p + 2]);
      const gradDist = labDistance(pxLab, interpLab);
      const palDist = minLabDistanceToPalette(pxLab, palette).dist;
      const d = Math.min(gradDist, palDist);
      distArr[i] = d;
      if (d <= deltaOuter) {
        isCandidate[i] = 1;
      }
    }
  }

  if (!config.removeInteriorHoles) {
    // Restrict removal to edge-connected regions so enclosed interior details stay intact
    const visited = new Uint8Array(total);
    const keepMask = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const pushIf = (idx: number) => {
      if (visited[idx]) return;
      visited[idx] = 1;
      if (isCandidate[idx] || data[idx * 4 + 3] === 0) {
        keepMask[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < w; x += 1) {
      pushIf(x);
      pushIf((h - 1) * w + x);
    }
    for (let y = 1; y < h - 1; y += 1) {
      pushIf(y * w);
      pushIf(y * w + (w - 1));
    }

    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      if (cx > 0) pushIf(cur - 1);
      if (cx < w - 1) pushIf(cur + 1);
      if (cy > 0) pushIf(cur - w);
      if (cy < h - 1) pushIf(cur + w);
    }

    for (let i = 0; i < total; i += 1) {
      if (!keepMask[i]) isCandidate[i] = 0;
    }
  }

  for (let i = 0; i < total; i += 1) {
    if (!isCandidate[i]) continue;
    const p = i * 4;
    const d = distArr[i];
    if (d <= deltaInner) {
      data[p + 3] = 0;
    } else {
      const alphaFactor = smoothstep(deltaInner, deltaOuter, d);
      data[p + 3] = Math.round(data[p + 3] * alphaFactor);
    }
  }
}

/**
 * Light / White Paper Knock-Out: cleanly removes bright neutral backgrounds
 * while protecting colorful strokes and dark typography.
 */
function applyLumaLightRemoval(data: Uint8ClampedArray, w: number, h: number, config: BgRemovalConfig) {
  const total = w * h;
  // Tolerance 5..100 maps luminance cutoff from ~248 down to ~155
  const cutoff = 250 - config.tolerance * 0.95;
  const span = Math.max(6, 12 + config.smoothness * 4.5);

  for (let i = 0; i < total; i += 1) {
    const p = i * 4;
    const a = data[p + 3];
    if (a === 0) continue;

    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Color protection: chromatic pixels retain opacity unless very pale
    const effectiveLuma = luma - chroma * 0.65;
    if (effectiveLuma >= cutoff) {
      const fade = 1 - smoothstep(cutoff - span, cutoff + span * 0.4, effectiveLuma);
      data[p + 3] = Math.round(a * fade);
    } else if (effectiveLuma >= cutoff - span) {
      const fade = 1 - smoothstep(cutoff - span, cutoff + span * 0.4, effectiveLuma);
      data[p + 3] = Math.round(a * fade);
      if (config.defringe && fade > 0.06 && fade < 0.95) {
        data[p] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - fade)) / fade)));
        data[p + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - fade)) / fade)));
        data[p + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - fade)) / fade)));
      }
    }
  }
}

/**
 * Dark / Black Screen Knock-Out: cleanly removes dark/black backgrounds
 * while protecting white, metallic, and bright/colorful artwork.
 */
function applyLumaDarkRemoval(data: Uint8ClampedArray, w: number, h: number, config: BgRemovalConfig) {
  const total = w * h;
  const cutoff = 8 + config.tolerance * 0.95;
  const span = Math.max(6, 12 + config.smoothness * 4.5);

  for (let i = 0; i < total; i += 1) {
    const p = i * 4;
    const a = data[p + 3];
    if (a === 0) continue;

    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const effectiveLuma = luma + chroma * 0.55;
    if (effectiveLuma <= cutoff + span) {
      const fade = smoothstep(cutoff - span * 0.4, cutoff + span, effectiveLuma);
      data[p + 3] = Math.round(a * fade);
      if (config.defringe && fade > 0.06 && fade < 0.95) {
        data[p] = Math.min(255, Math.round(r / fade));
        data[p + 1] = Math.min(255, Math.round(g / fade));
        data[p + 2] = Math.min(255, Math.round(b / fade));
      }
    }
  }
}

/**
 * Color Key Layer Removal: globally or border-connected removes a user-chosen
 * target color across multi-layered artwork or green/blue screens.
 */
function applyChromaKeyRemoval(data: Uint8ClampedArray, w: number, h: number, config: BgRemovalConfig) {
  const [tr, tg, tb] = hexToRgb(config.targetColor);
  const targetLab = rgbToLab(tr, tg, tb);
  const deltaMax = 5 + config.tolerance * 0.68;
  const featherSpan = Math.max(2, config.smoothness * 2.4);
  const deltaInner = Math.max(2, deltaMax - featherSpan * 0.45);
  const deltaOuter = deltaMax + featherSpan * 0.75;

  const total = w * h;
  const distArr = new Float32Array(total);
  const candidate = new Uint8Array(total);

  for (let i = 0; i < total; i += 1) {
    const p = i * 4;
    if (data[p + 3] === 0) continue;
    const d = labDistance(rgbToLab(data[p], data[p + 1], data[p + 2]), targetLab);
    distArr[i] = d;
    if (d <= deltaOuter) candidate[i] = 1;
  }

  if (!config.removeInteriorHoles) {
    const visited = new Uint8Array(total);
    const keep = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const pushIf = (idx: number) => {
      if (visited[idx]) return;
      visited[idx] = 1;
      if (candidate[idx] || data[idx * 4 + 3] === 0) {
        keep[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < w; x += 1) {
      pushIf(x);
      pushIf((h - 1) * w + x);
    }
    for (let y = 1; y < h - 1; y += 1) {
      pushIf(y * w);
      pushIf(y * w + (w - 1));
    }

    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      if (cx > 0) pushIf(cur - 1);
      if (cx < w - 1) pushIf(cur + 1);
      if (cy > 0) pushIf(cur - w);
      if (cy < h - 1) pushIf(cur + w);
    }

    for (let i = 0; i < total; i += 1) {
      if (!keep[i]) candidate[i] = 0;
    }
  }

  for (let i = 0; i < total; i += 1) {
    if (!candidate[i]) continue;
    const p = i * 4;
    const d = distArr[i];
    if (d <= deltaInner) {
      data[p + 3] = 0;
    } else {
      const alphaFactor = smoothstep(deltaInner, deltaOuter, d);
      data[p + 3] = Math.round(data[p + 3] * alphaFactor);
      if (config.defringe && alphaFactor > 0.05 && alphaFactor < 0.96) {
        data[p] = Math.max(0, Math.min(255, Math.round((data[p] - tr * (1 - alphaFactor)) / alphaFactor)));
        data[p + 1] = Math.max(0, Math.min(255, Math.round((data[p + 1] - tg * (1 - alphaFactor)) / alphaFactor)));
        data[p + 2] = Math.max(0, Math.min(255, Math.round((data[p + 2] - tb * (1 - alphaFactor)) / alphaFactor)));
      }
    }
  }
}

/**
 * Erodes 1-3px of stubborn outer fringe pixels after alpha keying.
 */
function applyAlphaEdgeTrim(data: Uint8ClampedArray, w: number, h: number, passes: number) {
  if (passes <= 0) return;
  const total = w * h;
  for (let pass = 0; pass < passes; pass += 1) {
    const alphaSnapshot = new Uint8ClampedArray(total);
    for (let i = 0; i < total; i += 1) {
      alphaSnapshot[i] = data[i * 4 + 3];
    }

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = y * w + x;
        const a = alphaSnapshot[idx];
        if (a === 0) continue;

        let minNeighbor = a;
        if (x > 0) minNeighbor = Math.min(minNeighbor, alphaSnapshot[idx - 1]);
        if (x < w - 1) minNeighbor = Math.min(minNeighbor, alphaSnapshot[idx + 1]);
        if (y > 0) minNeighbor = Math.min(minNeighbor, alphaSnapshot[idx - w]);
        if (y < h - 1) minNeighbor = Math.min(minNeighbor, alphaSnapshot[idx + w]);

        if (minNeighbor < 40) {
          data[idx * 4 + 3] = Math.min(a, Math.round(minNeighbor * 0.65));
        }
      }
    }
  }
}

/**
 * Returns a cached, background-removed HTMLCanvasElement for any image or canvas frame
 * and removal configuration, suitable for crisp live preview and animated GIF export.
 */
export function getProcessedBgRemovedCanvasFromSource(
  source: HTMLImageElement | HTMLCanvasElement,
  sourceKey: string,
  config: BgRemovalConfig,
  maxWorkingDim = 1600
): HTMLCanvasElement {
  const natW =
    source instanceof HTMLCanvasElement
      ? Math.max(1, source.width)
      : Math.max(1, source.naturalWidth || 512);
  const natH =
    source instanceof HTMLCanvasElement
      ? Math.max(1, source.height)
      : Math.max(1, source.naturalHeight || 512);
  const scale = Math.min(1, maxWorkingDim / Math.max(natW, natH));
  const w = Math.max(1, Math.round(natW * scale));
  const h = Math.max(1, Math.round(natH * scale));

  const cacheKey = [
    sourceKey,
    w,
    h,
    config.mode,
    config.tolerance,
    config.smoothness,
    config.edgeTrim,
    config.removeInteriorHoles ? 1 : 0,
    config.defringe ? 1 : 0,
    config.targetColor,
  ].join('|');

  const cached = processedCache.get(cacheKey);
  if (cached) {
    // Refresh insertion order for LRU behavior
    processedCache.delete(cacheKey);
    processedCache.set(cacheKey, cached);
    return cached.canvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  switch (config.mode) {
    case 'gradient-checker':
      applyGradientCheckerRemoval(data, w, h, config);
      break;
    case 'luma-light':
      applyLumaLightRemoval(data, w, h, config);
      break;
    case 'luma-dark':
      applyLumaDarkRemoval(data, w, h, config);
      break;
    case 'chroma-key':
      applyChromaKeyRemoval(data, w, h, config);
      break;
    case 'auto-edge':
    default:
      applyAutoEdgeRemoval(data, w, h, config);
      break;
  }

  if (config.edgeTrim > 0) {
    applyAlphaEdgeTrim(data, w, h, Math.min(3, Math.round(config.edgeTrim)));
  }

  ctx.putImageData(imageData, 0, 0);

  if (processedCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = processedCache.keys().next().value;
    if (oldestKey !== undefined) {
      processedCache.delete(oldestKey);
    }
  }
  processedCache.set(cacheKey, { key: cacheKey, canvas });
  return canvas;
}

/**
 * Returns a cached, background-removed HTMLCanvasElement for the given image
 * and removal configuration, suitable for crisp live preview and export.
 */
export function getProcessedBgRemovedCanvas(
  img: HTMLImageElement,
  config: BgRemovalConfig,
  maxWorkingDim = 1600
): HTMLCanvasElement {
  return getProcessedBgRemovedCanvasFromSource(img, img.src, config, maxWorkingDim);
}
