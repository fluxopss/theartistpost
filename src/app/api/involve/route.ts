import { submitInvolveInquiry } from "@/server/api/leads/involve";
import { limitWebLead, limitWebLeadEmail } from "@/server/api/leadRoute";

export async function POST(request: Request) {
  const limited = limitWebLead(request, "involve");
  if (limited) return limited;

  try {
    const body: unknown = await request.json();
    const emailLimited = limitWebLeadEmail("involve", body);
    if (emailLimited) return emailLimited;

    const outcome = await submitInvolveInquiry(body);

    if (outcome.ok) {
      return Response.json({ ok: true });
    }

    if (outcome.reason === "invalid") {
      return Response.json({ ok: false, error: outcome.error }, { status: 400 });
    }

    // The raw webhook error is already logged; the person only sees the
    // friendly message.
    return Response.json({ ok: false, error: outcome.error }, { status: 502 });
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
