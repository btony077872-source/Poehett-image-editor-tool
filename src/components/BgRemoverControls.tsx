import { Eraser } from 'lucide-react';
import { BgRemovalConfig, BgRemovalMode } from '../types';

interface BgRemoverControlsProps {
  idPrefix: string;
  title: string;
  description: string;
  config: BgRemovalConfig;
  edgeColor: string;
  disabled?: boolean;
  onChange: (patch: Partial<BgRemovalConfig>) => void;
}

const BG_MODES: { id: BgRemovalMode; label: string; hint: string }[] = [
  {
    id: 'auto-edge',
    label: 'Auto Edge',
    hint: 'Smart flood-fill from borders — ideal for solid/flat logo backgrounds.',
  },
  {
    id: 'gradient-checker',
    label: 'Gradient / Grid',
    hint: 'Removes gradient sweeps and fake-PNG checkerboard backgrounds.',
  },
  {
    id: 'luma-light',
    label: 'Light Paper',
    hint: 'Knocks out white or light paper while protecting dark/colored logos.',
  },
  {
    id: 'luma-dark',
    label: 'Dark Screen',
    hint: 'Knocks out black or dark backgrounds while keeping white/glowing art.',
  },
  {
    id: 'chroma-key',
    label: 'Color Layer',
    hint: 'Targets a specific color layer (green screen, colored badge, or tint).',
  },
];

export function BgRemoverControls({
  idPrefix,
  title,
  description,
  config,
  edgeColor,
  disabled = false,
  onChange,
}: BgRemoverControlsProps) {
  const activeModeMeta = BG_MODES.find((m) => m.id === config.mode) ?? BG_MODES[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#2B1E16]">
            <Eraser className="h-3.5 w-3.5 shrink-0 text-[#C25E00]" aria-hidden="true" />
            <span className="truncate">{title}</span>
          </p>
          <p className="text-[11px] text-[#6E5849]">{description}</p>
        </div>

        <button
          type="button"
          role="switch"
          disabled={disabled}
          aria-checked={config.enabled}
          aria-label={`Toggle ${title}`}
          onClick={() => onChange({ enabled: !config.enabled })}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 lg:h-6 lg:w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00] ${
            config.enabled ? 'bg-[#C25E00]' : 'bg-[#D8C7AE]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-150 lg:h-4.5 lg:w-4.5 ${
              config.enabled
                ? 'translate-x-6 lg:translate-x-5.5'
                : 'translate-x-1 lg:translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <div className="space-y-3 rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-3">
          {/* Style & Layer Mode Selector */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[#4A3628]">
              Logo & Layer Style
            </p>
            <div className="grid grid-cols-2 gap-1">
              {BG_MODES.map((mode, idx) => {
                const active = config.mode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onChange({ mode: mode.id })}
                    className={`min-h-[34px] rounded-md border px-2 py-1 text-[11px] font-medium transition-colors lg:min-h-0 whitespace-nowrap ${
                      idx === BG_MODES.length - 1 ? 'col-span-2' : ''
                    } ${
                      active
                        ? 'border-[#D97706] bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                        : 'border-[#E4D7C3] bg-[#FFFDF8]/70 text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[#6E5849]">
              {activeModeMeta.hint}
            </p>
          </div>

          {/* Target Color Picker for Color Layer Mode */}
          {config.mode === 'chroma-key' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor={`${idPrefix}bg-target-color`}
                  className="text-[11px] font-medium text-[#4A3628]"
                >
                  Target Layer Color
                </label>
                <button
                  type="button"
                  onClick={() => onChange({ targetColor: edgeColor })}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C25E00] hover:text-[#A14B00]"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-xs border border-black/20"
                    style={{ backgroundColor: edgeColor }}
                  />
                  <span>Use Edge ({edgeColor})</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`${idPrefix}bg-target-color`}
                  type="color"
                  value={config.targetColor}
                  onChange={(e) => onChange({ targetColor: e.target.value.toUpperCase() })}
                  className="h-9 w-11 cursor-pointer rounded-md border border-[#E4D7C3] bg-[#FFFDF8] p-0.5 lg:h-8 lg:w-10"
                />
                <input
                  type="text"
                  aria-label="Target background color hex"
                  value={config.targetColor}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (/^#[0-9A-F]{0,6}$/.test(val)) {
                      onChange({ targetColor: val });
                    }
                  }}
                  className="h-9 flex-1 rounded-md border border-[#E4D7C3] bg-[#FFFDF8] px-2.5 font-mono text-xs text-[#2B1E16] focus:border-[#C25E00] focus:outline-none lg:h-8"
                />
              </div>
            </div>
          )}

          {/* Tolerance */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <label htmlFor={`${idPrefix}bg-tolerance`} className="font-medium text-[#4A3628]">
                Tolerance
              </label>
              <span className="font-mono tabular-nums text-[#6E5849]">{config.tolerance}</span>
            </div>
            <input
              id={`${idPrefix}bg-tolerance`}
              type="range"
              min={5}
              max={100}
              step={1}
              value={config.tolerance}
              onChange={(e) => onChange({ tolerance: parseInt(e.target.value, 10) })}
              className="studio-slider w-full"
            />
          </div>

          {/* Edge Feather Smoothness & Edge Trim */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor={`${idPrefix}bg-smooth`} className="font-medium text-[#4A3628]">
                  Feather
                </label>
                <span className="font-mono tabular-nums text-[#6E5849]">{config.smoothness}</span>
              </div>
              <input
                id={`${idPrefix}bg-smooth`}
                type="range"
                min={0}
                max={10}
                step={1}
                value={config.smoothness}
                onChange={(e) => onChange({ smoothness: parseInt(e.target.value, 10) })}
                className="studio-slider w-full"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor={`${idPrefix}bg-trim`} className="font-medium text-[#4A3628]">
                  Edge Trim
                </label>
                <span className="font-mono tabular-nums text-[#6E5849]">{config.edgeTrim}px</span>
              </div>
              <input
                id={`${idPrefix}bg-trim`}
                type="range"
                min={0}
                max={3}
                step={1}
                value={config.edgeTrim}
                onChange={(e) => onChange({ edgeTrim: parseInt(e.target.value, 10) })}
                className="studio-slider w-full"
              />
            </div>
          </div>

          {/* Layer Refinement Checkboxes */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
            {(config.mode === 'auto-edge' ||
              config.mode === 'gradient-checker' ||
              config.mode === 'chroma-key') && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#4A3628]">
                <input
                  type="checkbox"
                  checked={config.removeInteriorHoles}
                  onChange={(e) => onChange({ removeInteriorHoles: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[#C25E00]"
                />
                <span>Clear inner holes</span>
              </label>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#4A3628]">
              <input
                type="checkbox"
                checked={config.defringe}
                onChange={(e) => onChange({ defringe: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#C25E00]"
              />
              <span>Defringe edge halo</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
