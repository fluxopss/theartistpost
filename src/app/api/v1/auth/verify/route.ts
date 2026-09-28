import { verifySignInChallenge } from "@/features/auth/challenges";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { issueSessionToken } from "@/features/auth/requestSession";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { sessionUserFromDb, toAuthUserDTO } from "@/features/auth/sessionUser";
import { writeAuditLog } from "@/features/posts/audit";
import { readJsonBody, verifyCodeBodySchema, type AuthSessionDTO } from "@/server/api/auth";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
} from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** Verify a sign-in code and return a Bearer session token. */
export async function POST(request: Request) {
  return withApiErrors("auth/verify", async () => {
    if (!getAuthSecret()) {
      return apiError("service_paused", authSecretRequiredError());
    }

    const json = await readJsonBody(request);
    if (!json.ok) {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const parsed = verifyCodeBodySchema.safeParse(json.body);
    if (!parsed.success) {
      return apiError(
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid code details",
      );
    }

    const email = parsed.data.email.toLowerCase();
    const ip = clientIp(request);
    const limit = checkRateLimit(`v1:auth:verify:${ip}`, {
      windowMs: 60_000,
      max: 20,
    });
    if (!limit.ok) {
      return apiError("rate_limited", "Too many attempts. Try again in a bit.", {
        retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "Sign-in is temporarily unavailable.",
      );
    }

    const verified = await verifySignInChallenge(
      prisma,
      email,
      parsed.data.code,
    );
    if (!verified.ok) {
      if (verified.code === "validation") {
        return apiError("validation_failed", verified.error, {
          fields: { code: verified.error },
        });
      }
      if (verified.code === "rate") {
        return apiError("rate_limited", verified.error, { retryAfterSec: 60 });
      }
      return apiError("unauthorized", verified.error);
    }

    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { artistProfile: true },
    });
    if (!dbUser) {
      return apiError("unauthorized", "That code is invalid or expired.");
    }

    const session = sessionUserFromDb(dbUser);
    const issued = issueSessionToken(session);
    if (!issued) {
      return apiError("service_paused", authSecretRequiredError());
    }

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "auth.verify_code",
      targetType: "User",
      targetId: dbUser.id,
      meta: { email },
    });

    const data: AuthSessionDTO = {
      ...issued,
      user: toAuthUserDTO(dbUser),
      ...(dbUser.role === "ARTIST" && !dbUser.artistProfile?.approved
        ? { pendingApproval: true }
        : {}),
    };

    return apiOk(data);
  });
}
