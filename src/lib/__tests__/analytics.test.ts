import { afterEach, describe, expect, it, vi } from "vitest";
import { trackGa4 } from "@/lib/analytics";

describe("trackGa4", () => {
  afterEach(() => {
    delete window.gtag;
  });

  it("sends the typed event through gtag", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackGa4("rsvp", { event_id: "n1", event_date: "2026-12-01T00:00:00Z" });
    expect(gtag).toHaveBeenCalledWith("event", "rsvp", {
      event_id: "n1",
      event_date: "2026-12-01T00:00:00Z",
    });
  });

  it("is a no-op when GA4 is off and never throws", () => {
    expect(() => trackGa4("sign_up", { method: "email" })).not.toThrow();
    window.gtag = () => {
      throw new Error("boom");
    };
    expect(() => trackGa4("generate_lead", { lead_type: "member" })).not.toThrow();
  });
});
