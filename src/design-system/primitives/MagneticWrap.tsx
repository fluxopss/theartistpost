"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Lazily loads Framer magnetic effect only when actually enabled. */
export function MagneticWrap({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [Inner, setInner] = useState<null | ((p: { children: ReactNode }) => ReactNode)>(
    null,
  );

  useEffect(() => {
    if (!enabled) {
      setInner(null);
      return;
    }
    let cancelled = false;
    import("./MagneticInner").then((m) => {
      if (!cancelled) setInner(() => m.MagneticInner);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !Inner) return <>{children}</>;
  return <Inner>{children}</Inner>;
}
