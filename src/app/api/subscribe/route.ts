import { parseSubscribeEmail } from "@/features/app/subscribe";
import { sendLeadToGhl } from "@/lib/ghl";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const emailValue =
      typeof body === "object" && body !== null && "email" in body
        ? (body as { email: unknown }).email
        : undefined;
    const parsed = parseSubscribeEmail(emailValue);
    if (!parsed.ok) {
      return Response.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const result = await sendLeadToGhl({
      name: parsed.email.split("@")[0] ?? "Subscriber",
      email: parsed.email,
      message: "Newsletter subscribe",
      intent: "subscribe",
      source: "theartistpost-subscribe",
      page: "/",
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error:
            "We could not add that just now. Email Robbie and we will put you on the list.",
        },
        { status: 502 },
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
