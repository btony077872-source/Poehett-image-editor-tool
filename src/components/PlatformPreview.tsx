import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import { EncodedOutput, LinePreset, PreviewCopy } from '../types';
import { getFormatLabel } from '../utils/imageEngine';
import { LineChatPreview } from './LineChatPreview';
import { PlatformLogo } from './PlatformLogo';

interface PlatformPreviewProps {
  preset: LinePreset;
  output: EncodedOutput;
  copy: PreviewCopy;
  onUpdateCopy: (patch: Partial<PreviewCopy>) => void;
  embedded?: boolean;
}

export function PlatformPreview({
  preset,
  output,
  copy,
  onUpdateCopy,
  embedded = false,
}: PlatformPreviewProps) {
  // Preserve LineCard Studio's LINE Chat Preview unchanged
  if (preset.platform === 'line') {
    return (
      <LineChatPreview
        preset={preset}
        output={output}
        copy={copy}
        onUpdateCopy={onUpdateCopy}
        embedded={embedded}
      />
    );
  }

  const previewSrc = output.objectUrl;
  const idPrefix = embedded ? 'mobile-' : '';
  const wrapperClass = embedded
    ? 'w-full bg-[#FFFDF8]'
    : 'w-full shrink-0 border-t border-[#E4D7C3] bg-[#FFFDF8] lg:w-[340px] lg:border-t-0 lg:border-l';

  return (
    <aside className={wrapperClass} data-bullet-collider={!embedded ? 'true' : undefined}>
      <div className={embedded ? 'p-4' : 'p-5'}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PlatformLogo platform={preset.platform} className="h-4 w-4 shrink-0" />
            <h2 className="font-display text-sm font-semibold text-[#2B1E16] truncate">
              {preset.platform === 'facebook'
                ? 'Facebook Preview'
                : preset.platform === 'instagram'
                ? 'Instagram Preview'
                : preset.platform === 'youtube'
                ? 'YouTube Preview'
                : preset.platform === 'tiktok'
                ? 'TikTok Preview'
                : preset.platform === 'x'
                ? 'X Post Preview'
                : 'Custom Frame Preview'}
            </h2>
          </div>
          <span className="font-mono text-xs tabular-nums text-[#6E5849] shrink-0">
            {preset.ratioLabel}
          </span>
        </div>

        {/* Facebook Feed & Cover Preview */}
        {preset.previewTemplate === 'fb-post' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877F2] font-display text-xs font-bold text-white">
                  {(copy.accountName || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#0F172A]">
                    {copy.accountName || 'Shop Page'}
                  </p>
                  <p className="text-[10px] text-[#64748B]">Sponsored · Public</p>
                </div>
              </div>
              <MoreHorizontal className="h-4 w-4 text-[#64748B] shrink-0" aria-hidden="true" />
            </div>
            <p className="px-3 pb-2.5 text-xs leading-relaxed text-[#334155] line-clamp-2">
              {copy.title || 'Seasonal product spotlight'}
            </p>
            <div
              className="w-full overflow-hidden bg-[#F1F5F9]"
              style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Facebook feed preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  {preset.width}×{preset.height}
                </div>
              )}
            </div>
            <div className="flex items-center justify-around border-t border-[#E2E8F0] px-2 py-2 text-[11px] font-medium text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                Like
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Comment
              </span>
              <span className="inline-flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                Share
              </span>
            </div>
          </div>
        )}

        {preset.previewTemplate === 'fb-cover' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
            <div
              className="relative w-full overflow-hidden bg-[#F1F5F9]"
              style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Facebook cover preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  851×315 Cover
                </div>
              )}
            </div>
            <div className="relative px-3 pb-3 pt-5">
              <div className="absolute -top-6 left-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#1877F2] font-display text-sm font-bold text-white shadow-xs">
                {(copy.accountName || 'S').charAt(0).toUpperCase()}
              </div>
              <p className="pl-14 text-xs font-bold text-[#0F172A] truncate">
                {copy.accountName || 'Brand Page'}
              </p>
              <p className="pl-14 text-[10px] text-[#64748B] truncate">
                {copy.title || 'Official Storefront'}
              </p>
            </div>
          </div>
        )}

        {/* Instagram Feed & Story/Reel Preview */}
        {preset.previewTemplate === 'ig-post' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4] p-[1.5px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#0F172A]">
                    {(copy.accountName || 'I').charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="truncate text-xs font-semibold text-[#0F172A]">
                  {(copy.accountName || 'brand_shop').toLowerCase().replace(/\s+/g, '_')}
                </span>
              </div>
              <MoreHorizontal className="h-4 w-4 text-[#64748B] shrink-0" aria-hidden="true" />
            </div>
            <div
              className="w-full overflow-hidden bg-[#F1F5F9]"
              style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Instagram post preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  {preset.width}×{preset.height}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-[#0F172A]">
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4" aria-hidden="true" />
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <Send className="h-4 w-4" aria-hidden="true" />
              </div>
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="px-3 pb-2.5 text-[11px] leading-snug text-[#334155] line-clamp-2">
              <span className="font-semibold text-[#0F172A] mr-1.5">
                {(copy.accountName || 'brand_shop').toLowerCase().replace(/\s+/g, '_')}
              </span>
              {copy.title || 'New collection now available'}
            </p>
          </div>
        )}

        {preset.previewTemplate === 'ig-story' && (
          <div className="mx-auto max-w-[230px] overflow-hidden rounded-2xl border border-[#CBD5E1] bg-[#0F172A]">
            <div
              className="relative w-full overflow-hidden bg-[#1E293B]"
              style={{ aspectRatio: '9 / 16' }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Instagram Story preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  1080×1920 Story
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-2.5"
              >
                <div className="mb-2 flex gap-1">
                  <span className="h-0.5 flex-1 rounded-full bg-white" />
                  <span className="h-0.5 flex-1 rounded-full bg-white/35" />
                </div>
                <p className="truncate text-[11px] font-semibold text-white">
                  {(copy.accountName || 'brand_shop').toLowerCase().replace(/\s+/g, '_')}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5"
              >
                <div className="rounded-full border border-white/40 px-3 py-1 text-[10px] text-white/85">
                  Send message…
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YouTube Thumbnail & Banner Preview */}
        {preset.previewTemplate === 'yt-thumb' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
            <div
              className="relative w-full overflow-hidden bg-[#0F172A]"
              style={{ aspectRatio: '16 / 9' }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="YouTube thumbnail preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  1280×720 Thumbnail
                </div>
              )}
              <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white">
                12:48
              </span>
            </div>
            <div className="flex items-start gap-2.5 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF0000] font-display text-xs font-bold text-white">
                {(copy.accountName || 'Y').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#0F172A]">
                  {copy.title || 'Video Title Preview'}
                </p>
                <p className="mt-1 truncate text-[11px] text-[#64748B]">
                  {copy.accountName || 'Channel Name'} · 24K views · 2 hours ago
                </p>
              </div>
            </div>
          </div>
        )}

        {preset.previewTemplate === 'yt-banner' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
            <div
              className="relative w-full overflow-hidden bg-[#0F172A]"
              style={{ aspectRatio: '16 / 9' }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="YouTube channel banner preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  2560×1440 Banner
                </div>
              )}
              {/* Desktop safe band guide */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[35%] bottom-[35%] border-y border-dashed border-white/85 bg-black/15 flex items-end justify-end p-1.5"
              >
                <span className="rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Desktop & mobile safe band
                </span>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-[#0F172A] truncate">
                {copy.accountName || 'YouTube Channel'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748B]">
                Dashed band indicates the center area always visible on desktop & mobile.
              </p>
            </div>
          </div>
        )}

        {/* TikTok Vertical & Profile Preview */}
        {preset.previewTemplate === 'tt-video' && (
          <div className="mx-auto max-w-[230px] overflow-hidden rounded-2xl border border-[#CBD5E1] bg-[#0F172A]">
            <div
              className="relative w-full overflow-hidden bg-[#1E293B]"
              style={{ aspectRatio: '9 / 16' }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="TikTok 9:16 preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  1080×1920 TikTok
                </div>
              )}
              {/* Right action rail & bottom caption safe zone */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-12 right-2 flex flex-col items-center gap-3 text-white drop-shadow"
              >
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Share2 className="h-5 w-5" />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-2.5 pr-10 text-white"
              >
                <p className="truncate text-[11px] font-semibold">
                  @{(copy.accountName || 'shop').toLowerCase().replace(/\s+/g, '')}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-white/85">
                  {copy.title || 'Check out our newest release'}
                </p>
              </div>
            </div>
          </div>
        )}

        {preset.previewTemplate === 'tt-profile' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white p-5 text-center">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F1F5F9]">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="TikTok avatar preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  1:1
                </div>
              )}
            </div>
            <p className="mt-3 text-xs font-bold text-[#0F172A] truncate">
              {copy.accountName || 'Creator Shop'}
            </p>
            <p className="text-[11px] text-[#64748B]">
              @{(copy.accountName || 'shop').toLowerCase().replace(/\s+/g, '')}
            </p>
          </div>
        )}

        {/* X (Twitter) Post & Header Preview */}
        {preset.previewTemplate === 'x-post' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-display text-xs font-bold text-white">
                {(copy.accountName || 'X').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-bold text-[#0F172A] truncate">
                    {copy.accountName || 'Official Account'}
                  </span>
                  <span className="text-[#64748B] truncate">
                    @{(copy.accountName || 'shop').toLowerCase().replace(/\s+/g, '')}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-[#334155] line-clamp-2">
                  {copy.title || 'New launch highlight'}
                </p>
                <div
                  className="mt-2 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
                  style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
                >
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="X post media preview"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                      {preset.width}×{preset.height}
                    </div>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between pr-4 text-[#64748B]">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        )}

        {preset.previewTemplate === 'x-header' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
            <div
              className="w-full overflow-hidden bg-[#F1F5F9]"
              style={{ aspectRatio: '3 / 1' }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="X header banner preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                  1500×500 Header
                </div>
              )}
            </div>
            <div className="relative px-3 pb-3 pt-6">
              <div className="absolute -top-6 left-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#0F172A] font-display text-sm font-bold text-white">
                {(copy.accountName || 'X').charAt(0).toUpperCase()}
              </div>
              <p className="text-xs font-bold text-[#0F172A] truncate">
                {copy.accountName || 'Official Account'}
              </p>
              <p className="text-[11px] text-[#64748B]">
                @{(copy.accountName || 'shop').toLowerCase().replace(/\s+/g, '')}
              </p>
            </div>
          </div>
        )}

        {/* Custom Dimensions Frame Preview */}
        {preset.previewTemplate === 'custom' && (
          <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3">
            <div
              className="mx-auto w-full overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
              style={{
                aspectRatio: `${preset.width} / ${preset.height}`,
                maxHeight: '280px',
              }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Custom dimension export preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[#94A3B8]">
                  {preset.width} × {preset.height}
                </div>
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-mono tabular-nums text-[#0F172A]">
                {output.width || preset.width} × {output.height || preset.height} px
              </span>
              <span className="font-mono tabular-nums">
                {getFormatLabel(output.format)} · {preset.ratioLabel}
              </span>
            </div>
          </div>
        )}

        {/* Shared Editable Mockup Copy Fields for Social Media Previews */}
        {preset.previewTemplate !== 'custom' && (
          <div className="mt-5 space-y-2.5 border-t border-[#E4D7C3] pt-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold text-[#4A3628]">
                Preview Copy
              </h3>
              <span className="text-[11px] text-[#8D7564]">
                Not baked into image
              </span>
            </div>

            <div>
              <label
                htmlFor={`${idPrefix}social-preview-account`}
                className="mb-1 block text-[11px] font-medium text-[#6E5849]"
              >
                Account / Channel Name
              </label>
              <input
                id={`${idPrefix}social-preview-account`}
                type="text"
                value={copy.accountName}
                onChange={(e) => onUpdateCopy({ accountName: e.target.value })}
                className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor={`${idPrefix}social-preview-title`}
                className="mb-1 block text-[11px] font-medium text-[#6E5849]"
              >
                {preset.platform === 'youtube' ? 'Video Title' : 'Caption / Headline'}
              </label>
              <input
                id={`${idPrefix}social-preview-title`}
                type="text"
                value={copy.title}
                onChange={(e) => onUpdateCopy({ title: e.target.value })}
                className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
