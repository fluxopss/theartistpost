import {
  EXISTING_EMAIL_SIGN_IN_HINT,
  registerArtistCore,
  registerMemberCore,
  reservedArtistIdentityError,
  reservedMemberIdentityError,
} from "@/features/auth/register";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { issueSessionToken } from "@/features/auth/requestSession";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { toAuthUserDTO } from "@/features/auth/sessionUser";
import {
  joinBodySchema,
  readJsonBody,
  type AuthSessionDTO,
} from "@/server/api/auth";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
} from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** Passwordless join for Expo — same doors as /join, returns Bearer token. */
export async function POST(request: Request) {
  return withApiErrors("auth/join", async () => {
    if (!getAuthSecret()) {
      return apiError("service_paused", authSecretRequiredError());
    }

    const json = await readJsonBody(request);
    if (!json.ok) {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const parsed = joinBodySchema.safeParse(json.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "body";
        if (!fields[key]) fields[key] = issue.message;
      }
      return apiError(
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid join details",
        { fields },
      );
    }

    const ip = clientIp(request);
    const email = parsed.data.email.toLowerCase();
    const door = parsed.data.door;
    const reserved =
      door === "member"
        ? reservedMemberIdentityError(email)
        : reservedArtistIdentityError(email, parsed.data.handle);
    if (reserved) {
      return apiError("validation_failed", reserved);
    }

    const limit = checkRateLimit(`v1:auth:join:${door}:${ip}`, {
      windowMs: 60_000,
      max: door === "artist" ? 5 : 8,
    });
    const emailLimit = checkRateLimit(`v1:auth:join:email:${email}`, {
      windowMs: 3_600_000,
      max: 5,
    });
    if (!limit.ok || !emailLimit.ok) {
      const retryAfterSec = Math.ceil(
        Math.max(limit.ok ? 0 : limit.retryAfterMs, emailLimit.ok ? 0 : emailLimit.retryAfterMs) /
          1000,
      );
      return apiError("rate_limited", "Too many attempts. Try again in a bit.", {
        retryAfterSec: Math.max(1, retryAfterSec),
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "Registration is temporarily unavailable.",
      );
    }

    const result =
      parsed.data.door === "member"
        ? await registerMemberCore(prisma, parsed.data, {
            existingEmailError: EXISTING_EMAIL_SIGN_IN_HINT,
          })
        : await registerArtistCore(prisma, parsed.data, {
            existingEmailError: EXISTING_EMAIL_SIGN_IN_HINT,
          });

    if (!result.ok) {
      if (result.code === "conflict") {
        return apiError("conflict", result.error);
      }
      if (result.code === "validation") {
        return apiError("validation_failed", result.error);
      }
      return apiError("upstream_unavailable", result.error);
    }

    const issued = issueSessionToken(result.user);
    if (!issued) {
      return apiError("service_paused", authSecretRequiredError());
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: result.dbUserId },
      include: { artistProfile: true },
    });

    const data: AuthSessionDTO = {
      ...issued,
      user: dbUser
        ? toAuthUserDTO(dbUser)
        : toAuthUserDTO(result.user, null),
      ...(result.pendingApproval ? { pendingApproval: true } : {}),
    };

    return apiOk(data, { status: 201 });
  });
}
