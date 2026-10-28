import { submitDonorSteward } from "@/server/api/leads/donor";
import { limitWebLead, limitWebLeadEmail } from "@/server/api/leadRoute";

/** Legacy-shaped steward route (mirrors /api/subscribe style). Prefer /api/v1/donate/steward. */
export async function POST(request: Request) {
  const limited = limitWebLead(request, "donate/steward");
  if (limited) return limited;

  try {
    const body: unknown = await request.json();
    const emailLimited = limitWebLeadEmail("donate/steward", body);
    if (emailLimited) return emailLimited;

    const outcome = await submitDonorSteward(body);

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
