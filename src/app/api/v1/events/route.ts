import { inWindow, parseEventWindow } from "@/server/api/events";
import { listPublicEvents } from "@/server/api/eventStore";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

/** Status depends on the clock, so this is computed per request. */
export const dynamic = "force-dynamic";

/** Managed (database) nights first-class, schedule nights where none replaces them. */
export async function GET(request: Request) {
  return withApiErrors("events", async () => {
    const parsed = parseEventWindow(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const events = (await listPublicEvents(getPrisma(), new Date())).filter(
      (event) => inWindow(event, parsed.window),
    );

    return apiOk(events, { cache: CACHE.minute });
  });
}
