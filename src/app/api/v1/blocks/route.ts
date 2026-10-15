import { blockUser, listBlocks } from "@/server/api/safety";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember, requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

/** People you have blocked. */
export async function GET(request: Request) {
  return withApiErrors("blocks", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    return apiOk(await listBlocks(ctx.prisma, ctx.dbUser.id));
  });
}

/**
 * Block someone by handle. Two-way invisibility; also removes follows in both
 * directions.
 */
export async function POST(request: Request) {
  return withApiErrors("blocks:create", async () => {
    const ctx = await requireActiveMember(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await blockUser(ctx.prisma, ctx.dbUser, body);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ blocked: true });
  });
}
