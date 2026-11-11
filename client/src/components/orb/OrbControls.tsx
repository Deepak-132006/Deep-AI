import { Maximize2, X } from "lucide-react";

type OrbControlsProps = {
  hovered: boolean;
  onRestore: () => void;
  onClose: () => void;
};

export default function OrbControls({
  hovered,
  onRestore,
  onClose,
}: OrbControlsProps) {
  return (
    <div
      className={`absolute -right-1 -top-1 z-20 flex gap-1 transition-all duration-200 ${
        hovered
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-90 opacity-0 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={onRestore}
        className="flex h-6 cursor-pointer w-6 items-center justify-center rounded-full bg-slate-900/80 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="Restore Chat Mode"
        title="Restore Chat Mode"
      >
        <Maximize2 size={13} />
      </button>

      <button
        type="button"
        onClick={onClose}
        className="flex h-6 w-6 items-center cursor-pointer justify-center rounded-full bg-slate-900/80 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="Close Deep Mode"
        title="Close Deep Mode"
      >
        <X size={13} />
      </button>
    </div>
  );
}