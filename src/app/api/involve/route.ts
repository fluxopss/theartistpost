import { submitInvolveInquiry } from "@/server/api/leads/involve";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const outcome = await submitInvolveInquiry(body);

    if (outcome.ok) {
      return Response.json({ ok: true });
    }

    if (outcome.reason === "invalid") {
      return Response.json({ ok: false, error: outcome.error }, { status: 400 });
    }

    return Response.json(
      { ok: false, error: outcome.upstreamError || outcome.error },
      { status: 502 },
    );
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
