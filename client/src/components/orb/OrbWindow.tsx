import { useCallback } from "react";

import BouncingOrb from "../../ui/Bouncingorb";

import OrbStatus from "./OrbStatus";
import OrbControls from "./OrbControls";

import { PHASE_RING } from "../../constants/orbConfig";

import { useOrbVoice } from "../../hooks/useOrbVoice";
import { useOrbDrag } from "../../hooks/useOrbDrag";
import { useOrbInteraction } from "../../hooks/useOrbInteraction";

export default function OrbWindow() {
  const {
    orbPhase,
    orbStatus,
    orbReply,
    orbVoiceRef,
    startOrbVoice,
    stopOrbVoice,
  } = useOrbVoice();

  const handleEscape = useCallback(() => {
    if (orbVoiceRef.current) {
      stopOrbVoice();
    }
  }, [orbVoiceRef, stopOrbVoice]);

  const { orbRootRef, hovered, applyHover, isOverOrb, pointerActiveRef } =
    useOrbInteraction(handleEscape);

  const {
    dragRef,
    handleOrbPointerCancel,
    handleOrbPointerDown,
    handleOrbPointerMove,
    handleOrbPointerUp,
  } = useOrbDrag({
    applyHover,
    isOverOrb,
    startOrbVoice,
    stopOrbVoice,
    pointerActiveRef,
    isVoiceActive: () => Boolean(orbVoiceRef.current),
  });

  function restoreChat() {
    stopOrbVoice();

    // Reset click-through state before hiding the window.
    applyHover(false, true);

    void window.deepAI.showChat();
  }

  function closeOrb() {
    stopOrbVoice();
    applyHover(false, true);

    void window.deepAI.closeOrb();
  }

  return (
    <main className="fixed inset-0 select-none overflow-hidden bg-transparent">
      <div
        ref={orbRootRef}
        className="group cursor-grab absolute bottom-2 right-2 flex h-[74px] w-[74px]  items-center justify-center"
        onMouseEnter={() => applyHover(true)}
        onMouseLeave={() => {
          if (dragRef.current.pointerId === -1) {
            applyHover(false);
          }
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="relative flex h-[50px] w-[50px] items-center justify-center">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -inset-1 rounded-full transition-opacity duration-200 ${PHASE_RING[orbPhase]}`}
            />

            <BouncingOrb
              size={50}
              phase={orbPhase}
              onPointerDown={handleOrbPointerDown}
              onPointerMove={handleOrbPointerMove}
              onPointerUp={handleOrbPointerUp}
              onPointerCancel={handleOrbPointerCancel}
            />
          </div>

          <OrbStatus phase={orbPhase} status={orbStatus} reply={orbReply} />
        </div>

        <OrbControls
          hovered={hovered}
          onRestore={restoreChat}
          onClose={closeOrb}
        />
      </div>
    </main>
  );
}
