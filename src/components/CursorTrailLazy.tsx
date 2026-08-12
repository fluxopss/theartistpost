"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CursorTrail = dynamic(
  () =>
    import("@/components/CursorTrail").then((m) => ({
      default: m.CursorTrail,
    })),
  { ssr: false },
);

/** Skip loading cursor JS on touch / reduced-motion devices. */
export function CursorTrailLazy() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const noHover = window.matchMedia("(hover: none)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!(coarse || noHover || reduce));
  }, []);

  if (!enabled) return null;
  return <CursorTrail />;
}
