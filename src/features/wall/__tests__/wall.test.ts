import { describe, expect, it } from "vitest";
import { buildWallPieces, wallHasNamedArtists } from "../buildWallPieces";
import { filterWallPieces } from "../filterWall";
import { DEFAULT_WALL_FILTERS } from "../types";
import { doorHref, INVOLVE_DOOR_IDS } from "@/content/involve";
import { kindnessSeeds } from "@/features/kindness/fixtures";
import { events } from "@/data/events";

describe("house doors", () => {
  it("keeps the five intake paths and door query strings", () => {
    expect(INVOLVE_DOOR_IDS).toEqual([
      "space",
      "partner",
      "support",
      "volunteer",
      "events",
    ]);
    expect(doorHref("space")).toBe("/get-involved?door=space");
    expect(doorHref("events")).toBe("/get-involved?door=events");
  });
});

/** A clock before the seed nights, so they still count as upcoming. */
const BEFORE_SEED_NIGHTS = new Date("2026-08-01T00:00:00-04:00");

describe("buildWallPieces", () => {
  const pieces = buildWallPieces({
    artists: [],
    events,
    notes: kindnessSeeds.slice(0, 3),
    now: BEFORE_SEED_NIGHTS,
  });

  it("does not invent named artists when the roster is empty", () => {
    expect(wallHasNamedArtists(pieces)).toBe(false);
    expect(pieces.some((p) => p.kind === "artist")).toBe(false);
    const titles = pieces.map((p) => p.title);
    expect(titles.join(" ")).not.toMatch(/Luna Voss|Kai Chan|Mira Noir/i);
  });

  it("still hangs a living stage: venue, reserved frames, nights, sparks", () => {
    expect(pieces.some((p) => p.kind === "venue")).toBe(true);
    expect(pieces.some((p) => p.kind === "reserved")).toBe(true);
    expect(pieces.some((p) => p.kind === "event")).toBe(true);
    expect(pieces.some((p) => p.kind === "kindness")).toBe(true);
    expect(pieces.find((p) => p.kind === "reserved")?.title).toBe(
      "Waiting for a name",
    );
  });

  it("places real artists when the nonprofit supplies them", () => {
    const withArtist = buildWallPieces({
      artists: [
        {
          id: "real-1",
          name: "Approved Artist",
          medium: "visual",
          bio: "Work from Hacienda.",
          image: "/brand/hacienda.webp",
          handle: "approved",
        },
      ],
      events: [],
      notes: [],
    });
    expect(wallHasNamedArtists(withArtist)).toBe(true);
    expect(withArtist.some((p) => p.title === "Approved Artist")).toBe(true);
    expect(withArtist.some((p) => p.id === "reserved-visual")).toBe(false);
  });
});

describe("filterWallPieces", () => {
  const pieces = buildWallPieces({
    artists: [],
    events,
    notes: kindnessSeeds.slice(0, 2),
    now: BEFORE_SEED_NIGHTS,
  });

  it("filters reserved frames by medium", () => {
    const visual = filterWallPieces(pieces, {
      ...DEFAULT_WALL_FILTERS,
      medium: "visual",
    });
    expect(visual.every((p) => p.medium === "visual")).toBe(true);
    expect(visual.length).toBeGreaterThan(0);
  });

  it("hangs a lit, empty culinary frame until a culinary artist is approved", () => {
    const culinary = filterWallPieces(pieces, {
      ...DEFAULT_WALL_FILTERS,
      medium: "culinary",
    });
    expect(culinary.map((p) => p.id)).toContain("reserved-culinary");
    const frame = culinary.find((p) => p.id === "reserved-culinary");
    expect(frame?.subtitle).toBe("Culinary · frame reserved");
    expect(frame?.image).toBeUndefined();
  });

  it("keeps every wall piece inside the canvas without overlapping the culinary frame", () => {
    const frame = pieces.find((p) => p.id === "reserved-culinary")!;
    const overlaps = pieces.filter(
      (p) =>
        p.id !== frame.id &&
        p.kind !== "kindness" &&
        p.x < frame.x + frame.w &&
        frame.x < p.x + p.w &&
        p.y < frame.y + frame.h &&
        frame.y < p.y + p.h,
    );
    expect(overlaps.map((p) => p.id)).toEqual([]);
  });

  it("filters by neighborhood and availability", () => {
    const open = filterWallPieces(pieces, {
      ...DEFAULT_WALL_FILTERS,
      availability: "open",
    });
    expect(open.every((p) => p.availability === "open")).toBe(true);

    const clematis = filterWallPieces(pieces, {
      ...DEFAULT_WALL_FILTERS,
      neighborhood: "clematis",
    });
    expect(clematis.every((p) => p.neighborhood === "clematis")).toBe(true);
  });

  it("keeps upcoming showcase nights when date=upcoming", () => {
    const upcoming = filterWallPieces(
      pieces,
      { ...DEFAULT_WALL_FILTERS, date: "upcoming" },
      new Date("2026-08-01T00:00:00-04:00"),
    );
    expect(upcoming.every((p) => p.showcaseDate)).toBe(true);
    expect(upcoming.length).toBeGreaterThan(0);
  });

  it("hangs only nights people can still go to", () => {
    const now = new Date("2026-09-15T12:00:00-04:00");
    const hung = buildWallPieces({
      artists: [],
      events: [
        ...events,
        {
          ...events[3]!,
          id: "cancelled-night",
          start: "2026-10-30T18:00:00-04:00",
          end: "2026-10-30T22:00:00-04:00",
          cancelled: true,
        },
      ],
      notes: [],
      now,
    });
    const nights = hung.filter((p) => p.kind === "event").map((p) => p.id);
    // e1 (Sept 5) and e2 (Sept 12) have ended; the cancelled night is out.
    expect(nights).toEqual(["event-e3", "event-e4"]);
    expect(hung.find((p) => p.kind === "venue")?.eventIds).toEqual(["e3", "e4"]);
  });

  it("marks every hung night as upcoming", () => {
    const nights = pieces.filter((p) => p.kind === "event");
    expect(nights.length).toBeGreaterThan(0);
    expect(nights.every((p) => p.availability === "upcoming")).toBe(true);
  });
});
