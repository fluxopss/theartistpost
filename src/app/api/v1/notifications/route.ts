import {
  listNotifications,
  NOTIFICATIONS_DEFAULT_TAKE,
  NOTIFICATIONS_MAX_TAKE,
} from "@/server/api/notifications";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireApiSession } from "@/server/api/session";
import { parsePageParams } from "@/server/api/validation";

export const runtime = "nodejs";

/** The signed-in member's in-app notifications, newest first. */
export async function GET(request: Request) {
  return withApiErrors("notifications", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    const parsed = parsePageParams(new URL(request.url).searchParams, {
      defaultTake: NOTIFICATIONS_DEFAULT_TAKE,
      maxTake: NOTIFICATIONS_MAX_TAKE,
    });
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    return apiOk(
      await listNotifications(ctx.prisma, ctx.dbUser.id, parsed.page),
    );
  });
}
