"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAdFreePath } from "@/lib/ads/placements";

/**
 * The runtime ad-free check: whatever page an <AdSlot> ends up on, it renders
 * nothing (no unit, no ad script, no preview outline) when the current route
 * is on the ad-free list. Runs during SSR too, so ad-free HTML never carries
 * ad markup. An unknown route fails closed.
 */
export function AdRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname || isAdFreePath(pathname)) return null;
  return <>{children}</>;
}
