// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentEvent } from "@/lib/content";

const fixtures = vi.hoisted(() => ({
  events: [] as ContentEvent[],
  prismaThrows: false,
}));

vi.mock("@/lib/content", () => ({
  content: {
    getEvents: async () => fixtures.events,
    getEventById: async (id: string) =>
      fixtures.events.find((event) => event.id === id) ?? null,
  },
}));

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return {
    getPrisma: () => {
      if (fixtures.prismaThrows) throw new Error("db down");
      return kit.getTestPrisma();
    },
  };
});

import { db, resetDb } from "./testkit";
import type { EventRow } from "@/server/api/eventStore";
import {
  findSiteEvent,
  isUpcomingPublic,
  listSiteEvents,
  listUpcomingSiteEvents,
} from "@/server/api/siteEvents";

const NOW = new Date("2026-10-28T12:00:00Z");

const pastSeed: ContentEvent = {
  id: "e4",
  title: "Kindness Always Community Night",
  artist: "The Artist Post",
  medium: "community",
  start: "2026-09-26T16:00:00-04:00",
  end: "2026-09-26T21:00:00-04:00",
  venue: "Hacienda · 522 Clematis Street",
  description: "Past night",
  comingSoon: true,
};

function row(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "evt_launch",
    sourceId: null,
    title: "Launch Night",
    description: "Doors at six.",
    artist: "",
    medium: "community",
    startsAt: new Date("2026-10-30T22:00:00Z"),
    endsAt: new Date("2026-10-31T02:00:00Z"),
    timeZone: "America/New_York",
    venueName: "Hacienda",
    venueAddress: "522 Clematis St, West Palm Beach, FL",
    latitude: null,
    longitude: null,
    capacity: null,
    status: "PUBLISHED",
    coverImageUrl: null,
    comingSoon: false,
    createdById: "user_admin",
    publishedAt: new Date("2026-10-20T00:00:00Z"),
    cancelledAt: null,
    createdAt: new Date("2026-10-20T00:00:00Z"),
    updatedAt: new Date("2026-10-20T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  resetDb();
  fixtures.events = [pastSeed];
  fixtures.prismaThrows = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listSiteEvents", () => {
  it("serves a night published in Manage events next to the schedule", async () => {
    db.event.findMany.mockResolvedValue([row()]);
    const events = await listSiteEvents(NOW);
    expect(events.map((e) => e.id)).toEqual(["e4", "evt_launch"]);
    expect(events[1]).toMatchObject({ source: "db", title: "Launch Night" });
  });

  it("falls back to the schedule when the database read throws", async () => {
    db.event.findMany.mockRejectedValue(new Error("connection refused"));
    const events = await listSiteEvents(NOW);
    expect(events.map((e) => e.id)).toEqual(["e4"]);
  });

  it("falls back to the schedule when the database cannot even be reached", async () => {
    fixtures.prismaThrows = true;
    const events = await listSiteEvents(NOW);
    expect(events.map((e) => e.id)).toEqual(["e4"]);
    expect(console.error).toHaveBeenCalled();
  });

  it("never throws, even when the schedule itself fails", async () => {
    fixtures.prismaThrows = true;
    fixtures.events = null as unknown as ContentEvent[];
    await expect(listSiteEvents(NOW)).resolves.toEqual([]);
  });
});

