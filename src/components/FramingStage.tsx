import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Crosshair,
  Download,
  ImagePlus,
  Move,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PLATFORM_CATEGORIES, SAMPLE_ASSETS } from '../data/presets';
import {
  AspectPresetMatch,
  BatchItem,
  EncodedOutput,
  FramingState,
  LinePreset,
  LogoWatermarkAsset,
  SampleAsset,
  SourceAsset,
} from '../types';
import { getEffectiveSourceRect } from '../utils/autoFraming';
import {
  computeCropGeometry,
  formatBytes,
  getFormatExtension,
  getFormatShortLabel,
  renderFramedCanvas,
  resolveMatteColor,
  supportsAlphaExport,
} from '../utils/imageEngine';
import { sanitizeBatchPrefix } from '../utils/zipExporter';
import { PWAInstallButton } from './PWAInstallButton';

interface FramingStageProps {
  queue: BatchItem[];
  activeItemId: string | null;
  source: SourceAsset | null;
  logoAsset?: LogoWatermarkAsset | null;
  preset: LinePreset;
  framing: FramingState;
  autoFitMatch?: AspectPresetMatch | null;
  onApplyAutoFit?: () => void;
  onCanvasVisibilityChange?: (visible: boolean) => void;
  output: EncodedOutput;
  isDraggingFile: boolean;
  isLoadingSampleId: string | null;
  isSharing: boolean;
  batchPrefix: string;
  bulletsEnabled: boolean;
  onToggleBullets: () => void;
  onChangeBatchPrefix: (value: string) => void;
  onSelectFiles: (files: File[], mode: 'append' | 'replace') => void;
  onSelectBatchItem: (itemId: string) => void;
  onRemoveBatchItem: (itemId: string) => void;
  onLoadSample: (sample: SampleAsset) => void;
  onLoadAllSamples: () => void;
  onUpdateFraming: (patch: Partial<FramingState>) => void;
  onClearAll: () => void;
  onDownloadSingle: () => void;
  onShareOutput: () => Promise<void>;
  onCopyImage: () => Promise<void>;
}

type GestureState =
  | {
      mode: 'pan';
      startX: number;
      startY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      mode: 'pinch';
      startDist: number;
      startZoom: number;
      lastDist: number;
      lastMoveTs: number;
      pinchVelocity: number;
      lastMidX: number;
      lastMidY: number;
    };

interface ZoomAnimationState {
  currentZoom: number;
  targetZoom: number;
  velocity: number;
  currentOffsetX: number;
  currentOffsetY: number;
  targetOffsetX: number | null;
  targetOffsetY: number | null;
  anchorNorm: { x: number; y: number } | null;
  animating: boolean;
  rafId: number | null;
  lastFrameTs: number;
  lastCommitTs: number;
  pendingSelfCommits: number[];
  lastSeenEffectZoom: number;
}

function clampZoom(z: number): number {
  return Math.max(1, Math.min(3, z));
}

