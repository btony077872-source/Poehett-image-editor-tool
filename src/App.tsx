import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { BouncyBulletStage } from './components/BouncyBulletStage';
import { ControlRail } from './components/ControlRail';
import { FloatingLayerPreview } from './components/FloatingLayerPreview';
import { FramingStage } from './components/FramingStage';
import { MobileBottomTabs } from './components/MobileBottomTabs';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlatformPreview } from './components/PlatformPreview';
import { RatioGuideView } from './components/RatioGuideView';
import { TopBar } from './components/TopBar';
import {
  DEFAULT_FRAMING,
  DEFAULT_PREVIEW_COPY,
  LINE_PRESETS,
  PLATFORM_CATEGORIES,
  resolveActivePreset,
  SAMPLE_ASSETS,
} from './data/presets';
import {
  ActiveView,
  BatchItem,
  EncodedOutput,
  FramingState,
  LogoWatermarkAsset,
  MobileTab,
  PlatformId,
  PreviewCopy,
  SampleAsset,
  SourceAsset,
  ZipExportState,
} from './types';
import {
  buildOutputFilename,
  buildStandaloneLogoGifFilename,
  encodeImageOutput,
  formatBytes,
  getFormatLabel,
  getFormatMime,
  loadSampleAsWebP,
  loadSourceFile,
  loadWatermarkLogoFile,
  recommendOutputFormat,
  resolveMatteColor,
} from './utils/imageEngine';
import {
  computeCenteredOffsetsForPreset,
  detectClosestPresetMatch,
  getEffectiveSourceRect,
} from './utils/autoFraming';
import { encodeStandaloneLogoGif } from './utils/gifEngine';
import { buildBatchZipArchive } from './utils/zipExporter';

const EMPTY_OUTPUT: EncodedOutput = {
  blob: null,
  objectUrl: null,
  bytes: 0,
  width: 0,
  height: 0,
  format: 'jpeg',
  mimeType: 'image/jpeg',
  encoding: false,
  encodeTimeMs: 0,
  matteApplied: false,
  alphaPreserved: false,
};

const IDLE_ZIP_STATE: ZipExportState = {
  exporting: false,
  completed: 0,
  total: 0,
};

function createBatchId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function releaseLogoAsset(asset: LogoWatermarkAsset | null) {
  if (!asset) return;
  URL.revokeObjectURL(asset.objectUrl);
  if (asset.gifFrames) {
    for (const frame of asset.gifFrames) {
      frame.canvas.width = 0;
      frame.canvas.height = 0;
    }
  }
}

function makeBatchItem(asset: SourceAsset): BatchItem {
  return {
    id: createBatchId(),
    asset,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };
}

function makeCenteredBatchItem(
  asset: SourceAsset,
  targetPreset: { width: number; height: number },
  autoCropEnabled: boolean
): BatchItem {
  if (!autoCropEnabled || !asset.autoCrop) {
    return makeBatchItem(asset);
  }
  const { effectiveWidth, effectiveHeight } = getEffectiveSourceRect(asset, {
    autoCropEnabled,
  });
  const { offsetX, offsetY } = computeCenteredOffsetsForPreset(
    effectiveWidth,
    effectiveHeight,
    targetPreset.width,
    targetPreset.height,
    asset.autoCrop.subjectCenter,
    1,
    asset.autoCrop.targetAnchor
  );
  return {
    id: createBatchId(),
    asset,
    offsetX,
    offsetY,
    zoom: 1,
  };
}

