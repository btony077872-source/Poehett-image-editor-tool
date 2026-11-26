import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[#F3D092] bg-[#FEF3C7] px-4 py-2 text-xs text-[#78350F]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-[#B45309]" aria-hidden="true" />
        <span>
          Offline mode — image conversion and ZIP export continue working locally on your device.
        </span>
      </div>
    </div>
  );
}
