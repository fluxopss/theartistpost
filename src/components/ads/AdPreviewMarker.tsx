"use client";

import { useEffect, useState } from "react";

const FLAG = "tap-ad-preview";

/** True when the visitor opened any page with ?ad-preview=1 this session. */
function previewOn(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get("ad-preview");
    if (param === "1") window.sessionStorage.setItem(FLAG, "1");
    if (param === "0") window.sessionStorage.removeItem(FLAG);
    return window.sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Invisible to everyone, except in preview mode: then it outlines a proposed
 * ad spot on the real page so Robbie can see exactly where an ad would sit.
 * Renders null on the server and first paint, so hydration always matches.
 */
export function AdPreviewMarker({ label, why }: { label: string; why: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Read once after mount; preview is opt-in per browser tab session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(previewOn());
  }, []);

  if (!show) return null;

  return (
    <aside
      aria-label={`Proposed ad spot: ${label}`}
      data-ad-preview
      className="mx-auto my-10 flex min-h-[250px] w-full max-w-3xl flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-spark-coral/70 bg-surface-glass px-6 py-8 text-center"
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-spark-coral">
        Proposed ad spot · preview only
      </p>
      <p className="display text-lg text-paper">{label}</p>
      <p className="max-w-md text-sm text-paper-muted">{why}</p>
    </aside>
  );
}
