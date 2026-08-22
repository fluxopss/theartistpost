"use client";

import type { ReactNode } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

type TrackClickProps = {
  event: AnalyticsEvent;
  payload?: Record<string, string | number | boolean | undefined>;
  children: ReactNode;
};

/** Client wrapper so server chrome can fire Pulse without passing handlers into links. */
export function TrackClick({ event, payload = {}, children }: TrackClickProps) {
  return (
    <span className="contents" onClick={() => trackEvent(event, payload)}>
      {children}
    </span>
  );
}
