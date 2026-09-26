import { describe, expect, it } from "vitest";
import { tapGenres, tapMedia, tapOrigin } from "@/content/stage";
import { allLanes, focusPan, laneHref, tapLane } from "@/features/stage/lanes";

describe("original TAP stage", () => {
  it("keeps the 2016 genre list and media-only posts", () => {
    expect(tapGenres.map((genre) => genre.label)).toEqual([
      "Musicians",
      "Photographers",
      "Dancers",
      "Filmmakers",
      "Actors",
      "Comedians",
      "Models",
    ]);
    expect(tapMedia.map((item) => item.label)).toEqual([
      "Photograph",
      "Video",
      "Sound",
    ]);
    expect(tapOrigin.line).toMatch(/2015/);
    expect(tapOrigin.line).toMatch(/photographs, video, and sound/i);
  });

  it("opens a real wall lane for every 2016 genre", () => {
    expect(allLanes().map((lane) => lane.id)).toEqual(
      tapGenres.map((genre) => genre.id),
    );
    expect(tapLane("music")?.medium).toBe("music");
    expect(tapLane("dance")?.medium).toBe("dance");
    expect(tapLane("photo")?.medium).toBe("visual");
    expect(tapLane("frame")?.medium).toBe("visual");
    expect(tapLane("stage")?.medium).toBe("theater");
    expect(tapLane("laugh")?.medium).toBe("theater");
    expect(tapLane("film")?.medium).toBe("multidisciplinary");
    expect(tapLane("nope")).toBeNull();
    expect(laneHref("music")).toBe("/explore?lane=music");
  });

  it("centers a frame in the phone viewport", () => {
    expect(
      focusPan({ x: 2280, y: 200, w: 300, h: 400 }, { width: 390, height: 420 }, 0.78),
    ).toEqual({
      x: 390 / 2 - (2280 + 150) * 0.78,
      y: 420 / 2 - (200 + 200) * 0.78,
    });
  });
});
