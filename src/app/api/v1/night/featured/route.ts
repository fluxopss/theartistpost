import { featuredNight } from "@/features/night/program";
import { listPublicEvents } from "@/server/api/eventStore";
import { apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

/** Which night is "next" depends on the clock, so compute it per request. */
export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors("night/featured", async () => {
    const now = new Date();
    const events = (await listPublicEvents(getPrisma(), now)).filter(
      (event) => !event.cancelled,
    );
    const event = featuredNight(events, now);
    const phase = event && event.status !== "closed" ? event.status : null;
    return apiOk({ event, phase }, { cache: CACHE.minute });
  });
}
