
export type OrbPhase =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export const API_BASE = "http://127.0.0.1:8000";

export const IDLE_STATUS = "Click me";

export const DRAG_THRESHOLD = 3;

export const PHASE_DOT: Record<OrbPhase, string> = {
  idle: "bg-slate-400",

  listening:
    "bg-emerald-400 animate-pulse motion-reduce:animate-none",

  thinking:
    "bg-amber-400 animate-pulse motion-reduce:animate-none",

  speaking: "bg-[#7C93F5]",

  error: "bg-red-400",
};

export const PHASE_RING: Record<OrbPhase, string> = {
  idle: "opacity-0",

  listening:
    "ring-2 ring-emerald-400/60 animate-pulse motion-reduce:animate-none",

  thinking:
    "border-2 border-amber-400 border-t-transparent animate-spin motion-reduce:animate-none",

  speaking:
    "ring-2 ring-[#7C93F5]/80 animate-pulse motion-reduce:animate-none",

  error: "ring-2 ring-red-400/70",
};
