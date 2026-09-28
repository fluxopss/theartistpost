"use server";

import { headers } from "next/headers";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { hitRateLimit } from "@/features/auth/rateLimit";
import {
  artistJoinSchema,
  EXISTING_EMAIL_ERROR,
  memberJoinSchema,
  registerArtistCore,
  registerMemberCore,
  type RegisterArtistInput,
  type RegisterMemberInput,
} from "@/features/auth/register";
import {
  clearSessionCookie,
  writeSessionCookie,
} from "@/features/auth/sessionCookie";
import type { SessionUser } from "@/features/auth/types";
import { getPrisma } from "@/shared/lib/prisma";

export type { RegisterArtistInput, RegisterMemberInput };

export type RegisterResult =
  | { ok: false; error: string }
  | { ok: true; user: SessionUser; pendingApproval?: boolean };

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Passwordless member join: name + email → VIEWER + session cookie.
 * Never creates guest@theartistpost.org.
 */
export async function registerMemberAction(
  raw: RegisterMemberInput,
): Promise<RegisterResult> {
  const parsed = memberJoinSchema.safeParse(raw);
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

  const result = await registerMemberCore(prisma, parsed.data, {
    existingEmailError: EXISTING_EMAIL_ERROR,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const wrote = await writeSessionCookie(result.user);
  if (!wrote) return { ok: false, error: authSecretRequiredError() };

  return { ok: true, user: result.user };
}

/**
 * Artist studio join: User ARTIST + ArtistProfile approved=false + session.
 * Never auto-approves. Never creates guest@theartistpost.org.
 */
export async function registerArtistAction(
  raw: RegisterArtistInput,
): Promise<RegisterResult> {
  const parsed = artistJoinSchema.safeParse(raw);
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

  const result = await registerArtistCore(prisma, parsed.data, {
    existingEmailError: EXISTING_EMAIL_ERROR,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const wrote = await writeSessionCookie(result.user);
  if (!wrote) return { ok: false, error: authSecretRequiredError() };

  return {
    ok: true,
    user: result.user,
    pendingApproval: result.pendingApproval,
  };
}

export async function signOutAction(): Promise<{ ok: true }> {
  await clearSessionCookie();
  return { ok: true };
}
