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
import { POST as rsvpLegacy } from "@/app/api/night/rsvp/route";
import { POST as stewardLegacy } from "@/app/api/donate/steward/route";
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

const subscriber = { email: "fan@gmail.com" };
const inquiry = {
  name: "Avery Artist",
  email: "avery@gmail.com",
  intent: "space",
  message: "I would like a weekend slot at Hacienda.",
};
const seat = { eventId: "e9", name: "Ada", email: "ada@gmail.com", party: 2 };

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
      email: "fan@gmail.com",
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
      data: { code: passCode("e9", "ada@gmail.com") },
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

describe("website lead routes keep their shapes", () => {
  it("/api/subscribe keeps its shape and sends no platform", async () => {
    const response = await subscribeLegacy(post("/api/subscribe", subscriber));
    expect(await response.json()).toEqual({ ok: true });
    expect(sentLead()).not.toHaveProperty("platform");
  });

  it("/api/involve answers a 502 with the friendly message, never the webhook error", async () => {
    fetchMock.mockImplementation(async () => new Response("down", { status: 503 }));
    const response = await involveLegacy(post("/api/involve", inquiry));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/GHL|webhook|503/i);
  });

  it("/api/night/rsvp keeps its success shape", async () => {
    const response = await rsvpLegacy(post("/api/night/rsvp", seat));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      delivered: true,
      code: passCode("e9", "ada@gmail.com"),
    });
  });

  it("/api/donate/steward keeps its success shape", async () => {
    const response = await stewardLegacy(
      post("/api/donate/steward", { name: "Dana Donor", email: "dana@gmail.com" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("website lead routes are rate limited", () => {
  const routes = [
    ["/api/subscribe", () => subscribeLegacy, subscriber],
    ["/api/involve", () => involveLegacy, inquiry],
    ["/api/night/rsvp", () => rsvpLegacy, seat],
    [
      "/api/donate/steward",
      () => stewardLegacy,
      { name: "Dana Donor", email: "dana@gmail.com" },
    ],
  ] as const;

  /** Same body with a different guest's email, as at a shared venue Wi-Fi. */
  const asGuest = (body: object, i: number) => ({
    ...body,
    email: `guest${i}@gmail.com`,
  });

  async function expectFriendly429(response: Response) {
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
    const json = await response.json();
    expect(json).toEqual({
      ok: false,
      error: "Too many tries. Wait a bit and send it again.",
    });
  }

  for (const [path, handler, body] of routes) {
    it(`${path}: 20 guests on one venue IP all get through`, async () => {
      for (let i = 0; i < 20; i += 1) {
        const ok = await handler()(post(path, asGuest(body, i)));
        expect(ok.status).toBe(200);
      }
    });

    it(`${path}: the same email five times, then a friendly 429`, async () => {
      for (let i = 0; i < 5; i += 1) {
        const ok = await handler()(post(path, body));
        expect(ok.status).toBe(200);
      }
      await expectFriendly429(await handler()(post(path, body)));

      // Even from another IP: the email has its own budget.
      await expectFriendly429(
        await handler()(post(path, body, "198.51.100.99")),
      );
      // Same email typed with other casing and spaces counts as the same person.
      await expectFriendly429(
        await handler()(
          post(path, { ...body, email: `  ${body.email.toUpperCase()} ` }, "198.51.100.98"),
        ),
      );
      // Another guest is not held back by it.
      expect((await handler()(post(path, asGuest(body, 99)))).status).toBe(200);
    });

    it(`${path}: forty per IP, then a friendly 429`, async () => {
      for (let i = 0; i < 40; i += 1) {
        await handler()(post(path, asGuest(body, i)));
      }
      await expectFriendly429(await handler()(post(path, asGuest(body, 40))));

      // A different caller still gets through.
      const other = await handler()(post(path, asGuest(body, 41), "198.51.100.99"));
      expect(other.status).toBe(200);
    });
  }

  it("a spoofed leading x-forwarded-for does not reset the budget", async () => {
    for (let i = 0; i < 40; i += 1) {
      await subscribeLegacy(
        post("/api/subscribe", asGuest(subscriber, i), `10.0.0.${i}, 203.0.113.50`),
      );
    }
    const limited = await subscribeLegacy(
      post("/api/subscribe", asGuest(subscriber, 40), "10.9.9.9, 203.0.113.50"),
    );
    expect(limited.status).toBe(429);
  });

  it("the website and v1 budgets are separate", async () => {
    for (let i = 0; i < 5; i += 1) {
      await subscribeV1(post("/api/v1/subscribe", subscriber));
    }
    const web = await subscribeLegacy(post("/api/subscribe", subscriber));
    expect(web.status).toBe(200);
  });

  it("v1 keeps five per IP per route, whatever the email", async () => {
    for (let i = 0; i < 5; i += 1) {
      const ok = await subscribeV1(post("/api/v1/subscribe", asGuest(subscriber, i)));
      expect(ok.status).toBe(200);
    }
    const limited = await subscribeV1(
      post("/api/v1/subscribe", asGuest(subscriber, 5)),
    );
    expect(limited.status).toBe(429);
  });
});
