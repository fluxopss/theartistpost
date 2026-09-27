import { submitSubscribe } from "@/server/api/leads/subscribe";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const outcome = await submitSubscribe(body);

    if (outcome.ok) {
      return Response.json({ ok: true });
    }

    if (outcome.reason === "invalid") {
      return Response.json({ ok: false, error: outcome.error }, { status: 400 });
    }

    return Response.json({ ok: false, error: outcome.error }, { status: 502 });
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
