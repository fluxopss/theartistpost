"use client";

import dynamic from "next/dynamic";

const CursorTrail = dynamic(
  () =>
    import("@/components/CursorTrail").then((m) => ({
      default: m.CursorTrail,
    })),
  { ssr: false },
);

export function CursorTrailLazy() {
  return <CursorTrail />;
}
