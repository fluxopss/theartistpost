import { describe, expect, it } from "vitest";
import {
  REACTIONS,
  REACTION_EMOJI,
  applyViewerReaction,
  emptyReactionCounts,
  reactionAccessibilityLabel,
  reactionSummaryLabel,
  reactionsFromLegacy,
  topReactions,
  totalReactions,
} from "../reactions";

describe("reaction set", () => {
  it("is the five kind-only reactions, Support first", () => {
    expect(REACTIONS).toEqual(["SUPPORT", "LOVE", "FIRE", "APPLAUSE", "INSPIRED"]);
    expect(REACTIONS.map((r) => REACTION_EMOJI[r])).toEqual(["✨", "❤️", "🔥", "👏", "🎨"]);
  });
});

describe("totals and summaries", () => {
  it("totals every emoji", () => {
    expect(totalReactions({ ...emptyReactionCounts(), SUPPORT: 2, FIRE: 3 })).toBe(5);
    expect(totalReactions(emptyReactionCounts())).toBe(0);
  });

  it("topReactions shows only reactions with counts, most first, ties in set order", () => {
    const counts = { ...emptyReactionCounts(), SUPPORT: 2, LOVE: 5, INSPIRED: 2, FIRE: 0 };
    expect(topReactions(counts)).toEqual([
      { reaction: "LOVE", emoji: "❤️", count: 5 },
      { reaction: "SUPPORT", emoji: "✨", count: 2 },
      { reaction: "INSPIRED", emoji: "🎨", count: 2 },
    ]);
    expect(topReactions(counts, 2)).toHaveLength(2);
    expect(topReactions(emptyReactionCounts())).toEqual([]);
  });
});

describe("applyViewerReaction (optimistic update)", () => {
  const base = {
    viewerReaction: null,
    reactionCounts: { ...emptyReactionCounts(), SUPPORT: 1 },
  } as const;

  it("adds a first reaction", () => {
    const next = applyViewerReaction(base, "LOVE");
    expect(next.viewerReaction).toBe("LOVE");
    expect(next.reactionCounts).toEqual({ ...emptyReactionCounts(), SUPPORT: 1, LOVE: 1 });
    expect(next.supportCount).toBe(2);
    expect(next.viewerSupported).toBe(true);
  });

  it("switching moves the count from the old emoji to the new one", () => {
    const mine = applyViewerReaction(base, "FIRE");
    const switched = applyViewerReaction(mine, "APPLAUSE");
    expect(switched.reactionCounts).toEqual({ ...emptyReactionCounts(), SUPPORT: 1, APPLAUSE: 1 });
    expect(switched.supportCount).toBe(2);
  });

  it("null removes it and never goes below zero", () => {
    const mine = applyViewerReaction(base, "FIRE");
    const removed = applyViewerReaction(mine, null);
    expect(removed.viewerReaction).toBeNull();
    expect(removed.reactionCounts.FIRE).toBe(0);
    expect(removed.viewerSupported).toBe(false);
    const stale = applyViewerReaction(
      { viewerReaction: "LOVE", reactionCounts: emptyReactionCounts() },
      null,
    );
    expect(stale.reactionCounts.LOVE).toBe(0);
    expect(stale.supportCount).toBe(0);
  });
});

describe("older servers", () => {
  it("builds counts from supportCount and viewerSupported when the new fields are missing", () => {
    expect(reactionsFromLegacy({ supportCount: 4, viewerSupported: true })).toEqual({
      reactionCounts: { ...emptyReactionCounts(), SUPPORT: 4 },
      viewerReaction: "SUPPORT",
    });
    expect(reactionsFromLegacy({ supportCount: 0, viewerSupported: false })).toEqual({
      reactionCounts: emptyReactionCounts(),
      viewerReaction: null,
    });
  });
});

describe("accessibility", () => {
  it("reads the viewer's reaction and the counts", () => {
    expect(
      reactionAccessibilityLabel({
        viewerReaction: "LOVE",
        reactionCounts: { ...emptyReactionCounts(), LOVE: 2, FIRE: 1 },
      }),
    ).toBe("You reacted with Love. 2 Love, 1 Fire. Double tap to take it back, touch and hold to choose another");
    expect(
      reactionAccessibilityLabel({ viewerReaction: null, reactionCounts: emptyReactionCounts() }),
    ).toBe("React. Be the first to cheer this on. Touch and hold to choose a reaction");
  });
});

describe("reactionSummaryLabel", () => {
  it("pluralises correctly and lists each emoji by name", () => {
    expect(reactionSummaryLabel({ ...emptyReactionCounts(), INSPIRED: 1 })).toBe("1 reaction: 1 Inspired");
    expect(reactionSummaryLabel({ ...emptyReactionCounts(), LOVE: 2, FIRE: 1 })).toBe(
      "3 reactions: 2 Love, 1 Fire",
    );
  });

  it("is empty when there are no reactions", () => {
    expect(reactionSummaryLabel(emptyReactionCounts())).toBe("");
  });
});
