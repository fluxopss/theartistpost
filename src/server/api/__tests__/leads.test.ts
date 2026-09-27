import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentEvent } from "@/lib/content";

const fixtures = vi.hoisted(() => ({ events: [] as ContentEvent[] }));

vi.mock("@/lib/content", () => ({
  content: {
    getEvents: async () => fixtures.events,
    getEventById: async (id: string) =>
      fixtures.events.find((event) => event.id === id) ?? null,
  },
}));

import { POST as rsvpV1 } from "@/app/api/v1/night/rsvp/route";
import { POST as involveV1 } from "@/app/api/v1/involve/route";
import { POST as subscribeV1 } from "@/app/api/v1/subscribe/route";
import { POST as subscribeLegacy } from "@/app/api/subscribe/route";
import { POST as involveLegacy } from "@/app/api/involve/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { passCode } from "@/features/night/rsvp";

const OPEN_NIGHT: ContentEvent = {
  id: "e9",
  title: "Kindness Always Community Night",
  artist: "The Artist Post",
  medium: "community",
  start: "2099-09-26T16:00:00-04:00",
  end: "2099-09-26T21:00:00-04:00",
  venue: "Hacienda · 522 Clematis Street",
  description: "Test night",
};

const CLOSED_NIGHT: ContentEvent = {
  ...OPEN_NIGHT,
  id: "e1",
  start: "2001-01-01T16:00:00-05:00",
  end: "2001-01-01T21:00:00-05:00",
};

const fetchMock = vi.fn();

function post(path: string, body: unknown, ip = "203.0.113.7") {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** JSON body of the n-th webhook call. */
function sentLead(n = 0): Record<string, unknown> {
  const init = fetchMock.mock.calls[n]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}

const subscriber = { email: "fan@example.com" };
const inquiry = {
  name: "Avery Artist",
  email: "avery@example.com",
  intent: "space",
  message: "I would like a weekend slot at Hacienda.",
};
const seat = { eventId: "e9", name: "Ada", email: "ada@example.com", party: 2 };

beforeEach(() => {
  resetRateLimits();
  fixtures.events = [OPEN_NIGHT, CLOSED_NIGHT];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("ok", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GHL_WEBHOOK_URL", "https://hooks.example.test/lead");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("v1 lead rate limit", () => {
  it("allows five per IP per route, then 429s with retryAfterSec", async () => {
    for (let i = 0; i < 5; i += 1) {
      const ok = await subscribeV1(post("/api/v1/subscribe", subscriber));
      expect(ok.status).toBe(200);
    }

    const limited = await subscribeV1(post("/api/v1/subscribe", subscriber));
    expect(limited.status).toBe(429);
    const retryAfter = Number(limited.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(600);
    const body = await limited.json();
    expect(body).toEqual({
      ok: false,
      error: {
        code: "rate_limited",
        message: expect.any(String),
        retryAfterSec: retryAfter,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);

    // Another IP and another route keep their own budgets.
    expect(
      (await subscribeV1(post("/api/v1/subscribe", subscriber, "198.51.100.1"))).status,
    ).toBe(200);
    expect((await involveV1(post("/api/v1/involve", inquiry))).status).toBe(200);
  });
});

describe("POST /api/v1/subscribe", () => {
  it("wraps success and tags the CRM lead with platform", async () => {
    const response = await subscribeV1(
      post("/api/v1/subscribe", { ...subscriber, platform: "ios" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { accepted: true } });
    expect(sentLead()).toMatchObject({
      email: "fan@example.com",
      source: "theartistpost-subscribe",
      intent: "subscribe",
      platform: "ios",
    });
  });

  it("rejects an unknown platform", async () => {
    const response = await subscribeV1(
      post("/api/v1/subscribe", { ...subscriber, platform: "blackberry" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.fields.platform).toMatch(/ios, android, web/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a bad email and a non-JSON body", async () => {
    const bad = await (
      await subscribeV1(post("/api/v1/subscribe", { email: "nope" }))
    ).json();
    expect(bad.error).toEqual({
      code: "validation_failed",
      message: "Enter a valid email address.",
      fields: { email: "Enter a valid email address." },
    });

    const garbled = await subscribeV1(post("/api/v1/subscribe", "{not json"));
    expect(garbled.status).toBe(400);
    expect((await garbled.json()).error.code).toBe("validation_failed");
  });

  it("maps a webhook timeout to upstream_unavailable", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );
    const response = await subscribeV1(post("/api/v1/subscribe", subscriber));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("upstream_unavailable");
    expect(body.error.message).not.toMatch(/GHL|webhook|timed out/i);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeDefined();
  });

  it("maps a webhook error status to upstream_unavailable", async () => {
    fetchMock.mockImplementation(async () => new Response("down", { status: 500 }));
    const response = await subscribeV1(post("/api/v1/subscribe", subscriber));
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("upstream_unavailable");
  });
});

describe("POST /api/v1/involve", () => {
  it("returns field errors from the shared validation", async () => {
    const response = await involveV1(
      post("/api/v1/involve", { ...inquiry, name: "A", message: "Hi" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.fields).toMatchObject({
      name: "Name is required.",
      message: "Tell us a little about how you want to show up.",
    });
  });

  it("sends the same lead as the website, plus platform", async () => {
    const response = await involveV1(
      post("/api/v1/involve", { ...inquiry, platform: "android" }),
    );
    expect(await response.json()).toEqual({ ok: true, data: { accepted: true } });
    expect(sentLead()).toMatchObject({
      source: "theartistpost-get-involved",
      page: "/get-involved",
      intent: "space",
      platform: "android",
    });
  });
});

describe("POST /api/v1/night/rsvp", () => {
  it("returns the door pass code", async () => {
    const response = await rsvpV1(post("/api/v1/night/rsvp", seat));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { code: passCode("e9", "ada@example.com") },
    });
    expect(sentLead()).toMatchObject({
      intent: "rsvp",
      source: "theartistpost-night-rsvp",
    });
  });

  it("404s an unknown night and 409s a closed one", async () => {
    const missing = await rsvpV1(post("/api/v1/night/rsvp", { ...seat, eventId: "zz" }));
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("not_found");

    const closed = await rsvpV1(post("/api/v1/night/rsvp", { ...seat, eventId: "e1" }));
    expect(closed.status).toBe(409);
    expect((await closed.json()).error).toEqual({
      code: "conflict",
      message: "That night has already closed.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not hand out a pass when the CRM is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await rsvpV1(post("/api/v1/night/rsvp", seat));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("upstream_unavailable");
    expect(body).not.toHaveProperty("data");
  });
});

describe("website lead routes are unchanged", () => {
  it("/api/subscribe keeps its shape and sends no platform", async () => {
    const response = await subscribeLegacy(post("/api/subscribe", subscriber));
    expect(await response.json()).toEqual({ ok: true });
    expect(sentLead()).not.toHaveProperty("platform");
  });

  it("/api/involve still reports the upstream error with a 502", async () => {
    fetchMock.mockImplementation(async () => new Response("down", { status: 503 }));
    const response = await involveLegacy(post("/api/involve", inquiry));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: "GHL webhook failed (503)",
    });
  });

  it("website routes are not rate limited by the v1 budget", async () => {
    for (let i = 0; i < 7; i += 1) {
      const response = await subscribeLegacy(post("/api/subscribe", subscriber));
      expect(response.status).toBe(200);
    }
  });
});
