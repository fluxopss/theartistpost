/**
 * Reactions on community and Wall posts. A small curated set, kind-only by
 * design (Kindness Always): there is no dislike, and nothing is ranked by
 * reactions. SUPPORT is the default tap.
 */

export const REACTIONS = ["SUPPORT", "LOVE", "FIRE", "APPLAUSE", "INSPIRED"] as const;

export type Reaction = (typeof REACTIONS)[number];

export const REACTION_EMOJI: Record<Reaction, string> = {
  SUPPORT: "✨",
  LOVE: "❤️",
  FIRE: "🔥",
  APPLAUSE: "👏",
  INSPIRED: "🎨",
};

export const REACTION_LABEL: Record<Reaction, string> = {
  SUPPORT: "Support",
  LOVE: "Love",
  FIRE: "Fire",
  APPLAUSE: "Applause",
  INSPIRED: "Inspired",
};

export type ReactionCounts = Record<Reaction, number>;

export function emptyReactionCounts(): ReactionCounts {
  return { SUPPORT: 0, LOVE: 0, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 };
}

export function totalReactions(counts: ReactionCounts): number {
  return REACTIONS.reduce((sum, reaction) => sum + (counts[reaction] ?? 0), 0);
}

export type ReactionSummary = { reaction: Reaction; emoji: string; count: number };

/**
 * The reactions to show on a card: only ones with a count, biggest first,
 * ties in the canonical set order. This is a per-post display, never a ranking
 * across posts.
 */
export function topReactions(counts: ReactionCounts, limit = 3): ReactionSummary[] {
  return REACTIONS.map((reaction, order) => ({ reaction, order, count: counts[reaction] ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map(({ reaction, count }) => ({ reaction, emoji: REACTION_EMOJI[reaction], count }));
}

export type ReactionState = {
  viewerReaction: Reaction | null;
  reactionCounts: ReactionCounts;
};

export type ReactionFields = ReactionState & {
  supportCount: number;
  viewerSupported: boolean;
};

/** Optimistic result of the viewer choosing `next` (null removes their reaction). */
export function applyViewerReaction(state: ReactionState, next: Reaction | null): ReactionFields {
  const counts = { ...state.reactionCounts };
  if (state.viewerReaction) {
    counts[state.viewerReaction] = Math.max(0, (counts[state.viewerReaction] ?? 0) - 1);
  }
  if (next) counts[next] = (counts[next] ?? 0) + 1;
  return {
    viewerReaction: next,
    reactionCounts: counts,
    supportCount: totalReactions(counts),
    viewerSupported: next !== null,
  };
}

/** For servers that predate reactions: everything was Support. */
export function reactionsFromLegacy(post: { supportCount: number; viewerSupported: boolean }): ReactionState {
  return {
    reactionCounts: { ...emptyReactionCounts(), SUPPORT: Math.max(0, post.supportCount) },
    viewerReaction: post.viewerSupported ? "SUPPORT" : null,
  };
}

/** Screen-reader sentence for the reaction button. */
export function reactionAccessibilityLabel(state: ReactionState): string {
  const parts = topReactions(state.reactionCounts, REACTIONS.length).map(
    (entry) => `${entry.count} ${REACTION_LABEL[entry.reaction]}`,
  );
  if (state.viewerReaction) {
    const counts = parts.length > 0 ? ` ${parts.join(", ")}.` : "";
    return `You reacted with ${REACTION_LABEL[state.viewerReaction]}.${counts} Double tap to take it back, touch and hold to choose another`;
  }
  if (parts.length > 0) {
    return `React. ${parts.join(", ")}. Touch and hold to choose a reaction`;
  }
  return "React. Be the first to cheer this on. Touch and hold to choose a reaction";
}

/** Spoken summary of a post's reactions, e.g. "3 reactions: 2 Love, 1 Fire". */
export function reactionSummaryLabel(counts: ReactionCounts): string {
  const total = totalReactions(counts);
  if (total === 0) return "";
  const parts = topReactions(counts, REACTIONS.length).map(
    (entry) => `${entry.count} ${REACTION_LABEL[entry.reaction]}`,
  );
  return `${total} ${total === 1 ? "reaction" : "reactions"}: ${parts.join(", ")}`;
}
