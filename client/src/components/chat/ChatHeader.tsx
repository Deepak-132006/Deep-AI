import { Monitor } from "lucide-react";

interface ChatHeaderProps {
  onOrbClick: () => void;
  isDeepMode: boolean;
  onToggleMode: () => void;
}

export default function ChatHeader({ onOrbClick }: ChatHeaderProps) {
  return (
    <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200/70 bg-white px-6">
      <div className="flex w-full items-center justify-end gap-4">
        <div className="h-6 w-px bg-slate-200" />

        <button
          type="button"
          onClick={onOrbClick}
          aria-label="Toggle desktop orb"
          title="Toggle desktop orb"
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          <Monitor
            size={16}
            className="transition-transform group-hover:scale-110"
          />
          <span className="hidden sm:inline">Deep Mode</span>
        </button>
      </div>
    </header>
  );
}
