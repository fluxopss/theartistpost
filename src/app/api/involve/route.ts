import { parseInvolveInquiry, isInvolveHoneypot } from "@/features/involve/validation";
import { sendLeadToGhl } from "@/lib/ghl";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = parseInvolveInquiry(body);
    if (!parsed.ok) {
      return Response.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    if (isInvolveHoneypot(parsed.data.website)) {
      return Response.json({ ok: true });
    }

    const { name, email, phone, intent, medium, city, message } = parsed.data;
    const result = await sendLeadToGhl({
      name,
      email,
      phone: phone || undefined,
      message,
      intent,
      medium: medium || undefined,
      city: city || undefined,
      source: "theartistpost-get-involved",
      page: "/get-involved",
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error:
            result.error ||
            "We could not send that just now. Call or email Robbie and we will catch you.",
        },
        { status: 502 },
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
