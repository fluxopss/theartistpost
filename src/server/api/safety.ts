import type { PrismaClient } from "@prisma/client";
import { apiError } from "@/server/api/respond";
import {
  requireActiveMember,
  type AuthedContext,
} from "@/server/api/session";

export const COMMUNITY_GATE_MESSAGE =
  "Finish your profile and accept the Community Guidelines first.";

/**
 * Ids of everyone in a block relationship with `userId`, in either
 * direction. Both sides become invisible to each other.
 */
export async function blockedIdsFor(
  prisma: PrismaClient,
  userId: string,
): Promise<Set<string>> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return ids;
}

/**
 * Session + not suspended + Community Guidelines accepted + handle set.
 * Gate for every community write (follow, post, reply, support, media).
 */
export async function requireCommunityMember(
  request: Request,
): Promise<AuthedContext | Response> {
  const ctx = await requireActiveMember(request);
  if (ctx instanceof Response) return ctx;
  if (!ctx.dbUser.termsAcceptedAt || !ctx.dbUser.handle) {
    return apiError("forbidden", COMMUNITY_GATE_MESSAGE);
  }
  return ctx;
}
