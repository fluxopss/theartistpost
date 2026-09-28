import type { PrismaClient } from "@prisma/client";
import {
  authorizePublisher,
  isMockGuestSession,
  PUBLISHING_CLOSED_ERROR,
  SIGN_IN_REQUIRED_ERROR,
} from "@/features/auth/publishGate";
import { resolveSessionFromRequest } from "@/features/auth/requestSession";
import {
  sessionUserFromDb,
  toAuthUserDTO,
  type AuthUserDTO,
  type DbUserWithProfile,
} from "@/features/auth/sessionUser";
import type { SessionUser } from "@/features/auth/types";
import { getPrisma } from "@/shared/lib/prisma";
import { apiError } from "@/server/api/respond";

export type AuthedContext = {
  session: SessionUser;
  dbUser: DbUserWithProfile;
  user: AuthUserDTO;
  prisma: PrismaClient;
};

/**
 * Require a real session (Bearer or cookie) backed by a DB user.
 * Mock guest / reserved emails are treated as unauthorized.
 */
export async function requireApiSession(
  request: Request,
): Promise<AuthedContext | Response> {
  const session = await resolveSessionFromRequest(request);
  if (!session || isMockGuestSession(session)) {
    return apiError("unauthorized", SIGN_IN_REQUIRED_ERROR);
  }

  const prisma = getPrisma();
  if (!prisma) {
    return apiError(
      "upstream_unavailable",
      "Accounts are temporarily unavailable.",
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.email.toLowerCase() },
    include: { artistProfile: true },
  });
  if (!dbUser) {
    return apiError("unauthorized", SIGN_IN_REQUIRED_ERROR);
  }

  const liveSession = sessionUserFromDb(dbUser);
  return {
    session: liveSession,
    dbUser,
    user: toAuthUserDTO(dbUser),
    prisma,
  };
}

/** Approved ARTIST or ADMIN — same gate as web studio writes. */
export async function requirePublisher(
  request: Request,
): Promise<AuthedContext | Response> {
  const ctx = await requireApiSession(request);
  if (ctx instanceof Response) return ctx;

  const gate = authorizePublisher(ctx.session, ctx.dbUser);
  if (!gate.ok) {
    return apiError("forbidden", gate.error || PUBLISHING_CLOSED_ERROR);
  }
  return ctx;
}
