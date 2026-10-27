"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { adsenseScriptSrc } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Fixed id so next/script loads Google's ad script once per page, however
 * many approved units render (and across client navigations).
 */
export const ADSENSE_SCRIPT_ID = "adsbygoogle-js";

/**
 * One responsive AdSense unit, clearly labeled. Space is reserved up front so
 * the page never jumps when the ad loads.
 *
 * This is the ONLY place Google's ad script is loaded: it rides along with an
 * approved unit, so pages without one (every ad-free page included) never load
 * it. Auto ads must stay OFF in the AdSense dashboard; placements are
 * code-controlled and approved by The Artist Post.
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
      // Queues this unit; adsbygoogle.js drains the queue once it loads.
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
      <Script
        id={ADSENSE_SCRIPT_ID}
        src={adsenseScriptSrc(client)}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
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
