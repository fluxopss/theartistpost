// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", () => ({
  content: {
    getEvents: async () => [],
    getEventById: async () => null,
  },
}));
vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { db, resetDb } from "./testkit";
import { POST as rsvpLegacy } from "@/app/api/night/rsvp/route";
import { POST as rsvpV1 } from "@/app/api/v1/night/rsvp/route";
import { passCode } from "@/features/night/rsvp";
import { resetRateLimits } from "@/features/auth/rateLimit";
import type { EventRow } from "@/server/api/eventStore";

function row(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "evt_launch",
    sourceId: null,
    title: "Launch Night",
    description: "Doors at six.",
    artist: "",
    medium: "community",
    startsAt: new Date("2099-10-30T22:00:00Z"),
    endsAt: new Date("2099-10-31T02:00:00Z"),
    timeZone: "America/New_York",
    venueName: "Hacienda",
    venueAddress: null,
    latitude: null,
    longitude: null,
    capacity: null,
    status: "PUBLISHED",
    coverImageUrl: null,
    comingSoon: false,
    sponsorName: null,
    sponsorUrl: null,
    sponsorLogoUrl: null,
    vendors: [],
    createdById: null,
    publishedAt: new Date("2026-10-20T00:00:00Z"),
    cancelledAt: null,
    createdAt: new Date("2026-10-20T00:00:00Z"),
    updatedAt: new Date("2026-10-20T00:00:00Z"),
    ...overrides,
  };
}

const fetchMock = vi.fn();
const seat = { eventId: "evt_launch", name: "Ada", email: "ada@gmail.com", party: 2 };
const post = (body: unknown) =>
  new Request("http://localhost/api/night/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.8" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  resetDb();
  resetRateLimits();
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

describe("holding a seat on a night published in Manage events", () => {
  it("works for a database night (the one /night now shows)", async () => {
    db.event.findFirst.mockResolvedValue(row());
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.message).toContain("RSVP: Launch Night");
  });

  it("refuses a cancelled night", async () => {
    db.event.findFirst.mockResolvedValue(
      row({ status: "CANCELLED", cancelledAt: new Date("2026-10-25T00:00:00Z") }),
    );
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only looks up published or cancelled nights, so a draft is not on the board", async () => {
    // The status filter keeps drafts out; with no public row the lookup is empty.
    db.event.findFirst.mockResolvedValue(null);
    const response = await rsvpLegacy(post({ ...seat, eventId: "evt_draft" }));
    expect(response.status).toBe(404);
    expect(db.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["PUBLISHED", "CANCELLED"] },
        }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a night that has ended", async () => {
    db.event.findFirst.mockResolvedValue(
      row({
        startsAt: new Date("2001-01-01T22:00:00Z"),
        endsAt: new Date("2001-01-02T02:00:00Z"),
      }),
    );
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("web seat holds respect a managed night's capacity", () => {
  it("refuses when the night is full, with the closed shape, and sends nothing", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: 40 }));
    db.eventRsvp.aggregate.mockResolvedValue({ _sum: { party: 40 } });
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "This night is full.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.eventRsvp.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "evt_launch", status: "GOING", waitlistedAt: null },
      }),
    );
  });

  it("refuses a party bigger than the seats left", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: 40 }));
    db.eventRsvp.aggregate.mockResolvedValue({ _sum: { party: 39 } });
    const response = await rsvpLegacy(post({ ...seat, party: 2 }));
    expect(response.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a party that fits exactly", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: 40 }));
    db.eventRsvp.aggregate.mockResolvedValue({ _sum: { party: 38 } });
    const response = await rsvpLegacy(post({ ...seat, party: 2 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      delivered: true,
      code: passCode("evt_launch", "ada@gmail.com"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts on an unlimited night without counting seats", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: null }));
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(db.eventRsvp.aggregate).not.toHaveBeenCalled();
  });

  it("refuses a cancelled night even with seats left", async () => {
    db.event.findFirst.mockResolvedValue(
      row({
        capacity: 40,
        status: "CANCELLED",
        cancelledAt: new Date("2026-10-25T00:00:00Z"),
      }),
    );
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("This night has been cancelled.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not hand out a pass when the seat count cannot be read", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: 40 }));
    db.eventRsvp.aggregate.mockRejectedValue(new Error("connection refused"));
    const response = await rsvpLegacy(post(seat));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      delivered: false,
      error: "Your seat was not sent. Try again in a moment.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("/api/v1/night/rsvp shares the check: full is a 409 conflict", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: 10 }));
    db.eventRsvp.aggregate.mockResolvedValue({ _sum: { party: 10 } });
    const response = await rsvpV1(post(seat));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "conflict", message: "This night is full." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("/api/v1/night/rsvp success shape is unchanged when seats are left", async () => {
    db.event.findFirst.mockResolvedValue(row({ capacity: 10 }));
    db.eventRsvp.aggregate.mockResolvedValue({ _sum: { party: 2 } });
    const response = await rsvpV1(post(seat));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { code: passCode("evt_launch", "ada@gmail.com") },
    });
  });
});
