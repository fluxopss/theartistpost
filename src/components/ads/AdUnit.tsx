"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One responsive AdSense unit, clearly labeled. Space is reserved up front so
 * the page never jumps when the ad loads.
 */
export function AdUnit({
  client,
  slot,
  placement,
}: {
  client: string;
  slot: string;
  placement: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocked or not loaded yet: the reserved space stays quietly empty.
    }
  }, []);

  return (
    <aside
      aria-label="Advertisement"
      data-ad-placement={placement}
      className="mx-auto my-10 w-full max-w-3xl"
    >
      <p className="mb-2 text-center text-[10px] uppercase tracking-[0.2em] text-paper-muted">
        Advertisement · helps keep artist opportunities free
      </p>
      <div className="min-h-[250px]">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
