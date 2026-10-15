import type { PrismaClient } from "@prisma/client";
import {
  authorizePublisher,
  isMockGuestSession,
  PUBLISHING_CLOSED_ERROR,
  SIGN_IN_REQUIRED_ERROR,
} from "@/features/auth/publishGate";
import { resolveLinkedSupabaseUser } from "@/features/auth/linkSupabaseUser";
import { resolveRequestAuth } from "@/features/auth/requestSession";
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

async function resolveDbUserFromRequest(
  request: Request,
): Promise<{ prisma: PrismaClient; dbUser: DbUserWithProfile } | null> {
  const auth = await resolveRequestAuth(request);
  if (auth.kind === "none") return null;

  const prisma = getPrisma();
  if (!prisma) return null;

  if (auth.kind === "supabase") {
    const dbUser = await resolveLinkedSupabaseUser(prisma, auth.claims);
    if (!dbUser) return null;
    return { prisma, dbUser };
  }

  if (isMockGuestSession(auth.session)) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: auth.session.email.toLowerCase() },
    include: { artistProfile: true },
  });
  if (!dbUser) return null;
  return { prisma, dbUser };
}

/**
 * Resolve a real session (Supabase JWT, Bearer HMAC, or cookie) backed by a DB user.
 * Mock guest / reserved emails / missing users yield null — never invents.
 */
export async function resolveOptionalSession(
  request: Request,
): Promise<AuthedContext | null> {
  const resolved = await resolveDbUserFromRequest(request);
  if (!resolved) return null;

  const liveSession = sessionUserFromDb(resolved.dbUser);
  return {
    session: liveSession,
    dbUser: resolved.dbUser,
    user: toAuthUserDTO(resolved.dbUser),
    prisma: resolved.prisma,
  };
}

/**
 * Require a real session backed by a DB user.
 * Mock guest / reserved emails are treated as unauthorized.
 */
export async function requireApiSession(
  request: Request,
): Promise<AuthedContext | Response> {
  const auth = await resolveRequestAuth(request);
  if (auth.kind === "none") {
    return apiError("unauthorized", SIGN_IN_REQUIRED_ERROR);
  }

  const prisma = getPrisma();
  if (!prisma) {
    return apiError(
      "upstream_unavailable",
      "Accounts are temporarily unavailable.",
    );
  }

  if (auth.kind === "supabase") {
    const dbUser = await resolveLinkedSupabaseUser(prisma, auth.claims);
    if (!dbUser) {
      return apiError(
        "unauthorized",
        "Join the house to link this pass, then try again.",
      );
    }
    const liveSession = sessionUserFromDb(dbUser);
    return {
      session: liveSession,
      dbUser,
      user: toAuthUserDTO(dbUser),
      prisma,
    };
  }

  if (isMockGuestSession(auth.session)) {
    return apiError("unauthorized", SIGN_IN_REQUIRED_ERROR);
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: auth.session.email.toLowerCase() },
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

/**
 * Approved ARTIST or ADMIN — same gate as web studio writes. Suspended
 * accounts are refused unless the caller is a read (`allowSuspended`).
 */
export async function requirePublisher(
  request: Request,
  options?: { allowSuspended?: boolean },
): Promise<AuthedContext | Response> {
  const ctx = await requireApiSession(request);
  if (ctx instanceof Response) return ctx;

  if (ctx.dbUser.suspendedAt && !options?.allowSuspended) {
    return apiError("forbidden", SUSPENDED_ERROR);
  }

  const gate = authorizePublisher(ctx.session, ctx.dbUser, {
    allowSuspended: options?.allowSuspended,
  });
  if (!gate.ok) {
    return apiError("forbidden", gate.error || PUBLISHING_CLOSED_ERROR);
  }
  return ctx;
}

/** ADMIN session required for customer management. */
export async function requireAdmin(
  request: Request,
): Promise<AuthedContext | Response> {
  const ctx = await requireApiSession(request);
  if (ctx instanceof Response) return ctx;
  if (ctx.dbUser.role !== "ADMIN") {
    return apiError("forbidden", "Admin access required.");
  }
  return ctx;
}

export const SUSPENDED_ERROR =
  "Your account is paused. Contact the house team if you think this is a mistake.";

/**
 * Real session AND not suspended. Every write route uses this (suspended
 * users stay read-only); reads and `DELETE /me` keep `requireApiSession`.
 */
export async function requireActiveMember(
  request: Request,
): Promise<AuthedContext | Response> {
  const ctx = await requireApiSession(request);
  if (ctx instanceof Response) return ctx;
  if (ctx.dbUser.suspendedAt) {
    return apiError("forbidden", SUSPENDED_ERROR);
  }
  return ctx;
}
