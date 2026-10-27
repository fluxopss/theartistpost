import { describe, expect, it } from "vitest";
import {
  AD_PLACEMENTS,
  approvedSlots,
  isAdFreePath,
} from "@/lib/ads/placements";

describe("ad placements", () => {
  it("never proposes a spot on an ad-free page", () => {
    for (const p of AD_PLACEMENTS) {
      expect(isAdFreePath(p.path), p.id).toBe(false);
    }
  });

  it("keeps the art, community, sign-in, giving and kindness ad-free", () => {
    for (const path of [
      "/explore",
      "/community/abc",
      "/join",
      "/u/robbie",
      "/donate",
      "/kindness-always",
      "/night",
      "/event/123",
      "/get-involved",
    ]) {
      expect(isAdFreePath(path), path).toBe(true);
    }
    expect(isAdFreePath("/history")).toBe(false);
  });

  it("approves only known spots with numeric ad-unit IDs", () => {
    const slots = approvedSlots({
      ADSENSE_SLOTS:
        " history-end:1234567890 , about-end:abc, wall:9999999999, schedule-end:12 , home-lower:5555555555",
    });
    expect([...slots.entries()]).toEqual([
      ["history-end", "1234567890"],
      ["home-lower", "5555555555"],
    ]);
    expect(approvedSlots({}).size).toBe(0);
  });
});
