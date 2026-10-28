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
});
