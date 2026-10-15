import { isPlausibleEventId } from "@/server/api/events";
import { findPublicEvent } from "@/server/api/eventStore";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

/** Status depends on the clock, so this is computed per request. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/events/[id]">,
) {
  return withApiErrors("events/[id]", async () => {
    const { id } = await ctx.params;
    const event = isPlausibleEventId(id)
      ? await findPublicEvent(getPrisma(), id)
      : null;
    if (!event) {
      return apiError("not_found", "That night is not on the board.");
    }
    return apiOk(event, { cache: CACHE.minute });
  });
}
