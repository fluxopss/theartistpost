import { describe, expect, it } from "vitest";
import { eventToIcs, monthMatrix, sameDay } from "@/lib/schedule/calendar";
import { artistSchema, chapterSchema, eventSchema } from "@/lib/content/schemas";
import { content } from "@/lib/content";
import { filterArtists } from "@/features/home/filterArtists";
import { moderateKindnessBody } from "@/features/kindness/moderation";

describe("calendar helpers", () => {
  it("builds a month matrix with full weeks", () => {
    const cells = monthMatrix(2026, 8); // September 2026
    expect(cells.length % 7).toBe(0);
    expect(cells.some((c) => c.date?.getDate() === 1)).toBe(true);
  });

  it("compares calendar days", () => {
    expect(
      sameDay(new Date("2026-09-05T12:00:00"), new Date("2026-09-05T23:00:00")),
    ).toBe(true);
    expect(
      sameDay(new Date("2026-09-05"), new Date("2026-09-06")),
    ).toBe(false);
  });

  it("exports ICS with required fields", () => {
    const ics = eventToIcs({
      id: "e1",
      title: "Showcase",
      artist: "Local",
      medium: "visual",
      start: "2026-09-05T12:00:00-04:00",
      end: "2026-09-05T20:00:00-04:00",
      venue: "Hacienda",
      description: "Hello",
    });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Showcase");
    expect(ics).toContain("UID:e1@theartistpost.org");
  });
});

describe("content schemas", () => {
  it("validates artist seed shape", () => {
    const parsed = artistSchema.parse({
      id: "1",
      name: "Coming Soon",
      medium: "visual",
      bio: "Soon",
      image: "/brand/coming-soon.webp",
      comingSoon: true,
    });
    expect(parsed.medium).toBe("visual");
  });

  it("validates chapter seed shape", () => {
    const parsed = chapterSchema.parse({
      id: "fl-wpb",
      name: "West Palm Beach",
      state: "Florida",
      stateCode: "FL",
      status: "active",
      summary: "Home hub",
    });
    expect(parsed.stateCode).toBe("FL");
  });

  it("validates event shape", () => {
    expect(() =>
      eventSchema.parse({
        id: "e1",
        title: "Night",
        artist: "TBA",
        medium: "music",
        start: "2026-09-05T12:00:00-04:00",
        end: "2026-09-05T20:00:00-04:00",
        venue: "Hacienda",
        description: "Live",
      }),
    ).not.toThrow();
  });
});

describe("kindness moderation stub", () => {
  it("rejects empty notes", () => {
    expect(moderateKindnessBody("   ").ok).toBe(false);
  });

  it("rejects link spam", () => {
    const result = moderateKindnessBody("Check https://spam.example");
    expect(result.ok).toBe(false);
  });

  it("allows kind copy", () => {
    const result = moderateKindnessBody("Your set lifted the room tonight.");
    expect(result.ok).toBe(true);
  });
});

describe("featured artist filters", () => {
  const sample = [
    {
      id: "1",
      name: "Ava",
      medium: "music" as const,
      bio: "Jazz at Hacienda",
      image: "/brand/cover-opt.webp",
    },
    {
      id: "2",
      name: "Nia",
      medium: "visual" as const,
      bio: "Murals",
      image: "/brand/cover-opt.webp",
    },
  ];

  it("filters by medium", () => {
    expect(filterArtists(sample, "", "music")).toHaveLength(1);
    expect(filterArtists(sample, "", "all")).toHaveLength(2);
  });

  it("filters by query against name and bio", () => {
    expect(filterArtists(sample, "hacienda", "all")[0]?.name).toBe("Ava");
    expect(filterArtists(sample, "zzz", "all")).toHaveLength(0);
  });
});

describe("content service seed adapter", () => {
  it("returns an artists array without inventing names", async () => {
    const artists = await content.getArtists();
    expect(Array.isArray(artists)).toBe(true);
  });
});