function recenterQueueToPreset(
  items: BatchItem[],
  targetPreset: { width: number; height: number },
  autoCropEnabled: boolean
): BatchItem[] {
  return items.map((item) => {
    if (!autoCropEnabled || !item.asset.autoCrop) {
      return { ...item, offsetX: 0, offsetY: 0 };
    }
    const { effectiveWidth, effectiveHeight } = getEffectiveSourceRect(item.asset, {
      autoCropEnabled,
    });
    const { offsetX, offsetY } = computeCenteredOffsetsForPreset(
      effectiveWidth,
      effectiveHeight,
      targetPreset.width,
      targetPreset.height,
      item.asset.autoCrop.subjectCenter,
      1,
      item.asset.autoCrop.targetAnchor
    );
    return { ...item, offsetX, offsetY, zoom: 1 };
  });
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('converter');
  const [activePresetId, setActivePresetId] = useState<string>(LINE_PRESETS[0].id);
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [logoAsset, setLogoAsset] = useState<LogoWatermarkAsset | null>(null);
  const [framing, setFraming] = useState<FramingState>(DEFAULT_FRAMING);
  const [output, setOutput] = useState<EncodedOutput>(EMPTY_OUTPUT);
  const [zipState, setZipState] = useState<ZipExportState>(IDLE_ZIP_STATE);
  const [batchPrefix, setBatchPrefix] = useState<string>('');
  const [previewCopy, setPreviewCopy] = useState<PreviewCopy>(DEFAULT_PREVIEW_COPY);

  const [mobileTab, setMobileTab] = useState<MobileTab>('presets');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<boolean>(true);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isLoadingSampleId, setIsLoadingSampleId] = useState<string | null>(null);
  const [isExportingLogoGif, setIsExportingLogoGif] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [shotSeq, setShotSeq] = useState(0);
  const [burstSignal, setBurstSignal] = useState(0);
  const [bulletsEnabled, setBulletsEnabled] = useState(true);
  const [isStageCanvasVisible, setIsStageCanvasVisible] = useState(true);

  const muzzleRef = useRef<HTMLSpanElement | null>(null);
  const dragCounterRef = useRef(0);
  const encodeTokenRef = useRef(0);
  const queueRef = useRef<BatchItem[]>([]);
  const logoAssetRef = useRef<LogoWatermarkAsset | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  queueRef.current = queue;
  logoAssetRef.current = logoAsset;

  const handleMascotShot = useCallback(() => {
    setShotSeq((s) => s + 1);
  }, []);

  const handleFireMascot = useCallback(() => {
    if (!bulletsEnabled) {
      setBulletsEnabled(true);
    }
    setShotSeq((s) => s + 1);
    setBurstSignal((b) => b + 1);
  }, [bulletsEnabled]);

  const rawPreset = useMemo(
    () => LINE_PRESETS.find((p) => p.id === activePresetId) ?? LINE_PRESETS[0],
    [activePresetId]
  );

  const activePreset = useMemo(
    () => resolveActivePreset(rawPreset, framing),
    [rawPreset, framing]
  );

  const activePlatform = activePreset.platform;

  const activeItem = useMemo(() => {
    if (queue.length === 0) return null;
    return queue.find((item) => item.id === activeItemId) ?? queue[0];
  }, [queue, activeItemId]);

  const activeSource = activeItem?.asset ?? null;

  const autoFitMatch = useMemo(() => {
    if (!activeSource) return null;
    const { effectiveWidth, effectiveHeight } = getEffectiveSourceRect(activeSource, {
      autoCropEnabled: framing.autoCropEnabled,
    });
    return detectClosestPresetMatch(effectiveWidth, effectiveHeight, {
      isPortraitSubject: activeSource.autoCrop?.isPortraitSubject,
    });
  }, [activeSource, framing.autoCropEnabled]);

  const effectiveFraming: FramingState = useMemo(
    () => ({
      ...framing,
      offsetX: activeItem?.offsetX ?? 0,
      offsetY: activeItem?.offsetY ?? 0,
      zoom: activeItem?.zoom ?? 1,
    }),
    [framing, activeItem?.offsetX, activeItem?.offsetY, activeItem?.zoom]
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  }, []);

  // Clean up all object URLs and offscreen GIF frame buffers on unmount
  useEffect(() => {
    return () => {
      for (const item of queueRef.current) {
        URL.revokeObjectURL(item.asset.objectUrl);
      }
      releaseLogoAsset(logoAssetRef.current);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleSelectFiles = useCallback(
    async (files: File[], mode: 'append' | 'replace' = 'append') => {
      if (files.length === 0) return;
      setErrorMessage(null);

      const results = await Promise.allSettled(files.map((f) => loadSourceFile(f)));
      const loadedAssets: SourceAsset[] = [];
      const errors: string[] = [];

      for (const res of results) {
        if (res.status === 'fulfilled') {
          loadedAssets.push(res.value);
        } else {
          errors.push(
            res.reason instanceof Error
              ? res.reason.message
              : 'One or more files could not be decoded.'
          );
        }
      }

      if (loadedAssets.length === 0) {
        setErrorMessage(errors[0] ?? 'Unable to load the selected image files.');
        return;
      }

      if (errors.length > 0) {
        setErrorMessage(
          `Loaded ${loadedAssets.length} image${loadedAssets.length > 1 ? 's' : ''}; skipped ${errors.length} unsupported file${errors.length > 1 ? 's' : ''}.`
        );
      }

      const newItems = loadedAssets.map((asset) =>
        makeCenteredBatchItem(asset, activePreset, framing.autoCropEnabled)
      );

      setQueue((prev) => {
        if (mode === 'replace') {
          for (const item of prev) {
            URL.revokeObjectURL(item.asset.objectUrl);
          }
          return newItems;
        }
        return [...prev, ...newItems];
      });

      setActiveItemId(newItems[0].id);
      setActiveView('converter');

      const primaryAsset = loadedAssets[0];
      const anyTransparent = loadedAssets.some((a) => a.hasTransparency);

      if (framing.autoDetectFormat) {
        const transparentAsset = loadedAssets.find((a) => a.hasTransparency) ?? primaryAsset;
        const rec = recommendOutputFormat(transparentAsset);
        setFraming((prev) => ({
          ...prev,
          outputFormat: rec.format,
          preserveTransparency: true,
          padBackdrop:
            rec.format !== 'jpeg' && anyTransparent && prev.fitMode === 'pad'
              ? 'transparent'
              : prev.padBackdrop === 'transparent' && rec.format === 'jpeg'
              ? 'white'
              : prev.padBackdrop,
        }));
        const trimNote =
          primaryAsset.autoCrop?.hasTrimmedMargins && framing.autoCropEnabled
            ? ` · Trimmed ${primaryAsset.autoCrop.trimmedPercent}% border`
            : '';
        showToast(
          `Auto-selected ${getFormatLabel(rec.format)} (${anyTransparent ? 'transparency preserved' : 'optimized for photos'})${trimNote}`
        );
      } else if (newItems.length > 1) {
        showToast(
          mode === 'replace'
            ? `Loaded ${newItems.length} images ready for ZIP export`
            : `Added ${newItems.length} images to batch queue`
        );
      } else if (primaryAsset.hasTransparency && framing.outputFormat === 'jpeg') {
        const matte = resolveMatteColor(primaryAsset, framing);
        showToast(
          `Transparency detected — ${matte} matte auto-applied for JPEG`
        );
      } else if (primaryAsset.autoCrop?.hasTrimmedMargins && framing.autoCropEnabled) {
        showToast(
          `Auto-cropped ${primaryAsset.autoCrop.trimmedPercent}% blank margin & centered subject`
        );
      }
    },
    [framing, activePreset, showToast]
  );

  const handleLoadSample = useCallback(
    async (sample: SampleAsset) => {
      setErrorMessage(null);
      setIsLoadingSampleId(sample.id);
      try {
        const asset = await loadSampleAsWebP(sample);
        const item = makeBatchItem(asset);
        setQueue((prev) => {
          for (const old of prev) {
            URL.revokeObjectURL(old.asset.objectUrl);
          }
          return [item];
        });
        setActiveItemId(item.id);
        setActivePresetId(sample.defaultPresetId);
        setPreviewCopy(sample.defaultCopy);
        setFraming((prev) => ({
          ...prev,
          fitMode: sample.id === 'sample-serum' ? 'pad' : 'crop',
          padBackdrop: 'blur',
          offsetX: 0,
          offsetY: 0,
          zoom: 1,
        }));
        setActiveView('converter');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to prepare sample WebP image.';
        setErrorMessage(message);
      } finally {
        setIsLoadingSampleId(null);
      }
    },
    []
  );

  const handleLoadAllSamples = useCallback(async () => {
    setErrorMessage(null);
    setIsLoadingSampleId('__all__');
    try {
      const assets = await Promise.all(SAMPLE_ASSETS.map((s) => loadSampleAsWebP(s)));
      const newItems = assets.map(makeBatchItem);
      setQueue((prev) => {
        for (const old of prev) {
          URL.revokeObjectURL(old.asset.objectUrl);
        }
        return newItems;
      });
      setActiveItemId(newItems[0].id);
      setActivePresetId(LINE_PRESETS[0].id);
      setPreviewCopy(SAMPLE_ASSETS[0].defaultCopy);
      setFraming((prev) => ({
        ...prev,
        fitMode: 'crop',
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
      }));
      setActiveView('converter');
      showToast('Loaded 3 sample WebP images — tap ZIP (3) when ready');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to prepare sample batch.';
      setErrorMessage(message);
    } finally {
      setIsLoadingSampleId(null);
    }
  }, [showToast]);

  const handleRemoveBatchItem = useCallback(
    (itemId: string) => {
      setQueue((prev) => {
        const target = prev.find((i) => i.id === itemId);
        if (target) {
          URL.revokeObjectURL(target.asset.objectUrl);
        }
        const next = prev.filter((i) => i.id !== itemId);
        if (activeItemId === itemId) {
          setActiveItemId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeItemId]
  );

  const handleClearAll = useCallback(() => {
    setQueue((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.asset.objectUrl);
      }
      return [];
    });
    setActiveItemId(null);
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setOutput(EMPTY_OUTPUT);
    setErrorMessage(null);
  }, []);

  const handleSelectLogoFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      try {
        const loaded = await loadWatermarkLogoFile(file);
        setLogoAsset((prev) => {
          releaseLogoAsset(prev);
          return loaded;
        });
        setFraming((prev) => ({
          ...prev,
          logoWatermark: {
            ...prev.logoWatermark,
            enabled: true,
            gifMotion: loaded.isAnimatedGif
              ? 'gif-frames'
              : prev.logoWatermark.gifMotion === 'gif-frames'
              ? 'pulse'
              : prev.logoWatermark.gifMotion,
          },
        }));
        showToast(
          loaded.isAnimatedGif
            ? `Loaded ${loaded.gifFrames?.length ?? 0}-frame animated GIF watermark`
            : `Loaded watermark logo: ${loaded.fileName}`
        );
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to load watermark logo image.'
        );
      }
    },
    [showToast]
  );

  const handleClearLogo = useCallback(() => {
    setLogoAsset((prev) => {
      releaseLogoAsset(prev);
      return null;
    });
    setFraming((prev) => ({
      ...prev,
      logoWatermark: {
        ...prev.logoWatermark,
        enabled: false,
      },
    }));
  }, []);

  const handleUseMascotLogo = useCallback(async () => {
    setErrorMessage(null);
    try {
      const response = await fetch('/icon.svg');
      if (!response.ok) {
        throw new Error('Could not load mascot logo asset.');
      }
      const svgText = await response.text();
      const mascotFile = new File([svgText], 'cowboy-roach-logo.svg', {
        type: 'image/svg+xml',
      });
      const loaded = await loadWatermarkLogoFile(mascotFile);
      setLogoAsset((prev) => {
        releaseLogoAsset(prev);
        return loaded;
      });
      setFraming((prev) => ({
        ...prev,
        logoWatermark: {
          ...prev.logoWatermark,
          enabled: true,
          gifMotion:
            prev.logoWatermark.gifMotion === 'gif-frames'
              ? 'pulse'
              : prev.logoWatermark.gifMotion,
        },
      }));
      showToast('Cowboy Roach watermark logo ready');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load mascot watermark.'
      );
    }
  }, [showToast]);

  const handleExportLogoGif = useCallback(async () => {
    if (!logoAsset || isExportingLogoGif) return;
    setErrorMessage(null);
    setIsExportingLogoGif(true);
    try {
      const res = await encodeStandaloneLogoGif(logoAsset, framing.logoWatermark);
      const filename = buildStandaloneLogoGifFilename(logoAsset.fileName);
      const url = URL.createObjectURL(res.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast(
        `Saved ${filename} (${res.frameCount} frames · ${formatBytes(res.blob.size)})`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to convert logo into GIF.'
      );
    } finally {
      setIsExportingLogoGif(false);
    }
  }, [logoAsset, isExportingLogoGif, framing.logoWatermark, showToast]);

  const handleUpdateFraming = useCallback(
    (patch: Partial<FramingState>) => {
      const { offsetX, offsetY, zoom, ...sharedPatch } = patch;
      if (Object.keys(sharedPatch).length > 0) {
        setFraming((prev) => ({ ...prev, ...sharedPatch }));
        if (sharedPatch.autoCropEnabled !== undefined) {
          const nextAutoCrop = sharedPatch.autoCropEnabled;
          setQueue((prev) => recenterQueueToPreset(prev, activePreset, nextAutoCrop));
        }
      }
      if (
        (offsetX !== undefined || offsetY !== undefined || zoom !== undefined) &&
        activeItem
      ) {
        const targetId = activeItem.id;
        setQueue((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  offsetX: offsetX ?? item.offsetX,
                  offsetY: offsetY ?? item.offsetY,
                  zoom: zoom ?? item.zoom,
                }
              : item
          )
        );
      }
    },
    [activeItem, activePreset]
  );

  const handleResetFraming = useCallback(() => {
    setFraming((prev) => ({
      ...prev,
      padInset: 4,
      blurRadius: 24,
      autoCropEnabled: true,
    }));
    if (activeItem) {
      const targetId = activeItem.id;
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== targetId) return item;
          if (!item.asset.autoCrop) {
            return { ...item, offsetX: 0, offsetY: 0, zoom: 1 };
          }
          const { effectiveWidth, effectiveHeight } = getEffectiveSourceRect(item.asset, {
            autoCropEnabled: true,
          });
          const { offsetX, offsetY } = computeCenteredOffsetsForPreset(
            effectiveWidth,
            effectiveHeight,
            activePreset.width,
            activePreset.height,
            item.asset.autoCrop.subjectCenter,
            1,
            item.asset.autoCrop.targetAnchor
          );
          return { ...item, offsetX, offsetY, zoom: 1 };
        })
      );
    }
  }, [activeItem, activePreset.width, activePreset.height]);

  const handleReCenterSubject = useCallback(() => {
    if (!activeItem) return;
    const { effectiveWidth, effectiveHeight } = getEffectiveSourceRect(
      activeItem.asset,
      { autoCropEnabled: framing.autoCropEnabled }
    );
    const center = activeItem.asset.autoCrop?.subjectCenter ?? { x: 0.5, y: 0.5 };
    const targetAnchor = activeItem.asset.autoCrop?.targetAnchor ?? { x: 0.5, y: 0.5 };
    const { offsetX, offsetY } = computeCenteredOffsetsForPreset(
      effectiveWidth,
      effectiveHeight,
      activePreset.width,
      activePreset.height,
      center,
      1,
      targetAnchor
    );
    setQueue((prev) =>
      prev.map((item) =>
        item.id === activeItem.id ? { ...item, offsetX, offsetY, zoom: 1 } : item
      )
    );
  }, [activeItem, activePreset.width, activePreset.height, framing.autoCropEnabled]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      const nextRaw = LINE_PRESETS.find((p) => p.id === presetId) ?? LINE_PRESETS[0];
      const nextResolved = resolveActivePreset(nextRaw, framing);
      setQueue((prev) =>
        recenterQueueToPreset(prev, nextResolved, framing.autoCropEnabled)
      );
    },
    [framing]
  );

  const handleSelectPlatform = useCallback(
    (platform: PlatformId) => {
      const category = PLATFORM_CATEGORIES.find((c) => c.id === platform);
      if (!category) return;
      setActivePresetId(category.defaultPresetId);
      const nextRaw =
        LINE_PRESETS.find((p) => p.id === category.defaultPresetId) ?? LINE_PRESETS[0];
      const nextResolved = resolveActivePreset(nextRaw, framing);
      setQueue((prev) =>
        recenterQueueToPreset(prev, nextResolved, framing.autoCropEnabled)
      );
    },
    [framing]
  );

  const handleApplyPresetFromGuide = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      const nextRaw = LINE_PRESETS.find((p) => p.id === presetId) ?? LINE_PRESETS[0];
      const nextResolved = resolveActivePreset(nextRaw, framing);
      setQueue((prev) =>
        recenterQueueToPreset(prev, nextResolved, framing.autoCropEnabled)
      );
      setActiveView('converter');
    },
    [framing]
  );

  const handleApplyAutoFit = useCallback(() => {
    if (!autoFitMatch) return;
    const nextResolved = resolveActivePreset(autoFitMatch.preset, framing);
    setActivePresetId(autoFitMatch.preset.id);
    setQueue((prev) =>
      recenterQueueToPreset(prev, nextResolved, framing.autoCropEnabled)
    );
    setActiveView('converter');
    showToast(
      `Auto-Fit applied: ${autoFitMatch.platformLabel} ${autoFitMatch.preset.shortName} (${autoFitMatch.preset.ratioLabel})`
    );
  }, [autoFitMatch, framing, showToast]);

  const handleSelectMobileTab = useCallback(
    (tab: MobileTab) => {
      if (mobileTab === tab) {
        setIsMobilePanelOpen((prev) => !prev);
      } else {
        setMobileTab(tab);
        setIsMobilePanelOpen(true);
      }
    },
    [mobileTab]
  );

  // Live debounced exact-byte encoder for the currently active image
  useEffect(() => {
    if (!activeSource) {
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      setOutput(EMPTY_OUTPUT);
      return;
    }

    const token = ++encodeTokenRef.current;
    setOutput((prev) => ({ ...prev, encoding: true }));

    const timer = window.setTimeout(async () => {
      try {
        const result = await encodeImageOutput(
          activeSource,
          activePreset,
          effectiveFraming,
          logoAsset
        );
        if (token !== encodeTokenRef.current) return;

        const nextUrl = URL.createObjectURL(result.blob);
        if (outputUrlRef.current) {
          URL.revokeObjectURL(outputUrlRef.current);
        }
        outputUrlRef.current = nextUrl;

        setOutput({
          blob: result.blob,
          objectUrl: nextUrl,
          bytes: result.blob.size,
          width: result.width,
          height: result.height,
          format: result.format,
          mimeType: result.mimeType,
          encoding: false,
          encodeTimeMs: result.encodeTimeMs,
          optimizedQuality: result.optimizedQuality,
          matteApplied: result.matteApplied,
          alphaPreserved: result.alphaPreserved,
        });
      } catch (err) {
        if (token !== encodeTokenRef.current) return;
        setOutput((prev) => ({ ...prev, encoding: false }));
        setErrorMessage(
          err instanceof Error ? err.message : 'Image conversion failed.'
        );
      }
    }, 95);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeSource, activePreset, effectiveFraming, logoAsset]);

  const handleDownloadSingle = useCallback(() => {
    if (!activeSource || !output.blob) return;
    const filename = buildOutputFilename(
      activeSource.fileName,
      activePreset,
      framing.outputFormat
    );
    const url = output.objectUrl ?? URL.createObjectURL(output.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Saved ${filename} (${formatBytes(output.bytes)})`);
  }, [activeSource, output, activePreset, framing.outputFormat, showToast]);

  const handleDownloadZip = useCallback(async () => {
    if (queue.length === 0 || zipState.exporting) return;
    setErrorMessage(null);
    setZipState({ exporting: true, completed: 0, total: queue.length });

    try {
      const result = await buildBatchZipArchive(
        queue,
        activePreset,
        framing,
        (completed, total) => {
          setZipState({ exporting: true, completed, total });
        },
        batchPrefix,
        logoAsset
      );

      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.archiveName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);

      showToast(
        `Saved ${result.archiveName} · ${result.count} ${getFormatLabel(framing.outputFormat)}s (${formatBytes(result.blob.size)})`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to package images into a ZIP archive.'
      );
    } finally {
      setZipState(IDLE_ZIP_STATE);
    }
  }, [queue, activePreset, framing, zipState.exporting, batchPrefix, logoAsset, showToast]);

  const handlePrimaryDownload = useCallback(() => {
    if (queue.length > 1) {
      void handleDownloadZip();
    } else {
      handleDownloadSingle();
    }
  }, [queue.length, handleDownloadZip, handleDownloadSingle]);

  const handleShareOutput = useCallback(async () => {
    if (queue.length === 0 || isSharing) return;
    setIsSharing(true);
    try {
      let shareFile: File | null = null;

      if (queue.length > 1) {
        const result = await buildBatchZipArchive(
          queue,
          activePreset,
          framing,
          undefined,
          batchPrefix,
          logoAsset
        );
        shareFile = new File([result.blob], result.archiveName, {
          type: 'application/zip',
        });
      } else if (activeSource && output.blob) {
        const filename = buildOutputFilename(
          activeSource.fileName,
          activePreset,
          framing.outputFormat
        );
        shareFile = new File([output.blob], filename, {
          type: getFormatMime(framing.outputFormat),
        });
      }

      if (!shareFile) return;

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files: [shareFile] }))
      ) {
        await navigator.share({
          files: [shareFile],
          title: 'ပိုးဟက် အယ်ဒီတာ Export',
        });
        showToast(`Shared ${shareFile.name}`);
      } else {
        handlePrimaryDownload();
        showToast('Direct Share unavailable here — saved file instead');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      handlePrimaryDownload();
      showToast('Share sheet unavailable — saved file instead');
    } finally {
      setIsSharing(false);
    }
  }, [
    queue,
    isSharing,
    activePreset,
    framing,
    batchPrefix,
    logoAsset,
    activeSource,
    output.blob,
    handlePrimaryDownload,
    showToast,
  ]);

  const handleCopyImage = useCallback(async () => {
    if (!output.blob || !activeSource) return;
    try {
      if (navigator.clipboard && 'ClipboardItem' in window) {
        const img = new Image();
        const url = output.objectUrl!;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to copy preview'));
          img.src = url;
        });
        const c = document.createElement('canvas');
        c.width = output.width;
        c.height = output.height;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((res) =>
            c.toBlob(res, 'image/png')
          );
          if (pngBlob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob }),
            ]);
            showToast('Framed image copied to clipboard');
            return;
          }
        }
      }
      showToast('Clipboard copy is restricted here — use Download');
    } catch {
      showToast('Clipboard copy is restricted here — use Download');
    }
  }, [output, activeSource, showToast]);

  // Global clipboard paste (Ctrl/Cmd+V) & save shortcut (Ctrl/Cmd+S)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        void handleSelectFiles(pastedFiles, 'append');
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        if (
          queue.length > 0 &&
          !zipState.exporting &&
          (queue.length > 1 || (output.blob && !output.encoding))
        ) {
          e.preventDefault();
          handlePrimaryDownload();
        }
      }
    };

    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    handleSelectFiles,
    handlePrimaryDownload,
    queue.length,
    zipState.exporting,
    output.blob,
    output.encoding,
  ]);

  // Global window drag-and-drop (supports multi-file drops)
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDraggingFile(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDraggingFile(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        void handleSelectFiles(Array.from(files), 'append');
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleSelectFiles]);

  const platformShortLabel =
    PLATFORM_CATEGORIES.find((c) => c.id === activePlatform)?.shortLabel ?? 'LINE';

  const mobileTabTitles: Record<MobileTab, string> = {
    presets:
      activePlatform === 'line'
        ? 'LINE Template Ratio'
        : `${platformShortLabel} Size Presets`,
    fit: 'Framing & Fit',
    layers: 'BG, Logo & Text',
    quality: `${getFormatLabel(framing.outputFormat)} Format & Size`,
    preview:
      activePlatform === 'line'
        ? 'LINE Chat Preview'
        : `${platformShortLabel} Live Preview`,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF6EE] text-[#2B1E16]">
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        canDownload={queue.length > 1 || Boolean(activeSource && output.blob)}
        isEncoding={output.encoding}
        batchCount={queue.length}
        outputFormat={framing.outputFormat}
        zipState={zipState}
        onDownload={handlePrimaryDownload}
        muzzleRef={muzzleRef}
        shotSeq={shotSeq}
        onFireMascot={handleFireMascot}
      />

      <BouncyBulletStage
        enabled={bulletsEnabled}
        muzzleRef={muzzleRef}
        burstSignal={burstSignal}
        onAutoShot={handleMascotShot}
      />

      <OfflineIndicator />

      {errorMessage && (
        <div
          role="alert"
          className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs text-[#991B1B]"
        >
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 sm:px-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
              className="rounded p-1 text-[#991B1B] hover:bg-[#FEE2E2]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {activeView === 'converter' ? (
        <>
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:flex-row lg:pb-0">
            {/* Desktop Left Control Rail */}
            <div className="hidden lg:flex">
              <ControlRail
                activePlatform={activePlatform}
                activePreset={activePreset}
                onSelectPlatform={handleSelectPlatform}
                onSelectPreset={handleSelectPreset}
                framing={effectiveFraming}
                onUpdateFraming={handleUpdateFraming}
                onResetFraming={handleResetFraming}
                onReCenterSubject={handleReCenterSubject}
                source={activeSource}
                hasSource={Boolean(activeSource)}
                edgeColor={activeSource?.edgeColor ?? '#F3EBDD'}
                outputBytes={output.bytes}
                originalBytes={activeSource?.originalBytes ?? 0}
                optimizedQuality={output.optimizedQuality}
                isEncoding={output.encoding}
                autoFitMatch={autoFitMatch}
                onApplyAutoFit={handleApplyAutoFit}
                logoAsset={logoAsset}
                onSelectLogoFile={handleSelectLogoFile}
                onClearLogo={handleClearLogo}
                onUseMascotLogo={handleUseMascotLogo}
                onExportLogoGif={handleExportLogoGif}
                isExportingLogoGif={isExportingLogoGif}
              />
            </div>

            {/* Canvas-First Stage (shared across desktop center & mobile top) */}
            <FramingStage
              queue={queue}
              activeItemId={activeItem?.id ?? null}
              source={activeSource}
              logoAsset={logoAsset}
              preset={activePreset}
              framing={effectiveFraming}
              autoFitMatch={autoFitMatch}
              onApplyAutoFit={handleApplyAutoFit}
              onCanvasVisibilityChange={setIsStageCanvasVisible}
              output={output}
              isDraggingFile={isDraggingFile}
              isLoadingSampleId={isLoadingSampleId}
              isSharing={isSharing}
              batchPrefix={batchPrefix}
              bulletsEnabled={bulletsEnabled}
              onToggleBullets={() => setBulletsEnabled((prev) => !prev)}
              onChangeBatchPrefix={setBatchPrefix}
              onSelectFiles={handleSelectFiles}
              onSelectBatchItem={setActiveItemId}
              onRemoveBatchItem={handleRemoveBatchItem}
              onLoadSample={handleLoadSample}
              onLoadAllSamples={handleLoadAllSamples}
              onUpdateFraming={handleUpdateFraming}
              onClearAll={handleClearAll}
              onDownloadSingle={handleDownloadSingle}
              onShareOutput={handleShareOutput}
              onCopyImage={handleCopyImage}
            />

            {/* Mobile Focused Bottom-Tab Tool Panel */}
            <section
              aria-label={mobileTabTitles[mobileTab]}
              className="border-t border-[#E4D7C3] bg-[#FFFDF8] lg:hidden"
            >
              <button
                type="button"
                onClick={() => setIsMobilePanelOpen((prev) => !prev)}
                aria-expanded={isMobilePanelOpen}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-[#FAF6EE]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-display text-xs font-semibold text-[#2B1E16] truncate">
                    {mobileTabTitles[mobileTab]}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-[#6E5849] whitespace-nowrap">
                    {activePreset.ratioLabel} · {getFormatLabel(framing.outputFormat)}
                    {framing.outputFormat !== 'png' && framing.outputFormat !== 'gif'
                      ? ` Q${Math.round(framing.quality * 100)}`
                      : ''}
                  </span>
                </div>
                {isMobilePanelOpen ? (
                  <ChevronDown className="h-4 w-4 text-[#6E5849] shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[#6E5849] shrink-0" aria-hidden="true" />
                )}
              </button>

              {isMobilePanelOpen && (
                <div className="border-t border-[#E4D7C3]">
                  {mobileTab === 'preview' ? (
                    <PlatformPreview
                      preset={activePreset}
                      output={output}
                      copy={previewCopy}
                      onUpdateCopy={(patch) =>
                        setPreviewCopy((prev) => ({ ...prev, ...patch }))
                      }
                      embedded
                    />
                  ) : (
                    <ControlRail
                      activePlatform={activePlatform}
                      activePreset={activePreset}
                      onSelectPlatform={handleSelectPlatform}
                      onSelectPreset={handleSelectPreset}
                      framing={effectiveFraming}
                      onUpdateFraming={handleUpdateFraming}
                      onResetFraming={handleResetFraming}
                      onReCenterSubject={handleReCenterSubject}
                      source={activeSource}
                      hasSource={Boolean(activeSource)}
                      edgeColor={activeSource?.edgeColor ?? '#F3EBDD'}
                      outputBytes={output.bytes}
                      originalBytes={activeSource?.originalBytes ?? 0}
                      optimizedQuality={output.optimizedQuality}
                      isEncoding={output.encoding}
                      autoFitMatch={autoFitMatch}
                      onApplyAutoFit={handleApplyAutoFit}
                      logoAsset={logoAsset}
                      onSelectLogoFile={handleSelectLogoFile}
                      onClearLogo={handleClearLogo}
                      onUseMascotLogo={handleUseMascotLogo}
                      onExportLogoGif={handleExportLogoGif}
                      isExportingLogoGif={isExportingLogoGif}
                      section={mobileTab}
                      embedded
                    />
                  )}
                </div>
              )}
            </section>

            {/* Desktop Right Adaptive Platform Preview Pane */}
            <div className="hidden lg:flex">
              <PlatformPreview
                preset={activePreset}
                output={output}
                copy={previewCopy}
                onUpdateCopy={(patch) =>
                  setPreviewCopy((prev) => ({ ...prev, ...patch }))
                }
              />
            </div>
          </div>

          {activeSource && (
            <FloatingLayerPreview
              source={activeSource}
              logoAsset={logoAsset}
              preset={activePreset}
              framing={effectiveFraming}
              visible={!isStageCanvasVisible}
              onJumpToStage={() =>
                document
                  .getElementById('main-stage-canvas')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
          )}

          <MobileBottomTabs
            activeTab={mobileTab}
            isPanelOpen={isMobilePanelOpen}
            onSelectTab={handleSelectMobileTab}
          />
        </>
      ) : (
        <div className="flex-1">
          <RatioGuideView
            mode={activeView}
            activePresetId={activePreset.id}
            onApplyPreset={handleApplyPresetFromGuide}
          />
        </div>
      )}

      {/* Non-blocking Export Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-4 left-4 z-50 flex items-center justify-center gap-2 rounded-lg border border-[#E4D7C3] bg-[#2B1E16] px-4 py-2.5 text-xs font-medium text-[#FFFDF8] shadow-lg sm:left-auto sm:right-5 sm:bottom-5 sm:justify-start"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
