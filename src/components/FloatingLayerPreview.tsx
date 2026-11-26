import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Eye, Minimize2 } from 'lucide-react';
import { FramingState, LinePreset, LogoWatermarkAsset, SourceAsset } from '../types';
import { renderFramedCanvas, supportsAlphaExport } from '../utils/imageEngine';

interface FloatingLayerPreviewProps {
  source: SourceAsset;
  logoAsset: LogoWatermarkAsset | null;
  preset: LinePreset;
  framing: FramingState;
  visible: boolean;
  onJumpToStage: () => void;
}

export function FloatingLayerPreview({
  source,
  logoAsset,
  preset,
  framing,
  visible,
  onJumpToStage,
}: FloatingLayerPreviewProps) {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [minimized, setMinimized] = useState(false);

  const showAlphaCheckerboard = supportsAlphaExport(framing, source);

  useEffect(() => {
    if (!visible || minimized) return;
    const canvas = miniCanvasRef.current;
    if (!canvas) return;

    const maxDim = 280;
    const aspect = preset.width / Math.max(1, preset.height);
    let w = maxDim;
    let h = Math.round(maxDim / aspect);
    if (h > maxDim) {
      h = maxDim;
      w = Math.round(maxDim * aspect);
    }
    const targetW = Math.max(32, w);
    const targetH = Math.max(32, h);

    renderFramedCanvas(canvas, source, targetW, targetH, framing, logoAsset, 0);

    const hasAnimatedLogo =
      Boolean(logoAsset) &&
      framing.logoWatermark.enabled &&
      (framing.logoWatermark.gifMotion !== 'none' || Boolean(logoAsset?.isAnimatedGif));

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasAnimatedLogo || reduced) return;

    let rafId = 0;
    const startTs = performance.now();
    let lastDrawTs = 0;

    const tick = (now: number) => {
      if (now - lastDrawTs >= 50) {
        lastDrawTs = now;
        renderFramedCanvas(
          canvas,
          source,
          targetW,
          targetH,
          framing,
          logoAsset,
          now - startTs
        );
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [visible, minimized, source, logoAsset, preset, framing]);

  if (!visible) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-[4.4rem] right-3 z-30 flex items-center gap-1.5 sm:bottom-5 sm:right-5">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Show floating live preview"
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#CBB89D] bg-[#FFFDF8]/96 px-3 py-1.5 text-xs font-semibold text-[#2B1E16] shadow-md backdrop-blur-sm transition-colors hover:border-[#C25E00] hover:text-[#C25E00]"
        >
          <Eye className="h-3.5 w-3.5 text-[#C25E00]" aria-hidden="true" />
          <span>Live Preview</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Floating live preview"
      className="fixed bottom-[4.35rem] right-3 z-30 w-[144px] overflow-hidden rounded-xl border border-[#CBB89D] bg-[#FFFDF8]/96 p-2 shadow-lg backdrop-blur-sm transition-all duration-150 sm:bottom-5 sm:right-5 sm:w-[196px] sm:p-2.5"
    >
      <div className="mb-1.5 flex items-center justify-between gap-1.5">
        <span className="truncate font-mono text-[10px] font-semibold tabular-nums text-[#2B1E16]">
          Live · {preset.ratioLabel}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onJumpToStage}
            aria-label="Scroll back to main canvas"
            title="Jump to main stage"
            className="flex h-6 w-6 items-center justify-center rounded text-[#6E5849] transition-colors hover:bg-[#F3EBDD] hover:text-[#C25E00]"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize floating preview"
            title="Minimize floating preview"
            className="flex h-6 w-6 items-center justify-center rounded text-[#6E5849] transition-colors hover:bg-[#F3EBDD] hover:text-[#2B1E16]"
          >
            <Minimize2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onJumpToStage}
        aria-label="Tap preview to jump to main stage"
        className="block w-full overflow-hidden rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E00]"
        style={
          showAlphaCheckerboard
            ? {
                backgroundColor: '#FFFDF8',
                backgroundImage:
                  'linear-gradient(45deg, #E4D7C3 25%, transparent 25%), linear-gradient(-45deg, #E4D7C3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E4D7C3 75%), linear-gradient(-45deg, transparent 75%, #E4D7C3 75%)',
                backgroundSize: '10px 10px',
                backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
              }
            : undefined
        }
      >
        <div
          className="mx-auto flex items-center justify-center"
          style={{
            aspectRatio: `${preset.width} / ${preset.height}`,
            maxHeight: '108px',
          }}
        >
          <canvas ref={miniCanvasRef} className="block h-full w-full object-contain" />
        </div>
      </button>
    </aside>
  );
}
