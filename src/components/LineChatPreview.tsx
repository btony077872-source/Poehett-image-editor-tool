import { ChevronLeft, ChevronRight, Menu, Search, Tag } from 'lucide-react';
import { EncodedOutput, LinePreset, PreviewCopy } from '../types';

interface LineChatPreviewProps {
  preset: LinePreset;
  output: EncodedOutput;
  copy: PreviewCopy;
  onUpdateCopy: (patch: Partial<PreviewCopy>) => void;
  embedded?: boolean;
}

export function LineChatPreview({
  preset,
  output,
  copy,
  onUpdateCopy,
  embedded = false,
}: LineChatPreviewProps) {
  const previewSrc = output.objectUrl;
  const idPrefix = embedded ? 'mobile-' : '';

  const wrapperClass = embedded
    ? 'w-full bg-[#FFFDF8]'
    : 'w-full shrink-0 border-t border-[#E4D7C3] bg-[#FFFDF8] lg:w-[340px] lg:border-t-0 lg:border-l';

  return (
    <aside className={wrapperClass} data-bullet-collider={!embedded ? 'true' : undefined}>
      <div className={embedded ? 'p-4' : 'p-5'}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-[#2B1E16]">
            LINE Chat Preview
          </h2>
          <span className="text-xs text-[#6E5849]">{preset.group}</span>
        </div>

        {/* Realistic LINE Chat Frame */}
        <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#8CABD9]">
          {/* LINE Chat Top Header */}
          <div className="flex items-center justify-between bg-[#7A99C7]/90 px-3 py-2.5 text-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <ChevronLeft className="h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
              <span className="truncate text-xs font-semibold">
                {copy.accountName || 'Official Account'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 opacity-90 shrink-0">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <Menu className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>

          {/* Chat Canvas Area */}
          <div className="px-3 py-4">
            <div className="mb-3 text-center">
              <span className="inline-block rounded-full bg-black/15 px-2.5 py-0.5 text-[10px] font-medium text-white">
                Today
              </span>
            </div>

            <div className="flex items-start gap-2">
              {/* Official Account Avatar */}
              <div
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06C755] font-display text-[11px] font-bold text-white"
              >
                {(copy.accountName || 'L').charAt(0).toUpperCase()}
              </div>

              {/* Adaptive LINE Message Bubble */}
              <div className="min-w-0 flex-1">
                {preset.previewTemplate === 'product' && (
                  <div className="overflow-hidden rounded-xl bg-white shadow-xs">
                    <div
                      className="relative w-full overflow-hidden bg-[#F1F5F9]"
                      style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
                    >
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt="LINE Product Card preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                          1.54:1 Card Image
                        </div>
                      )}
                      {copy.tag.trim() && (
                        <span className="absolute left-2 top-2 rounded bg-[#0F172A]/80 px-2 py-0.5 text-[10px] font-medium text-white">
                          {copy.tag}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-bold leading-snug text-[#0F172A]">
                        {copy.title || 'Product title'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#64748B]">
                        {copy.description || 'Short promotional description.'}
                      </p>
                      {copy.price.trim() && (
                        <p className="mt-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]">
                          {copy.price}
                        </p>
                      )}
                    </div>
                    <div className="border-t border-[#F1F5F9] px-3 py-2 text-center text-[11px] font-semibold text-[#3B82F6]">
                      {copy.ctaLabel || 'View Details'}
                    </div>
                  </div>
                )}

                {preset.previewTemplate === 'image' && (
                  <div className="overflow-hidden rounded-xl bg-white shadow-xs">
                    <div
                      className="relative w-full overflow-hidden bg-[#F1F5F9]"
                      style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
                    >
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt="LINE Image Card preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                          1.11:1 Image Card
                        </div>
                      )}
                      {copy.tag.trim() && (
                        <span className="absolute left-2.5 top-2.5 rounded bg-[#0F172A]/80 px-2 py-0.5 text-[10px] font-medium text-white">
                          {copy.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1 border-t border-[#F1F5F9] px-3 py-2 text-[11px] font-semibold text-[#3B82F6]">
                      <span>{copy.ctaLabel || 'Explore Collection'}</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                  </div>
                )}

                {preset.previewTemplate === 'person' && (
                  <div className="overflow-hidden rounded-xl bg-white p-4 text-center shadow-xs">
                    <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F1F5F9]">
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt="LINE Person Card preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-[#94A3B8]">
                          1:1 Photo
                        </div>
                      )}
                    </div>
                    <p className="mt-3 truncate text-xs font-bold text-[#0F172A]">
                      {copy.title || 'Stylist Name'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[#64748B]">
                      {copy.description || 'Specialist profile description.'}
                    </p>
                    <div className="mt-3 border-t border-[#F1F5F9] pt-2 text-[11px] font-semibold text-[#3B82F6]">
                      {copy.ctaLabel || 'Book Consultation'}
                    </div>
                  </div>
                )}

                {preset.previewTemplate === 'rich' && (
                  <div className="overflow-hidden rounded-xl bg-white shadow-xs">
                    <div
                      className="w-full overflow-hidden bg-[#F1F5F9]"
                      style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
                    >
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt="LINE Rich Message preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#94A3B8]">
                          {preset.width}×{preset.height} Rich Message
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {preset.previewTemplate === 'coupon' && (
                  <div className="overflow-hidden rounded-xl bg-white shadow-xs">
                    <div className="flex items-center gap-1.5 bg-[#06C755] px-3 py-1.5 text-[10px] font-semibold text-white">
                      <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>LINE Coupon</span>
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F1F5F9]">
                        {previewSrc ? (
                          <img
                            src={previewSrc}
                            alt="LINE Coupon thumbnail preview"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#94A3B8]">
                            640×640
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-bold leading-snug text-[#0F172A]">
                          {copy.title || 'Special Member Offer'}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-[#64748B]">
                          {copy.couponValidity || 'Valid through Dec 31'}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-[#F1F5F9] px-3 py-2 text-center text-[11px] font-semibold text-[#06C755]">
                      {copy.ctaLabel || 'Check Coupon'}
                    </div>
                  </div>
                )}

                <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-white/85">
                  11:48
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Promotional Preview Copy Controls */}
        {preset.previewTemplate !== 'rich' ? (
          <div className="mt-5 space-y-3 border-t border-[#E4D7C3] pt-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold text-[#4A3628]">
                Preview Card Copy
              </h3>
              <span className="text-[11px] text-[#8D7564]">
                Not baked into export
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label
                  htmlFor={`${idPrefix}preview-title`}
                  className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                >
                  Card Headline
                </label>
                <input
                  id={`${idPrefix}preview-title`}
                  type="text"
                  value={copy.title}
                  onChange={(e) => onUpdateCopy({ title: e.target.value })}
                  className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
                />
              </div>

              {(preset.previewTemplate === 'product' ||
                preset.previewTemplate === 'person') && (
                <div>
                  <label
                    htmlFor={`${idPrefix}preview-desc`}
                    className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                  >
                    Description
                  </label>
                  <input
                    id={`${idPrefix}preview-desc`}
                    type="text"
                    value={copy.description}
                    onChange={(e) =>
                      onUpdateCopy({ description: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {preset.previewTemplate === 'product' && (
                  <div>
                    <label
                      htmlFor={`${idPrefix}preview-price`}
                      className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                    >
                      Price
                    </label>
                    <input
                      id={`${idPrefix}preview-price`}
                      type="text"
                      value={copy.price}
                      onChange={(e) => onUpdateCopy({ price: e.target.value })}
                      className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 font-mono text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
                    />
                  </div>
                )}

                {preset.previewTemplate === 'coupon' && (
                  <div>
                    <label
                      htmlFor={`${idPrefix}preview-validity`}
                      className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                    >
                      Validity
                    </label>
                    <input
                      id={`${idPrefix}preview-validity`}
                      type="text"
                      value={copy.couponValidity}
                      onChange={(e) =>
                        onUpdateCopy({ couponValidity: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
                    />
                  </div>
                )}

                {(preset.previewTemplate === 'product' ||
                  preset.previewTemplate === 'image') && (
                  <div>
                    <label
                      htmlFor={`${idPrefix}preview-tag`}
                      className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                    >
                      Overlay Tag
                    </label>
                    <input
                      id={`${idPrefix}preview-tag`}
                      type="text"
                      value={copy.tag}
                      onChange={(e) => onUpdateCopy({ tag: e.target.value })}
                      className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
                    />
                  </div>
                )}

                <div
                  className={
                    preset.previewTemplate === 'product'
                      ? 'col-span-2'
                      : 'col-span-1'
                  }
                >
                  <label
                    htmlFor={`${idPrefix}preview-cta`}
                    className="mb-1 block text-[11px] font-medium text-[#6E5849]"
                  >
                    Action Label
                  </label>
                  <input
                    id={`${idPrefix}preview-cta`}
                    type="text"
                    value={copy.ctaLabel}
                    onChange={(e) => onUpdateCopy({ ctaLabel: e.target.value })}
                    className="w-full rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] px-2.5 py-1.5 text-xs text-[#2B1E16] focus:border-[#D97706] focus:bg-[#FFFDF8] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-[#6E5849]">
            Rich Messages display edge-to-edge inside chat bubbles with no surrounding card
            text. Verify key visuals remain legible at mobile width above.
          </p>
        )}
      </div>
    </aside>
  );
}
