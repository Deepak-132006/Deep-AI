import {
  PHASE_DOT,
  type OrbPhase,
} from "../../constants/orbConfig";

type OrbStatusProps = {
  phase: OrbPhase;
  status: string;
  reply: string;
};

export default function OrbStatus({
  phase,
  status,
  reply,
}: OrbStatusProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      title={phase === "speaking" && reply ? reply : status}
      className="flex max-w-36 items-center gap-1.5 rounded-full bg-slate-900/85 px-2 py-1 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur"
    >
      {phase === "thinking" ? (
        <span
          aria-label="Thinking"
          role="status"
          className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300 motion-reduce:animate-none"
        />
      ) : (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${PHASE_DOT[phase]}`}
        />
      )}

      {phase !== "thinking" && (
        <span className="truncate">{status}</span>
      )}
    </span>
  );
}