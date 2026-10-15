import { acceptTerms } from "@/server/api/meProfile";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember } from "@/server/api/session";

export const runtime = "nodejs";

/** Accept the Community Guidelines (required before the first post). */
export async function POST(request: Request) {
  return withApiErrors("me/terms", async () => {
    const ctx = await requireActiveMember(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await acceptTerms(ctx.prisma, ctx.dbUser, body);
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk({ termsAcceptedAt: result.termsAcceptedAt });
  });
}
