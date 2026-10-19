import { describe, expect, it } from "vitest";
import { navMarketing } from "@/content/site";

describe("header navigation", () => {
  it("has Community right after The Wall", () => {
    const hrefs = navMarketing.map((l) => l.href);
    expect(hrefs).toContain("/community");
    expect(hrefs.indexOf("/community")).toBe(hrefs.indexOf("/explore") + 1);
  });
});
