import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ImagePlus, Stamp, Trash2, Type } from 'lucide-react';
import {
  BgRemovalConfig,
  FramingState,
  LogoWatermarkAsset,
  LogoWatermarkState,
  SourceAsset,
  TextFontStyle,
  TextWatermarkState,
} from '../types';
import { BgRemoverControls } from './BgRemoverControls';
import { WatermarkAnchorPicker } from './WatermarkAnchorPicker';

interface LayersPanelProps {
  idPrefix: string;
  embedded?: boolean;
  source: SourceAsset | null;
  framing: FramingState;
  logoAsset: LogoWatermarkAsset | null;
  onUpdateFraming: (patch: Partial<FramingState>) => void;
  onSelectLogoFile: (file: File) => void;
  onClearLogo: () => void;
  onUseMascotLogo: () => void;
}

const TEXT_SWATCHES = ['#FFFFFF', '#2B1E16', '#F59E0B', '#EF4444', '#10B981', '#0F172A'];

const FONT_OPTIONS: { id: TextFontStyle; label: string }[] = [
  { id: 'display', label: 'Display' },
  { id: 'sans', label: 'Sans' },
  { id: 'mono', label: 'Mono' },
  { id: 'serif', label: 'Serif' },
];

const TEXT_STYLE_PRESETS: {
  label: string;
  patch: Partial<TextWatermarkState>;
}[] = [
  {
    label: 'Corner Tag',
    patch: {
      fontStyle: 'display',
      bold: true,
      italic: false,
      sizePercent: 5,
      color: '#FFFFFF',
      opacity: 0.92,
      position: 'bottom-left',
      rotation: 0,
      strokeEnabled: true,
      strokeColor: '#2B1E16',
      shadowEnabled: true,
      badgeEnabled: false,
    },
  },
  {
    label: 'Pill Badge',
    patch: {
      fontStyle: 'sans',
      bold: true,
      italic: false,
      sizePercent: 4.5,
      color: '#FFFFFF',
      opacity: 0.96,
      position: 'bottom-left',
      rotation: 0,
      strokeEnabled: false,
      shadowEnabled: false,
      badgeEnabled: true,
      badgeColor: '#2B1E16',
      badgeOpacity: 0.78,
    },
  },
  {
    label: 'Diagonal Stamp',
    patch: {
      fontStyle: 'display',
      bold: true,
      italic: false,
      sizePercent: 6,
      color: '#FFFFFF',
      opacity: 0.35,
      position: 'tile',
      rotation: -24,
      strokeEnabled: false,
      shadowEnabled: true,
      badgeEnabled: false,
    },
  },
  {
    label: 'Amber Promo',
    patch: {
      fontStyle: 'display',
      bold: true,
      italic: false,
      sizePercent: 5.5,
      color: '#FFFDF8',
      opacity: 1,
      position: 'top-left',
      rotation: 0,
      strokeEnabled: false,
      shadowEnabled: false,
      badgeEnabled: true,
      badgeColor: '#C25E00',
      badgeOpacity: 0.92,
    },
  },
];

