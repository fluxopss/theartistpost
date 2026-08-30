import { describe, expect, it } from "vitest";
import { history } from "@/content/history";
import { site } from "@/content/site";

const invented = /luna voss|kai chan|mira noir/i;

describe("The Artist Post History", () => {
  it("is titled and sourced", () => {
    expect(history.title).toBe("The Artist Post History");
    expect(history.eras.length).toBeGreaterThanOrEqual(5);
    expect(history.sources.length).toBeGreaterThanOrEqual(4);
    expect(history.honesty).toMatch(/do not invent/i);
  });

  it("keeps eras in chronological order", () => {
    const keys = history.eras.map((era) => era.sortKey);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect(history.eras[0]?.year).toBe("2014");
    expect(history.eras.some((era) => era.id === "charity")).toBe(true);
  });

  it("records the public charity facts without invented artists", () => {
    const text = JSON.stringify(history);
    expect(text).toContain(site.ein);
    expect(text).toContain(site.founder);
    expect(text).toContain("501(c)(3)");
    expect(text).toContain("522 Clematis");
    expect(invented.test(text)).toBe(false);
  });
});
