import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LINE_PRESETS, PLATFORM_CATEGORIES } from '../data/presets';
import { ActiveView, PlatformId } from '../types';
import { PlatformLogo } from './PlatformLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface RatioGuideViewProps {
  mode: Extract<ActiveView, 'guide' | 'tips'>;
  activePresetId: string;
  onApplyPreset: (presetId: string) => void;
}

const OPTIMIZATION_TIPS = [
  {
    index: '01.',
    title: 'Why LINE Official Account Manager Rejects WebP',
    body: 'Supplier catalogs and modern storefronts serve product assets in .webp to save web bandwidth, but LINE Official Account Manager strictly requires JPG, JPEG, or PNG uploads for Card-based messages, Rich Messages, and Coupons. Converting directly to 92% JPEG removes upload rejections while keeping colors accurate.',
  },
  {
    index: '02.',
    title: 'Preserving Transparency vs. Auto Matte Fill',
    body: 'Switch Output Format to PNG or WebP with Preserve Transparency enabled to keep alpha channels intact for logos and stickers. When exporting to JPEG—which has no alpha channel—ပိုးဟက် အယ်ဒီတာ automatically fills transparent areas with your selected JPEG background matte color (White, Auto Edge, Dark, or Custom) so dark edges never appear.',
  },
  {
    index: '03.',
    title: 'Preventing Awkward Auto-Crops Across Feeds',
    body: 'Vertical 4:5 Instagram/Facebook posts and horizontal 1.54:1 LINE Product Cards crop opposite edges when uploaded raw. Use Fit & Pad with Blur Fill or Auto Edge Match to keep full bottles, apparel, or packaging uncropped inside any social frame.',
  },
  {
    index: '04.',
    title: 'Staying Under YouTube 2 MB & LINE Chat Size Caps',
    body: 'YouTube Studio enforces a strict 2 MB limit on 1280×720 thumbnails, and LINE carousels open fastest on mobile between 150 KB and 500 KB. Keep JPEG or WebP quality around 88%–92% for crisp text and fast delivery.',
  },
];

const GUIDE_PLATFORMS = PLATFORM_CATEGORIES.filter((p) => p.id !== 'custom');

