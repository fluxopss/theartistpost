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

/**
 * GA4 key events used for Google Ads conversions (see the TAP ad strategy).
 * Params are source/intent style values only: never an email, name or handle.
 */
export type Ga4Event =
  | { name: "sign_up"; params: { method: string } }
  | { name: "generate_lead"; params: { lead_type: string } }
  | { name: "rsvp"; params: { event_id: string; event_date: string } }
  | {
      name: "beta_install_click";
      params: { platform: "ios" | "android" | "pwa" | "web" };
    };

/** Send one typed GA4 event through the existing gtag setup. No-op when GA4 is off. */
export function trackGa4<N extends Ga4Event["name"]>(
  name: N,
  params: Extract<Ga4Event, { name: N }>["params"],
): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
  } catch {
    // GA must never break a form or a button
  }
}
