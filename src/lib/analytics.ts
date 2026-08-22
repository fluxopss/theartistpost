export type AnalyticsEvent =
  | "cta_call"
  | "cta_involve"
  | "cta_donate"
  | "involve_submit";

type EventPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    fluxPulse?: { event: (name: string, props?: EventPayload) => void };
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
}
