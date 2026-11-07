import { beforeEach, describe, expect, it } from "vitest";
import {
  FIRST_TOUCH_STORAGE_KEY,
  captureFirstTouch,
  firstTouchFromUrl,
  parseFirstTouch,
  readFirstTouch,
} from "@/lib/firstTouch";

describe("first touch", () => {
  beforeEach(() => window.localStorage.clear());

  it("reads UTMs, gclid and the landing path from a URL", () => {
    expect(
      firstTouchFromUrl(
        "https://theartistpost.org/join?utm_source=qr-event&utm_medium=qr&utm_campaign=night-1&utm_content=flyer&gclid=abc&other=x",
      ),
    ).toEqual({
      utm_source: "qr-event",
      utm_medium: "qr",
      utm_campaign: "night-1",
      utm_content: "flyer",
      gclid: "abc",
      landing_page: "/join",
    });
  });

  it("stores on the first visit and never overwrites it", () => {
    captureFirstTouch("https://theartistpost.org/join?gclid=first");
    captureFirstTouch("https://theartistpost.org/install?gclid=second");
    expect(readFirstTouch()).toEqual({ gclid: "first", landing_page: "/join" });
  });

  it("returns undefined when storage is empty or corrupt", () => {
    expect(readFirstTouch()).toBeUndefined();
    window.localStorage.setItem(FIRST_TOUCH_STORAGE_KEY, "{nope");
    expect(readFirstTouch()).toBeUndefined();
  });

  it("drops unknown keys, non-strings and oversize values", () => {
    expect(parseFirstTouch({ gclid: "g", evil: "x", utm_source: 4 })).toEqual({ gclid: "g" });
    expect(parseFirstTouch({ gclid: "a".repeat(500) })?.gclid).toHaveLength(200);
    expect(parseFirstTouch("x")).toBeUndefined();
    expect(parseFirstTouch({})).toBeUndefined();
  });
});
