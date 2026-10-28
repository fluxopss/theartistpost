// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { ContentEvent } from "@/lib/content";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

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
import { toEventDTO } from "@/server/api/dto";
import {
  EVENT_BASE_SELECT,
  EVENT_SELECT,
  isMissingColumnError,
} from "@/server/api/eventColumns";
import { eventRowToDTO, type EventRow } from "@/server/api/eventStore";
import { presentedByFromRow, vendorsFromJson } from "@/server/api/eventSponsors";
import { db, resetDb } from "./testkit";

const ORIGIN = "https://theartistpost.fluxlab.agency";

function row(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "evt_1",
    sourceId: null,
    title: "Culinary Night",
    description: "Chefs on Clematis.",
    artist: "",
    medium: "culinary",
    startsAt: new Date("2030-10-30T22:00:00Z"),
    endsAt: new Date("2030-10-31T01:00:00Z"),
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
    publishedAt: new Date("2030-10-01T00:00:00Z"),
    cancelledAt: null,
    createdAt: new Date("2030-09-30T00:00:00Z"),
    updatedAt: new Date("2030-09-30T00:00:00Z"),
    ...overrides,
  };
}

const NOW = new Date("2030-10-01T12:00:00Z");
const missingColumn = () =>
  Object.assign(new Error("The column `Event.sponsorName` does not exist in the current database."), {
    code: "P2022",
  });

beforeEach(() => {
  resetDb();
  fixtures.events = [];
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("EventDTO presentedBy + vendors", () => {
  it("is null and [] for a night without a sponsor or vendors", () => {
    const dto = eventRowToDTO(row(), NOW);
    expect(dto.presentedBy).toBeNull();
    expect(dto.vendors).toEqual([]);
  });

  it("maps a sponsor with an absolute logo and https link", () => {
    const dto = eventRowToDTO(
      row({
        sponsorName: "  Clematis Coffee ",
        sponsorUrl: "https://clematis.coffee/",
        sponsorLogoUrl: "/uploads/sponsor-logo.png",
      }),
      NOW,
    );
    expect(dto.presentedBy).toEqual({
      name: "Clematis Coffee",
      url: "https://clematis.coffee/",
      logoUrl: `${ORIGIN}/uploads/sponsor-logo.png`,
    });
  });

  it("never shows a link or logo that is not safe, even if stored", () => {
    const dto = eventRowToDTO(
      row({
        sponsorName: "Clematis Coffee",
        sponsorUrl: "javascript:alert(1)",
        sponsorLogoUrl: "https://elsewhere.example/logo.png",
      }),
      NOW,
    );
    expect(dto.presentedBy).toEqual({
      name: "Clematis Coffee",
      url: null,
      logoUrl: null,
    });
    expect(presentedByFromRow({ sponsorName: "  " })).toBeNull();
  });

  it("maps vendors and drops anything malformed or extra", () => {
    const dto = eventRowToDTO(
      row({
        vendors: [
          { name: "Taco Bus", offering: "Tacos", url: "https://taco.bus/", price: 5 },
          { name: "Pie Lady", offering: "" },
          { name: "", offering: "nothing" },
          { name: "Sneaky", url: "http://plain.example/" },
          "not an object",
        ],
      }),
      NOW,
    );
    expect(dto.vendors).toEqual([
      { name: "Taco Bus", offering: "Tacos", url: "https://taco.bus/" },
      { name: "Pie Lady", offering: "", url: null },
      { name: "Sneaky", offering: "", url: null },
    ]);
    expect(vendorsFromJson(null)).toEqual([]);
    expect(vendorsFromJson({ name: "x" })).toEqual([]);
    expect(
      vendorsFromJson(Array.from({ length: 20 }, (_, i) => ({ name: `V${i}` }))),
    ).toHaveLength(12);
  });

  it("gives schedule (seed) nights presentedBy null and vendors []", () => {
    const dto = toEventDTO({
      id: "e1",
      title: "Seed",
      artist: "TAP",
      medium: "community",
      start: "2030-03-10T18:00:00-04:00",
      end: "2030-03-10T21:00:00-04:00",
      venue: "Hacienda",
      description: "",
    });
    expect(dto.presentedBy).toBeNull();
    expect(dto.vendors).toEqual([]);
  });
});

describe("explicit Event columns (safe before the migration is applied)", () => {
  it("selects every Event column, and the base select omits only the new four", () => {
    const all = Object.values(Prisma.EventScalarFieldEnum).sort();
    expect(Object.keys(EVENT_SELECT).sort()).toEqual(all);
    expect(Object.keys(EVENT_BASE_SELECT).sort()).toEqual(
      all.filter(
        (k) => !["sponsorName", "sponsorUrl", "sponsorLogoUrl", "vendors"].includes(k),
      ),
    );
  });

  it("recognizes only a missing-column error", () => {
    expect(isMissingColumnError(missingColumn())).toBe(true);
    expect(isMissingColumnError(new Error("relation \"Event\" does not exist"))).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });

  it("/api/v1/events still serves managed nights when the columns are missing", async () => {
    db.event.findMany
      .mockRejectedValueOnce(missingColumn())
      .mockResolvedValueOnce([
        (() => {
          const { sponsorName, sponsorUrl, sponsorLogoUrl, vendors, ...base } = row();
          void sponsorName, void sponsorUrl, void sponsorLogoUrl, void vendors;
          return base;
        })(),
      ]);
    const res = await listEvents(new Request("http://localhost/api/v1/events"));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: "evt_1", source: "db", presentedBy: null, vendors: [] });
    expect(db.event.findMany.mock.calls[0][0].select).toEqual(EVENT_SELECT);
    expect(db.event.findMany.mock.calls[1][0].select).toEqual(EVENT_BASE_SELECT);
  });

  it("/api/v1/events/[id] also falls back", async () => {
    db.event.findFirst
      .mockRejectedValueOnce(missingColumn())
      .mockResolvedValueOnce(row());
    const res = await getEvent(new Request("http://localhost/api/v1/events/evt_1"), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data.id).toBe("evt_1");
  });
});

