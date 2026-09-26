import { content } from "@/lib/content";
import { sendLeadToGhl } from "@/lib/ghl";
import { nightPhase } from "@/features/night/program";
import {
  isNightHoneypot,
  parseNightRsvp,
  passCode,
} from "@/features/night/rsvp";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = parseNightRsvp(body);
    if (!parsed.ok) {
      return Response.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const { eventId, name, email, party, note, website } = parsed.data;
    const code = passCode(eventId, email);

    if (isNightHoneypot(website)) {
      return Response.json({ ok: true, delivered: true, code });
    }

    const event = await content.getEventById(eventId);
    if (!event) {
      return Response.json(
        { ok: false, error: "That night is not on the board." },
        { status: 404 },
      );
    }

    if (nightPhase(event) === "closed") {
      return Response.json(
        { ok: false, error: "That night has already closed." },
        { status: 409 },
      );
    }

    const result = await sendLeadToGhl({
      name,
      email,
      message: [
        `RSVP: ${event.title}`,
        `When: ${event.start}`,
        `Party of ${party}`,
        `Pass: ${code}`,
        note?.trim() ? `Note: ${note.trim()}` : "",
        `Venue: ${event.venue}`,
      ]
        .filter(Boolean)
        .join("\n"),
      intent: "rsvp",
      source: "theartistpost-night-rsvp",
      page: "/night",
    });

    if (!result.ok) {
      return Response.json({
        ok: true,
        delivered: false,
        error: "Your seat was not sent. Try again in a moment.",
      });
    }

    return Response.json({
      ok: true,
      delivered: true,
      code,
    });
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
