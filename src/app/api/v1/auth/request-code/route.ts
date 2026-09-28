import { issueSignInChallenge } from "@/features/auth/challenges";
import { checkRateLimit } from "@/features/auth/rateLimit";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { readJsonBody, requestCodeBodySchema } from "@/server/api/auth";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
} from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/**
 * Request a 6-digit sign-in code for an existing account.
 * Always returns a generic success shape when the email is unknown
 * (after rate limits), except delivery/config failures.
 */
export async function POST(request: Request) {
  return withApiErrors("auth/request-code", async () => {
    if (!getAuthSecret()) {
      return apiError("service_paused", authSecretRequiredError());
    }

    const json = await readJsonBody(request);
    if (!json.ok) {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const parsed = requestCodeBodySchema.safeParse(json.body);
    if (!parsed.success) {
      return apiError(
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Enter a valid email address.",
        { fields: { email: "Enter a valid email address." } },
      );
    }

    const email = parsed.data.email.toLowerCase();
    if (isDeniedAuthorEmail(email)) {
      return apiError("validation_failed", "That email is reserved.", {
        fields: { email: "That email is reserved." },
      });
    }

    const ip = clientIp(request);
    const ipLimit = checkRateLimit(`v1:auth:code:ip:${ip}`, {
      windowMs: 60_000,
      max: 8,
    });
    const emailLimit = checkRateLimit(`v1:auth:code:email:${email}`, {
      windowMs: 3_600_000,
      max: 8,
    });
    if (!ipLimit.ok || !emailLimit.ok) {
      const retryAfterSec = Math.ceil(
        Math.max(
          ipLimit.ok ? 0 : ipLimit.retryAfterMs,
          emailLimit.ok ? 0 : emailLimit.retryAfterMs,
        ) / 1000,
      );
      return apiError("rate_limited", "Too many code requests. Try again later.", {
        retryAfterSec: Math.max(1, retryAfterSec),
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "Sign-in is temporarily unavailable.",
      );
    }

    const issued = await issueSignInChallenge(prisma, email);
    if (!issued.ok) {
      if (issued.code === "not_found") {
        // Do not leak whether the email exists.
        return apiOk({
          sent: true,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
      }
      if (issued.code === "unavailable") {
        return apiError("upstream_unavailable", issued.error);
      }
      return apiError("internal", issued.error);
    }

    return apiOk({
      sent: true,
      expiresAt: issued.expiresAt,
      ...(issued.debugCode ? { debugCode: issued.debugCode } : {}),
    });
  });
}
