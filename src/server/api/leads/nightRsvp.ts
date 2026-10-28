import { sendLeadToGhl } from "@/lib/ghl";
import { findSiteEvent } from "@/server/api/siteEvents";
import { seatSummary } from "@/server/api/eventRsvp";
import { getPrisma } from "@/shared/lib/prisma";
import { nightPhase } from "@/features/night/program";
import {
  isNightHoneypot,
  parseNightRsvp,
  passCode,
} from "@/features/night/rsvp";
import {
  platformField,
  type LeadOptions,
  type LeadOutcome,
} from "@/server/api/leads/types";

export const RSVP_UNDELIVERED_ERROR =
  "Your seat was not sent. Try again in a moment.";

export const RSVP_FULL_ERROR = "This night is full.";

/**
 * Seats left on a managed (Manage events) night with a seat limit, counted
 * from the in-app RSVP list. Null when there is no limit to check (schedule
 * nights and unlimited nights). Throws when the count cannot be read, so the
 * caller fails closed instead of over-booking.
 *
 * Web seat holds have no account, so they are recorded in the CRM only and
 * never written to EventRsvp; the door team checks both lists.
 */
async function seatsLeftFor(event: {
  id: string;
  source: "db" | "content";
  capacity: number | null;
}): Promise<number | null> {
  if (event.source !== "db" || event.capacity === null) return null;
  const summary = await seatSummary(getPrisma(), event.id, event.capacity);
  return summary.seatsLeft;
}

/** Hold a seat for a night: validate, check the night is open, tell the CRM. */
export async function submitNightRsvp(
  body: unknown,
  options?: LeadOptions,
): Promise<LeadOutcome<{ code: string }>> {
  const parsed = parseNightRsvp(body);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "invalid",
      error: parsed.error,
      fields: parsed.fields,
    };
  }

  const { eventId, name, email, party, note, website } = parsed.data;
  const code = passCode(eventId, email);

  if (isNightHoneypot(website)) {
    return { ok: true, data: { code } };
  }

  // Same source as the pages: nights published in Manage events, then the schedule.
  const event = await findSiteEvent(eventId);
  if (!event) {
    return {
      ok: false,
      reason: "not_found",
      error: "That night is not on the board.",
    };
  }

  if (event.cancelled) {
    return {
      ok: false,
      reason: "closed",
      error: "This night has been cancelled.",
    };
  }

  if (nightPhase(event) === "closed") {
    return {
      ok: false,
      reason: "closed",
      error: "That night has already closed.",
    };
  }

  let seatsLeft: number | null;
  try {
    seatsLeft = await seatsLeftFor(event);
  } catch (error) {
    console.error("[night-rsvp] seat count unavailable", error);
    return {
      ok: false,
      reason: "undelivered",
      error: RSVP_UNDELIVERED_ERROR,
      upstreamError: "seat count unavailable",
    };
  }
  if (seatsLeft !== null && seatsLeft < party) {
    return { ok: false, reason: "closed", error: RSVP_FULL_ERROR };
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
    ...platformField(options),
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: "undelivered",
      error: RSVP_UNDELIVERED_ERROR,
      upstreamError: result.error,
    };
  }

  return { ok: true, data: { code } };
}
