import { failureResponse } from "@/server/api/eventResult";
import { checkInToEvent, getMyCheckIn } from "@/server/api/eventCheckIn";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember, requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

/** Where check-in stands for this night. Never asks for a location. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("events/[id]/checkin", async () => {
    const session = await requireApiSession(request);
    if (session instanceof Response) return session;
    const { id } = await ctx.params;
    const result = await getMyCheckIn(session.prisma, session.dbUser, id);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}

/**
 * "I'm here." Body is optional `{ lat, lng, accuracyM? }` — one reading, used
 * only to decide verified yes/no and never stored or logged.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("events/[id]/checkin:post", async () => {
    const session = await requireActiveMember(request);
    if (session instanceof Response) return session;

    let body: unknown = {};
    const text = await request.text();
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        return apiError("validation_failed", "Expected a JSON body.");
      }
    }

    const { id } = await ctx.params;
    const result = await checkInToEvent(session.prisma, session.dbUser, id, body);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}