export function RatioGuideView({
  mode,
  activePresetId,
  onApplyPreset,
}: RatioGuideViewProps) {
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformId>('all');

  if (mode === 'tips') {
    return (
      <div className="mx-auto w-full max-w-[960px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#2B1E16] sm:text-3xl">
            LINE & Social Asset Optimization Tips
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6E5849]">
            Practical prepress guidelines for converting WebP, PNG, SVG, and photo assets into
            fast-loading LINE Official Account broadcasts and social media posts.
          </p>
        </div>

        <div
          data-bullet-collider="true"
          className="divide-y divide-[#E4D7C3] rounded-xl border border-[#E4D7C3] bg-[#FFFDF8]"
        >
          {OPTIMIZATION_TIPS.map((tip) => (
            <article key={tip.index} className="p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold text-[#2B1E16]">
                <span className="mr-2 font-mono text-sm font-medium text-[#C25E00]">
                  {tip.index}
                </span>
                {tip.title}
              </h2>
              <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-[#6E5849]">
                {tip.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4D7C3] bg-[#FFFDF8] px-5 py-4 sm:px-6">
          <p className="text-sm text-[#6E5849]">
            Desktop shortcuts: paste with{' '}
            <span className="font-mono text-xs text-[#2B1E16]">Ctrl+V / ⌘V</span> and
            export with{' '}
            <span className="font-mono text-xs text-[#2B1E16]">Ctrl+S / ⌘S</span>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => onApplyPreset(activePresetId)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#C25E00] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A14B00] sm:min-h-0 whitespace-nowrap shrink-0"
            >
              <span>Back to Converter</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visiblePresets = LINE_PRESETS.filter(
    (p) => p.platform !== 'custom' && (platformFilter === 'all' || p.platform === platformFilter)
  );

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 max-w-2xl sm:mb-7">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#2B1E16] sm:text-3xl">
          LINE & Social Media Ratio Guide
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6E5849]">
          Reference dimensions, aspect ratios, and upload size limits for LINE Official Account
          plus Facebook, Instagram, YouTube, TikTok, and X. Select any preset to load it in the
          converter.
        </p>
      </div>

      {/* Platform Filter Tabs with Logos */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPlatformFilter('all')}
          className={`inline-flex min-h-[40px] items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-0 whitespace-nowrap ${
            platformFilter === 'all'
              ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16]'
              : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
          }`}
        >
          All Platforms
        </button>
        {GUIDE_PLATFORMS.map((cat) => {
          const active = platformFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setPlatformFilter(cat.id)}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-0 whitespace-nowrap ${
                active
                  ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16]'
                  : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:border-[#CBB89D] hover:text-[#2B1E16]'
              }`}
            >
              <PlatformLogo platform={cat.id} className="h-4 w-4 shrink-0" />
              <span>{cat.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Stacked List */}
      <div className="divide-y divide-[#E4D7C3] overflow-hidden rounded-xl border border-[#E4D7C3] bg-[#FFFDF8] sm:hidden">
        {visiblePresets.map((preset) => {
          const isCurrent = preset.id === activePresetId;
          const platformMeta = PLATFORM_CATEGORIES.find((c) => c.id === preset.platform);
          return (
            <div key={preset.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <PlatformLogo platform={preset.platform} className="h-4 w-4 shrink-0" />
                    <p className="truncate text-sm font-semibold text-[#2B1E16]">
                      {preset.name}
                    </p>
                  </div>
                  <p className="mt-1 font-mono text-xs tabular-nums text-[#6E5849]">
                    {platformMeta?.shortLabel ?? preset.group} · {preset.ratioLabel} · {preset.width}×{preset.height} px
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyPreset(preset.id)}
                  className={`inline-flex min-h-[44px] shrink-0 items-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#C25E00] text-white hover:bg-[#A14B00]'
                      : 'border border-[#E4D7C3] bg-[#FFFDF8] text-[#2B1E16] hover:border-[#D97706] hover:text-[#C25E00]'
                  }`}
                >
                  {isCurrent ? 'Active' : 'Use'}
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#6E5849]">
                {preset.usageNote}
              </p>
            </div>
          );
        })}
      </div>

      {/* Desktop Data Table */}
      <div
        data-bullet-collider="true"
        className="hidden overflow-x-auto rounded-xl border border-[#E4D7C3] bg-[#FFFDF8] sm:block"
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#E4D7C3] bg-[#F3EBDD]/60 text-xs font-semibold text-[#6E5849]">
              <th className="px-5 py-3.5">Platform</th>
              <th className="px-5 py-3.5">Template Type</th>
              <th className="px-5 py-3.5 text-right">Aspect Ratio</th>
              <th className="px-5 py-3.5 text-right">Export Size (1×)</th>
              <th className="px-5 py-3.5 text-right">Max Cap</th>
              <th className="px-5 py-3.5">Recommended Usage</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4D7C3]">
            {visiblePresets.map((preset) => {
              const isCurrent = preset.id === activePresetId;
              const platformMeta = PLATFORM_CATEGORIES.find((c) => c.id === preset.platform);
              return (
                <tr
                  key={preset.id}
                  className="transition-colors hover:bg-[#FAF6EE]"
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B1E16]">
                      <PlatformLogo platform={preset.platform} className="h-4 w-4 shrink-0" />
                      <span>{platformMeta?.shortLabel ?? preset.platform}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="font-semibold text-[#2B1E16]">{preset.name}</p>
                    <p className="text-[11px] text-[#6E5849]">{preset.group}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs font-medium tabular-nums text-[#2B1E16] whitespace-nowrap">
                    {preset.ratioLabel}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-[#4A3628] whitespace-nowrap">
                    {preset.width} × {preset.height} px
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-[#6E5849] whitespace-nowrap">
                    ≤ {preset.maxSizeMb} MB
                  </td>
                  <td className="px-5 py-4 text-xs leading-relaxed text-[#6E5849] min-w-[230px]">
                    {preset.usageNote}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onApplyPreset(preset.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#C25E00] text-white hover:bg-[#A14B00]'
                          : 'border border-[#E4D7C3] bg-[#FFFDF8] text-[#2B1E16] hover:border-[#D97706] hover:text-[#C25E00]'
                      }`}
                    >
                      <span>{isCurrent ? 'Open Active' : 'Use Preset'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
