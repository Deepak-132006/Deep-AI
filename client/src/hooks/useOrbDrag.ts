import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { DRAG_THRESHOLD } from "../constants/orbConfig";
import type { MutableRefObject } from "react";

type UseOrbDragProps = {
  applyHover: (on: boolean, force?: boolean) => void;
  isOverOrb: (x: number, y: number) => boolean;
  startOrbVoice: () => void;
  stopOrbVoice: () => void;
  isVoiceActive: () => boolean;
  pointerActiveRef: MutableRefObject<boolean>;
};

export function useOrbDrag({
  applyHover,
  isOverOrb,
  startOrbVoice,
  stopOrbVoice,
  isVoiceActive,
  pointerActiveRef,
}: UseOrbDragProps) {
  const dragRef = useRef({
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    moved: false,
  });

const handleOrbPointerCancel = () => {
  pointerActiveRef.current = false;

  dragRef.current.pointerId = -1;
  dragRef.current.moved = false;
};

  const handleOrbPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (e.button !== 0) return;

    pointerActiveRef.current = true;
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.screenX,
      lastY: e.screenY,
      moved: false,
    };

    applyHover(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Dragging can still work if pointer capture fails.
    }
  };

  const handleOrbPointerMove = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;

    if (drag.pointerId !== e.pointerId) return;

    const dx = e.screenX - drag.lastX;
    const dy = e.screenY - drag.lastY;

    drag.lastX = e.screenX;
    drag.lastY = e.screenY;

    if (
      !drag.moved &&
      Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD
    ) {
      drag.moved = true;
    }

    if (drag.moved) {
      void window.deepAI.moveOrbBy(dx, dy);
    }
  };

  const handleOrbPointerUp = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;
    pointerActiveRef.current = false;

    if (drag.pointerId !== e.pointerId) return;

    const wasDragged = drag.moved;

    drag.pointerId = -1;
    drag.moved = false;

    applyHover(isOverOrb(e.clientX, e.clientY));

    if (!wasDragged) {
      if (isVoiceActive()) {
        stopOrbVoice();
      } else {
        startOrbVoice();
      }
    }
  };

  return {
    dragRef,
    handleOrbPointerCancel,
    handleOrbPointerDown,
    handleOrbPointerMove,
    handleOrbPointerUp,
  };
}