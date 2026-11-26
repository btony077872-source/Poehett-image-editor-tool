import {
  ArrowLeftRight,
  Crop,
  Grid3X3,
  Lock,
  RotateCcw,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { LINE_PRESETS, PLATFORM_CATEGORIES } from '../data/presets';
import {
  AspectPresetMatch,
  FitMode,
  FramingState,
  LinePreset,
  LogoWatermarkAsset,
  MatteMode,
  OutputFormat,
  PadBackdrop,
  PlatformId,
  ResolutionScale,
  SourceAsset,
} from '../types';
import {
  formatBytes,
  getFormatLabel,
  recommendOutputFormat,
  resolveMatteColor,
} from '../utils/imageEngine';
import { LayersPanel } from './LayersPanel';
import { PlatformLogo } from './PlatformLogo';

interface ControlRailProps {
  activePlatform: PlatformId;
  activePreset: LinePreset;
  onSelectPlatform: (platform: PlatformId) => void;
  onSelectPreset: (presetId: string) => void;
  framing: FramingState;
  onUpdateFraming: (patch: Partial<FramingState>) => void;
  onResetFraming: () => void;
  onReCenterSubject: () => void;
  source: SourceAsset | null;
  hasSource: boolean;
  edgeColor: string;
  outputBytes: number;
  originalBytes: number;
  optimizedQuality?: number;
  isEncoding: boolean;
  autoFitMatch: AspectPresetMatch | null;
  onApplyAutoFit: () => void;
  logoAsset: LogoWatermarkAsset | null;
  onSelectLogoFile: (file: File) => void;
  onClearLogo: () => void;
  onUseMascotLogo: () => void;
  section?: 'all' | 'presets' | 'fit' | 'layers' | 'quality';
  embedded?: boolean;
}

const OUTPUT_FORMATS: { id: OutputFormat; label: string }[] = [
  { id: 'jpeg', label: 'JPEG' },
  { id: 'png', label: 'PNG' },
  { id: 'webp', label: 'WebP' },
];

const MATTE_SWATCHES = ['#FFFFFF', '#FAF6EE', '#F3EBDD', '#E4D7C3', '#2B1E16', '#C25E00'];

const QUALITY_PRESETS: { value: number; label: string }[] = [
  { value: 70, label: 'Compact 70' },
  { value: 88, label: 'Balanced 88' },
  { value: 95, label: 'Crisp 95' },
];

const CUSTOM_QUICK_RATIOS: { label: string; w: number; h: number }[] = [
  { label: '1:1', w: 1080, h: 1080 },
  { label: '4:5', w: 1080, h: 1350 },
  { label: '16:9', w: 1920, h: 1080 },
  { label: '9:16', w: 1080, h: 1920 },
];

export function ControlRail({
  activePlatform,
  activePreset,
  onSelectPlatform,
  onSelectPreset,
  framing,
  onUpdateFraming,
  onResetFraming,
  onReCenterSubject,
  source,
  hasSource,
  edgeColor,
  outputBytes,
  originalBytes,
  optimizedQuality,
  isEncoding,
  autoFitMatch,
  onApplyAutoFit,
  logoAsset,
  onSelectLogoFile,
  onClearLogo,
  onUseMascotLogo,
  section = 'all',
  embedded = false,
}: ControlRailProps) {
  const qualityValue = Math.max(1, Math.min(100, Math.round(framing.quality * 100)));
  const zoomPercent = Math.round(framing.zoom * 100);
  const outputWidth = activePreset.width * framing.scale;
  const outputHeight = activePreset.height * framing.scale;

  const formatSupportsAlpha =
    framing.outputFormat === 'png' || framing.outputFormat === 'webp';
  const formatLabel = getFormatLabel(framing.outputFormat);
  const resolvedMatteHex = resolveMatteColor(source, framing);
  const recommendation = source ? recommendOutputFormat(source) : null;
  const hasEffectiveAlpha = Boolean(source?.hasTransparency || framing.bgRemoval.enabled);
  const needsMatte = !formatSupportsAlpha || !framing.preserveTransparency;

  const sizeDeltaPercent =
    hasSource && originalBytes > 0 && outputBytes > 0
      ? Math.round(((outputBytes - originalBytes) / originalBytes) * 100)
      : null;

  const setQualityValue = (next: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(next)));
    onUpdateFraming({ quality: clamped / 100 });
  };

  const padOptions: { id: PadBackdrop; label: string }[] = [
    { id: 'blur', label: 'Blur Fill' },
    { id: 'white', label: 'White' },
    { id: 'edge', label: 'Auto Edge' },
    { id: 'custom', label: 'Custom' },
    ...(formatSupportsAlpha
      ? [{ id: 'transparent' as PadBackdrop, label: 'Transparent' }]
      : []),
  ];

  // Filter presets for active platform, grouping cleanly in order of appearance
  const platformPresets = LINE_PRESETS.filter((p) => p.platform === activePlatform);
  const presetGroups: string[] = [];
  for (const preset of platformPresets) {
    if (!presetGroups.includes(preset.group)) {
      presetGroups.push(preset.group);
    }
  }

  const handleCustomWidthChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const nextW = Math.max(64, Math.min(4096, parsed));
    if (framing.lockCustomAspect && framing.customWidth > 0) {
      const ratio = framing.customHeight / framing.customWidth;
      const nextH = Math.max(64, Math.min(4096, Math.round(nextW * ratio)));
      onUpdateFraming({ customWidth: nextW, customHeight: nextH });
    } else {
      onUpdateFraming({ customWidth: nextW });
    }
  };

  const handleCustomHeightChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const nextH = Math.max(64, Math.min(4096, parsed));
    if (framing.lockCustomAspect && framing.customHeight > 0) {
      const ratio = framing.customWidth / framing.customHeight;
      const nextW = Math.max(64, Math.min(4096, Math.round(nextH * ratio)));
      onUpdateFraming({ customWidth: nextW, customHeight: nextH });
    } else {
      onUpdateFraming({ customHeight: nextH });
    }
  };

  const showPresets = section === 'all' || section === 'presets';
  const showFit = section === 'all' || section === 'fit';
  const showLayers = section === 'all' || section === 'layers';
  const showQuality = section === 'all' || section === 'quality';

  const idPrefix = embedded ? 'mobile-' : '';
  const wrapperClass = embedded
    ? 'w-full bg-[#FFFDF8]'
    : 'w-full shrink-0 border-b border-[#E4D7C3] bg-[#FFFDF8] lg:w-[300px] lg:border-b-0 lg:border-r';

  return (
    <aside
      className={wrapperClass}
      data-bullet-collider={!embedded ? 'true' : undefined}
    >
      <div className="divide-y divide-[#E4D7C3]">
        {/* Section 1: Platform Switcher (with Logos) & Ratio Presets */}
        {showPresets && (
          <section className={embedded ? 'p-4' : 'p-5'}>
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-[#2B1E16]">
                Platform & Ratio
              </h2>
              <span className="font-mono text-xs tabular-nums text-[#6E5849]">
                {activePreset.ratioLabel}
              </span>
            </div>

            {/* Auto-Fit Orientation-Locked Detection & Top-2 Alternatives */}
            {source && autoFitMatch && (
              <div className="mb-3 rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold tabular-nums text-[#2B1E16] truncate">
                      Input {autoFitMatch.sourceRatioLabel} ·{' '}
                      {autoFitMatch.orientation === 'portrait'
                        ? 'Portrait Lock'
                        : autoFitMatch.orientation === 'landscape'
                        ? 'Landscape Lock'
                        : 'Square'}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#6E5849]">
                      {autoFitMatch.preset.id === activePreset.id
                        ? `Matched: ${autoFitMatch.platformLabel} ${autoFitMatch.preset.shortName}`
                        : `Closest: ${autoFitMatch.platformLabel} ${autoFitMatch.preset.ratioLabel}`}
                      {source.autoCrop?.detectionMethod === 'face-api'
                        ? ' · Face headroom'
                        : source.autoCrop?.detectionMethod === 'portrait-heuristic'
                        ? ' · Portrait lock'
                        : source.autoCrop?.detectionMethod === 'focal-contrast'
                        ? ' · Focal contrast'
                        : ''}
                    </p>
                  </div>

                  {autoFitMatch.preset.id !== activePreset.id ? (
                    <button
                      type="button"
                      onClick={onApplyAutoFit}
                      aria-label={`Auto-Fit to ${autoFitMatch.platformLabel} ${autoFitMatch.preset.shortName}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#C25E00] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#A14B00] whitespace-nowrap"
                    >
                      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>Auto-Fit</span>
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] font-semibold text-[#15803D] whitespace-nowrap shrink-0">
                      Auto-Fit ✓
                    </span>
                  )}
                </div>

                {autoFitMatch.alternatives.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E4D7C3]/70">
                    <span className="text-[10px] font-medium text-[#8D7564] whitespace-nowrap">
                      Also fits:
                    </span>
                    {autoFitMatch.alternatives.map((alt) => {
                      const isCurrent = alt.preset.id === activePreset.id;
                      return (
                        <button
                          key={alt.preset.id}
                          type="button"
                          onClick={() => onSelectPreset(alt.preset.id)}
                          aria-pressed={isCurrent}
                          aria-label={`Switch to alternative ${alt.platformLabel} ${alt.preset.shortName}`}
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                            isCurrent
                              ? 'border-[#D97706] bg-[#D97706]/12 text-[#2B1E16]'
                              : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#4A3628] hover:border-[#C25E00] hover:text-[#2B1E16]'
                          }`}
                        >
                          <span>{alt.platformLabel}</span>
                          <span className="font-mono tabular-nums text-[#6E5849]">
                            {alt.preset.ratioLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Category Switcher with Brand Logos */}
            <div
              role="group"
              aria-label="Platform category"
              className="mb-4 grid grid-cols-4 gap-1.5"
            >
              {PLATFORM_CATEGORIES.map((cat) => {
                const isSelected = activePlatform === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectPlatform(cat.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                      isSelected
                        ? 'border-[#D97706] bg-[#D97706]/[0.09] text-[#2B1E16]'
                        : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                    }`}
                  >
                    <PlatformLogo platform={cat.id} className="h-4 w-4 shrink-0" />
                    <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                      {cat.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preset List or Custom Dimension Inputs */}
            {activePlatform === 'custom' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
                  <div>
                    <label
                      htmlFor={`${idPrefix}custom-width-input`}
                      className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                    >
                      Width (px)
                    </label>
                    <input
                      id={`${idPrefix}custom-width-input`}
                      type="number"
                      min={64}
                      max={4096}
                      value={framing.customWidth}
                      onChange={(e) => handleCustomWidthChange(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 font-mono text-xs font-medium tabular-nums text-[#2B1E16] focus:border-[#C25E00] focus:bg-[#FFFDF8] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFraming({
                        customWidth: framing.customHeight,
                        customHeight: framing.customWidth,
                      })
                    }
                    aria-label="Swap width and height"
                    title="Swap width and height"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] transition-colors hover:border-[#C25E00] hover:text-[#2B1E16]"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  <div>
                    <label
                      htmlFor={`${idPrefix}custom-height-input`}
                      className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                    >
                      Height (px)
                    </label>
                    <input
                      id={`${idPrefix}custom-height-input`}
                      type="number"
                      min={64}
                      max={4096}
                      value={framing.customHeight}
                      onChange={(e) => handleCustomHeightChange(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 font-mono text-xs font-medium tabular-nums text-[#2B1E16] focus:border-[#C25E00] focus:bg-[#FFFDF8] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFraming({
                        lockCustomAspect: !framing.lockCustomAspect,
                      })
                    }
                    aria-pressed={framing.lockCustomAspect}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      framing.lockCustomAspect
                        ? 'border-[#D97706] bg-[#D97706]/[0.08] text-[#2B1E16]'
                        : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:text-[#2B1E16]'
                    }`}
                  >
                    {framing.lockCustomAspect ? (
                      <Lock className="h-3.5 w-3.5 text-[#C25E00]" aria-hidden="true" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Lock Aspect</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {CUSTOM_QUICK_RATIOS.map((qr) => (
                      <button
                        key={qr.label}
                        type="button"
                        onClick={() =>
                          onUpdateFraming({
                            customWidth: qr.w,
                            customHeight: qr.h,
                          })
                        }
                        className="rounded-md border border-[#E4D7C3] bg-[#FFFDF8] px-2 py-1 font-mono text-[11px] text-[#6E5849] transition-colors hover:border-[#C25E00] hover:text-[#2B1E16]"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {presetGroups.map((group) => {
                  const items = platformPresets.filter((p) => p.group === group);
                  return (
                    <div key={group}>
                      <p className="mb-1.5 text-xs font-medium text-[#6E5849]">
                        {group}
                      </p>
                      <div className="space-y-1">
                        {items.map((preset) => {
                          const selected = preset.id === activePreset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => onSelectPreset(preset.id)}
                              aria-pressed={selected}
                              className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors duration-150 lg:min-h-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                                selected
                                  ? 'border-[#D97706] bg-[#D97706]/[0.08] text-[#2B1E16]'
                                  : 'border-transparent bg-transparent text-[#4A3628] hover:bg-[#FAF6EE] hover:text-[#2B1E16]'
                              }`}
                            >
                              <span className="truncate text-sm font-medium">
                                {preset.shortName}
                              </span>
                              <span className="font-mono text-xs tabular-nums text-[#6E5849] whitespace-nowrap shrink-0">
                                {preset.ratioLabel} · {preset.width}×{preset.height}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section 2: Framing Mode & Controls */}
        {showFit && (
          <section className={embedded ? 'p-4' : 'p-5'}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-[#2B1E16]">
                Framing & Fit
              </h2>
              {hasSource && (
                <button
                  type="button"
                  onClick={onResetFraming}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-xs font-medium text-[#6E5849] transition-colors hover:text-[#2B1E16] lg:min-h-0 lg:px-0 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Segmented Mode Control */}
            <div
              role="group"
              aria-label="Image fitting mode"
              className="grid grid-cols-2 gap-1 rounded-lg bg-[#F3EBDD] p-1"
            >
              {(
                [
                  { id: 'crop', label: 'Crop & Fill' },
                  { id: 'pad', label: 'Fit & Pad' },
                ] as { id: FitMode; label: string }[]
              ).map((mode) => {
                const active = framing.fitMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdateFraming({ fitMode: mode.id })}
                    className={`min-h-[40px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 lg:min-h-0 whitespace-nowrap ${
                      active
                        ? 'bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                        : 'text-[#6E5849] hover:text-[#2B1E16]'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {framing.fitMode === 'crop' ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <label htmlFor={`${idPrefix}zoom-slider`} className="font-medium text-[#4A3628]">
                      Zoom
                    </label>
                    <span className="font-mono tabular-nums text-[#6E5849]">
                      {zoomPercent}%
                    </span>
                  </div>
                  <input
                    id={`${idPrefix}zoom-slider`}
                    type="range"
                    min={1}
                    max={3}
                    step={0.02}
                    value={framing.zoom}
                    onChange={(e) =>
                      onUpdateFraming({ zoom: parseFloat(e.target.value) })
                    }
                    className="studio-slider w-full"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFraming({ showGrid: !framing.showGrid })
                    }
                    aria-pressed={framing.showGrid}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors lg:min-h-0 whitespace-nowrap ${
                      framing.showGrid
                        ? 'border-[#D97706] bg-[#D97706]/[0.08] text-[#2B1E16]'
                        : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                    }`}
                  >
                    <Grid3X3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Rule of Thirds</span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasSource}
                    onClick={onReCenterSubject}
                    className="min-h-[40px] rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-3 py-1.5 text-xs font-medium text-[#6E5849] transition-colors hover:border-[#C25E00] hover:text-[#2B1E16] disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-0 whitespace-nowrap"
                  >
                    {source?.autoCrop ? 'Focus Subject' : 'Center'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-[#4A3628]">
                    Padding Backdrop
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {padOptions.map((opt) => {
                      const active = framing.padBackdrop === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateFraming({ padBackdrop: opt.id })}
                          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors lg:min-h-0 whitespace-nowrap ${
                            opt.id === 'transparent' ? 'col-span-2' : ''
                          } ${
                            active
                              ? 'border-[#D97706] bg-[#D97706]/[0.08] text-[#2B1E16]'
                              : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                          }`}
                        >
                          {opt.id === 'edge' && (
                            <span
                              aria-hidden="true"
                              className="h-3 w-3 rounded-xs border border-black/15 shrink-0"
                              style={{ backgroundColor: edgeColor }}
                            />
                          )}
                          {opt.id === 'white' && (
                            <span
                              aria-hidden="true"
                              className="h-3 w-3 rounded-xs border border-[#CBB89D] bg-white shrink-0"
                            />
                          )}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {framing.padBackdrop === 'blur' && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label htmlFor={`${idPrefix}blur-slider`} className="font-medium text-[#4A3628]">
                        Blur Strength
                      </label>
                      <span className="font-mono tabular-nums text-[#6E5849]">
                        {framing.blurRadius}px
                      </span>
                    </div>
                    <input
                      id={`${idPrefix}blur-slider`}
                      type="range"
                      min={8}
                      max={48}
                      step={2}
                      value={framing.blurRadius}
                      onChange={(e) =>
                        onUpdateFraming({ blurRadius: parseInt(e.target.value, 10) })
                      }
                      className="studio-slider w-full"
                    />
                  </div>
                )}

                {framing.padBackdrop === 'custom' && (
                  <div>
                    <label
                      htmlFor={`${idPrefix}custom-pad-color`}
                      className="mb-1.5 block text-xs font-medium text-[#4A3628]"
                    >
                      Backdrop Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`${idPrefix}custom-pad-color`}
                        type="color"
                        value={framing.padColor}
                        onChange={(e) =>
                          onUpdateFraming({ padColor: e.target.value.toUpperCase() })
                        }
                        className="h-10 w-12 cursor-pointer rounded-md border border-[#E4D7C3] bg-[#FFFDF8] p-0.5 lg:h-8 lg:w-10"
                      />
                      <input
                        type="text"
                        aria-label="Custom backdrop hex color"
                        value={framing.padColor}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          if (/^#[0-9A-F]{0,6}$/.test(val)) {
                            onUpdateFraming({ padColor: val });
                          }
                        }}
                        className="h-10 flex-1 rounded-md border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 font-mono text-xs text-[#2B1E16] focus:border-[#C25E00] focus:bg-[#FFFDF8] focus:outline-none lg:h-8"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <label htmlFor={`${idPrefix}inset-slider`} className="font-medium text-[#4A3628]">
                      Frame Margin
                    </label>
                    <span className="font-mono tabular-nums text-[#6E5849]">
                      {framing.padInset}%
                    </span>
                  </div>
                  <input
                    id={`${idPrefix}inset-slider`}
                    type="range"
                    min={0}
                    max={18}
                    step={1}
                    value={framing.padInset}
                    onChange={(e) =>
                      onUpdateFraming({ padInset: parseInt(e.target.value, 10) })
                    }
                    className="studio-slider w-full"
                  />
                </div>
              </div>
            )}

            {/* Auto-Crop Margins & Subject Centering */}
            <div className="mt-3.5 border-t border-[#E4D7C3] pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <label
                    htmlFor={`${idPrefix}auto-crop-switch`}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#2B1E16]"
                  >
                    <Crop className="h-3.5 w-3.5 text-[#C25E00]" aria-hidden="true" />
                    <span>Auto-Crop Margins</span>
                  </label>
                  <p className="text-[11px] text-[#6E5849]">
                    {source?.autoCrop?.hasTrimmedMargins
                      ? framing.autoCropEnabled
                        ? `Trimmed ${source.autoCrop.trimmedPercent}% blank border · ${
                            source.autoCrop.isPortraitSubject
                              ? 'Portrait headroom locked'
                              : 'Focal point centered'
                          }`
                        : `${source.autoCrop.trimmedPercent}% border margin detected (off)`
                      : source?.autoCrop?.detectionMethod === 'face-api'
                      ? `Face detected (${source.autoCrop.faceCount}) · Headroom safe`
                      : source?.autoCrop?.detectionMethod === 'portrait-heuristic'
                      ? 'Portrait region · Upper-third headroom'
                      : source?.autoCrop?.detectionMethod === 'focal-contrast'
                      ? 'High-contrast focal point centered'
                      : 'Trim empty borders & center subject'}
                  </p>
                </div>
                <button
                  id={`${idPrefix}auto-crop-switch`}
                  type="button"
                  role="switch"
                  aria-checked={framing.autoCropEnabled}
                  onClick={() =>
                    onUpdateFraming({ autoCropEnabled: !framing.autoCropEnabled })
                  }
                  className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                    framing.autoCropEnabled ? 'bg-[#C25E00]' : 'bg-[#D6C5AD]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${
                      framing.autoCropEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Background Remover, Watermark Logo & Text Generator */}
        {showLayers && (
          <LayersPanel
            idPrefix={idPrefix}
            embedded={embedded}
            source={source}
            framing={framing}
            logoAsset={logoAsset}
            onUpdateFraming={onUpdateFraming}
            onSelectLogoFile={onSelectLogoFile}
            onClearLogo={onClearLogo}
            onUseMascotLogo={onUseMascotLogo}
          />
        )}

        {/* Section 4: Output Format, Quality & Scale */}
        {showQuality && (
          <section className={embedded ? 'p-4' : 'p-5'}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-[#2B1E16]">
                Output Format & Quality
              </h2>
              <span className="font-mono text-xs tabular-nums text-[#6E5849]">
                {outputWidth}×{outputHeight}
              </span>
            </div>

            <div className="space-y-4">
              {/* Automated Input Detection & Smart Recommendation */}
              {source && recommendation && (
                <div className="rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-semibold tabular-nums text-[#2B1E16] truncate">
                        {source.formatLabel} ·{' '}
                        {source.hasTransparency
                          ? `Alpha ${source.transparencyPercent}%`
                          : 'Opaque'}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#6E5849]">
                        {recommendation.reason}
                      </p>
                    </div>
                    {recommendation.format !== framing.outputFormat && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextFormat = recommendation.format;
                          const patch: Partial<FramingState> = {
                            outputFormat: nextFormat,
                            preserveTransparency: true,
                          };
                          if (
                            nextFormat !== 'jpeg' &&
                            hasEffectiveAlpha &&
                            framing.fitMode === 'pad'
                          ) {
                            patch.padBackdrop = 'transparent';
                          }
                          onUpdateFraming(patch);
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#D97706] bg-[#D97706]/10 px-2 py-1 text-[11px] font-semibold text-[#2B1E16] transition-colors hover:bg-[#C25E00] hover:text-white whitespace-nowrap"
                      >
                        <Sparkles className="h-3 w-3 text-[#C25E00]" aria-hidden="true" />
                        <span>Use {getFormatLabel(recommendation.format)}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Output Format Selector: JPEG / PNG / WebP */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#4A3628]">
                  Target Format
                </p>
                <div
                  role="group"
                  aria-label="Output image format"
                  className="grid grid-cols-3 gap-1 rounded-lg bg-[#F3EBDD] p-1"
                >
                  {OUTPUT_FORMATS.map((fmt) => {
                    const active = framing.outputFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          const patch: Partial<FramingState> = {
                            outputFormat: fmt.id,
                          };
                          if (
                            fmt.id === 'jpeg' &&
                            framing.padBackdrop === 'transparent'
                          ) {
                            patch.padBackdrop = 'white';
                          }
                          if (
                            fmt.id !== 'jpeg' &&
                            hasEffectiveAlpha &&
                            framing.preserveTransparency &&
                            framing.fitMode === 'pad' &&
                            framing.padBackdrop === 'white'
                          ) {
                            patch.padBackdrop = 'transparent';
                          }
                          onUpdateFraming(patch);
                        }}
                        className={`min-h-[38px] rounded-md px-2 py-1.5 text-xs font-semibold transition-colors lg:min-h-0 whitespace-nowrap ${
                          active
                            ? 'bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                            : 'text-[#6E5849] hover:text-[#2B1E16]'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compression Slider (JPEG & WebP) vs Lossless Info (PNG) */}
              {framing.outputFormat === 'png' ? (
                <div className="rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-3 py-2.5 text-xs text-[#6E5849]">
                  Lossless PNG export — full pixel clarity with zero compression artifacts.
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <label htmlFor={`${idPrefix}quality-slider`} className="font-medium text-[#4A3628]">
                      {formatLabel} Compression Quality
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id={`${idPrefix}quality-number`}
                        type="number"
                        aria-label={`${formatLabel} quality value from 1 to 100`}
                        min={1}
                        max={100}
                        step={1}
                        value={qualityValue}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          if (!Number.isNaN(parsed)) {
                            setQualityValue(parsed);
                          }
                        }}
                        className="h-8 w-13 rounded-md border border-[#E4D7C3] bg-[#FAF6EE] px-1.5 py-0.5 text-right font-mono text-xs font-medium tabular-nums text-[#2B1E16] focus:border-[#C25E00] focus:bg-[#FFFDF8] focus:outline-none lg:h-auto lg:w-12"
                      />
                      <span className="font-mono text-[11px] text-[#6E5849]">/ 100</span>
                    </div>
                  </div>
                  <input
                    id={`${idPrefix}quality-slider`}
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={qualityValue}
                    onChange={(e) => setQualityValue(parseInt(e.target.value, 10))}
                    className="studio-slider w-full"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-[#8D7564]">
                    <span>1 · Smallest</span>
                    <span>50</span>
                    <span>100 · Best</span>
                  </div>

                  {/* Quick Quality Presets */}
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    {QUALITY_PRESETS.map((qp) => {
                      const active = qualityValue === qp.value;
                      return (
                        <button
                          key={qp.value}
                          type="button"
                          onClick={() => setQualityValue(qp.value)}
                          className={`min-h-[38px] rounded-md border px-2 py-1 text-[11px] font-medium transition-colors lg:min-h-0 whitespace-nowrap ${
                            active
                              ? 'border-[#D97706] bg-[#D97706]/[0.08] text-[#2B1E16]'
                              : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                          }`}
                        >
                          {qp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transparency Toggle for PNG & WebP */}
              {formatSupportsAlpha && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#4A3628]">
                        Preserve Transparency
                      </p>
                      <p className="text-[11px] text-[#6E5849]">
                        Keep alpha channel on PNG / WebP export
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={framing.preserveTransparency}
                      onClick={() => {
                        const nextPreserve = !framing.preserveTransparency;
                        const patch: Partial<FramingState> = {
                          preserveTransparency: nextPreserve,
                        };
                        if (
                          nextPreserve &&
                          hasEffectiveAlpha &&
                          framing.fitMode === 'pad' &&
                          framing.padBackdrop === 'white'
                        ) {
                          patch.padBackdrop = 'transparent';
                        }
                        onUpdateFraming(patch);
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                        framing.preserveTransparency ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
                      }`}
                    >
                      <span className="sr-only">Toggle alpha transparency preservation</span>
                      <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
                          framing.preserveTransparency
                            ? 'translate-x-6 lg:translate-x-5.5'
                            : 'translate-x-1 lg:translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {framing.preserveTransparency && hasEffectiveAlpha && (
                    <p className="text-[11px] font-medium text-[#15803D]">
                      {framing.bgRemoval.enabled
                        ? `Removed background alpha preserved in ${formatLabel}.`
                        : `Transparent alpha channel (${source?.transparencyPercent ?? 0}%) preserved in ${formatLabel}.`}
                    </p>
                  )}
                </div>
              )}

              {/* User-Selectable Background Matte Color (JPEG or flattened exports) */}
              {needsMatte && (
                <div className="rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#2B1E16]">
                      {framing.outputFormat === 'jpeg'
                        ? 'JPEG Background Matte'
                        : 'Opaque Background Matte'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[#6E5849]">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 rounded-xs border border-black/15 shrink-0"
                        style={{ backgroundColor: resolvedMatteHex }}
                      />
                      {resolvedMatteHex}
                    </span>
                  </div>

                  {hasEffectiveAlpha ? (
                    <p className="mb-2.5 text-[11px] leading-snug text-[#6E5849]">
                      {framing.bgRemoval.enabled
                        ? 'Background-removed transparent areas filled with this matte color.'
                        : `Transparent areas (${source?.transparencyPercent ?? 0}%) automatically filled with this matte color.`}
                    </p>
                  ) : (
                    <p className="mb-2.5 text-[11px] leading-snug text-[#6E5849]">
                      Auto-applied behind any transparent PNG, WebP, or SVG converted to {formatLabel}.
                    </p>
                  )}

                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'white', label: 'White', color: '#FFFFFF' },
                        { id: 'edge', label: 'Edge', color: edgeColor },
                        { id: 'black', label: 'Dark', color: '#0F172A' },
                        { id: 'custom', label: 'Custom', color: framing.matteColor },
                      ] as { id: MatteMode; label: string; color: string }[]
                    ).map((m) => {
                      const active = framing.matteMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onUpdateFraming({ matteMode: m.id })}
                          className={`flex min-h-[34px] items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium transition-colors lg:min-h-0 whitespace-nowrap ${
                            active
                              ? 'border-[#D97706] bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                              : 'border-[#E4D7C3] bg-[#FFFDF8]/75 text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-xs border border-black/15 shrink-0"
                            style={{ backgroundColor: m.color }}
                          />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {framing.matteMode === 'custom' && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          id={`${idPrefix}matte-color-picker`}
                          type="color"
                          aria-label="Select custom matte background color"
                          value={framing.matteColor}
                          onChange={(e) =>
                            onUpdateFraming({
                              matteColor: e.target.value.toUpperCase(),
                            })
                          }
                          className="h-9 w-11 cursor-pointer rounded-md border border-[#E4D7C3] bg-[#FFFDF8] p-0.5 lg:h-8 lg:w-10"
                        />
                        <input
                          type="text"
                          aria-label="Custom matte hex color"
                          value={framing.matteColor}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            if (/^#[0-9A-F]{0,6}$/.test(val)) {
                              onUpdateFraming({ matteColor: val });
                            }
                          }}
                          className="h-9 flex-1 rounded-md border border-[#E4D7C3] bg-[#FFFDF8] px-2.5 font-mono text-xs text-[#2B1E16] focus:border-[#C25E00] focus:outline-none lg:h-8"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        {MATTE_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => onUpdateFraming({ matteColor: hex })}
                            aria-label={`Set matte color ${hex}`}
                            className={`h-6 flex-1 rounded border transition-transform hover:scale-105 ${
                              framing.matteColor.toUpperCase() === hex
                                ? 'border-[#C25E00] ring-1 ring-[#C25E00]'
                                : 'border-[#CBB89D]'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Automated Optimization Toggles */}
              <div className="space-y-3 border-t border-[#E4D7C3] pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#4A3628]">
                      Auto-Optimize Size Cap
                    </p>
                    <p className="text-[11px] text-[#6E5849]">
                      Clamp exports ≤ {activePreset.maxSizeMb} MB automatically
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={framing.autoOptimize}
                    onClick={() =>
                      onUpdateFraming({ autoOptimize: !framing.autoOptimize })
                    }
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                      framing.autoOptimize ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
                    }`}
                  >
                    <span className="sr-only">Toggle automatic file size cap optimization</span>
                    <span
                      aria-hidden="true"
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
                        framing.autoOptimize
                          ? 'translate-x-6 lg:translate-x-5.5'
                          : 'translate-x-1 lg:translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#4A3628]">
                      Auto-Pick Format on Upload
                    </p>
                    <p className="text-[11px] text-[#6E5849]">
                      PNG/WebP for transparent · JPEG for photos
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={framing.autoDetectFormat}
                    onClick={() =>
                      onUpdateFraming({
                        autoDetectFormat: !framing.autoDetectFormat,
                      })
                    }
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                      framing.autoDetectFormat ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
                    }`}
                  >
                    <span className="sr-only">Toggle automatic output format selection on upload</span>
                    <span
                      aria-hidden="true"
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
                        framing.autoDetectFormat
                          ? 'translate-x-6 lg:translate-x-5.5'
                          : 'translate-x-1 lg:translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Live File Size Readout */}
              <div className="flex items-center justify-between gap-2 text-xs text-[#6E5849]">
                <span>Est. {formatLabel} size</span>
                <span className="font-mono tabular-nums text-[#2B1E16]">
                  {!hasSource
                    ? '—'
                    : isEncoding
                    ? 'Calculating…'
                    : `${formatBytes(outputBytes)}${
                        sizeDeltaPercent !== null
                          ? ` (${sizeDeltaPercent > 0 ? `+${sizeDeltaPercent}` : sizeDeltaPercent}%)`
                          : ''
                      }`}
                </span>
              </div>

              {optimizedQuality !== undefined && (
                <p className="text-[11px] font-medium text-[#15803D]">
                  Auto-tuned quality to Q{optimizedQuality} to fit within {activePreset.maxSizeMb} MB limit.
                </p>
              )}

              {framing.outputFormat !== 'png' && qualityValue < 40 && (
                <p className="text-[11px] leading-snug text-[#D97706]">
                  Heavy compression below 40 may soften product details.
                </p>
              )}

              <div>
                <p className="mb-1.5 text-xs font-medium text-[#4A3628]">
                  Export Resolution
                </p>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F3EBDD] p-1">
                  {(
                    [
                      { scale: 1, label: '1× Standard' },
                      { scale: 2, label: '2× High-DPI' },
                    ] as { scale: ResolutionScale; label: string }[]
                  ).map((item) => {
                    const active = framing.scale === item.scale;
                    return (
                      <button
                        key={item.scale}
                        type="button"
                        onClick={() => onUpdateFraming({ scale: item.scale })}
                        className={`min-h-[40px] rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors lg:min-h-0 whitespace-nowrap ${
                          active
                            ? 'bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                            : 'text-[#6E5849] hover:text-[#2B1E16]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#4A3628]">
                    Crisp Product Details
                  </p>
                  <p className="text-[11px] text-[#6E5849]">
                    Subtle edge sharpen after resize
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={framing.sharpen}
                  onClick={() => onUpdateFraming({ sharpen: !framing.sharpen })}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                    framing.sharpen ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
                  }`}
                >
                  <span className="sr-only">Toggle crisp product detail sharpening</span>
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
                      framing.sharpen
                        ? 'translate-x-6 lg:translate-x-5.5'
                        : 'translate-x-1 lg:translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
