import { Crop, LayoutGrid, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { MobileTab } from '../types';

interface MobileBottomTabsProps {
  activeTab: MobileTab;
  isPanelOpen: boolean;
  onSelectTab: (tab: MobileTab) => void;
}

const TABS: {
  id: MobileTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: 'presets', label: 'Presets', icon: LayoutGrid },
  { id: 'fit', label: 'Fit', icon: Crop },
  { id: 'quality', label: 'Quality', icon: SlidersHorizontal },
  { id: 'preview', label: 'Preview', icon: MessageSquare },
];

export function MobileBottomTabs({
  activeTab,
  isPanelOpen,
  onSelectTab,
}: MobileBottomTabsProps) {
  return (
    <nav
      aria-label="Mobile converter tools"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4D7C3] bg-[#FFFDF8]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid h-14 grid-cols-4 items-center">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = isPanelOpen && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-pressed={isActive}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#D97706] ${
                isActive
                  ? 'text-[#C25E00]'
                  : 'text-[#6E5849] hover:text-[#2B1E16]'
              }`}
            >
              <Icon className="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-medium tracking-tight leading-none mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
