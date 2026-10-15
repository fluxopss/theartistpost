import { z } from "zod";
import type { PrismaClient, Reaction } from "@prisma/client";

/**
 * The curated reaction set. Kind-only by design (Kindness Always): there is
 * no dislike, no angry, and nothing ranks posts by reactions. SUPPORT is the
 * default and the only one older app builds know about.
 */
export const REACTIONS = [
  "SUPPORT",
  "LOVE",
  "FIRE",
  "APPLAUSE",
  "INSPIRED",
] as const satisfies readonly Reaction[];

export const REACTION_EMOJI: Record<Reaction, string> = {
  SUPPORT: "✨",
  LOVE: "❤️",
  FIRE: "🔥",
  APPLAUSE: "👏",
  INSPIRED: "🎨",
};

export type ReactionCounts = Record<Reaction, number>;

export const reactionBodySchema = z.object({
  reaction: z.enum(REACTIONS, { message: "Pick one of the reactions." }),
});

export function parseReaction(raw: string | null): Reaction | null {
  return (REACTIONS as readonly string[]).includes(raw ?? "")
    ? (raw as Reaction)
    : null;
}

export function emptyReactionCounts(): ReactionCounts {
  return { SUPPORT: 0, LOVE: 0, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 };
}

export function totalReactions(counts: ReactionCounts): number {
  return REACTIONS.reduce((sum, key) => sum + counts[key], 0);
}

type Group = { postId: string; reaction: Reaction; _count: { _all: number } };

/** Fold grouped rows into one counts map per post id. */
export function countsByPost(rows: unknown): Map<string, ReactionCounts> {
  const out = new Map<string, ReactionCounts>();
  if (!Array.isArray(rows)) return out;
  for (const row of rows as Group[]) {
    const counts = out.get(row.postId) ?? emptyReactionCounts();
    if ((REACTIONS as readonly string[]).includes(row.reaction)) {
      counts[row.reaction] += row._count?._all ?? 0;
    }
    out.set(row.postId, counts);
  }
  return out;
}

/** One grouped read for a whole page of Community posts. */
export async function loadCommunityReactionCounts(
  prisma: PrismaClient,
  postIds: string[],
): Promise<Map<string, ReactionCounts>> {
  if (postIds.length === 0) return new Map();
  const rows = await prisma.communityReaction.groupBy({
    by: ["postId", "reaction"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  return countsByPost(rows);
}

/** One grouped read for Wall posts (a Like row is a reaction). */
export async function loadWallReactionCounts(
  prisma: PrismaClient,
  postIds: string[],
): Promise<Map<string, ReactionCounts>> {
  if (postIds.length === 0) return new Map();
  const rows = await prisma.like.groupBy({
    by: ["postId", "reaction"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  return countsByPost(rows);
}
