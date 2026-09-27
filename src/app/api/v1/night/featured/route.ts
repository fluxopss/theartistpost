import { content } from "@/lib/content";
import { featuredNight } from "@/features/night/program";
import { toEventDTO } from "@/server/api/dto";
import { apiOk, CACHE, withApiErrors } from "@/server/api/respond";

/** Which night is "next" depends on the clock, so compute it per request. */
export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors("night/featured", async () => {
    const now = new Date();
    const night = featuredNight(await content.getEvents(), now);
    const event = night ? toEventDTO(night, now) : null;
    const phase = event && event.status !== "closed" ? event.status : null;
    return apiOk({ event, phase }, { cache: CACHE.minute });
  });
}
