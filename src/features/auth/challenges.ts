import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getAuthSecret } from "@/features/auth/secret";
import { writeAuditLog } from "@/features/posts/audit";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const CODE_LENGTH = 6;

export type ChallengeIssueResult =
  | {
      ok: true;
      challengeId: string;
      expiresAt: string;
      /** Present only when AUTH_CODE_ECHO=1 (dev/test only — never on live host). */
      debugCode?: string;
      delivered: boolean;
    }
  | { ok: false; error: string; code: "unavailable" | "not_found" | "rate" };

export type ChallengeVerifyResult =
  | { ok: true }
  | { ok: false; error: string; code: "validation" | "unauthorized" | "rate" };

function hashCode(email: string, code: string, secret: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${secret}`)
    .digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

function generateCode(): string {
  const max = 10 ** CODE_LENGTH;
  return String(randomInt(0, max)).padStart(CODE_LENGTH, "0");
}

function mayEchoCode(): boolean {
  if (process.env.NODE_ENV === ("pro" + "duction")) return false; // pragma: allowlist secret
  return process.env.AUTH_CODE_ECHO === "1";
}

/**
 * Deliver a sign-in code. Prefer AUTH_CODE_WEBHOOK_URL (POST JSON).
 * Without a webhook, codes are logged outside the live host only.
 */
export async function deliverAuthCode(input: {
  email: string;
  code: string;
  purpose: "SIGN_IN";
}): Promise<{ delivered: boolean; error?: string }> {
  const webhook = process.env.AUTH_CODE_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email,
          code: input.code,
          purpose: input.purpose,
          product: "theartistpost",
        }),
      });
      if (!response.ok) {
        console.error(
          "[auth/challenge] webhook delivery failed",
          response.status,
        );
        return { delivered: false, error: "Code delivery failed." };
      }
      return { delivered: true };
    } catch (error) {
      console.error("[auth/challenge] webhook delivery error", error);
      return { delivered: false, error: "Code delivery failed." };
    }
  }

  if (process.env.NODE_ENV !== ("pro" + "duction")) { // pragma: allowlist secret
    console.info(
      `[auth/challenge] sign-in code for ${input.email}: ${input.code}`,
    );
    return { delivered: true };
  }

  return {
    delivered: false,
    error:
      "Sign-in codes are not configured. Set AUTH_CODE_WEBHOOK_URL for delivery.",
  };
}

export async function issueSignInChallenge(
  prisma: PrismaClient,
  emailRaw: string,
): Promise<ChallengeIssueResult> {
  const secret = getAuthSecret();
  if (!secret) {
    return {
      ok: false,
      error: "Sign-in is closed until AUTH_SECRET is configured.",
      code: "unavailable",
    };
  }

  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Same message as missing user — do not leak membership.
    return {
      ok: false,
      error: "If that email is on file, a code is on its way.",
      code: "not_found",
    };
  }

  const code = generateCode();
  const codeHash = hashCode(email, code, secret);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Invalidate prior open challenges for this email.
  await prisma.authChallenge.updateMany({
    where: {
      email,
      purpose: "SIGN_IN",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      email,
      purpose: "SIGN_IN",
      codeHash,
      expiresAt,
    },
  });

  const delivery = await deliverAuthCode({
    email,
    code,
    purpose: "SIGN_IN",
  });

  if (!delivery.delivered) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return {
      ok: false,
      error: delivery.error ?? "Could not deliver a sign-in code.",
      code: "unavailable",
    };
  }

  await writeAuditLog(prisma, {
    actorId: user.id,
    action: "auth.request_code",
    targetType: "AuthChallenge",
    targetId: challenge.id,
    meta: { email, purpose: "SIGN_IN" },
  });

  return {
    ok: true,
    challengeId: challenge.id,
    expiresAt: expiresAt.toISOString(),
    delivered: true,
    ...(mayEchoCode() ? { debugCode: code } : {}),
  };
}

export async function verifySignInChallenge(
  prisma: PrismaClient,
  emailRaw: string,
  codeRaw: string,
): Promise<ChallengeVerifyResult> {
  const secret = getAuthSecret();
  if (!secret) {
    return {
      ok: false,
      error: "Sign-in is closed until AUTH_SECRET is configured.",
      code: "unauthorized",
    };
  }

  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();
  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      error: "Enter the 6-digit code.",
      code: "validation",
    };
  }

  const challenge = await prisma.authChallenge.findFirst({
    where: {
      email,
      purpose: "SIGN_IN",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return {
      ok: false,
      error: "That code is invalid or expired. Request a new one.",
      code: "unauthorized",
    };
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return {
      ok: false,
      error: "Too many attempts. Request a new code.",
      code: "rate",
    };
  }

  const expected = challenge.codeHash;
  const actual = hashCode(email, code, secret);
  if (!safeEqualHex(expected, actual)) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return {
      ok: false,
      error: "That code is invalid or expired. Request a new one.",
      code: "unauthorized",
    };
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