function clampOffset(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function FramingStage({
  queue,
  activeItemId,
  source,
  logoAsset = null,
  preset,
  framing,
  autoFitMatch = null,
  onApplyAutoFit,
  onCanvasVisibilityChange,
  output,
  isDraggingFile,
  isLoadingSampleId,
  isSharing,
  batchPrefix,
  bulletsEnabled,
  onToggleBullets,
  onChangeBatchPrefix,
  onSelectFiles,
  onSelectBatchItem,
  onRemoveBatchItem,
  onLoadSample,
  onLoadAllSamples,
  onUpdateFraming,
  onClearAll,
  onDownloadSingle,
  onShareOutput,
  onCopyImage,
}: FramingStageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pickerModeRef = useRef<'append' | 'replace'>('append');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [isZoomingHud, setIsZoomingHud] = useState(false);
  const [hudZoom, setHudZoom] = useState(framing.zoom);
  const [copiedJustNow, setCopiedJustNow] = useState(false);
  const [failedSampleImages, setFailedSampleImages] = useState<Record<string, boolean>>({});

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<GestureState | null>(null);
  const latestFramingRef = useRef(framing);
  latestFramingRef.current = framing;
  const latestSourceRef = useRef(source);
  latestSourceRef.current = source;
  const latestPresetRef = useRef(preset);
  latestPresetRef.current = preset;
  const latestLogoRef = useRef(logoAsset);
  latestLogoRef.current = logoAsset;
  const onUpdateFramingRef = useRef(onUpdateFraming);
  onUpdateFramingRef.current = onUpdateFraming;
  const hudHideTimeoutRef = useRef<number | null>(null);

  const zoomAnimRef = useRef<ZoomAnimationState>({
    currentZoom: framing.zoom,
    targetZoom: framing.zoom,
    velocity: 0,
    currentOffsetX: framing.offsetX,
    currentOffsetY: framing.offsetY,
    targetOffsetX: null,
    targetOffsetY: null,
    anchorNorm: null,
    animating: false,
    rafId: null,
    lastFrameTs: 0,
    lastCommitTs: 0,
    pendingSelfCommits: [],
    lastSeenEffectZoom: framing.zoom,
  });

  const targetW = preset.width * framing.scale;
  const targetH = preset.height * framing.scale;
  const isBatch = queue.length > 1;
  const activeIndex = queue.findIndex((item) => item.id === activeItemId);

  const getPreviewDimensions = (p: LinePreset) => {
    const previewMaxDim = 1080;
    const aspect = p.width / p.height;
    let previewW = previewMaxDim;
    let previewH = Math.round(previewMaxDim / aspect);
    if (previewH > previewMaxDim) {
      previewH = previewMaxDim;
      previewW = Math.round(previewMaxDim * aspect);
    }
    return { previewW, previewH };
  };

  // Sync external zoom/offset changes (e.g. sidebar slider, preset swap, Focus Subject)
  useEffect(() => {
    const anim = zoomAnimRef.current;
    const zoomChanged = Math.abs(framing.zoom - anim.lastSeenEffectZoom) > 0.0005;
    anim.lastSeenEffectZoom = framing.zoom;

    if (!anim.animating) {
      anim.currentZoom = framing.zoom;
      anim.targetZoom = framing.zoom;
      anim.currentOffsetX = framing.offsetX;
      anim.currentOffsetY = framing.offsetY;
      anim.pendingSelfCommits = [];
      setHudZoom(framing.zoom);
      return;
    }

    if (!zoomChanged) {
      return;
    }

    // Check if this zoom update came from our own rAF throttled commit
    const matchIdx = anim.pendingSelfCommits.findIndex(
      (z) => Math.abs(z - framing.zoom) < 0.0008
    );
    if (matchIdx !== -1) {
      anim.pendingSelfCommits.splice(0, matchIdx + 1);
      return;
    }

    // External slider or preset action overrides in-flight inertia cleanly
    if (anim.rafId !== null) {
      cancelAnimationFrame(anim.rafId);
      anim.rafId = null;
    }
    anim.animating = false;
    anim.velocity = 0;
    anim.targetOffsetX = null;
    anim.targetOffsetY = null;
    anim.pendingSelfCommits = [];
    anim.currentZoom = framing.zoom;
    anim.targetZoom = framing.zoom;
    anim.currentOffsetX = framing.offsetX;
    anim.currentOffsetY = framing.offsetY;
    setHudZoom(framing.zoom);
    setIsZoomingHud(false);
  }, [framing.zoom, framing.offsetX, framing.offsetY]);

  // Render live interactive preview canvas at crisp display resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    if (zoomAnimRef.current.animating) return;

    const { previewW, previewH } = getPreviewDimensions(preset);
    renderFramedCanvas(canvas, source, previewW, previewH, framing, logoAsset);
  }, [source, preset, framing, logoAsset]);

  // Clean up any active rAF or HUD timer on unmount
  useEffect(() => {
    return () => {
      if (zoomAnimRef.current.rafId !== null) {
        cancelAnimationFrame(zoomAnimRef.current.rafId);
        zoomAnimRef.current.rafId = null;
      }
      if (hudHideTimeoutRef.current !== null) {
        window.clearTimeout(hudHideTimeoutRef.current);
      }
    };
  }, []);

  // Observe whether main stage canvas is visible in viewport for floating layer mini-preview
  useEffect(() => {
    if (!onCanvasVisibilityChange) return;
    if (!source) {
      onCanvasVisibilityChange(true);
      return;
    }
    const el = frameBoxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      onCanvasVisibilityChange(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        onCanvasVisibilityChange(entry.isIntersecting && entry.intersectionRatio >= 0.25);
      },
      { threshold: [0, 0.25, 0.6] }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [source, onCanvasVisibilityChange]);

  const triggerFilePicker = (mode: 'append' | 'replace') => {
    pickerModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      onSelectFiles(Array.from(fileList), pickerModeRef.current);
    }
    e.target.value = '';
  };

  const computeAnchoredOffsets = (
    srcAsset: SourceAsset,
    baseFraming: FramingState,
    prevZoom: number,
    nextZoom: number,
    prevOffsetX: number,
    prevOffsetY: number,
    anchorNorm: { x: number; y: number } | null
  ): { offsetX: number; offsetY: number } => {
    if (!anchorNorm || !frameBoxRef.current) {
      return { offsetX: prevOffsetX, offsetY: prevOffsetY };
    }
    const rect = frameBoxRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { offsetX: prevOffsetX, offsetY: prevOffsetY };
    }
    const { effectiveWidth: srcW, effectiveHeight: srcH } = getEffectiveSourceRect(
      srcAsset,
      baseFraming
    );
    const geomPrev = computeCropGeometry(srcW, srcH, rect.width, rect.height, {
      ...baseFraming,
      zoom: prevZoom,
      offsetX: prevOffsetX,
      offsetY: prevOffsetY,
    });
    const geomNext = computeCropGeometry(srcW, srcH, rect.width, rect.height, {
      ...baseFraming,
      zoom: nextZoom,
      offsetX: prevOffsetX,
      offsetY: prevOffsetY,
    });

    const cursorPxX = anchorNorm.x * rect.width;
    const cursorPxY = anchorNorm.y * rect.height;
    const fracX = (cursorPxX - geomPrev.drawX) / Math.max(1, geomPrev.drawWidth);
    const fracY = (cursorPxY - geomPrev.drawY) / Math.max(1, geomPrev.drawHeight);

    const desiredDrawX = cursorPxX - fracX * geomNext.drawWidth;
    const desiredDrawY = cursorPxY - fracY * geomNext.drawHeight;

    const nextOffsetX =
      geomNext.maxShiftX > 1
        ? clampOffset(
            (desiredDrawX - (rect.width - geomNext.drawWidth) / 2) / geomNext.maxShiftX
          )
        : 0;
    const nextOffsetY =
      geomNext.maxShiftY > 1
        ? clampOffset(
            (desiredDrawY - (rect.height - geomNext.drawHeight) / 2) / geomNext.maxShiftY
          )
        : 0;

    return { offsetX: nextOffsetX, offsetY: nextOffsetY };
  };

  const scheduleZoomHudHide = () => {
    if (hudHideTimeoutRef.current !== null) {
      window.clearTimeout(hudHideTimeoutRef.current);
    }
    hudHideTimeoutRef.current = window.setTimeout(() => {
      setIsZoomingHud(false);
    }, 950);
  };

  const ensureZoomLoop = () => {
    const anim = zoomAnimRef.current;
    if (anim.rafId !== null) return;

    anim.animating = true;
    anim.lastFrameTs = performance.now();

    const step = (now: number) => {
      const currentSource = latestSourceRef.current;
      const canvas = canvasRef.current;
      if (!currentSource || !canvas || latestFramingRef.current.fitMode !== 'crop') {
        anim.animating = false;
        anim.rafId = null;
        return;
      }

      const dt = Math.min(0.05, Math.max(0.001, (now - anim.lastFrameTs) / 1000));
      anim.lastFrameTs = now;

      const prevZoom = anim.currentZoom;

      // Apply inertial velocity to targetZoom and damp smoothly
      if (Math.abs(anim.velocity) > 0.0005) {
        const nextTarget = clampZoom(anim.targetZoom + anim.velocity * dt);
        if (
          (nextTarget <= 1 && anim.velocity < 0) ||
          (nextTarget >= 3 && anim.velocity > 0)
        ) {
          anim.velocity = 0;
        } else {
          anim.velocity *= Math.exp(-9.2 * dt);
        }
        anim.targetZoom = nextTarget;
      } else {
        anim.velocity = 0;
      }

      // Exponential spring smoothing toward targetZoom (instant if reduced-motion)
      const reduced = prefersReducedMotion();
      const followRate = gestureRef.current?.mode === 'pinch' ? 28 : 19;
      const alpha = reduced ? 1 : 1 - Math.exp(-followRate * dt);
      const nextZoom = clampZoom(prevZoom + (anim.targetZoom - prevZoom) * alpha);

      let nextOffsetX = anim.currentOffsetX;
      let nextOffsetY = anim.currentOffsetY;

      if (anim.targetOffsetX !== null && anim.targetOffsetY !== null) {
        const panAlpha = reduced ? 1 : 1 - Math.exp(-16 * dt);
        nextOffsetX = clampOffset(
          anim.currentOffsetX + (anim.targetOffsetX - anim.currentOffsetX) * panAlpha
        );
        nextOffsetY = clampOffset(
          anim.currentOffsetY + (anim.targetOffsetY - anim.currentOffsetY) * panAlpha
        );
      } else if (Math.abs(nextZoom - prevZoom) > 0.00005) {
        const anchored = computeAnchoredOffsets(
          currentSource,
          latestFramingRef.current,
          prevZoom,
          nextZoom,
          anim.currentOffsetX,
          anim.currentOffsetY,
          anim.anchorNorm
        );
        nextOffsetX = anchored.offsetX;
        nextOffsetY = anchored.offsetY;
      }

      anim.currentZoom = nextZoom;
      anim.currentOffsetX = nextOffsetX;
      anim.currentOffsetY = nextOffsetY;

      const frameSnapshot: FramingState = {
        ...latestFramingRef.current,
        zoom: nextZoom,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      };
      const { previewW, previewH } = getPreviewDimensions(latestPresetRef.current);
      renderFramedCanvas(
        canvas,
        currentSource,
        previewW,
        previewH,
        frameSnapshot,
        latestLogoRef.current
      );

      setHudZoom(nextZoom);

      const zoomSettled = Math.abs(anim.targetZoom - nextZoom) < 0.0012;
      const velSettled = Math.abs(anim.velocity) < 0.008;
      const panSettled =
        anim.targetOffsetX === null ||
        (Math.abs(anim.targetOffsetX - nextOffsetX) < 0.0012 &&
          Math.abs((anim.targetOffsetY ?? 0) - nextOffsetY) < 0.0012);

      if (zoomSettled && velSettled && panSettled) {
        const finalZoom = +clampZoom(anim.targetZoom).toFixed(3);
        const finalOffX = +(anim.targetOffsetX ?? nextOffsetX).toFixed(3);
        const finalOffY = +(anim.targetOffsetY ?? nextOffsetY).toFixed(3);

        anim.currentZoom = finalZoom;
        anim.currentOffsetX = finalOffX;
        anim.currentOffsetY = finalOffY;
        anim.velocity = 0;
        anim.targetOffsetX = null;
        anim.targetOffsetY = null;
        anim.animating = false;
        anim.rafId = null;
        anim.lastCommitTs = now;
        if (Math.abs(finalZoom - anim.lastSeenEffectZoom) > 0.0005) {
          anim.pendingSelfCommits.push(finalZoom);
          if (anim.pendingSelfCommits.length > 16) anim.pendingSelfCommits.shift();
        }

        setHudZoom(finalZoom);
        scheduleZoomHudHide();
        onUpdateFramingRef.current({
          zoom: finalZoom,
          offsetX: finalOffX,
          offsetY: finalOffY,
        });
        return;
      }

      // Throttled state sync (~48ms) so sidebar zoom slider stays live without React stutter
      if (now - anim.lastCommitTs >= 48) {
        const committedZoom = +nextZoom.toFixed(3);
        anim.lastCommitTs = now;
        if (Math.abs(committedZoom - anim.lastSeenEffectZoom) > 0.0005) {
          anim.pendingSelfCommits.push(committedZoom);
          if (anim.pendingSelfCommits.length > 16) anim.pendingSelfCommits.shift();
        }
        onUpdateFramingRef.current({
          zoom: committedZoom,
          offsetX: +nextOffsetX.toFixed(3),
          offsetY: +nextOffsetY.toFixed(3),
        });
      }

      anim.rafId = requestAnimationFrame(step);
    };

    anim.rafId = requestAnimationFrame(step);
  };

  const triggerSmoothZoomReset = () => {
    const anim = zoomAnimRef.current;
    if (prefersReducedMotion()) {
      onUpdateFraming({ offsetX: 0, offsetY: 0, zoom: 1 });
      return;
    }
    anim.velocity = 0;
    anim.targetZoom = 1;
    anim.targetOffsetX = 0;
    anim.targetOffsetY = 0;
    anim.anchorNorm = null;
    setIsZoomingHud(true);
    ensureZoomLoop();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!source || latestFramingRef.current.fitMode !== 'crop') return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic or already-ended pointers that cannot be captured
    }

    const active = Array.from(pointersRef.current.values());
    if (active.length === 1) {
      // Cancel any residual wheel/pinch zoom target pan override when user grabs to pan
      zoomAnimRef.current.targetOffsetX = null;
      zoomAnimRef.current.targetOffsetY = null;
      setIsPanning(true);
      gestureRef.current = {
        mode: 'pan',
        startX: active[0].x,
        startY: active[0].y,
        startOffsetX: zoomAnimRef.current.animating
          ? zoomAnimRef.current.currentOffsetX
          : latestFramingRef.current.offsetX,
        startOffsetY: zoomAnimRef.current.animating
          ? zoomAnimRef.current.currentOffsetY
          : latestFramingRef.current.offsetY,
      };
    } else if (active.length >= 2) {
      setIsPanning(true);
      const [p1, p2] = active;
      const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      const baseZoom = zoomAnimRef.current.animating
        ? zoomAnimRef.current.currentZoom
        : latestFramingRef.current.zoom;
      zoomAnimRef.current.velocity = 0;
      zoomAnimRef.current.targetOffsetX = null;
      zoomAnimRef.current.targetOffsetY = null;
      gestureRef.current = {
        mode: 'pinch',
        startDist: dist,
        startZoom: baseZoom,
        lastDist: dist,
        lastMoveTs: performance.now(),
        pinchVelocity: 0,
        lastMidX: (p1.x + p2.x) / 2,
        lastMidY: (p1.y + p2.y) / 2,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId) || !source || !frameBoxRef.current) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const rect = frameBoxRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const active = Array.from(pointersRef.current.values());
    const currentFraming = latestFramingRef.current;
    const { effectiveWidth: srcW, effectiveHeight: srcH } = getEffectiveSourceRect(
      source,
      currentFraming
    );

    if (active.length === 1 && gestureRef.current?.mode === 'pan') {
      const activeZoom = zoomAnimRef.current.animating
        ? zoomAnimRef.current.currentZoom
        : currentFraming.zoom;
      const geom = computeCropGeometry(srcW, srcH, rect.width, rect.height, {
        ...currentFraming,
        zoom: activeZoom,
      });

      const dx = active[0].x - gestureRef.current.startX;
      const dy = active[0].y - gestureRef.current.startY;

      const nextOffsetX =
        geom.maxShiftX > 1
          ? clampOffset(gestureRef.current.startOffsetX + dx / geom.maxShiftX)
          : 0;
      const nextOffsetY =
        geom.maxShiftY > 1
          ? clampOffset(gestureRef.current.startOffsetY + dy / geom.maxShiftY)
          : 0;

      zoomAnimRef.current.currentOffsetX = nextOffsetX;
      zoomAnimRef.current.currentOffsetY = nextOffsetY;
      onUpdateFraming({ offsetX: nextOffsetX, offsetY: nextOffsetY });
    } else if (active.length >= 2 && gestureRef.current?.mode === 'pinch') {
      const now = performance.now();
      const [p1, p2] = active;
      const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const nextTargetZoom = clampZoom(
        gestureRef.current.startZoom * (dist / gestureRef.current.startDist)
      );

      const moveDt = Math.max(0.008, (now - gestureRef.current.lastMoveTs) / 1000);
      const prevTargetZoom = clampZoom(
        gestureRef.current.startZoom * (gestureRef.current.lastDist / gestureRef.current.startDist)
      );
      const instVel = (nextTargetZoom - prevTargetZoom) / moveDt;
      gestureRef.current.pinchVelocity =
        gestureRef.current.pinchVelocity * 0.55 +
        Math.max(-3.5, Math.min(3.5, instVel)) * 0.45;
      gestureRef.current.lastDist = dist;
      gestureRef.current.lastMoveTs = now;

      const geom = computeCropGeometry(srcW, srcH, rect.width, rect.height, {
        ...currentFraming,
        zoom: nextTargetZoom,
      });

      const dMidX = midX - gestureRef.current.lastMidX;
      const dMidY = midY - gestureRef.current.lastMidY;
      gestureRef.current.lastMidX = midX;
      gestureRef.current.lastMidY = midY;

      const anim = zoomAnimRef.current;
      const curOffX = anim.animating ? anim.currentOffsetX : currentFraming.offsetX;
      const curOffY = anim.animating ? anim.currentOffsetY : currentFraming.offsetY;

      anim.currentOffsetX =
        geom.maxShiftX > 1 ? clampOffset(curOffX + dMidX / geom.maxShiftX) : 0;
      anim.currentOffsetY =
        geom.maxShiftY > 1 ? clampOffset(curOffY + dMidY / geom.maxShiftY) : 0;
      anim.targetZoom = nextTargetZoom;
      anim.velocity = 0;
      anim.anchorNorm = {
        x: Math.max(0, Math.min(1, (midX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (midY - rect.top) / rect.height)),
      };

      setIsZoomingHud(true);
      ensureZoomLoop();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore capture release errors on synthetic/ended pointers
    }

    const prevGesture = gestureRef.current;
    const remaining = Array.from(pointersRef.current.values());

    if (prevGesture?.mode === 'pinch' && remaining.length < 2) {
      // Release pinch with inertial momentum carry-over
      const carryVel =
        performance.now() - prevGesture.lastMoveTs < 140
          ? Math.max(-2.8, Math.min(2.8, prevGesture.pinchVelocity * 0.35))
          : 0;
      if (Math.abs(carryVel) > 0.08 && !prefersReducedMotion()) {
        zoomAnimRef.current.velocity = carryVel;
        setIsZoomingHud(true);
        ensureZoomLoop();
      } else {
        scheduleZoomHudHide();
      }
    }

    if (remaining.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startX: remaining[0].x,
        startY: remaining[0].y,
        startOffsetX: zoomAnimRef.current.animating
          ? zoomAnimRef.current.currentOffsetX
          : latestFramingRef.current.offsetX,
        startOffsetY: zoomAnimRef.current.animating
          ? zoomAnimRef.current.currentOffsetY
          : latestFramingRef.current.offsetY,
      };
    } else if (remaining.length === 0) {
      setIsPanning(false);
      gestureRef.current = null;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source || framing.fitMode !== 'crop') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = frameBoxRef.current?.getBoundingClientRect();
      const normAnchor =
        rect && rect.width > 0 && rect.height > 0
          ? {
              x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
              y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
            }
          : null;

      // Normalize wheel delta across trackpad pixels, line-scroll mice, and page scrolls
      const pixelDelta =
        e.deltaMode === 1
          ? e.deltaY * 32
          : e.deltaMode === 2
          ? e.deltaY * 360
          : e.deltaY;
      const impulse = Math.max(-0.32, Math.min(0.32, -pixelDelta * 0.0016));
      if (Math.abs(impulse) < 0.0005) return;

      const anim = zoomAnimRef.current;
      if (!anim.animating) {
        anim.currentZoom = latestFramingRef.current.zoom;
        anim.targetZoom = latestFramingRef.current.zoom;
        anim.currentOffsetX = latestFramingRef.current.offsetX;
        anim.currentOffsetY = latestFramingRef.current.offsetY;
      }
      anim.targetOffsetX = null;
      anim.targetOffsetY = null;
      anim.anchorNorm = normAnchor;

      if (prefersReducedMotion()) {
        const nextZoom = clampZoom(anim.targetZoom + impulse);
        anim.targetZoom = nextZoom;
        anim.velocity = 0;
      } else {
        anim.targetZoom = clampZoom(anim.targetZoom + impulse * 0.85);
        anim.velocity = Math.max(
          -3.6,
          Math.min(3.6, anim.velocity * 0.45 + impulse * 3.4)
        );
      }

      setIsZoomingHud(true);
      ensureZoomLoop();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [source, framing.fitMode]);

  const handleCopyClick = async () => {
    await onCopyImage();
    setCopiedJustNow(true);
    window.setTimeout(() => setCopiedJustNow(false), 1800);
  };

  // Detect quality / platform spec warnings
  const effectiveDims = source ? getEffectiveSourceRect(source, framing) : null;
  const isUpscaled =
    effectiveDims !== null &&
    (effectiveDims.effectiveWidth < targetW * 0.85 ||
      effectiveDims.effectiveHeight < targetH * 0.85);
  const exceedsLimit = output.bytes > preset.maxSizeMb * 1024 * 1024;
  const isHeavyForPlatform =
    !exceedsLimit &&
    (preset.platform === 'line'
      ? output.bytes > 2 * 1024 * 1024
      : output.bytes > preset.maxSizeMb * 1024 * 1024 * 0.85);
  const platformShortLabel =
    preset.platform === 'line'
      ? 'LINE OA'
      : PLATFORM_CATEGORIES.find((c) => c.id === preset.platform)?.shortLabel ?? 'Platform';
  const outputShortLabel = getFormatShortLabel(framing.outputFormat);
  const outputExt = getFormatExtension(framing.outputFormat);
  const showAlphaCheckerboard = supportsAlphaExport(framing, source);
  const resolvedMatteHex = resolveMatteColor(source, framing);

  return (
    <main
      id="main-stage-canvas"
      className="relative flex min-w-0 flex-1 flex-col bg-[#FAF6EE] lg:sticky lg:top-2 lg:self-start"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.webp,.png,.jpg,.jpeg,.gif,.svg,.avif,.bmp,.ico"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Global stage drag-over overlay */}
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C25E00] bg-[#FFFDF8]/92 backdrop-blur-[2px]">
          <Upload className="mb-2 h-8 w-8 text-[#C25E00]" aria-hidden="true" />
          <p className="font-display text-base font-semibold text-[#2B1E16]">
            {source
              ? 'Drop images to add to your batch'
              : 'Drop one or more images to convert'}
          </p>
          <p className="mt-1 text-xs text-[#6E5849]">
            Multiple files export together in a single ZIP archive
          </p>
        </div>
      )}

      {!source ? (
        /* Empty State: Fast Intake & Built-in Sample Loader */
        <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-[640px]">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#2B1E16] sm:text-[28px]">
                  Convert Any Image for LINE & Social
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-[#4A3628]">
                  Drop WebP, PNG, JPG, SVG, GIF, or AVIF photos to resize and export as JPEG,
                  PNG, or WebP—single files or a ready-to-upload ZIP archive.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleBullets}
                  aria-pressed={bulletsEnabled}
                  title={bulletsEnabled ? 'Pause bouncy bullets' : 'Resume bouncy bullets'}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:min-h-0 whitespace-nowrap ${
                    bulletsEnabled
                      ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16] hover:bg-[#D97706]/18'
                      : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                  }`}
                >
                  <Crosshair
                    className={`h-3.5 w-3.5 ${
                      bulletsEnabled ? 'text-[#C25E00]' : 'text-[#8D7564]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{bulletsEnabled ? 'Bullets On' : 'Bullets Off'}</span>
                </button>
                <PWAInstallButton compact />
              </div>
            </div>

            <button
              type="button"
              data-bullet-collider="true"
              onClick={() => triggerFilePicker('append')}
              className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBB89D] bg-[#FFFDF8] px-5 py-9 text-center transition-colors duration-150 hover:border-[#C25E00] hover:bg-[#D97706]/[0.04] sm:rounded-xl sm:px-6 sm:py-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00]"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3EBDD] text-[#2B1E16] transition-colors group-hover:bg-[#D97706]/15 group-hover:text-[#C25E00]">
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="font-display text-base font-semibold text-[#2B1E16]">
                Tap to choose photos, or drop any image files
              </span>
              <span className="mt-1.5 text-xs text-[#6E5849]">
                1 file exports {outputShortLabel} · 2+ files export ZIP · Supports .webp, .png, .jpg, .svg, .gif
              </span>
              <span className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-4 py-2 text-xs font-semibold text-[#2B1E16] transition-colors group-hover:border-[#C25E00] group-hover:bg-[#C25E00] group-hover:text-white sm:min-h-0 sm:px-3.5 sm:py-1.5">
                Choose Images
              </span>
            </button>

            {/* Built-in Studio Samples */}
            <div className="mt-7 sm:mt-8">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-xs font-semibold text-[#4A3628]">
                  Or test with sample WebP product photos
                </h2>
                <button
                  type="button"
                  disabled={isLoadingSampleId !== null}
                  onClick={onLoadAllSamples}
                  className="min-h-[36px] text-xs font-semibold text-[#C25E00] transition-colors hover:text-[#A14B00] disabled:opacity-50 sm:min-h-0 whitespace-nowrap"
                >
                  {isLoadingSampleId === '__all__'
                    ? 'Preparing 3 WebPs…'
                    : 'Load all 3 as batch'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SAMPLE_ASSETS.map((sample) => {
                  const loading = isLoadingSampleId === sample.id;
                  const failed = failedSampleImages[sample.id];
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      data-bullet-collider="true"
                      disabled={isLoadingSampleId !== null}
                      onClick={() => onLoadSample(sample)}
                      className="group flex overflow-hidden rounded-xl border border-[#E4D7C3] bg-[#FFFDF8] text-left transition-colors duration-150 hover:border-[#C25E00] disabled:opacity-60 sm:block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00]"
                    >
                      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden bg-[#F3EBDD] sm:w-full">
                        {!failed ? (
                          <img
                            src={sample.src}
                            alt={sample.title}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedSampleImages((prev) => ({
                                ...prev,
                                [sample.id]: true,
                              }))
                            }
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F3EBDD] to-[#E4D7C3] p-3 text-center text-xs font-medium text-[#6E5849]">
                            {sample.title}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-center p-3">
                        <p className="truncate text-sm font-semibold text-[#2B1E16]">
                          {loading ? 'Preparing WebP…' : sample.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6E5849]">
                          {sample.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Framing Stage */
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
          {/* Top Stage Header Bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 sm:mb-4 sm:gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6E5849]">
                {isBatch && activeIndex >= 0 && (
                  <>
                    <span className="font-mono font-semibold tabular-nums text-[#C25E00] whitespace-nowrap">
                      {activeIndex + 1}/{queue.length}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="truncate font-medium text-[#2B1E16] max-w-[180px] sm:max-w-[220px]">
                  {source.fileName}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {source.formatLabel}
                  {source.hasTransparency ? ` (${source.transparencyPercent}% alpha)` : ''} →{' '}
                  {outputShortLabel}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden font-mono tabular-nums whitespace-nowrap sm:inline">
                  {source.naturalWidth}×{source.naturalHeight}
                </span>
                {source.autoCrop?.detectionMethod === 'face-api' && (
                  <>
                    <span aria-hidden="true" className="hidden md:inline">·</span>
                    <span className="hidden whitespace-nowrap md:inline">
                      Face headroom
                    </span>
                  </>
                )}
                {source.autoCrop?.detectionMethod === 'portrait-heuristic' && (
                  <>
                    <span aria-hidden="true" className="hidden md:inline">·</span>
                    <span className="hidden whitespace-nowrap md:inline">
                      Portrait lock
                    </span>
                  </>
                )}
                {autoFitMatch && autoFitMatch.preset.id !== preset.id && onApplyAutoFit && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={onApplyAutoFit}
                      title={`Detected ${autoFitMatch.sourceRatioLabel} (${autoFitMatch.orientation}) — click to switch to ${autoFitMatch.platformLabel} ${autoFitMatch.preset.shortName}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#D97706]/45 bg-[#D97706]/10 px-2 py-0.5 text-[11px] font-semibold text-[#A14B00] transition-colors hover:border-[#C25E00] hover:bg-[#D97706]/20 whitespace-nowrap"
                    >
                      <Sparkles className="h-3 w-3 shrink-0 text-[#C25E00]" aria-hidden="true" />
                      <span>
                        Auto-Fit · {autoFitMatch.platformLabel} {autoFitMatch.preset.ratioLabel}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onToggleBullets}
                aria-pressed={bulletsEnabled}
                title={bulletsEnabled ? 'Pause bouncy bullets' : 'Resume bouncy bullets'}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:min-h-0 whitespace-nowrap ${
                  bulletsEnabled
                    ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16] hover:bg-[#D97706]/18'
                    : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                }`}
              >
                <Crosshair
                  className={`h-3.5 w-3.5 ${
                    bulletsEnabled ? 'text-[#C25E00]' : 'text-[#8D7564]'
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {bulletsEnabled ? 'Bullets On' : 'Bullets Off'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => triggerFilePicker('append')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-2.5 py-1.5 text-xs font-medium text-[#4A3628] transition-colors hover:border-[#C25E00] hover:text-[#2B1E16] sm:min-h-0 sm:px-3 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add</span>
              </button>

              {isBatch ? (
                <button
                  type="button"
                  disabled={!output.blob || output.encoding}
                  onClick={onDownloadSingle}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-2.5 py-1.5 text-xs font-medium text-[#4A3628] transition-colors hover:border-[#CBB89D] hover:text-[#2B1E16] disabled:opacity-45 sm:min-h-0 sm:px-3 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save {outputShortLabel}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerFilePicker('replace')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-2.5 py-1.5 text-xs font-medium text-[#4A3628] transition-colors hover:border-[#CBB89D] hover:text-[#2B1E16] sm:min-h-0 sm:px-3 whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Replace</span>
                </button>
              )}

              <button
                type="button"
                disabled={(!output.blob && !isBatch) || isSharing}
                onClick={() => void onShareOutput()}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-2.5 py-1.5 text-xs font-medium text-[#2B1E16] transition-colors hover:border-[#C25E00] hover:text-[#C25E00] disabled:opacity-45 sm:min-h-0 sm:px-3 whitespace-nowrap"
              >
                <Share2 className="h-3.5 w-3.5 text-[#C25E00]" aria-hidden="true" />
                <span>{isSharing ? 'Sharing…' : 'Share'}</span>
              </button>

              <button
                type="button"
                disabled={!output.blob}
                onClick={handleCopyClick}
                className="hidden min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-3 py-1.5 text-xs font-medium text-[#4A3628] transition-colors hover:border-[#CBB89D] hover:text-[#2B1E16] disabled:opacity-45 sm:inline-flex sm:min-h-0 whitespace-nowrap"
              >
                {copiedJustNow ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClearAll}
                aria-label={isBatch ? 'Clear all queued images' : 'Remove current image'}
                title={isBatch ? 'Clear all images' : 'Remove image'}
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] p-1.5 text-[#6E5849] transition-colors hover:border-[#FCA5A5] hover:text-[#DC2626] sm:min-h-0 sm:min-w-0"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Dominant Interactive Canvas Frame */}
          <div className="flex flex-1 items-center justify-center py-1 sm:py-2">
            <div
              ref={frameBoxRef}
              data-bullet-collider="true"
              className="relative w-full overflow-hidden rounded-xl border border-[#CBB89D] bg-[#FFFDF8] shadow-xs"
              style={{
                aspectRatio: `${preset.width} / ${preset.height}`,
                maxWidth:
                  preset.width / preset.height >= 1.4
                    ? '660px'
                    : preset.width / preset.height >= 1.05
                    ? '520px'
                    : '460px',
                maxHeight: isBatch ? '42vh' : '48vh',
                ...(showAlphaCheckerboard
                  ? {
                      backgroundColor: '#FFFDF8',
                      backgroundImage:
                        'linear-gradient(45deg, #E4D7C3 25%, transparent 25%), linear-gradient(-45deg, #E4D7C3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E4D7C3 75%), linear-gradient(-45deg, transparent 75%, #E4D7C3 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }
                  : {}),
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={triggerSmoothZoomReset}
                className={`block h-full w-full touch-none select-none ${
                  framing.fitMode === 'crop'
                    ? isPanning
                      ? 'cursor-grabbing'
                      : 'cursor-grab'
                    : 'cursor-default'
                }`}
              />

              {/* Live Inertial Zoom HUD Readout */}
              {framing.fitMode === 'crop' && (isZoomingHud || hudZoom > 1.01) && (
                <div
                  aria-live="polite"
                  className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-md bg-[#2B1E16]/82 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#FFFDF8] shadow-xs backdrop-blur-[2px] transition-opacity duration-150"
                >
                  {hudZoom.toFixed(2)}×
                </div>
              )}

              {/* Optional Rule-of-Thirds Overlay */}
              {framing.showGrid && framing.fitMode === 'crop' && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/60 shadow-[0_0_1px_rgba(43,30,22,0.45)]" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/60 shadow-[0_0_1px_rgba(43,30,22,0.45)]" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/60 shadow-[0_0_1px_rgba(43,30,22,0.45)]" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/60 shadow-[0_0_1px_rgba(43,30,22,0.45)]" />
                </div>
              )}

              {/* Circular Safe-Zone Guide for LINE Person Card */}
              {preset.previewTemplate === 'person' && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="h-[88%] w-[88%] rounded-full border border-dashed border-white/85 shadow-[0_0_0_1px_rgba(43,30,22,0.35)]" />
                </div>
              )}
            </div>
          </div>

          {/* Batch Queue Filmstrip (shown when 2+ images are loaded) */}
          {isBatch && (
            <div className="mt-3.5 border-t border-[#E4D7C3] pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[#4A3628]">
                  <span className="font-semibold text-[#2B1E16]">
                    Batch Queue ({queue.length})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {preset.shortName} ({preset.ratioLabel}) · {outputShortLabel}
                    {framing.outputFormat !== 'png'
                      ? ` Q${Math.round(framing.quality * 100)}`
                      : ' Lossless'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-medium text-[#6E5849] transition-colors hover:text-[#DC2626] whitespace-nowrap shrink-0"
                >
                  Clear all
                </button>
              </div>

              {/* Custom ZIP Filename Prefix Control */}
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <label
                  htmlFor="batch-prefix-input"
                  className="text-xs font-medium text-[#4A3628] whitespace-nowrap"
                >
                  ZIP file prefix
                </label>
                <div className="relative flex min-w-[160px] flex-1 max-w-[260px] items-center">
                  <input
                    id="batch-prefix-input"
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => onChangeBatchPrefix(e.target.value)}
                    placeholder="Optional (e.g. autumn-promo)"
                    className="min-h-[38px] w-full rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] py-1.5 pl-2.5 pr-8 text-xs text-[#2B1E16] placeholder:text-[#8D7564] focus:border-[#C25E00] focus:outline-none sm:min-h-0"
                  />
                  {batchPrefix.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeBatchPrefix('')}
                      aria-label="Clear custom filename prefix"
                      className="absolute right-1.5 rounded p-1 text-[#8D7564] transition-colors hover:bg-[#F3EBDD] hover:text-[#2B1E16]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <span className="font-mono text-[11px] tabular-nums text-[#6E5849] truncate">
                  {sanitizeBatchPrefix(batchPrefix)
                    ? `→ ${sanitizeBatchPrefix(batchPrefix)}-${queue.length >= 100 ? '001' : '01'}.${outputExt}`
                    : `Default: [name]_${preset.filenameSuffix}.${outputExt}`}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {queue.map((item, idx) => {
                  const selected = item.id === activeItemId;
                  return (
                    <div
                      key={item.id}
                      className={`group relative flex w-[136px] shrink-0 items-center gap-2 rounded-lg border p-1.5 transition-colors ${
                        selected
                          ? 'border-[#C25E00] bg-[#FFFDF8]'
                          : 'border-[#E4D7C3] bg-[#FFFDF8]/80 hover:border-[#CBB89D] hover:bg-[#FFFDF8]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectBatchItem(item.id)}
                        className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00]"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#F3EBDD]">
                          <img
                            src={item.asset.objectUrl}
                            alt={item.asset.fileName}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="truncate text-[11px] font-semibold text-[#2B1E16]">
                            {item.asset.fileName}
                          </p>
                          <p className="font-mono text-[10px] tabular-nums text-[#6E5849]">
                            #{idx + 1} · {item.asset.formatLabel}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveBatchItem(item.id)}
                        aria-label={`Remove ${item.asset.fileName}`}
                        className="absolute right-1 top-1 rounded p-1 text-[#8D7564] opacity-80 transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] hover:opacity-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Stage Metadata & Validation Bar */}
          <div className="mt-3 space-y-2 border-t border-[#E4D7C3] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#4A3628]">
                <span className="font-mono font-medium tabular-nums text-[#2B1E16]">
                  {targetW} × {targetH} px
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {output.encoding
                    ? 'Calculating…'
                    : `${formatBytes(source.originalBytes)} → ${formatBytes(output.bytes)}`}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-medium ${
                    exceedsLimit
                      ? 'text-[#DC2626]'
                      : isHeavyForPlatform
                      ? 'text-[#D97706]'
                      : 'text-[#15803D]'
                  }`}
                >
                  {preset.platform === 'line'
                    ? exceedsLimit
                      ? 'Exceeds LINE 10 MB limit'
                      : isHeavyForPlatform
                      ? 'Within 10 MB (try lower quality for faster chat load)'
                      : 'Ready for LINE OA (< 10 MB)'
                    : exceedsLimit
                    ? `Exceeds ${platformShortLabel} ${preset.maxSizeMb} MB limit`
                    : isHeavyForPlatform
                    ? `Near ${platformShortLabel} ${preset.maxSizeMb} MB cap (lower quality if needed)`
                    : `Ready for ${platformShortLabel} (< ${preset.maxSizeMb} MB)`}
                </span>
                {output.alphaPreserved && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-[#2B1E16] whitespace-nowrap">
                      Alpha preserved
                    </span>
                  </>
                )}
                {output.matteApplied && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#2B1E16] whitespace-nowrap">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-xs border border-black/20"
                        style={{ backgroundColor: resolvedMatteHex }}
                      />
                      Matte {resolvedMatteHex}
                    </span>
                  </>
                )}
                {output.optimizedQuality !== undefined && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] font-medium text-[#15803D] whitespace-nowrap">
                      Auto-tuned Q{output.optimizedQuality}
                    </span>
                  </>
                )}
                {framing.autoCropEnabled && source.autoCrop?.hasTrimmedMargins && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-[#4A3628] whitespace-nowrap">
                      Trimmed {source.autoCrop.trimmedPercent}%
                    </span>
                  </>
                )}
                {framing.bgRemoval.enabled && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] font-medium text-[#C25E00] whitespace-nowrap">
                      BG removed
                    </span>
                  </>
                )}
                {logoAsset && framing.logoWatermark.enabled && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-[#4A3628] whitespace-nowrap">
                      Logo{framing.logoWatermark.bgRemoval.enabled ? ' (cutout)' : ''}
                    </span>
                  </>
                )}
                {framing.textWatermark.enabled &&
                  framing.textWatermark.text.trim().length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-[#4A3628] whitespace-nowrap">
                        Text layer
                      </span>
                    </>
                  )}
              </div>

              {framing.fitMode === 'crop' && (
                <div className="flex items-center gap-1.5 text-xs text-[#6E5849]">
                  <Move className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="sm:hidden">Drag to pan · Pinch to zoom</span>
                  <span className="hidden sm:inline">
                    Drag to pan · Scroll or pinch to zoom · Double-click to reset
                  </span>
                </div>
              )}
            </div>

            {isUpscaled && (
              <div className="flex items-center gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" aria-hidden="true" />
                <span>
                  Source image ({source.naturalWidth}×{source.naturalHeight}) is smaller than the{' '}
                  {targetW}×{targetH} export size and will be upscaled.{' '}
                  {framing.scale === 2
                    ? 'Switch to 1× Standard or enable Crisp Product Details if needed.'
                    : 'Enable Crisp Product Details in Quality for sharper edges.'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
