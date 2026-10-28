// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentEvent } from "@/lib/content";

const fixtures = vi.hoisted(() => ({ events: [] as ContentEvent[] }));

vi.mock("@/lib/content", () => ({
  content: {
    getEvents: async () => fixtures.events,
    getEventById: async (id: string) =>
      fixtures.events.find((event) => event.id === id) ?? null,
  },
}));

import { db, resetDb } from "./testkit";
import {
  eventRowToDTO,
  findPublicEvent,
  listPublicEvents,
  type EventRow,
} from "@/server/api/eventStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = db as any;

const seed = (id: string, extra: Partial<ContentEvent> = {}): ContentEvent => ({
  id,
  title: `Seed ${id}`,
  artist: "The Artist Post",
  medium: "community",
  start: "2030-03-10T18:00:00-04:00",
  end: "2030-03-10T21:00:00-04:00",
  venue: "Hacienda · 522 Clematis Street",
  description: "From the schedule",
  ...extra,
});

function row(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "evt_1",
    sourceId: null,
    title: "Opening Night",
    description: "Doors at six.",
    artist: "",
    medium: "community",
    startsAt: new Date("2030-10-30T22:00:00Z"),
    endsAt: new Date("2030-10-31T01:00:00Z"),
    timeZone: "America/New_York",
    venueName: "Hacienda",
    venueAddress: "522 Clematis St, West Palm Beach, FL",
    latitude: 26.7131,
    longitude: -80.0533,
    capacity: 80,
    status: "PUBLISHED",
    coverImageUrl: "/uploads/cover.jpg",
    comingSoon: false,
    sponsorName: null,
    sponsorUrl: null,
    sponsorLogoUrl: null,
    vendors: [],
    createdById: "user_admin",
    publishedAt: new Date("2030-10-01T00:00:00Z"),
    cancelledAt: null,
    createdAt: new Date("2030-09-30T00:00:00Z"),
    updatedAt: new Date("2030-09-30T00:00:00Z"),
    ...overrides,
  };
}

const NOW = new Date("2030-10-01T12:00:00Z");

beforeEach(() => {
  resetDb();
  fixtures.events = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("eventRowToDTO", () => {
  it("keeps the public shape and adds the managed fields", () => {
    const dto = eventRowToDTO(row(), NOW);
    expect(dto).toMatchObject({
      id: "evt_1",
      title: "Opening Night",
      venue: "Hacienda",
      venueAddress: "522 Clematis St, West Palm Beach, FL",
      start: "2030-10-30T22:00:00.000Z",
      end: "2030-10-31T01:00:00.000Z",
      status: "upcoming",
      source: "db",
      cancelled: false,
      capacity: 80,
      latitude: 26.7131,
      longitude: -80.0533,
      comingSoon: false,
      timeZone: "America/New_York",
    });
    expect(dto.coverImageUrl).toBe(
      "https://theartistpost.fluxlab.agency/uploads/cover.jpg",
    );
  });

  it("reports a cancelled night as closed so it never counts as next", () => {
    const dto = eventRowToDTO(row({ status: "CANCELLED" }), NOW);
    expect(dto.cancelled).toBe(true);
    expect(dto.status).toBe("closed");
  });
});

describe("listPublicEvents", () => {
  it("returns only the schedule when there is no database", async () => {
    fixtures.events = [seed("e1")];
    const list = await listPublicEvents(null, NOW);
    expect(list.map((e) => e.id)).toEqual(["e1"]);
    expect(list[0]?.source).toBe("content");
  });

  it("merges published DB nights with schedule nights, soonest first", async () => {
    fixtures.events = [
      seed("e1", {
        start: "2030-12-01T18:00:00-05:00",
        end: "2030-12-01T21:00:00-05:00",
      }),
    ];
    prisma.event.findMany.mockResolvedValueOnce([row()]);
    const list = await listPublicEvents(prisma, NOW);
    expect(list.map((e) => e.id)).toEqual(["evt_1", "e1"]);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["PUBLISHED", "CANCELLED"] } },
      }),
    );
  });

  it("lets a DB night replace the schedule night it was adopted from", async () => {
    fixtures.events = [seed("e4"), seed("e5")];
    prisma.event.findMany.mockResolvedValueOnce([
      row({ id: "evt_adopted", sourceId: "e4" }),
    ]);
    const list = await listPublicEvents(prisma, NOW);
    expect(list.map((e) => e.id).sort()).toEqual(["e5", "evt_adopted"]);
  });

  it("keeps serving the schedule when the events table is unavailable", async () => {
    fixtures.events = [seed("e1")];
    prisma.event.findMany.mockRejectedValueOnce(
      new Error("relation does not exist"),
    );
    const list = await listPublicEvents(prisma, NOW);
    expect(list.map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("findPublicEvent", () => {
  it("finds a DB night by id", async () => {
    prisma.event.findFirst.mockResolvedValueOnce(row());
    const dto = await findPublicEvent(prisma, "evt_1", NOW);
    expect(dto?.source).toBe("db");
  });

  it("resolves an old schedule id to the DB night that replaced it", async () => {
    fixtures.events = [seed("e4")];
    prisma.event.findFirst.mockResolvedValueOnce(
      row({ id: "evt_adopted", sourceId: "e4" }),
    );
    const dto = await findPublicEvent(prisma, "e4", NOW);
    expect(dto?.id).toBe("evt_adopted");
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["PUBLISHED", "CANCELLED"] },
          OR: [{ id: "e4" }, { sourceId: "e4" }],
        },
      }),
    );
  });

  it("falls back to the schedule, and to null for unknown ids", async () => {
    fixtures.events = [seed("e1")];
    expect((await findPublicEvent(prisma, "e1", NOW))?.source).toBe("content");
    expect(await findPublicEvent(prisma, "nope", NOW)).toBeNull();
  });
});
