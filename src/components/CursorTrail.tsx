"use client";

import { useEffect, useState } from "react";
import { useIsTouchDevice, useReducedMotion } from "@/hooks/useMedia";

export function CursorTrail() {
  const touch = useIsTouchDevice();
  const reduce = useReducedMotion();
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  const enabled = !touch && !reduce;

  // Decorative glow that follows the pointer. The real system cursor always
  // stays visible on top (never `cursor: none`): on dark sections a hidden
  // pointer was impossible to find, links lost the hand cursor and text
  // fields lost the text cursor.
  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="cursor-trail pointer-events-none fixed z-[70] mix-blend-screen"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: visible ? 1 : 0,
        transform: "translate(-50%, -50%)",
      }}
      aria-hidden
    >
      <div className="h-3 w-3 rounded-full bg-spark-teal shadow-[0_0_16px_rgba(46,196,182,0.8)]" />
      <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-spark-coral/50" />
    </div>
  );
}