export function LayersPanel({
  idPrefix,
  embedded = false,
  source,
  framing,
  logoAsset,
  onUpdateFraming,
  onSelectLogoFile,
  onClearLogo,
  onUseMascotLogo,
}: LayersPanelProps) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // On desktop (embedded=false), expand sections automatically when active or toggled;
  // on mobile dedicated Layers tab (embedded=true), keep sections open for fast thumb access.
  const [openBg, setOpenBg] = useState(embedded);
  const [openLogo, setOpenLogo] = useState(embedded);
  const [openText, setOpenText] = useState(embedded);

  const updateBgRemoval = (patch: Partial<BgRemovalConfig>) => {
    const next = { ...framing.bgRemoval, ...patch };
    const framingPatch: Partial<FramingState> = { bgRemoval: next };
    if (
      patch.enabled === true &&
      framing.outputFormat !== 'jpeg' &&
      framing.fitMode === 'pad' &&
      framing.padBackdrop === 'white'
    ) {
      framingPatch.padBackdrop = 'transparent';
    }
    onUpdateFraming(framingPatch);
  };

  const updateLogo = (patch: Partial<LogoWatermarkState>) => {
    onUpdateFraming({
      logoWatermark: { ...framing.logoWatermark, ...patch },
    });
  };

  const updateLogoBgRemoval = (patch: Partial<BgRemovalConfig>) => {
    onUpdateFraming({
      logoWatermark: {
        ...framing.logoWatermark,
        bgRemoval: { ...framing.logoWatermark.bgRemoval, ...patch },
      },
    });
  };

  const updateText = (patch: Partial<TextWatermarkState>) => {
    onUpdateFraming({
      textWatermark: { ...framing.textWatermark, ...patch },
    });
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectLogoFile(file);
      setOpenLogo(true);
    }
    e.target.value = '';
  };

  const padClass = embedded ? 'p-4' : 'p-5';

  return (
    <div className="divide-y divide-[#E4D7C3]">
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*,.webp,.png,.jpg,.jpeg,.svg,.gif,.avif,.bmp,.ico"
        onChange={handleLogoFileChange}
        className="hidden"
      />

      {/* A. Input Media Background Remover */}
      <section className={padClass}>
        <button
          type="button"
          onClick={() => setOpenBg((prev) => !prev)}
          aria-expanded={openBg}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-[#2B1E16]">
              Background Remover
            </h2>
            <p className="text-[11px] text-[#6E5849]">
              {framing.bgRemoval.enabled
                ? `Active · ${framing.bgRemoval.mode}`
                : 'Strip background from input media'}
            </p>
          </div>
          {openBg ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#6E5849]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6E5849]" aria-hidden="true" />
          )}
        </button>

        {(openBg || framing.bgRemoval.enabled) && (
          <div className="mt-3">
            <BgRemoverControls
              idPrefix={`${idPrefix}main-`}
              title="Remove Input Background"
              description="Multi-style cutout for logos, products & layers"
              config={framing.bgRemoval}
              edgeColor={source?.edgeColor ?? '#FFFFFF'}
              disabled={!source}
              onChange={updateBgRemoval}
            />
            {framing.bgRemoval.enabled && framing.outputFormat === 'jpeg' && (
              <p className="mt-2 text-[11px] text-[#6E5849]">
                JPEG composites the cutout onto your selected JPEG Matte color. Switch Target Format to PNG or WebP for transparent export.
              </p>
            )}
          </div>
        )}
      </section>

      {/* B. Watermark Logo (+ Optional Logo Background Remover) */}
      <section className={padClass}>
        <button
          type="button"
          onClick={() => setOpenLogo((prev) => !prev)}
          aria-expanded={openLogo}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-[#2B1E16]">
              <Stamp className="h-3.5 w-3.5 shrink-0 text-[#C25E00]" aria-hidden="true" />
              <span>Watermark Logo</span>
            </h2>
            <p className="truncate text-[11px] text-[#6E5849]">
              {logoAsset
                ? framing.logoWatermark.enabled
                  ? `${logoAsset.fileName} · ${Math.round(framing.logoWatermark.opacity * 100)}%`
                  : `${logoAsset.fileName} · Hidden`
                : 'Overlay a brand logo with optional BG removal'}
            </p>
          </div>
          {openLogo ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#6E5849]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6E5849]" aria-hidden="true" />
          )}
        </button>

        {(openLogo || (logoAsset && framing.logoWatermark.enabled)) && (
          <div className="mt-3 space-y-3">
            {!logoAsset ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBB89D] bg-[#FAF6EE] px-3 py-2.5 text-xs font-semibold text-[#2B1E16] transition-colors hover:border-[#C25E00] hover:bg-[#D97706]/[0.06]"
                >
                  <ImagePlus className="h-4 w-4 text-[#C25E00]" aria-hidden="true" />
                  <span>Upload Watermark Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUseMascotLogo();
                    setOpenLogo(true);
                  }}
                  className="w-full rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-medium text-[#6E5849] transition-colors hover:border-[#D97706] hover:text-[#2B1E16]"
                >
                  Or try with Cowboy Roach Mascot
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Logo Asset Row */}
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#E4D7C3]"
                      style={{
                        backgroundColor: '#FFFDF8',
                        backgroundImage:
                          'linear-gradient(45deg, #E4D7C3 25%, transparent 25%), linear-gradient(-45deg, #E4D7C3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E4D7C3 75%), linear-gradient(-45deg, transparent 75%, #E4D7C3 75%)',
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                      }}
                    >
                      <img
                        src={logoAsset.objectUrl}
                        alt={logoAsset.fileName}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#2B1E16]">
                        {logoAsset.fileName}
                      </p>
                      <p className="font-mono text-[10px] tabular-nums text-[#6E5849]">
                        {logoAsset.naturalWidth}×{logoAsset.naturalHeight}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="rounded-md border border-[#E4D7C3] bg-[#FFFDF8] px-2 py-1 text-[11px] font-medium text-[#4A3628] hover:border-[#C25E00]"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={onClearLogo}
                      aria-label="Remove watermark logo"
                      className="rounded-md border border-[#E4D7C3] bg-[#FFFDF8] p-1 text-[#6E5849] hover:border-[#FCA5A5] hover:text-[#DC2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Enable / Disable Logo Watermark */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#4A3628]">Show Logo on Image</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={framing.logoWatermark.enabled}
                    aria-label="Toggle watermark logo visibility"
                    onClick={() => updateLogo({ enabled: !framing.logoWatermark.enabled })}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
                      framing.logoWatermark.enabled ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
                        framing.logoWatermark.enabled
                          ? 'translate-x-6 lg:translate-x-5.5'
                          : 'translate-x-1 lg:translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {framing.logoWatermark.enabled && (
                  <>
                    {/* User Choice: Remove Background from Uploaded Logo or Keep As-Is */}
                    <div className="border-t border-[#E4D7C3] pt-3">
                      <BgRemoverControls
                        idPrefix={`${idPrefix}logo-`}
                        title="Remove Logo Background"
                        description="Strip white, dark, gradient, or colored box behind logo"
                        config={framing.logoWatermark.bgRemoval}
                        edgeColor={logoAsset.edgeColor}
                        onChange={updateLogoBgRemoval}
                      />
                    </div>

                    <WatermarkAnchorPicker
                      label="Logo Position"
                      value={framing.logoWatermark.position}
                      onChange={(position) => updateLogo({ position })}
                    />

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <label htmlFor={`${idPrefix}logo-size`} className="font-medium text-[#4A3628]">
                            Size
                          </label>
                          <span className="font-mono tabular-nums text-[#6E5849]">
                            {framing.logoWatermark.sizePercent}%
                          </span>
                        </div>
                        <input
                          id={`${idPrefix}logo-size`}
                          type="range"
                          min={6}
                          max={65}
                          step={1}
                          value={framing.logoWatermark.sizePercent}
                          onChange={(e) =>
                            updateLogo({ sizePercent: parseInt(e.target.value, 10) })
                          }
                          className="studio-slider w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <label htmlFor={`${idPrefix}logo-opacity`} className="font-medium text-[#4A3628]">
                            Opacity
                          </label>
                          <span className="font-mono tabular-nums text-[#6E5849]">
                            {Math.round(framing.logoWatermark.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          id={`${idPrefix}logo-opacity`}
                          type="range"
                          min={10}
                          max={100}
                          step={2}
                          value={Math.round(framing.logoWatermark.opacity * 100)}
                          onChange={(e) =>
                            updateLogo({ opacity: parseInt(e.target.value, 10) / 100 })
                          }
                          className="studio-slider w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <label htmlFor={`${idPrefix}logo-margin`} className="font-medium text-[#4A3628]">
                            Margin
                          </label>
                          <span className="font-mono tabular-nums text-[#6E5849]">
                            {framing.logoWatermark.marginPercent}%
                          </span>
                        </div>
                        <input
                          id={`${idPrefix}logo-margin`}
                          type="range"
                          min={0}
                          max={15}
                          step={1}
                          value={framing.logoWatermark.marginPercent}
                          onChange={(e) =>
                            updateLogo({ marginPercent: parseInt(e.target.value, 10) })
                          }
                          className="studio-slider w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <label htmlFor={`${idPrefix}logo-rotate`} className="font-medium text-[#4A3628]">
                            Rotate
                          </label>
                          <span className="font-mono tabular-nums text-[#6E5849]">
                            {framing.logoWatermark.rotation}°
                          </span>
                        </div>
                        <input
                          id={`${idPrefix}logo-rotate`}
                          type="range"
                          min={-45}
                          max={45}
                          step={1}
                          value={framing.logoWatermark.rotation}
                          onChange={(e) =>
                            updateLogo({ rotation: parseInt(e.target.value, 10) })
                          }
                          className="studio-slider w-full"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* C. Text Generator for Input Media */}
      <section className={padClass}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpenText((prev) => !prev)}
            aria-expanded={openText}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          >
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-[#2B1E16]">
                <Type className="h-3.5 w-3.5 shrink-0 text-[#C25E00]" aria-hidden="true" />
                <span>Text Generator</span>
              </h2>
              <p className="truncate text-[11px] text-[#6E5849]">
                {framing.textWatermark.enabled
                  ? framing.textWatermark.text.trim() || 'Active'
                  : 'Add custom text, handle, or stamp'}
              </p>
            </div>
            {openText ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-[#6E5849]" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-[#6E5849]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={framing.textWatermark.enabled}
            aria-label="Toggle text generator overlay"
            onClick={() => {
              const next = !framing.textWatermark.enabled;
              updateText({ enabled: next });
              if (next) setOpenText(true);
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
              framing.textWatermark.enabled ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
                framing.textWatermark.enabled
                  ? 'translate-x-6 lg:translate-x-5.5'
                  : 'translate-x-1 lg:translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {(openText || framing.textWatermark.enabled) && (
          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor={`${idPrefix}text-generator-input`}
                className="mb-1 block text-[11px] font-medium text-[#4A3628]"
              >
                Watermark / Caption Text
              </label>
              <textarea
                id={`${idPrefix}text-generator-input`}
                rows={2}
                value={framing.textWatermark.text}
                onChange={(e) =>
                  updateText({
                    text: e.target.value,
                    enabled: e.target.value.length > 0 ? true : framing.textWatermark.enabled,
                  })
                }
                placeholder="Type brand handle, © copyright, or promo…"
                className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] placeholder:text-[#8D7564] focus:border-[#C25E00] focus:bg-[#FFFDF8] focus:outline-none"
              />
            </div>

            {/* Quick Style Presets */}
            <div>
              <p className="mb-1 text-[11px] font-medium text-[#4A3628]">Quick Styles</p>
              <div className="grid grid-cols-2 gap-1">
                {TEXT_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => updateText({ ...preset.patch, enabled: true })}
                    className="rounded-md border border-[#E4D7C3] bg-[#FFFDF8] px-2 py-1 text-[11px] font-medium text-[#4A3628] transition-colors hover:border-[#D97706] hover:text-[#2B1E16]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family & Bold/Italic */}
            <div className="flex items-center gap-1.5">
              <div className="grid flex-1 grid-cols-4 gap-1 rounded-lg bg-[#F3EBDD] p-1">
                {FONT_OPTIONS.map((f) => {
                  const active = framing.textWatermark.fontStyle === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateText({ fontStyle: f.id })}
                      className={`rounded py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                          : 'text-[#6E5849] hover:text-[#2B1E16]'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-pressed={framing.textWatermark.bold}
                onClick={() => updateText({ bold: !framing.textWatermark.bold })}
                className={`h-8 w-8 rounded-md border text-xs font-bold transition-colors ${
                  framing.textWatermark.bold
                    ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16]'
                    : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849]'
                }`}
              >
                B
              </button>
              <button
                type="button"
                aria-pressed={framing.textWatermark.italic}
                onClick={() => updateText({ italic: !framing.textWatermark.italic })}
                className={`h-8 w-8 rounded-md border text-xs italic transition-colors ${
                  framing.textWatermark.italic
                    ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16]'
                    : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849]'
                }`}
              >
                I
              </button>
            </div>

            {/* Text Color */}
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor={`${idPrefix}text-color-picker`} className="text-[11px] font-medium text-[#4A3628]">
                  Text Color
                </label>
                <span className="font-mono text-[11px] text-[#6E5849]">
                  {framing.textWatermark.color}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  id={`${idPrefix}text-color-picker`}
                  type="color"
                  value={framing.textWatermark.color}
                  onChange={(e) => updateText({ color: e.target.value.toUpperCase() })}
                  className="h-7 w-9 cursor-pointer rounded border border-[#E4D7C3] bg-[#FFFDF8] p-0.5"
                />
                {TEXT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Set text color ${hex}`}
                    onClick={() => updateText({ color: hex })}
                    className={`h-6 flex-1 rounded border ${
                      framing.textWatermark.color.toUpperCase() === hex
                        ? 'border-[#C25E00] ring-1 ring-[#C25E00]'
                        : 'border-[#CBB89D]'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Size, Opacity, Margin, Rotation */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <label htmlFor={`${idPrefix}text-size`} className="font-medium text-[#4A3628]">
                    Size
                  </label>
                  <span className="font-mono tabular-nums text-[#6E5849]">
                    {framing.textWatermark.sizePercent}%
                  </span>
                </div>
                <input
                  id={`${idPrefix}text-size`}
                  type="range"
                  min={2}
                  max={16}
                  step={0.5}
                  value={framing.textWatermark.sizePercent}
                  onChange={(e) => updateText({ sizePercent: parseFloat(e.target.value) })}
                  className="studio-slider w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <label htmlFor={`${idPrefix}text-opacity`} className="font-medium text-[#4A3628]">
                    Opacity
                  </label>
                  <span className="font-mono tabular-nums text-[#6E5849]">
                    {Math.round(framing.textWatermark.opacity * 100)}%
                  </span>
                </div>
                <input
                  id={`${idPrefix}text-opacity`}
                  type="range"
                  min={10}
                  max={100}
                  step={2}
                  value={Math.round(framing.textWatermark.opacity * 100)}
                  onChange={(e) =>
                    updateText({ opacity: parseInt(e.target.value, 10) / 100 })
                  }
                  className="studio-slider w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <label htmlFor={`${idPrefix}text-margin`} className="font-medium text-[#4A3628]">
                    Margin
                  </label>
                  <span className="font-mono tabular-nums text-[#6E5849]">
                    {framing.textWatermark.marginPercent}%
                  </span>
                </div>
                <input
                  id={`${idPrefix}text-margin`}
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  value={framing.textWatermark.marginPercent}
                  onChange={(e) => updateText({ marginPercent: parseInt(e.target.value, 10) })}
                  className="studio-slider w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <label htmlFor={`${idPrefix}text-rotate`} className="font-medium text-[#4A3628]">
                    Rotate
                  </label>
                  <span className="font-mono tabular-nums text-[#6E5849]">
                    {framing.textWatermark.rotation}°
                  </span>
                </div>
                <input
                  id={`${idPrefix}text-rotate`}
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={framing.textWatermark.rotation}
                  onChange={(e) => updateText({ rotation: parseInt(e.target.value, 10) })}
                  className="studio-slider w-full"
                />
              </div>
            </div>

            {/* Outline, Shadow, & Optional Background Pill */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#4A3628]">
                <input
                  type="checkbox"
                  checked={framing.textWatermark.strokeEnabled}
                  onChange={(e) => updateText({ strokeEnabled: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[#C25E00]"
                />
                <span>Outline</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#4A3628]">
                <input
                  type="checkbox"
                  checked={framing.textWatermark.shadowEnabled}
                  onChange={(e) => updateText({ shadowEnabled: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[#C25E00]"
                />
                <span>Shadow</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#4A3628]">
                <input
                  type="checkbox"
                  checked={framing.textWatermark.badgeEnabled}
                  onChange={(e) => updateText({ badgeEnabled: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[#C25E00]"
                />
                <span>Text Backdrop</span>
              </label>
            </div>

            {framing.textWatermark.badgeEnabled && (
              <div className="flex items-center gap-2 rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-2">
                <input
                  type="color"
                  aria-label="Text backdrop color"
                  value={framing.textWatermark.badgeColor}
                  onChange={(e) =>
                    updateText({ badgeColor: e.target.value.toUpperCase() })
                  }
                  className="h-7 w-9 cursor-pointer rounded border border-[#E4D7C3] bg-[#FFFDF8] p-0.5"
                />
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center justify-between text-[10px] text-[#6E5849]">
                    <span>Backdrop Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(framing.textWatermark.badgeOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    step={5}
                    value={Math.round(framing.textWatermark.badgeOpacity * 100)}
                    onChange={(e) =>
                      updateText({ badgeOpacity: parseInt(e.target.value, 10) / 100 })
                    }
                    className="studio-slider w-full"
                  />
                </div>
              </div>
            )}

            <WatermarkAnchorPicker
              label="Text Position"
              value={framing.textWatermark.position}
              onChange={(position) => updateText({ position })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
