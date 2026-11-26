import { Download, FolderArchive, Loader2 } from 'lucide-react';
import { ActiveView, OutputFormat, ZipExportState } from '../types';
import { getFormatLabel } from '../utils/imageEngine';
import { CowboyRoachLogo } from './CowboyRoachLogo';

interface TopBarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  canDownload: boolean;
  isEncoding: boolean;
  batchCount: number;
  outputFormat: OutputFormat;
  zipState: ZipExportState;
  onDownload: () => void;
  muzzleRef: React.RefObject<HTMLSpanElement | null>;
  shotSeq: number;
  onFireMascot: () => void;
}

const NAV_ITEMS: { id: ActiveView; label: string; mobileLabel: string }[] = [
  { id: 'converter', label: 'Converter', mobileLabel: 'Convert' },
  { id: 'guide', label: 'Ratio Guide', mobileLabel: 'Ratios' },
  { id: 'tips', label: 'Quick Tips', mobileLabel: 'Tips' },
];

export function TopBar({
  activeView,
  onChangeView,
  canDownload,
  isEncoding,
  batchCount,
  outputFormat,
  zipState,
  onDownload,
  muzzleRef,
  shotSeq,
  onFireMascot,
}: TopBarProps) {
  const isBatch = batchCount > 1;
  const isBusy = zipState.exporting || (!isBatch && isEncoding);
  const formatLabel = getFormatLabel(outputFormat);

  const desktopLabel = zipState.exporting
    ? `Packing ${zipState.completed}/${zipState.total}…`
    : isBatch
    ? `Download ZIP (${batchCount})`
    : `Download ${formatLabel}`;

  const mobileLabel = zipState.exporting
    ? `${zipState.completed}/${zipState.total}`
    : isBatch
    ? `ZIP (${batchCount})`
    : `Save ${formatLabel === 'JPEG' ? 'JPG' : formatLabel}`;

  return (
    <header className="sticky top-0 z-30 h-12 border-b border-[#E4D7C3] bg-[#FFFDF8]/95 backdrop-blur-sm sm:h-14">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-1.5 px-2.5 sm:gap-8 sm:px-6">
        {/* Zone 1: Animated Cowboy Cockroach Mascot + Single-line Burmese Wordmark */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onFireMascot}
            aria-label="Fire cowboy cockroach bouncy bullets"
            title="Click to shoot bouncy bullets"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-150 hover:scale-105 active:scale-95 sm:h-11 sm:w-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
          >
            <CowboyRoachLogo
              ref={muzzleRef}
              shotSeq={shotSeq}
              className="h-8 w-9 sm:h-10 sm:w-12"
            />
          </button>
          <button
            type="button"
            onClick={() => onChangeView('converter')}
            className="font-display text-[13px] font-bold tracking-tight text-[#2B1E16] whitespace-nowrap shrink-0 sm:text-[17px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97706]"
          >
            ပိုးဟက် အယ်ဒီတာ
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`relative py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:py-1 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97706] ${
                  isActive
                    ? 'text-[#2B1E16]'
                    : 'text-[#6E5849] hover:text-[#2B1E16]'
                }`}
              >
                <span className="sm:hidden">{item.mobileLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-[7px] h-[2px] bg-[#D97706] transition-opacity duration-150 sm:-bottom-[17px] ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={!canDownload || isBusy}
            onClick={onDownload}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#C25E00] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#A14B00] active:bg-[#853D00] disabled:cursor-not-allowed disabled:bg-[#E9DFCF] disabled:text-[#A18C7B] whitespace-nowrap shrink-0 sm:min-h-[38px] sm:gap-2 sm:px-4 sm:py-2 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
          >
            {zipState.exporting ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : isBatch ? (
              <FolderArchive className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="tabular-nums sm:hidden">{mobileLabel}</span>
            <span className="hidden tabular-nums sm:inline">{desktopLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
