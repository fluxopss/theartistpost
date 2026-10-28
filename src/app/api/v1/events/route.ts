import { inLane, inWindow, parseEventWindow, parseLane } from "@/server/api/events";
import { listPublicEvents } from "@/server/api/eventStore";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

/** Status depends on the clock, so this is computed per request. */
export const dynamic = "force-dynamic";

/** Managed (database) nights first-class, schedule nights where none replaces them. */
export async function GET(request: Request) {
  return withApiErrors("events", async () => {
    const params = new URL(request.url).searchParams;
    const parsed = parseEventWindow(params);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }
    // Optional ?lane=<medium> (e.g. culinary). Without it, every night.
    const lane = parseLane(params);
    if (!lane.ok) {
      return apiError("validation_failed", lane.message, {
        fields: lane.fields,
      });
    }

    const events = (await listPublicEvents(getPrisma(), new Date())).filter(
      (event) => inWindow(event, parsed.window) && inLane(event, lane.lane),
    );

    return apiOk(events, { cache: CACHE.minute });
  });
}
