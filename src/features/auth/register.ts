import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { toSessionUser } from "@/features/auth/sessionUser";
import type { SessionUser } from "@/features/auth/types";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";

export const memberJoinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
});

export const artistJoinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  handle: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/i, "Handle must be letters, numbers, _ or -"),
  medium: z.string().trim().min(2).max(40),
  intent: z.string().trim().min(8).max(280),
});

export type RegisterMemberInput = z.infer<typeof memberJoinSchema>;
export type RegisterArtistInput = z.infer<typeof artistJoinSchema>;

export type RegisterCoreResult =
  | { ok: false; error: string; code?: "conflict" | "validation" | "unavailable" }
  | { ok: true; user: SessionUser; dbUserId: string; pendingApproval?: boolean };

/**
 * Join only opens a door for a brand-new email. Without an emailed code we
 * cannot prove someone owns an existing address, so returning emails never
 * get a session and their account is never touched.
 */
export const EXISTING_EMAIL_ERROR =
  "This email already joined. Email sign-in is coming soon.";

export const EXISTING_EMAIL_SIGN_IN_HINT =
  "This email already joined. Request a sign-in code instead.";

/**
 * Pure reserved-identity checks (no DB). Call before getPrisma() so CI and
 * DB-down hosts still return validation errors instead of "unavailable".
 */
export function reservedMemberIdentityError(
  email: string,
): string | null {
  if (isDeniedAuthorEmail(email)) return "That email is reserved.";
  return null;
}

export function reservedArtistIdentityError(
  email: string,
  handle: string,
): string | null {
  if (isDeniedAuthorEmail(email) || handle.toLowerCase() === "studioguest") {
    return "That identity is reserved.";
  }
  return null;
}

/**
 * Passwordless member join core: name + email → VIEWER.
 * Does not write cookies or tokens — callers issue the session.
 */
export async function registerMemberCore(
  prisma: PrismaClient,
  raw: RegisterMemberInput,
  options?: { existingEmailError?: string },
): Promise<RegisterCoreResult> {
  if (!getAuthSecret()) {
    return { ok: false, error: authSecretRequiredError(), code: "unavailable" };
  }

  const email = raw.email.toLowerCase();
  const name = raw.name;

  const reserved = reservedMemberIdentityError(email);
  if (reserved) {
    return { ok: false, error: reserved, code: "validation" };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return {
        ok: false,
        error: options?.existingEmailError ?? EXISTING_EMAIL_ERROR,
        code: "conflict",
      };
    }

    const user = await prisma.user.create({
      data: { email, name, role: "VIEWER" },
    });
    const session = toSessionUser(user);

    await writeAuditLog(prisma, {
      actorId: user.id,
      action: "auth.register_member",
      targetType: "User",
      targetId: user.id,
      meta: { email },
    });

    return { ok: true, user: session, dbUserId: user.id };
  } catch (error) {
    console.error("[registerMemberCore]", error);
    return {
      ok: false,
      error: "Could not open the member door.",
      code: "unavailable",
    };
  }
}

/**
 * Artist studio join core: User ARTIST + ArtistProfile approved=false.
 * Never auto-approves.
 */
export async function registerArtistCore(
  prisma: PrismaClient,
  raw: RegisterArtistInput,
  options?: { existingEmailError?: string },
): Promise<RegisterCoreResult> {
  if (!getAuthSecret()) {
    return { ok: false, error: authSecretRequiredError(), code: "unavailable" };
  }

  const email = raw.email.toLowerCase();
  const handle = raw.handle.toLowerCase();
  const name = raw.name;
  const medium = raw.medium;
  const intent = raw.intent;

  const reserved = reservedArtistIdentityError(email, handle);
  if (reserved) {
    return { ok: false, error: reserved, code: "validation" };
  }

  try {
    const [byEmail, byHandle] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.artistProfile.findUnique({ where: { handle } }),
    ]);

    if (byEmail) {
      return {
        ok: false,
        error: options?.existingEmailError ?? EXISTING_EMAIL_ERROR,
        code: "conflict",
      };
    }

    if (byHandle) {
      return {
        ok: false,
        error: "That handle is already taken.",
        code: "conflict",
      };
    }

    const bio = `${medium} · ${intent}`;
    const socialLinks = { medium, intent };

    const created = await prisma.user.create({
      data: {
        email,
        name,
        role: "ARTIST",
        artistProfile: {
          create: {
            handle,
            bio,
            socialLinks,
            approved: false,
          },
        },
      },
      include: { artistProfile: true },
    });

    const session = toSessionUser({
      id: created.id,
      email,
      name,
      role: "ARTIST",
      handle,
    });

    await writeAuditLog(prisma, {
      actorId: created.id,
      action: "auth.register_artist",
      targetType: "ArtistProfile",
      targetId: created.artistProfile!.id,
      meta: { email, handle, medium, approved: false },
    });

    return {
      ok: true,
      user: session,
      dbUserId: created.id,
      pendingApproval: true,
    };
  } catch (error) {
    console.error("[registerArtistCore]", error);
    return {
      ok: false,
      error: "Could not open the studio door.",
      code: "unavailable",
    };
  }
}
