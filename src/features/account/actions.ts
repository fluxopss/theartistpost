"use server";

import { readSessionFromCookie, writeSessionCookie } from "@/features/auth/sessionCookie";
import { sessionUserFromDb } from "@/features/auth/sessionUser";
import { getPrisma } from "@/shared/lib/prisma";

/**
 * After a profile or photo change, re-issue the signed-in person's own cookie
 * from the database so the header shows their new name and photo. Only ever
 * rewrites the session that is already in the cookie.
 */
export async function refreshSessionCookieAction(): Promise<{ ok: boolean }> {
  const session = await readSessionFromCookie();
  if (!session) return { ok: false };
  const prisma = getPrisma();
  if (!prisma) return { ok: false };

  const dbUser = await prisma.user.findUnique({
    where: { email: session.email.toLowerCase() },
    include: { artistProfile: true },
  });
  if (!dbUser || dbUser.id !== session.id) return { ok: false };

  const wrote = await writeSessionCookie(sessionUserFromDb(dbUser));
  return { ok: wrote };
}
