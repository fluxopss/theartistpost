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

import { GET as listEvents } from "@/app/api/v1/events/route";
import { GET as getEvent } from "@/app/api/v1/events/[id]/route";
import { GET as getFeatured } from "@/app/api/v1/night/featured/route";

const night = (
  id: string,
  start: string,
  end: string,
  extra: Partial<ContentEvent> = {},
): ContentEvent => ({
  id,
  title: `Night ${id}`,
  artist: "The Artist Post",
  medium: "community",
  start,
  end,
  venue: "Hacienda · 522 Clematis Street",
  description: "Test night",
  ...extra,
});

// Deliberately out of order.
const LATE = night("late", "2030-03-20T18:00:00-04:00", "2030-03-20T21:00:00-04:00");
const EARLY = night(
  "early",
  "2030-03-01T18:00:00-05:00",
  "2030-03-01T21:00:00-05:00",
  { comingSoon: true },
);
const MID = night("mid", "2030-03-10T18:00:00-04:00", "2030-03-10T21:00:00-04:00");

const at = (iso: string) => vi.setSystemTime(new Date(iso));
const list = (query = "") =>
  listEvents(new Request(`http://localhost/api/v1/events${query}`));
const one = (id: string) =>
  getEvent(new Request(`http://localhost/api/v1/events/${id}`), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  fixtures.events = [LATE, EARLY, MID];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/v1/events", () => {
  it("sorts by start and maps status from the clock", async () => {
    at("2030-03-10T19:30:00-04:00"); // during MID
    const response = await list();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    const { ok, data } = await response.json();
    expect(ok).toBe(true);
    expect(data.map((e: { id: string }) => e.id)).toEqual(["early", "mid", "late"]);
    expect(data.map((e: { status: string }) => e.status)).toEqual([
      "closed",
      "live",
      "upcoming",
    ]);
    expect(data[0]).toEqual({
      id: "early",
      title: "Night early",
      artist: "The Artist Post",
      medium: "community",
      start: EARLY.start,
      end: EARLY.end,
      venue: "Hacienda · 522 Clematis Street",
      description: "Test night",
      comingSoon: true,
      status: "closed",
    });
    expect(data[1].comingSoon).toBe(false);
  });

  it("is upcoming before start and closed after end", async () => {
    at("2030-01-01T00:00:00Z");
    let data = (await (await list()).json()).data;
    expect(data.every((e: { status: string }) => e.status === "upcoming")).toBe(true);

    at("2031-01-01T00:00:00Z");
    data = (await (await list()).json()).data;
    expect(data.every((e: { status: string }) => e.status === "closed")).toBe(true);
  });

  it("filters to events overlapping from/to", async () => {
    at("2030-01-01T00:00:00Z");
    const { data } = await (
      await list("?from=2030-03-05&to=2030-03-15T00:00:00Z")
    ).json();
    expect(data.map((e: { id: string }) => e.id)).toEqual(["mid"]);
  });

  it("accepts an offset whose + arrived unencoded", async () => {
    const response = await list("?from=2030-03-10T00:00:00+02:00");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.map((e: { id: string }) => e.id)).toEqual(["mid", "late"]);
  });

  it("rejects malformed or inverted ranges", async () => {
    const bad = await list("?from=next-tuesday");
    expect(bad.status).toBe(400);
    const body = await bad.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.fields.from).toBeDefined();

    const inverted = await (await list("?from=2030-04-01&to=2030-03-01")).json();
    expect(inverted.error.fields.to).toMatch(/after/);
  });
});

describe("GET /api/v1/events/[id]", () => {
  it("returns one event", async () => {
    at("2030-03-01T19:00:00-05:00");
    const { ok, data } = await (await one("early")).json();
    expect(ok).toBe(true);
    expect(data.id).toBe("early");
    expect(data.status).toBe("live");
  });

  it("returns a not_found envelope for an unknown id", async () => {
    const response = await one("nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "not_found", message: "That night is not on the board." },
    });
  });
});

describe("GET /api/v1/night/featured", () => {
  it("is null when every night has passed", async () => {
    at("2031-01-01T00:00:00Z");
    const response = await getFeatured();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(await response.json()).toEqual({
      ok: true,
      data: { event: null, phase: null },
    });
  });

  it("is the soonest open night, live while it runs", async () => {
    at("2030-03-05T12:00:00Z");
    let { data } = await (await getFeatured()).json();
    expect(data.event.id).toBe("mid");
    expect(data.phase).toBe("upcoming");

    at("2030-03-10T20:00:00-04:00");
    ({ data } = await (await getFeatured()).json());
    expect(data.event.id).toBe("mid");
    expect(data.phase).toBe("live");
    expect(data.event.status).toBe("live");
  });

  it("is null when there are no events at all", async () => {
    fixtures.events = [];
    const { data } = await (await getFeatured()).json();
    expect(data).toEqual({ event: null, phase: null });
  });
});
