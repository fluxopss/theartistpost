import { describe, expect, it } from "vitest";
import { defaultBoardScope, needsTopicsPrompt } from "../board-scope";

describe("defaultBoardScope", () => {
  it("opens on For You for a signed-in member who picked topics", () => {
    expect(defaultBoardScope({ signedIn: true, topicCount: 3 })).toBe("foryou");
  });

  it("opens on Everyone for guests and for members with no topics yet", () => {
    expect(defaultBoardScope({ signedIn: false, topicCount: 0 })).toBe("all");
    expect(defaultBoardScope({ signedIn: true, topicCount: 0 })).toBe("all");
  });
});

describe("needsTopicsPrompt", () => {
  it("asks for topics only on For You, for a signed-in member with none", () => {
    expect(needsTopicsPrompt({ scope: "foryou", signedIn: true, topicCount: 0 })).toBe(true);
    expect(needsTopicsPrompt({ scope: "foryou", signedIn: true, topicCount: 2 })).toBe(false);
    expect(needsTopicsPrompt({ scope: "all", signedIn: true, topicCount: 0 })).toBe(false);
    expect(needsTopicsPrompt({ scope: "foryou", signedIn: false, topicCount: 0 })).toBe(false);
  });
});
