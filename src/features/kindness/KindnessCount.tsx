"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/shared/lib/cn";

export function KindnessCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce || prev.current === value) {
      prev.current = value;
      return;
    }
    const from = prev.current;
    prev.current = value;
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return (
    <span className={cn("kindness-count", className)} aria-live="polite">
      {reduce ? value : shown}
    </span>
  );
}
