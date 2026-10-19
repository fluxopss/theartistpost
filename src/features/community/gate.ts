import type { SessionUser } from "@/features/auth/types";
import { getPrisma } from "@/shared/lib/prisma";

/**
 * Where the viewer stands on the community board, read from the database (the
 * cookie doesn't carry guidelines or suspension). Mirrors the server's
 * `requireCommunityMember`: posting, replying and reacting need a handle and
 * accepted Community Guidelines, and a paused account can only read.
 */
export type CommunityGate = "signedOut" | "needsProfile" | "paused" | "ready";

export async function communityGate(session: SessionUser | null): Promise<CommunityGate> {
  if (!session) return "signedOut";
  const prisma = getPrisma();
  if (!prisma) return "signedOut";
  const user = await prisma.user.findUnique({
    where: { email: session.email.toLowerCase() },
    select: { id: true, handle: true, termsAcceptedAt: true, suspendedAt: true },
  });
  if (!user || user.id !== session.id) return "signedOut";
  if (user.suspendedAt) return "paused";
  if (!user.handle || !user.termsAcceptedAt) return "needsProfile";
  return "ready";
}
