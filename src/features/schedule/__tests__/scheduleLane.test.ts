import { describe, expect, it } from "vitest";
import { laneLabel, scheduleLane } from "@/features/schedule/LaneChips";

describe("scheduleLane", () => {
  it("accepts house lanes and community, case-insensitively", () => {
    expect(scheduleLane("culinary")).toBe("culinary");
    expect(scheduleLane("Community")).toBe("community");
    expect(scheduleLane(["music", "x"])).toBe("music");
  });
  it("ignores anything else", () => {
    expect(scheduleLane("crypto")).toBeNull();
    expect(scheduleLane("")).toBeNull();
    expect(scheduleLane(undefined)).toBeNull();
  });
  it("labels community nights", () => {
    expect(laneLabel("community")).toBe("Community nights");
  });
});
