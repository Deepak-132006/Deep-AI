
import { useCallback, useEffect, useRef, useState } from "react";

export function useOrbInteraction(onEscape: () => void) {
  const orbRootRef = useRef<HTMLDivElement>(null);
  const interactiveRef = useRef(false);
  const pointerActiveRef = useRef(false);

  // Keep the latest callback without recreating event listeners.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const [hovered, setHovered] = useState(false);

  const setInteractive = useCallback((on: boolean, force = false) => {
    if (!force && interactiveRef.current === on) return;

    interactiveRef.current = on;
    void window.deepAI.setOrbMouseInteractive(on);
  }, []);

  const applyHover = useCallback(
    (on: boolean, force = false) => {
      setHovered(on);
      setInteractive(on, force);
    },
    [setInteractive],
  );

  const isOverOrb = useCallback((x: number, y: number) => {
    const target = document.elementFromPoint(x, y);

    return Boolean(
      target && orbRootRef.current?.contains(target),
    );
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (pointerActiveRef.current) return;

      applyHover(isOverOrb(e.clientX, e.clientY));
    };

    const reset = () => {
      if (pointerActiveRef.current) return;

      applyHover(false, true);
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        reset();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeRef.current();
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("blur", reset);

    document.documentElement.addEventListener("mouseleave", reset);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("blur", reset);

      document.documentElement.removeEventListener("mouseleave", reset);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("keydown", handleKey);
    };
  }, [applyHover, isOverOrb]);

  return {
    orbRootRef,
    hovered,
    applyHover,
    isOverOrb,
    pointerActiveRef,
  };
}
