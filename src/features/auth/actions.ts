"use server";

import { headers } from "next/headers";
import {
  issueSignInChallenge,
  verifySignInChallenge,
} from "@/features/auth/challenges";
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
  reservedArtistIdentityError,
  reservedMemberIdentityError,
  type RegisterArtistInput,
  type RegisterMemberInput,
} from "@/features/auth/register";
import { returningAuthMode } from "@/features/auth/returningSignIn";
import {
  clearSessionCookie,
  writeSessionCookie,
} from "@/features/auth/sessionCookie";
import { sessionUserFromDb } from "@/features/auth/sessionUser";
import type { SessionUser } from "@/features/auth/types";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import { getPrisma } from "@/shared/lib/prisma";
import { z } from "zod";

export type { RegisterArtistInput, RegisterMemberInput };

export type RegisterResult =
  | { ok: false; error: string }
  | { ok: true; user: SessionUser; pendingApproval?: boolean };

export type RequestSignInCodeResult =
  | { ok: false; error: string }
  | {
      ok: true;
      /** Always true in the public success shape (does not leak membership). */
      sent: true;
      expiresAt: string;
      /** Present only when AUTH_CODE_ECHO=1 (dev/test). */
      debugCode?: string;
      /** Which path served this request — hmac until Supabase OTP is opted in. */
      mode: "hmac" | "supabase";
    };

export type VerifySignInCodeResult =
  | { ok: false; error: string }
  | {
      ok: true;
      user: SessionUser;
      pendingApproval?: boolean;
      mode: "hmac" | "supabase";
    };

const returnEmailSchema = z.object({
  email: z.string().trim().email().max(200),
});

const returnVerifySchema = z.object({
  email: z.string().trim().email().max(200),
  code: z.string().trim().min(4).max(12),
});

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
  const reserved = reservedMemberIdentityError(email);
  if (reserved) return { ok: false, error: reserved };

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
  const handle = parsed.data.handle.toLowerCase();
  const reserved = reservedArtistIdentityError(email, handle);
  if (reserved) return { ok: false, error: reserved };

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

/**
 * Returning door — step 1: send a sign-in code.
 *
 * HMAC path (default): AuthChallenge + AUTH_CODE_WEBHOOK_URL delivery.
 * Supabase path (after Auth #15 + SUPABASE_RETURNING_OTP=1): reserved hook;
 * falls back to HMAC until that path is implemented against /auth/link.
 */
export async function requestSignInCodeAction(raw: {
  email: string;
}): Promise<RequestSignInCodeResult> {
  const parsed = returnEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  if (!getAuthSecret()) {
    return { ok: false, error: authSecretRequiredError() };
  }

  const email = parsed.data.email.toLowerCase();
  if (isDeniedAuthorEmail(email)) {
    return { ok: false, error: "That email is reserved." };
  }

  const ip = await clientKey();
  if (
    !hitRateLimit(`return:code:ip:${ip}`, { windowMs: 60_000, max: 8 }) ||
    !hitRateLimit(`return:code:email:${email}`, { windowMs: 3_600_000, max: 8 })
  ) {
    return { ok: false, error: "Too many code requests. Try again later." };
  }

  const mode = returningAuthMode();

  // Hook for Auth PR #15: Supabase OTP + POST /api/v1/auth/link.
  // Do not break the returning door if only partial Supabase env is set.
  if (mode === "supabase") {
    // TODO(auth#15): signInWithOtp({ email }) via @supabase/supabase-js,
    // then verifyOtp → access_token → POST /auth/link → writeSessionCookie.
    // Until that client path ships, fall through to the house HMAC codes.
    console.info(
      "[auth/return] SUPABASE_RETURNING_OTP set — using HMAC until Supabase OTP + /auth/link are wired in this action",
    );
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: "Sign-in is temporarily unavailable." };
  }

  const issued = await issueSignInChallenge(prisma, email);
  if (!issued.ok) {
    if (issued.code === "not_found") {
      // Same public shape as the API — do not leak whether the email exists.
      return {
        ok: true,
        sent: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        mode: "hmac",
      };
    }
    return { ok: false, error: issued.error };
  }

  return {
    ok: true,
    sent: true,
    expiresAt: issued.expiresAt,
    mode: "hmac",
    ...(issued.debugCode ? { debugCode: issued.debugCode } : {}),
  };
}

/**
 * Returning door — step 2: verify code and open tap_session.
 */
export async function verifySignInCodeAction(raw: {
  email: string;
  code: string;
}): Promise<VerifySignInCodeResult> {
  const parsed = returnVerifySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid code details",
    };
  }

  if (!getAuthSecret()) {
    return { ok: false, error: authSecretRequiredError() };
  }

  const email = parsed.data.email.toLowerCase();
  const ip = await clientKey();
  if (!hitRateLimit(`return:verify:${ip}`, { windowMs: 60_000, max: 20 })) {
    return { ok: false, error: "Too many attempts. Try again in a bit." };
  }

  const mode = returningAuthMode();
  if (mode === "supabase") {
    // TODO(auth#15): verifyOtp → POST /api/v1/auth/link with access token →
    // writeSessionCookie from the linked Prisma user. Fall through to HMAC.
    console.info(
      "[auth/return] SUPABASE_RETURNING_OTP set — verifying via HMAC until Supabase OTP + /auth/link are wired",
    );
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: "Sign-in is temporarily unavailable." };
  }

  const verified = await verifySignInChallenge(prisma, email, parsed.data.code);
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { artistProfile: true },
  });
  if (!dbUser) {
    return { ok: false, error: "That code is invalid or expired." };
  }

  const session = sessionUserFromDb(dbUser);
  const wrote = await writeSessionCookie(session);
  if (!wrote) return { ok: false, error: authSecretRequiredError() };

  await writeAuditLog(prisma, {
    actorId: dbUser.id,
    action: "auth.verify_code_web",
    targetType: "User",
    targetId: dbUser.id,
    meta: { email, surface: "join_returning" },
  });

  return {
    ok: true,
    user: session,
    mode: "hmac",
    ...(dbUser.role === "ARTIST" && !dbUser.artistProfile?.approved
      ? { pendingApproval: true }
      : {}),
  };
}

export async function signOutAction(): Promise<{ ok: true }> {
  await clearSessionCookie();
  return { ok: true };
}
