import { describe, expect, it } from "vitest";
import {
  readLogoIntroForce,
  shouldPlayLogoIntro,
} from "@/features/house/logoIntro";

describe("logo intro gate", () => {
  it("plays once per session unless forced", () => {
    expect(
      shouldPlayLogoIntro({ seen: false, reduceMotion: false, force: false }),
    ).toBe(true);
    expect(
      shouldPlayLogoIntro({ seen: true, reduceMotion: false, force: false }),
    ).toBe(false);
    expect(
      shouldPlayLogoIntro({ seen: true, reduceMotion: false, force: true }),
    ).toBe(true);
  });

  it("skips when motion is reduced", () => {
    expect(
      shouldPlayLogoIntro({ seen: false, reduceMotion: true, force: false }),
    ).toBe(false);
    expect(
      shouldPlayLogoIntro({ seen: false, reduceMotion: true, force: true }),
    ).toBe(true);
  });

  it("reads ?intro as a replay flag", () => {
    expect(readLogoIntroForce("?intro=1")).toBe(true);
    expect(readLogoIntroForce("door=space")).toBe(false);
  });
});
