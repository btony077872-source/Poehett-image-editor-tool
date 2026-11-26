import { useState } from 'react';
import { Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] font-medium text-[#2B1E16] transition-colors hover:border-[#D97706] hover:text-[#C25E00] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] ${
          compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
      >
        <Smartphone className="h-4 w-4 text-[#C25E00] shrink-0" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E4D7C3] bg-[#FFFDF8] font-medium text-[#2B1E16] transition-colors hover:border-[#D97706] hover:text-[#C25E00] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] ${
            compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2 text-xs'
          }`}
        >
          <Smartphone className="h-4 w-4 text-[#C25E00] shrink-0" aria-hidden="true" />
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
          >
            <div className="w-full max-w-sm rounded-2xl border border-[#E4D7C3] bg-[#FFFDF8] p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <h3
                  id="ios-install-title"
                  className="font-display text-base font-bold text-[#2B1E16]"
                >
                  Install ပိုးဟက် အယ်ဒီတာ on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="flex min-h-[44px] min-w-[44px] -mr-2 -mt-2 items-center justify-center rounded-lg text-[#6E5849] hover:bg-[#F3EBDD] hover:text-[#2B1E16]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#6E5849]">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold text-[#C25E00] pt-0.5">
                    01.
                  </span>
                  <span>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 font-semibold text-[#2B1E16]">
                      <Share className="h-3.5 w-3.5" aria-hidden="true" />
                      Share
                    </span>{' '}
                    button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold text-[#C25E00] pt-0.5">
                    02.
                  </span>
                  <span>
                    Scroll down and tap{' '}
                    <strong className="font-semibold text-[#2B1E16]">
                      Add to Home Screen
                    </strong>{' '}
                    to launch offline like a native app.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#C25E00] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A14B00]"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
