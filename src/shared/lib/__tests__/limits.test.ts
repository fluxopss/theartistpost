import { describe, expect, it } from "vitest";
import * as limits from "../limits";
import * as meProfile from "@/server/api/meProfile";
import { IMAGE_MAX_BYTES } from "@/server/api/media";

describe("profile limits have one source", () => {
  it("server and browser read the same numbers", () => {
    expect(meProfile.BIO_MAX).toBe(limits.BIO_MAX);
    expect(meProfile.HEADLINE_MAX).toBe(limits.HEADLINE_MAX);
    expect(meProfile.LOCATION_MAX).toBe(limits.LOCATION_MAX);
    expect(meProfile.TOPICS_MAX).toBe(limits.TOPICS_MAX);
    expect(IMAGE_MAX_BYTES).toBe(limits.IMAGE_MAX_BYTES);
  });

  it("keeps the values the app was built against", () => {
    expect([limits.BIO_MAX, limits.HEADLINE_MAX, limits.LOCATION_MAX, limits.TOPICS_MAX]).toEqual([480, 80, 60, 8]);
    expect([limits.NAME_MIN, limits.NAME_MAX]).toEqual([2, 80]);
    expect(limits.IMAGE_MAX_BYTES).toBe(2.5 * 1024 * 1024);
  });
});
