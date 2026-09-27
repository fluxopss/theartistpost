import { content } from "@/lib/content";
import { byStartAscending, toEventDTO } from "@/server/api/dto";
import { inWindow, parseEventWindow } from "@/server/api/events";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";

/** Status depends on the clock, so this is computed per request. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiErrors("events", async () => {
    const parsed = parseEventWindow(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const now = new Date();
    const events = (await content.getEvents())
      .filter((event) => inWindow(event, parsed.window))
      .sort(byStartAscending)
      .map((event) => toEventDTO(event, now));

    return apiOk(events, { cache: CACHE.minute });
  });
}
