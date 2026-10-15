import { createReport } from "@/server/api/safety";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember } from "@/server/api/session";

export const runtime = "nodejs";

/**
 * Report a post, comment, board post or person. One report per reporter per
 * target: a repeat returns the same id with 200 (a new report is 201).
 */
export async function POST(request: Request) {
  return withApiErrors("reports:create", async () => {
    const ctx = await requireActiveMember(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await createReport(ctx.prisma, ctx.dbUser, body);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ id: result.id }, { status: result.created ? 201 : 200 });
  });
}
