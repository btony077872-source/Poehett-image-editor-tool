import { useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { LINE_PRESETS, PLATFORM_CATEGORIES } from '../data/presets';
import { ActiveView, PlatformId } from '../types';
import { PlatformLogo } from './PlatformLogo';
import { PWAInstallButton } from './PWAInstallButton';
import slideUiMapImg from '../assets/images/workflow_ui_map_1795682799860.jpg';
import slideFramingFlowImg from '../assets/images/workflow_framing_flow_1795682801171.jpg';
import slideGifWatermarkImg from '../assets/images/workflow_gif_watermark_1795682801049.jpg';

interface RatioGuideViewProps {
  mode: Extract<ActiveView, 'guide' | 'tips'>;
  activePresetId: string;
  onApplyPreset: (presetId: string) => void;
}

interface WorkflowSlide {
  id: string;
  indexLabel: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  alt: string;
  downloadFilename: string;
  highlights: { step: string; label: string; detail: string }[];
}

const WORKFLOW_SLIDES: WorkflowSlide[] = [
  {
    id: 'workspace-map',
    indexLabel: '01',
    tabLabel: '01. Where Is What',
    title: 'Workspace Map — Where Every Tool Lives',
    subtitle:
      'Quick orientation across the Top Bar, Left Control Rail, Center Framing Stage, and Right Live Platform Preview.',
    imageSrc: slideUiMapImg,
    alt: 'Workspace Map presentation slide showing Top Bar, Left Control Rail, Center Framing Stage, and Right Live Social Preview',
    downloadFilename: 'poehat-editor-workspace-map.jpg',
    highlights: [
      {
        step: '01',
        label: 'Top Bar',
        detail: 'Switch between Converter, Ratio Guide, and Quick Tips, or click Download to save single files and batch ZIPs.',
      },
      {
        step: '02',
        label: 'Left Control Rail',
        detail: 'Adjust Platform & Ratio, Framing & Fit, Layers, Watermark, and Output Format & Quality from top to bottom.',
      },
      {
        step: '03',
        label: 'Center Framing Stage',
        detail: 'Drop or paste images, apply Auto-Fit, drag or inertial-zoom inside the crop frame, and monitor edits on the floating preview.',
      },
      {
        step: '04',
        label: 'Live Platform Preview',
        detail: 'Inspect how your framed photo renders inside realistic LINE chat, Instagram, YouTube, TikTok, Facebook, and X cards.',
      },
    ],
  },
  {
    id: 'framing-flow',
    indexLabel: '02',
    tabLabel: '02. 4-Step Flow',
    title: '4-Step Asset Framing & Export Workflow',
    subtitle:
      'Turn raw supplier WebP files, portraits, or product shots into platform-compliant exports in under a minute.',
    imageSrc: slideFramingFlowImg,
    alt: '4-Step Asset Framing Workflow slide illustrating Upload and Auto-Fit, Auto-Crop and Frame, Format and Quality, and Export and Batch ZIP',
    downloadFilename: 'poehat-editor-4-step-workflow.jpg',
    highlights: [
      {
        step: '01',
        label: 'Upload & Auto-Fit',
        detail: 'Drop single images or multi-file batches; orientation-locked Auto-Fit suggests the closest social preset automatically.',
      },
      {
        step: '02',
        label: 'Auto-Crop & Frame',
        detail: 'Empty borders trim automatically while faces and product subjects center cleanly with rule-of-thirds guides or Fit & Pad.',
      },
      {
        step: '03',
        label: 'Format & Quality',
        detail: 'Export JPEG, PNG, WebP, or GIF with optional transparent alpha preservation, matte swatches, and size-cap tuning.',
      },
      {
        step: '04',
        label: 'Export & Batch ZIP',
        detail: 'Save one optimized image, copy or share directly, or package the entire multi-image queue into a named ZIP archive.',
      },
    ],
  },
  {
    id: 'gif-watermark',
    indexLabel: '03',
    tabLabel: '03. GIF Watermark',
    title: 'Background Cutout & Animated GIF Watermark Guide',
    subtitle:
      'Turn any uploaded logo or multi-frame GIF into a looping transparent watermark using the dedicated Watermark rail section.',
    imageSrc: slideGifWatermarkImg,
    alt: 'Animated GIF Watermark guide slide showing logo background cutout, scale/opacity/anchor/motion controls, and standalone or composite GIF exports',
    downloadFilename: 'poehat-editor-gif-watermark-guide.jpg',
    highlights: [
      {
        step: '01',
        label: 'Logo Source & BG Cutout',
        detail: 'Upload PNG, SVG, WebP, or animated GIF logos (or try Cowboy Roach Mascot) and strip solid/box backdrops in Layers.',
      },
      {
        step: '02',
        label: 'Scale, Opacity & Anchor',
        detail: 'Use the Watermark section above Output Format to dial Scale, Opacity, 9-point/Tile positioning, Motion style, and Speed.',
      },
      {
        step: '03',
        label: 'Standalone or Composite GIF',
        detail: 'Click Save Logo as GIF for a transparent looping badge, or Switch Output to GIF to animate the watermark on your framed photo.',
      },
    ],
  },
];

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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [failedSlides, setFailedSlides] = useState<Record<string, boolean>>({});

  const activeSlide = WORKFLOW_SLIDES[activeSlideIndex] ?? WORKFLOW_SLIDES[0];

  const triggerSlideDownload = (slide: WorkflowSlide) => {
    const link = document.createElement('a');
    link.href = slide.imageSrc;
    link.download = slide.downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllSlides = () => {
    WORKFLOW_SLIDES.forEach((slide, index) => {
      window.setTimeout(() => {
        triggerSlideDownload(slide);
      }, index * 180);
    });
  };

  if (mode === 'tips') {
    const activeSlideFailed = Boolean(failedSlides[activeSlide.id]);

    return (
      <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 sm:py-10">
        {/* Visual Workflow & Workspace Presentation Slides */}
        <section
          aria-label="Visual workflow guide"
          data-bullet-collider="true"
          className="mb-10 rounded-xl border border-[#E4D7C3] bg-[#FFFDF8] p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#2B1E16] sm:text-3xl">
                Visual Guide &amp; Workflow Slides
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6E5849]">
                Presentation boards showing where each tool lives, the 4-step framing pipeline, and
                Animated GIF Watermark exports. Save any slide to share with your team.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => triggerSlideDownload(activeSlide)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#C25E00] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A14B00] sm:min-h-0 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Download Slide {activeSlide.indexLabel}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadAllSlides}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-3.5 py-2 text-xs font-semibold text-[#2B1E16] transition-colors hover:border-[#C25E00] hover:text-[#C25E00] sm:min-h-0 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5 shrink-0 text-[#C25E00]" aria-hidden="true" />
                <span>Save All (3)</span>
              </button>
            </div>
          </div>

          {/* Slide Navigation Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Presentation slides"
              className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#F3EBDD] p-1"
            >
              {WORKFLOW_SLIDES.map((slide, idx) => {
                const selected = idx === activeSlideIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-0 whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-[#FFFDF8] text-[#2B1E16] shadow-xs'
                        : 'text-[#6E5849] hover:text-[#2B1E16]'
                    }`}
                  >
                    {slide.tabLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs font-medium tabular-nums text-[#6E5849]">
                {activeSlide.indexLabel} / 0{WORKFLOW_SLIDES.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() =>
                    setActiveSlideIndex((prev) =>
                      prev === 0 ? WORKFLOW_SLIDES.length - 1 : prev - 1
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] text-[#4A3628] transition-colors hover:border-[#C25E00] hover:text-[#2B1E16]"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() =>
                    setActiveSlideIndex((prev) => (prev + 1) % WORKFLOW_SLIDES.length)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] text-[#4A3628] transition-colors hover:border-[#C25E00] hover:text-[#2B1E16]"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Primary 16:9 Presentation Stage */}
          <div className="mt-4 overflow-hidden rounded-xl border border-[#E4D7C3] bg-[#FAF6EE]">
            {activeSlideFailed ? (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 p-6 text-center">
                <ImageIcon className="h-8 w-8 text-[#C25E00]" aria-hidden="true" />
                <p className="font-display text-base font-semibold text-[#2B1E16]">
                  {activeSlide.title}
                </p>
                <p className="max-w-lg text-xs leading-relaxed text-[#6E5849]">
                  {activeSlide.subtitle}
                </p>
              </div>
            ) : (
              <img
                src={activeSlide.imageSrc}
                alt={activeSlide.alt}
                referrerPolicy="no-referrer"
                onError={() =>
                  setFailedSlides((prev) => ({ ...prev, [activeSlide.id]: true }))
                }
                className="aspect-video w-full bg-[#FAF6EE] object-contain"
              />
            )}
          </div>

          {/* Companion Plain-Text "Where Is What" Legend */}
          <div className="mt-4 border-t border-[#E4D7C3] pt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-[#2B1E16]">
                {activeSlide.title}
              </h2>
              <p className="text-xs text-[#6E5849]">{activeSlide.subtitle}</p>
            </div>
            <div
              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                activeSlide.highlights.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
              }`}
            >
              {activeSlide.highlights.map((item) => (
                <div
                  key={item.step}
                  className="rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-3"
                >
                  <p className="text-xs font-semibold text-[#2B1E16]">
                    <span className="mr-1.5 font-mono tabular-nums text-[#C25E00]">
                      {item.step}.
                    </span>
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6E5849]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Card Thumbnail Strip for Quick Picking & Direct Save */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-[#E4D7C3] pt-4 sm:grid-cols-3">
            {WORKFLOW_SLIDES.map((slide, idx) => {
              const selected = idx === activeSlideIndex;
              const thumbFailed = Boolean(failedSlides[slide.id]);
              return (
                <div
                  key={slide.id}
                  className={`flex items-center gap-2.5 rounded-lg border p-2 transition-colors ${
                    selected
                      ? 'border-[#D97706] bg-[#D97706]/[0.07]'
                      : 'border-[#E4D7C3] bg-[#FAF6EE] hover:border-[#CBB89D]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <div className="h-11 w-20 shrink-0 overflow-hidden rounded border border-[#E4D7C3] bg-[#FFFDF8]">
                      {thumbFailed ? (
                        <div className="flex h-full w-full items-center justify-center text-[#C25E00]">
                          <ImageIcon className="h-4 w-4" aria-hidden="true" />
                        </div>
                      ) : (
                        <img
                          src={slide.imageSrc}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedSlides((prev) => ({ ...prev, [slide.id]: true }))
                          }
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#2B1E16]">
                        {slide.tabLabel}
                      </p>
                      <p className="truncate text-[11px] text-[#6E5849]">
                        16:9 Guide Slide
                      </p>
                    </div>
                  </button>

                  <a
                    href={slide.imageSrc}
                    download={slide.downloadFilename}
                    aria-label={`Download ${slide.tabLabel}`}
                    title={`Download ${slide.tabLabel}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] transition-colors hover:border-[#C25E00] hover:text-[#C25E00]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mb-6 max-w-2xl">
          <h2 className="font-display text-xl font-bold tracking-tight text-[#2B1E16] sm:text-2xl">
            LINE &amp; Social Asset Optimization Tips
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#6E5849]">
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
              <h3 className="font-display text-base font-semibold text-[#2B1E16]">
                <span className="mr-2 font-mono text-sm font-medium text-[#C25E00]">
                  {tip.index}
                </span>
                {tip.title}
              </h3>
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