describe("site lists only load nights that are still relevant", () => {
  it("asks the database only for nights ending after now minus a day (adopted rows always)", async () => {
    await listSiteEvents(NOW);
    expect(db.event.findMany).toHaveBeenCalledTimes(1);
    expect(db.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["PUBLISHED", "CANCELLED"] },
          OR: [
            { endsAt: { gte: new Date("2026-10-27T12:00:00Z") } },
            { sourceId: { not: null } },
          ],
        },
      }),
    );
  });

  it("an old adopted night still hides the schedule night it replaced", async () => {
    fixtures.events = [
      { ...pastSeed, id: "e7", start: "2099-01-01T18:00:00-05:00", end: "2099-01-01T21:00:00-05:00" },
    ];
    db.event.findMany.mockResolvedValue([
      row({
        id: "evt_old",
        sourceId: "e7",
        startsAt: new Date("2026-01-01T22:00:00Z"),
        endsAt: new Date("2026-01-02T02:00:00Z"),
      }),
    ]);
    const upcoming = await listUpcomingSiteEvents(NOW);
    expect(upcoming).toEqual([]);
  });

  it("listUpcomingSiteEvents makes one query", async () => {
    await listUpcomingSiteEvents(NOW);
    expect(db.event.findMany).toHaveBeenCalledTimes(1);
  });

  it("a past night stays reachable by id", async () => {
    db.event.findFirst.mockResolvedValue(
      row({
        id: "evt_past",
        startsAt: new Date("2026-01-01T22:00:00Z"),
        endsAt: new Date("2026-01-02T02:00:00Z"),
      }),
    );
    await expect(findSiteEvent("evt_past", NOW)).resolves.toMatchObject({
      id: "evt_past",
      status: "closed",
    });
    const where = db.event.findFirst.mock.calls[0]?.[0]?.where;
    expect(where).not.toHaveProperty("endsAt");
  });
});

describe("listUpcomingSiteEvents", () => {
  it("shows only published nights that have not ended", async () => {
    db.event.findMany.mockResolvedValue([
      row(),
      row({
        id: "evt_cancelled",
        status: "CANCELLED",
        cancelledAt: new Date("2026-10-25T00:00:00Z"),
        startsAt: new Date("2026-11-06T22:00:00Z"),
        endsAt: new Date("2026-11-07T02:00:00Z"),
      }),
      row({
        id: "evt_past",
        startsAt: new Date("2026-10-01T22:00:00Z"),
        endsAt: new Date("2026-10-02T02:00:00Z"),
      }),
    ]);
    const upcoming = await listUpcomingSiteEvents(NOW);
    expect(upcoming.map((e) => e.id)).toEqual(["evt_launch"]);
  });

  it("keeps a night that is happening right now", async () => {
    db.event.findMany.mockResolvedValue([row()]);
    const during = new Date("2026-10-30T23:00:00Z");
    const upcoming = await listUpcomingSiteEvents(during);
    expect(upcoming.map((e) => e.id)).toEqual(["evt_launch"]);
  });

  it("is empty when only past nights exist (honest empty state)", async () => {
    await expect(listUpcomingSiteEvents(NOW)).resolves.toEqual([]);
  });
});

describe("isUpcomingPublic", () => {
  it("rejects cancelled and ended nights", () => {
    const base = { start: "2026-10-30T18:00:00-04:00", end: "2026-10-30T22:00:00-04:00" };
    expect(isUpcomingPublic({ ...base, cancelled: false }, NOW)).toBe(true);
    expect(isUpcomingPublic({ ...base, cancelled: true }, NOW)).toBe(false);
    expect(isUpcomingPublic(base, new Date("2026-10-31T12:00:00Z"))).toBe(false);
  });
});

describe("findSiteEvent", () => {
  it("finds a database night by id", async () => {
    db.event.findFirst.mockResolvedValue(row());
    await expect(findSiteEvent("evt_launch", NOW)).resolves.toMatchObject({
      id: "evt_launch",
      source: "db",
    });
  });

  it("keeps past schedule nights reachable", async () => {
    await expect(findSiteEvent("e4", NOW)).resolves.toMatchObject({ id: "e4" });
  });

  it("falls back to the schedule when the database cannot be reached", async () => {
    fixtures.prismaThrows = true;
    await expect(findSiteEvent("e4", NOW)).resolves.toMatchObject({ id: "e4" });
    await expect(findSiteEvent("nope", NOW)).resolves.toBeNull();
  });
});
