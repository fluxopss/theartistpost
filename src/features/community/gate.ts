import type { SessionUser } from "@/features/auth/types";
import { getPrisma } from "@/shared/lib/prisma";

/**
 * Where the viewer stands on the community board, read from the database (the
 * cookie doesn't carry guidelines or suspension). Mirrors the server's
 * `requireCommunityMember`: posting, replying and reacting need a handle and
 * accepted Community Guidelines, and a paused account can only read.
 */
export type CommunityGate = "signedOut" | "needsProfile" | "paused" | "ready";

export type CommunityViewer = { gate: CommunityGate; handle: string | null };

/**
 * The viewer's gate plus their handle from the database. The cookie's handle
 * can be stale (set the handle in the app after signing in on the web), and
 * "is this my post?" must use the real one.
 */
export async function communityViewer(session: SessionUser | null): Promise<CommunityViewer> {
  if (!session) return { gate: "signedOut", handle: null };
  const prisma = getPrisma();
  if (!prisma) return { gate: "signedOut", handle: null };
  const user = await prisma.user.findUnique({
    where: { email: session.email.toLowerCase() },
    select: { id: true, handle: true, termsAcceptedAt: true, suspendedAt: true },
  });
  if (!user || user.id !== session.id) return { gate: "signedOut", handle: null };
  const handle = user.handle ?? null;
  if (user.suspendedAt) return { gate: "paused", handle };
  if (!user.handle || !user.termsAcceptedAt) return { gate: "needsProfile", handle };
  return { gate: "ready", handle };
}

export async function communityGate(session: SessionUser | null): Promise<CommunityGate> {
  return (await communityViewer(session)).gate;
}
