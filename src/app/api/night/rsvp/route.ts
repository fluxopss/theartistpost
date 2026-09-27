import { submitNightRsvp } from "@/server/api/leads/nightRsvp";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const outcome = await submitNightRsvp(body);

    if (outcome.ok) {
      return Response.json({
        ok: true,
        delivered: true,
        code: outcome.data.code,
      });
    }

    switch (outcome.reason) {
      case "invalid":
        return Response.json({ ok: false, error: outcome.error }, { status: 400 });
      case "not_found":
        return Response.json({ ok: false, error: outcome.error }, { status: 404 });
      case "closed":
        return Response.json({ ok: false, error: outcome.error }, { status: 409 });
      case "undelivered":
        return Response.json({
          ok: true,
          delivered: false,
          error: outcome.error,
        });
      default: {
        const _exhaustive: never = outcome.reason;
        return _exhaustive;
      }
    }
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
