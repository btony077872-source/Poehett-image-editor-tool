import { WatermarkAnchor } from '../types';

interface WatermarkAnchorPickerProps {
  label: string;
  value: WatermarkAnchor;
  onChange: (anchor: WatermarkAnchor) => void;
}

const GRID_ANCHORS: { id: Exclude<WatermarkAnchor, 'tile'>; label: string }[] = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'middle-left', label: 'Middle Left' },
  { id: 'center', label: 'Center' },
  { id: 'middle-right', label: 'Middle Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

export function WatermarkAnchorPicker({
  label,
  value,
  onChange,
}: WatermarkAnchorPickerProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[#4A3628]">{label}</span>
        <button
          type="button"
          onClick={() => onChange(value === 'tile' ? 'bottom-right' : 'tile')}
          aria-pressed={value === 'tile'}
          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            value === 'tile'
              ? 'border-[#D97706] bg-[#D97706]/10 text-[#2B1E16]'
              : 'border-[#E4D7C3] bg-[#FFFDF8] text-[#6E5849] hover:text-[#2B1E16]'
          }`}
        >
          Tile Repeat
        </button>
      </div>

      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-3 gap-1 rounded-lg border border-[#E4D7C3] bg-[#FAF6EE] p-1"
      >
        {GRID_ANCHORS.map((anchor) => {
          const active = value === anchor.id;
          return (
            <button
              key={anchor.id}
              type="button"
              onClick={() => onChange(anchor.id)}
              aria-label={anchor.label}
              aria-pressed={active}
              title={anchor.label}
              className={`flex h-7 items-center justify-center rounded transition-colors ${
                active
                  ? 'bg-[#C25E00] text-white'
                  : 'bg-[#FFFDF8] text-[#8D7564] hover:bg-[#F3EBDD] hover:text-[#2B1E16]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-xs ${
                  active ? 'bg-white' : 'bg-current opacity-60'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
