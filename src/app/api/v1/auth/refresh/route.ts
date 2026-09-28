import { issueSessionToken } from "@/features/auth/requestSession";
import {
  authSecretRequiredError,
  getAuthSecret,
} from "@/features/auth/secret";
import { toAuthUserDTO } from "@/features/auth/sessionUser";
import type { AuthSessionDTO } from "@/server/api/auth";
import { requireApiSession } from "@/server/api/session";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";

export const runtime = "nodejs";

/** Re-issue a fresh token for a still-valid Bearer/cookie session. */
export async function POST(request: Request) {
  return withApiErrors("auth/refresh", async () => {
    if (!getAuthSecret()) {
      return apiError("service_paused", authSecretRequiredError());
    }

    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    const issued = issueSessionToken(ctx.session);
    if (!issued) {
      return apiError("service_paused", authSecretRequiredError());
    }

    const data: AuthSessionDTO = {
      ...issued,
      user: toAuthUserDTO(ctx.dbUser),
      ...(ctx.dbUser.role === "ARTIST" && !ctx.dbUser.artistProfile?.approved
        ? { pendingApproval: true }
        : {}),
    };

    return apiOk(data);
  });
}
