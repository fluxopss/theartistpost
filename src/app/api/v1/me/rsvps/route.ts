import { failureResponse } from "@/server/api/eventResult";
import { listMyRsvps } from "@/server/api/eventRsvp";
import { apiOk, withApiErrors } from "@/server/api/respond";
import { requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

/** Nights I said going / maybe to, soonest first. */
export async function GET(request: Request) {
  return withApiErrors("me/rsvps", async () => {
    const session = await requireApiSession(request);
    if (session instanceof Response) return session;
    const result = await listMyRsvps(session.prisma, session.dbUser);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}
