import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDraft, loadDraft, saveDraft, type ProfileDraft } from "../profileDraft";

const draft: ProfileDraft = {
  name: "Rae",
  handle: "rae",
  headline: "Painter",
  bio: "",
  location: "",
  chapterId: null,
  topicSlugs: ["murals"],
  venmoUsername: "",
  cashAppTag: "",
  paypalMeUsername: "",
};

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("profileDraft", () => {
  it("round-trips a draft per user", () => {
    saveDraft("u1", draft);
    expect(loadDraft("u1")).toEqual(draft);
    expect(loadDraft("u2")).toBeNull();
    expect(window.localStorage.getItem("tap:profile-draft:u1")).not.toBeNull();
  });

  it("clears a draft", () => {
    saveDraft("u1", draft);
    clearDraft("u1");
    expect(loadDraft("u1")).toBeNull();
  });

  it("ignores corrupt stored data", () => {
    window.localStorage.setItem("tap:profile-draft:u1", "{not json");
    expect(loadDraft("u1")).toBeNull();
    window.localStorage.setItem("tap:profile-draft:u1", JSON.stringify({ name: 5 }));
    expect(loadDraft("u1")).toBeNull();
  });

  it("survives a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveDraft("u1", draft)).not.toThrow();
    expect(loadDraft("u1")).toBeNull();
    expect(() => clearDraft("u1")).not.toThrow();
  });
});
