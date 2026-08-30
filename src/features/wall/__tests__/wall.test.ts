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

describe("buildWallPieces", () => {
  const pieces = buildWallPieces({
    artists: [],
    events,
    notes: kindnessSeeds.slice(0, 3),
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
  });

  it("filters reserved frames by medium", () => {
    const visual = filterWallPieces(pieces, {
      ...DEFAULT_WALL_FILTERS,
      medium: "visual",
    });
    expect(visual.every((p) => p.medium === "visual")).toBe(true);
    expect(visual.length).toBeGreaterThan(0);
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
});
