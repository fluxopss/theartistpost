"use client";

import dynamic from "next/dynamic";
import { useIsTouchDevice, useReducedMotion } from "@/hooks/useMedia";

const CursorTrail = dynamic(
  () =>
    import("@/components/CursorTrail").then((m) => ({
      default: m.CursorTrail,
    })),
  { ssr: false },
);

/** Skip loading cursor JS on touch / reduced-motion devices. */
export function CursorTrailLazy() {
  // useIsTouchDevice reports touch on the server, so the trail stays off until hydrated.
  const touch = useIsTouchDevice();
  const reduce = useReducedMotion();

  if (touch || reduce) return null;
  return <CursorTrail />;
}
