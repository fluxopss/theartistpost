"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroShaderCanvas = dynamic(
  () => import("./HeroShader").then((m) => m.HeroShader),
  { ssr: false },
);

/** Desktop-only canvas accent — skipped on touch / narrow / reduced-motion. */
export function HeroShaderLazy() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!enabled) return null;
  return <HeroShaderCanvas />;
}
