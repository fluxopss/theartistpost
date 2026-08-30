import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { involveDoors } from "@/content/involve";
import { assets, copy } from "@/content/site";

describe("house voice", () => {
  it("keeps the original TAP hero line and CTAs", () => {
    expect(copy.house.headline).toBe("Creativity needs kindness");
    expect(copy.house.ctaInvolve).toBe("Get Involved");
    expect(copy.house.ctaKindness).toBe("Leave a Kindness");
    expect(copy.house.kicker).toMatch(/five doors/i);
    expect(assets.logo3d).toBe("/brand/logo-3d.webp");
  });

  it("lets The Wall speak as local arts, not only spatial jargon", () => {
    expect(copy.house.exploreLine).toMatch(/arts, music, theater, and culture/i);
    expect(copy.wall.title).toMatch(/arts, music, theater, and culture/i);
    expect(copy.wall.lead).toMatch(/living gallery/i);
    expect(copy.wall.lead).toMatch(/invented portrait/i);
  });

  it("keeps the five participation doors in order", () => {
    expect(involveDoors.map((door) => door.id)).toEqual([
      "space",
      "partner",
      "support",
      "volunteer",
      "events",
    ]);
    expect(involveDoors.map((door) => door.title)).toEqual([
      "Book an Artist Space",
      "Become a Partner",
      "Support the Mission",
      "Volunteer",
      "Explore Events",
    ]);
  });

  it("does not crop the low-res community collage as the hero backdrop", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/house/HouseHero.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/assets\.cover/);
    expect(source).not.toMatch(/cover-opt/);
    expect(source).toMatch(/house-entrance__wash/);
  });
});
