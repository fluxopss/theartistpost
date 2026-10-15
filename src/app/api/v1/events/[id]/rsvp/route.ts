import { failureResponse } from "@/server/api/eventResult";
import { getMyRsvp, setMyRsvp } from "@/server/api/eventRsvp";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember, requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

/** My response to a night, plus how full it is. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("events/[id]/rsvp", async () => {
    const session = await requireApiSession(request);
    if (session instanceof Response) return session;
    const { id } = await ctx.params;
    const result = await getMyRsvp(session.prisma, session.dbUser, id);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}

/** Body `{ status: GOING|MAYBE|NOT_GOING, party?: 1-6, note? }`. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("events/[id]/rsvp:post", async () => {
    const session = await requireActiveMember(request);
    if (session instanceof Response) return session;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const { id } = await ctx.params;
    const result = await setMyRsvp(session.prisma, session.dbUser, id, body);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}
