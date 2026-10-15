import { markRead } from "@/server/api/notifications";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

/** Mark notifications read: `{ ids }` for specific ones, `{}` for all. */
export async function POST(request: Request) {
  return withApiErrors("notifications/read", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await markRead(ctx.prisma, ctx.dbUser.id, body);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ unreadCount: result.unreadCount });
  });
}
