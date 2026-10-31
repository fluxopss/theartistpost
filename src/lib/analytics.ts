export type AnalyticsEvent =
  | "cta_call"
  | "cta_involve"
  | "cta_donate"
  | "involve_submit"
  | "subscribe_submit"
  | "app_install";

type EventPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    fluxPulse?: { event: (name: string, props?: EventPayload) => void };
    /** gtag.js, present only when GA4 is configured (see lib/google.ts). */
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  payload: EventPayload = {},
): void {
  if (typeof window === "undefined") return;
  try {
    window.fluxPulse?.event(event, payload);
  } catch {
    // Pulse must never break a CTA
  }
  try {
    // Same event, same payload, to GA4. Payloads carry only source/intent
    // style strings: never an email, handle or user id.
    window.gtag?.("event", event, payload);
  } catch {
    // GA must never break a CTA either
  }
}
