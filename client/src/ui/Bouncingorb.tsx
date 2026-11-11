
import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import type { OrbPhase } from "../constants/orbConfig";

export interface BouncingOrbProps {
  size?: number;
  followCursor?: boolean;
  bounce?: boolean;
  phase?: OrbPhase;
  className?: string;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const GAZE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-1, -0.35],
  [1, -0.35],
  [-0.85, 0.5],
  [0.85, 0.5],
  [0, -0.8],
  [0, 0.6],
  [-0.4, -0.7],
  [0.4, -0.7],
];

const CORE =
  "radial-gradient(circle at 35% 25%, #B8F2FF 0%, #65C9F5 18%, #3978E8 48%, #243B9B 78%, #111B48 100%)";

const PHASE_GLOW: Record<OrbPhase, string> = {
  idle: "rgba(65, 130, 255, 0.35)",
  listening: "rgba(45, 175, 255, 0.65)",
  thinking: "rgba(130, 90, 255, 0.7)",
  speaking: "rgba(55, 210, 235, 0.7)",
  error: "rgba(255, 75, 90, 0.55)",
};

export default function BouncingOrb({
  size = 160,
  followCursor = true,
  bounce = true,
  phase = "idle",
  className = "",
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: BouncingOrbProps) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef(0);

  // Eye movement
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);

  const spring = {
    stiffness: 170,
    damping: 16,
    mass: 0.7,
  };

  const sx = useSpring(gx, spring);
  const sy = useSpring(gy, spring);

  const blink = useMotionValue(1);

  const eyeX = useTransform(sx, (v) => v * size * 0.1);
  const eyeY = useTransform(sy, (v) => v * size * 0.07);
  const eyeRotate = useTransform(sx, [-1, 1], [-7, 7]);

  const coreX = useTransform(sx, (v) => v * size * 0.025);
  const coreY = useTransform(sy, (v) => v * size * 0.02);

  // Idle gaze movement
  useEffect(() => {
    if (reduce || !followCursor) return;

    let timer: ReturnType<typeof setTimeout>;
    let previous = -1;

    const look = () => {
      if (Date.now() - lastPointer.current > 2500) {
        let index = 0;

        do {
          index = Math.floor(Math.random() * GAZE.length);
        } while (index === previous);

        previous = index;

        gx.set(GAZE[index][0]);
        gy.set(GAZE[index][1]);
      }

      timer = setTimeout(look, 1400 + Math.random() * 1200);
    };

    look();

    return () => clearTimeout(timer);
  }, [reduce, followCursor, gx, gy]);

  // Cursor tracking
  useEffect(() => {
    if (reduce || !followCursor) return;

    const handlePointerMove = (event: PointerEvent) => {
      const element = rootRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();

      const dx =
        (event.clientX - (rect.left + rect.width / 2)) / 300;

      const dy =
        (event.clientY - (rect.top + rect.height / 2)) / 300;

      const distance = Math.hypot(dx, dy) || 1;
      const factor = Math.min(1, distance) / distance;

      gx.set(dx * factor);
      gy.set(dy * factor);

      lastPointer.current = Date.now();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [reduce, followCursor, gx, gy]);

  // Natural blinking
  useEffect(() => {
    if (reduce) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const blinkOnce = async () => {
      await animate(blink, 0.08, {
        duration: 0.08,
        ease: "easeIn",
      });

      await animate(blink, 1, {
        duration: 0.14,
        ease: "easeOut",
      });
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        await blinkOnce();

        if (alive && Math.random() < 0.2) {
          await blinkOnce();
        }

        if (alive) schedule();
      }, 2500 + Math.random() * 2500);
    };

    schedule();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reduce, blink]);

  const phaseAnimation = (() => {
    if (!bounce || reduce) return {};

    switch (phase) {
      case "listening":
        return {
          scale: [1, 1.035, 1],
          y: [0, -1.5, 0],
        };

      case "thinking":
        return {
          scale: [1, 1.055, 1],
          y: [0, -2, 0],
        };

      case "speaking":
        return {
          scale: [1, 1.045, 0.99, 1],
          y: [0, -1, 0, -1, 0],
        };

      case "error":
        return {
          x: [0, -2, 2, -1, 0],
        };

      default:
        return {
          scale: [1, 1.015, 1],
          y: [0, -1, 0],
        };
    }
  })();

  const animationDuration =
    phase === "thinking" ? 1.25 :
    phase === "speaking" ? 0.65 :
    phase === "listening" ? 2 :
    phase === "error" ? 0.4 : 3;

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        touchAction: "none",
      }}
      aria-hidden="true"
    >
      {/* Soft ambient glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: "-15%",
          background: `radial-gradient(circle, ${PHASE_GLOW[phase]} 0%, transparent 72%)`,
          filter: "blur(10px)",
        }}
        animate={
          reduce
            ? undefined
            : {
                opacity:
                  phase === "thinking"
                    ? [0.45, 0.95, 0.45]
                    : [0.45, 0.7, 0.45],
                scale:
                  phase === "speaking"
                    ? [1, 1.2, 1]
                    : [1, 1.08, 1],
              }
        }
        transition={{
          duration: animationDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main orb */}
      <motion.div
        className="absolute inset-0 rounded-full will-change-transform"
        style={{
          background: CORE,
          x: coreX,
          y: coreY,
          boxShadow: `
            inset 0 2px 9px rgba(255,255,255,0.5),
            inset 0 -10px 18px rgba(0,0,0,0.35),
            0 4px 18px rgba(20,50,130,0.3)
          `,
        }}
        animate={phaseAnimation}
        transition={{
          duration: animationDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Subtle surface highlight */}
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "48%",
            height: "25%",
            top: "12%",
            left: "16%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)",
            filter: "blur(5px)",
            transform: "rotate(-25deg)",
          }}
        />

        {/* Animated eyes */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            gap: size * 0.11,
            x: eyeX,
            y: eyeY,
            rotate: eyeRotate,
            scaleY: blink,
          }}
        >
          {[0, 1].map((index) => (
            <div
              key={index}
              className="rounded-full bg-white"
              style={{
                width: size * 0.075,
                height: size * 0.17,
                boxShadow: "0 0 8px rgba(255,255,255,0.85)",
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