describe("old app builds keep parsing /api/v1/events (acceptance 2)", () => {
  // Every key the API returned before Phase 2, with its JSON type.
  const OLD_KEYS: Record<string, string[]> = {
    id: ["string"],
    title: ["string"],
    artist: ["string"],
    medium: ["string"],
    start: ["string"],
    end: ["string"],
    venue: ["string"],
    description: ["string"],
    comingSoon: ["boolean"],
    status: ["string"],
    source: ["string"],
    cancelled: ["boolean"],
    timeZone: ["string"],
    venueAddress: ["string", "null"],
    latitude: ["number", "null"],
    longitude: ["number", "null"],
    capacity: ["number", "null"],
    coverImageUrl: ["string", "null"],
  };
  const typeOf = (v: unknown) => (v === null ? "null" : typeof v);

  it("only adds presentedBy and vendors; every old key keeps its type", async () => {
    fixtures.events = [
      {
        id: "e1",
        title: "Seed",
        artist: "TAP",
        medium: "community",
        start: "2099-03-10T18:00:00-04:00",
        end: "2099-03-10T21:00:00-04:00",
        venue: "Hacienda",
        description: "",
      },
    ];
    db.event.findMany.mockResolvedValueOnce([
      row({
        startsAt: new Date("2099-01-01T22:00:00Z"),
        endsAt: new Date("2099-01-02T01:00:00Z"),
        sponsorName: "Clematis Coffee",
        sponsorUrl: "https://clematis.coffee/",
        vendors: [{ name: "Taco Bus", offering: "Tacos" }],
      }),
    ]);
    const { data } = await (
      await listEvents(new Request("http://localhost/api/v1/events"))
    ).json();
    expect(data).toHaveLength(2);
    for (const event of data as Record<string, unknown>[]) {
      expect(Object.keys(event).sort()).toEqual(
        [...Object.keys(OLD_KEYS), "presentedBy", "vendors"].sort(),
      );
      for (const [key, types] of Object.entries(OLD_KEYS)) {
        expect(types, key).toContain(typeOf(event[key]));
      }
    }
  });
});

describe("GET /api/v1/events?lane=", () => {
  beforeEach(() => {
    fixtures.events = [
      {
        id: "music1",
        title: "Music",
        artist: "TAP",
        medium: "music",
        start: "2099-03-10T18:00:00-04:00",
        end: "2099-03-10T21:00:00-04:00",
        venue: "Hacienda",
        description: "",
      },
    ];
    db.event.findMany.mockResolvedValue([
      row({ startsAt: new Date("2099-01-01T22:00:00Z"), endsAt: new Date("2099-01-02T01:00:00Z") }),
    ]);
  });

  it("is unchanged without a lane", async () => {
    const { data } = await (await listEvents(new Request("http://localhost/api/v1/events"))).json();
    expect(data.map((e: { id: string }) => e.id)).toEqual(["evt_1", "music1"]);
  });

  it("filters by medium, case-insensitively", async () => {
    const { data } = await (
      await listEvents(new Request("http://localhost/api/v1/events?lane=Culinary"))
    ).json();
    expect(data.map((e: { id: string }) => e.id)).toEqual(["evt_1"]);
  });

  it("returns an empty list for a lane with no nights, and 400 for junk", async () => {
    const empty = await (
      await listEvents(new Request("http://localhost/api/v1/events?lane=dance"))
    ).json();
    expect(empty.data).toEqual([]);
    const bad = await listEvents(
      new Request("http://localhost/api/v1/events?lane=%3Cscript%3E"),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.fields.lane).toBeDefined();
  });
});
