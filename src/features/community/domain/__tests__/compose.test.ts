import { describe, expect, it } from "vitest";
import { COMMUNITY_BODY_MAX, COMMUNITY_KINDS, extractMentions, validateCommunityBody } from "../compose";

describe("community kinds", () => {
  it("lists the six v1 kinds with their labels in order", () => {
    expect(COMMUNITY_KINDS.map((k) => k.id)).toEqual([
      "SHOUTOUT",
      "COLLAB",
      "SHOWING",
      "ASK",
      "KINDNESS",
      "UPDATE",
    ]);
    expect(COMMUNITY_KINDS.map((k) => k.label)).toEqual([
      "Shout-out",
      "Collab call",
      "I'm showing",
      "Ask the house",
      "Kindness",
      "Studio update",
    ]);
  });

  it("gives every kind a non-empty prompt", () => {
    for (const kind of COMMUNITY_KINDS) {
      expect(kind.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it("caps bodies at 500 characters", () => {
    expect(COMMUNITY_BODY_MAX).toBe(500);
  });
});

describe("extractMentions", () => {
  it("returns lowercased, unique handles", () => {
    expect(extractMentions("hi @Robbie and @robbie @x")).toEqual(["robbie"]);
  });

  it("ignores handles shorter than 2 characters", () => {
    expect(extractMentions("hey @x only")).toEqual([]);
  });

  it("finds mentions at the start of the body and after whitespace", () => {
    expect(extractMentions("@ada_art and @bo-bo")).toEqual(["ada_art", "bo-bo"]);
  });

  it("does not match an @ inside an email-like word", () => {
    expect(extractMentions("write to ada@example.com")).toEqual([]);
  });

  it("caps the result at 5 handles", () => {
    const body = "@aa1 @bb2 @cc3 @dd4 @ee5 @ff6 @gg7";
    expect(extractMentions(body)).toEqual(["aa1", "bb2", "cc3", "dd4", "ee5"]);
  });

  it("returns an empty list for a body without mentions", () => {
    expect(extractMentions("just a kind word")).toEqual([]);
  });
});

describe("validateCommunityBody", () => {
  it("requires something after trimming", () => {
    expect(validateCommunityBody("   ")).toEqual({ ok: false, message: "Write something first." });
    expect(validateCommunityBody("")).toMatchObject({ ok: false });
  });

  it("accepts up to 500 characters and trims", () => {
    expect(validateCommunityBody("  hi  ")).toEqual({ ok: true, body: "hi" });
    expect(validateCommunityBody("x".repeat(COMMUNITY_BODY_MAX))).toMatchObject({ ok: true });
  });

  it("rejects more than 500 characters", () => {
    expect(validateCommunityBody("x".repeat(COMMUNITY_BODY_MAX + 1))).toMatchObject({ ok: false });
  });

  it("counts what a person sees: 500 emoji fit, 501 do not", () => {
    expect(validateCommunityBody("🎨".repeat(COMMUNITY_BODY_MAX))).toMatchObject({ ok: true });
    expect(validateCommunityBody("🎨".repeat(COMMUNITY_BODY_MAX + 1))).toMatchObject({ ok: false });
  });

  it("keeps emoji exactly as typed", () => {
    expect(validateCommunityBody("  Great show 🔥👏  ")).toEqual({ ok: true, body: "Great show 🔥👏" });
  });
});
