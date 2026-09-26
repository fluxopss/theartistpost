import { describe, expect, it } from "vitest";
import { mediaGap, mediaKindLabel } from "@/features/posts/mediaRule";

describe("TAP media rule", () => {
  it("refuses a post with no photograph, video, or sound", () => {
    expect(mediaGap("")).toBe("A TAP post needs a photograph, video, or sound.");
    expect(mediaGap("   ")).toBe("A TAP post needs a photograph, video, or sound.");
    expect(mediaGap(null)).toBe("A TAP post needs a photograph, video, or sound.");
  });

  it("accepts a site path or an http link", () => {
    expect(mediaGap("/uploads/still.webp")).toBeNull();
    expect(mediaGap("https://cdn.example.com/clip.mp4")).toBeNull();
    expect(mediaGap("not-a-link")).toMatch(/valid media URL/);
  });

  it("names the three TAP mediums", () => {
    expect(mediaKindLabel("IMAGE")).toBe("Photograph");
    expect(mediaKindLabel("VIDEO")).toBe("Video");
    expect(mediaKindLabel("EMBED")).toBe("Sound");
    expect(mediaKindLabel("CANVAS")).toBe("Work");
  });
});
