"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { hitRateLimit } from "@/features/auth/rateLimit";
import {
  clearSessionCookie,
  writeSessionCookie,
} from "@/features/auth/sessionCookie";
import type { SessionUser } from "@/features/auth/types";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import { getPrisma } from "@/shared/lib/prisma";

const memberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
});

const artistSchema = z.object({
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

export type RegisterMemberInput = z.infer<typeof memberSchema>;
export type RegisterArtistInput = z.infer<typeof artistSchema>;

export type RegisterResult =
  | { ok: false; error: string }
  | { ok: true; user: SessionUser; pendingApproval?: boolean };

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

function toSessionUser(input: {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  handle?: string | null;
  image?: string | null;
}): SessionUser {
  return {
    id: input.id,
    email: input.email,
    name: input.name,
    role: input.role,
    handle: input.handle ?? undefined,
    image: input.image ?? null,
  };
}

/**
 * Passwordless member join: name + email → VIEWER + session cookie.
 * Never creates guest@theartistpost.org.
 */
export async function registerMemberAction(
  raw: RegisterMemberInput,
): Promise<RegisterResult> {
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid member details",
    };
  }

  if (!getAuthSecret()) {
    return { ok: false, error: authSecretRequiredError() };
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;

  if (isDeniedAuthorEmail(email)) {
    return { ok: false, error: "That email is reserved." };
  }

  const ip = await clientKey();
  if (
    !hitRateLimit(`register:member:${ip}`, { windowMs: 60_000, max: 8 }) ||
    !hitRateLimit(`register:email:${email}`, { windowMs: 3_600_000, max: 5 })
  ) {
    return { ok: false, error: "Too many attempts. Try again in a bit." };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: "Registration is temporarily unavailable." };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role === "ARTIST" || existing.role === "ADMIN") {
        return {
          ok: false,
          error: "This email already has a studio account. Open the Artist door.",
        };
      }
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { name },
      });
      const session = toSessionUser(updated);
      const wrote = await writeSessionCookie(session);
      if (!wrote) return { ok: false, error: authSecretRequiredError() };
      await writeAuditLog(prisma, {
        actorId: updated.id,
        action: "auth.register_member",
        targetType: "User",
        targetId: updated.id,
        meta: { email, returning: true },
      });
      return { ok: true, user: session };
    }

    const user = await prisma.user.create({
      data: { email, name, role: "VIEWER" },
    });
    const session = toSessionUser(user);
    const wrote = await writeSessionCookie(session);
    if (!wrote) return { ok: false, error: authSecretRequiredError() };

    await writeAuditLog(prisma, {
      actorId: user.id,
      action: "auth.register_member",
      targetType: "User",
      targetId: user.id,
      meta: { email },
    });

    return { ok: true, user: session };
  } catch (error) {
    console.error("[registerMemberAction]", error);
    return { ok: false, error: "Could not open the member door." };
  }
}

/**
 * Artist studio join: User ARTIST + ArtistProfile approved=false + session.
 * Never auto-approves. Never creates guest@theartistpost.org.
 */
export async function registerArtistAction(
  raw: RegisterArtistInput,
): Promise<RegisterResult> {
  const parsed = artistSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid studio details",
    };
  }

  if (!getAuthSecret()) {
    return { ok: false, error: authSecretRequiredError() };
  }

  const email = parsed.data.email.toLowerCase();
  const handle = parsed.data.handle.toLowerCase();
  const name = parsed.data.name;
  const medium = parsed.data.medium;
  const intent = parsed.data.intent;

  if (isDeniedAuthorEmail(email) || handle === "studioguest") {
    return { ok: false, error: "That identity is reserved." };
  }

  const ip = await clientKey();
  if (
    !hitRateLimit(`register:artist:${ip}`, { windowMs: 60_000, max: 5 }) ||
    !hitRateLimit(`register:email:${email}`, { windowMs: 3_600_000, max: 5 })
  ) {
    return { ok: false, error: "Too many attempts. Try again in a bit." };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: "Registration is temporarily unavailable." };
  }

  try {
    const [byEmail, byHandle] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
        include: { artistProfile: true },
      }),
      prisma.artistProfile.findUnique({ where: { handle } }),
    ]);

    if (byHandle && byHandle.userId !== byEmail?.id) {
      return { ok: false, error: "That handle is already taken." };
    }

    if (byEmail?.artistProfile?.approved) {
      return {
        ok: false,
        error: "This email is already an approved artist. Sign in from Settings.",
      };
    }

    const bio = `${medium} · ${intent}`;
    const socialLinks = { medium, intent };

    let userId: string;
    let profileId: string;

    if (byEmail) {
      const updated = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          name,
          role: "ARTIST",
          artistProfile: byEmail.artistProfile
            ? {
                update: {
                  handle,
                  bio,
                  socialLinks,
                  approved: false,
                },
              }
            : {
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
      userId = updated.id;
      profileId = updated.artistProfile!.id;
    } else {
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
      userId = created.id;
      profileId = created.artistProfile!.id;
    }

    const session = toSessionUser({
      id: userId,
      email,
      name,
      role: "ARTIST",
      handle,
    });
    const wrote = await writeSessionCookie(session);
    if (!wrote) return { ok: false, error: authSecretRequiredError() };

    await writeAuditLog(prisma, {
      actorId: userId,
      action: "auth.register_artist",
      targetType: "ArtistProfile",
      targetId: profileId,
      meta: { email, handle, medium, approved: false },
    });

    return { ok: true, user: session, pendingApproval: true };
  } catch (error) {
    console.error("[registerArtistAction]", error);
    return { ok: false, error: "Could not open the studio door." };
  }
}

export async function signOutAction(): Promise<{ ok: true }> {
  await clearSessionCookie();
  return { ok: true };
}
