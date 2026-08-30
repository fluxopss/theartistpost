import { beforeEach, describe, expect, it } from "vitest";
import { appCopy } from "@/content/site";
import { isTabActive, tabForPath } from "@/features/app/nav";
import { parseSubscribeEmail } from "@/features/app/subscribe";
import {
  addComment,
  clearLocalAppData,
  DEFAULT_STUDIO,
  getComments,
  getSaves,
  getStudio,
  isLiked,
  setStudio,
  slugifyHandle,
  toggleLike,
  toggleSavedEvent,
  toggleSavedPost,
} from "@/features/app/storage";

describe("app tab matching", () => {
  it("treats home as exact only", () => {
    expect(isTabActive("/", "/")).toBe(true);
    expect(isTabActive("/", "/explore")).toBe(false);
  });

  it("groups product routes under their tab", () => {
    expect(isTabActive("/explore", "/post/hello")).toBe(true);
    expect(isTabActive("/artist-schedule", "/event/night-1")).toBe(true);
    expect(isTabActive("/more", "/settings")).toBe(true);
    expect(isTabActive("/more", "/install")).toBe(true);
    expect(tabForPath("/privacy")?.href).toBe("/more");
    expect(tabForPath("/install")?.href).toBe("/more");
    expect(tabForPath("/history")?.href).toBe("/more");
    expect(tabForPath("/about")?.href).toBe("/more");
  });
});

describe("install copy", () => {
  it("describes the home-screen app without inventing artists", () => {
    expect(appCopy.installTitle).toMatch(/app/i);
    expect(appCopy.installBenefits.length).toBeGreaterThanOrEqual(3);
    expect(
      appCopy.installBenefits.some((item) => /invent/i.test(item.body)),
    ).toBe(true);
  });
});

describe("subscribe email", () => {
  it("accepts a normal address", () => {
    expect(parseSubscribeEmail("Robbie@theartistpost.org").ok).toBe(true);
  });

  it("rejects empty and junk", () => {
    expect(parseSubscribeEmail("").ok).toBe(false);
    expect(parseSubscribeEmail("not-an-email").ok).toBe(false);
  });
});

describe("device studio storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Studio Guest", () => {
    expect(getStudio()).toEqual(DEFAULT_STUDIO);
  });

  it("slugifies a display name", () => {
    expect(slugifyHandle("Love All Studio")).toBe("loveallstudio");
    const saved = setStudio({ displayName: "Kindness Always" });
    expect(saved.handle).toBe("kindnessalways");
  });

  it("toggles likes", () => {
    expect(isLiked("p1")).toBe(false);
    expect(toggleLike("p1")).toBe(true);
    expect(isLiked("p1")).toBe(true);
    expect(toggleLike("p1")).toBe(false);
  });

  it("saves works and nights", () => {
    toggleSavedPost({
      id: "1",
      slug: "mural",
      title: "Mural",
      artist: "Local",
    });
    toggleSavedEvent({
      id: "e1",
      title: "Night",
      venue: "Hacienda",
      start: "2026-09-05T12:00:00-04:00",
    });
    const library = getSaves();
    expect(library.posts).toHaveLength(1);
    expect(library.events[0]?.venue).toBe("Hacienda");
  });

  it("rejects empty comments and stores a valid note", () => {
    expect(addComment("p1", " ", "Guest")).toMatchObject({
      error: expect.stringMatching(/note/i),
    });
    const comment = addComment("p1", "Loved the coral spark.", "Guest");
    expect("id" in comment).toBe(true);
    expect(getComments("p1")).toHaveLength(1);
  });

  it("clears local studio data", () => {
    toggleLike("p1");
    clearLocalAppData();
    expect(isLiked("p1")).toBe(false);
    expect(getStudio().displayName).toBe("Studio Guest");
  });
});
