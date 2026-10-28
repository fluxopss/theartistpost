import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { writeAuditLog } from "@/features/posts/audit";
import {
  CHECKIN_LEAD_MS,
  checkInWindow,
  verifyProximity,
  type CheckInWindow,
} from "@/server/api/eventRules";
import {
  EVENT_ID_RE,
  NOT_FOUND_EVENT,
  type EventFailure,
} from "@/server/api/eventResult";
import type { EventRow } from "@/server/api/eventStore";
import { fillRow, withEventColumns } from "@/server/api/eventColumns";
import { zodFieldErrors } from "@/server/api/validation";

export type CheckInDTO = { checkedInAt: string; verified: boolean };

export type CheckInStateDTO = {
  checkIn: CheckInDTO | null;
  window: CheckInWindow;
  /** When "I'm here" opens (doors). */
  opensAt: string;
  /** Whether a location can be used to verify at all. */
  venueHasLocation: boolean;
};

type Person = { id: string; email: string; name: string };
type Ok<T> = { ok: true; data: T };
type CheckInRow = { checkedInAt: Date; verified: boolean; id: string };

/**
 * One optional reading. It is compared to the venue inside this request and
 * dropped: nothing derived from it except the boolean is kept or logged.
 */
export const checkInBodySchema = z
  .object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    accuracyM: z.number().min(0).max(100_000).nullable().optional(),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: "Send both a latitude and a longitude, or neither.",
    path: ["lat"],
  });

function toDTO(row: CheckInRow): CheckInDTO {
  return { checkedInAt: row.checkedInAt.toISOString(), verified: row.verified };
}

async function loadLiveEvent(
  prisma: PrismaClient,
  eventId: string,
): Promise<EventRow | null> {
  if (!EVENT_ID_RE.test(eventId)) return null;
  return (await withEventColumns(
    (select) =>
      prisma.event.findFirst({
        select,
        where: { id: eventId, status: { in: ["PUBLISHED", "CANCELLED"] } },
      }),
    fillRow,
  )) as EventRow | null;
}

function stateFor(event: EventRow, checkIn: CheckInRow | null, now: Date): CheckInStateDTO {
  return {
    checkIn: checkIn ? toDTO(checkIn) : null,
    window: checkInWindow(event, now),
    opensAt: new Date(event.startsAt.getTime() - CHECKIN_LEAD_MS).toISOString(),
    venueHasLocation: event.latitude !== null && event.longitude !== null,
  };
}

export async function getMyCheckIn(
  prisma: PrismaClient,
  person: Person,
  eventId: string,
): Promise<Ok<CheckInStateDTO> | EventFailure> {
  const event = await loadLiveEvent(prisma, eventId);
  if (!event) return NOT_FOUND_EVENT;
  const mine = (await prisma.eventCheckIn.findUnique({
    where: { eventId_userId: { eventId, userId: person.id } },
  })) as CheckInRow | null;
  return { ok: true, data: stateFor(event, mine, new Date()) };
}

export async function checkInToEvent(
  prisma: PrismaClient,
  person: Person,
  eventId: string,
  raw: unknown,
): Promise<Ok<CheckInStateDTO> | EventFailure> {
  const parsed = checkInBodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Check the request.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const limit = checkRateLimit(`v1:event-checkin:${person.id}`, {
    windowMs: 10 * 60_000,
    max: 10,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down a little.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  const event = await loadLiveEvent(prisma, eventId);
  if (!event) return NOT_FOUND_EVENT;
  if (event.status === "CANCELLED") {
    return {
      ok: false,
      code: "conflict",
      message: "This night has been cancelled.",
    };
  }

  const now = new Date();
  const window = checkInWindow(event, now);
  if (window !== "open") {
    return {
      ok: false,
      code: "conflict",
      message:
        window === "before"
          ? "Check-in opens when the doors do."
          : "That night has already closed.",
    };
  }

  const { lat, lng, accuracyM } = parsed.data;
  const verified = verifyProximity(
    { lat: event.latitude, lng: event.longitude },
    lat !== undefined && lng !== undefined ? { lat, lng, accuracyM } : null,
  );

  try {
    const key = { eventId_userId: { eventId, userId: person.id } };
    const existing = (await prisma.eventCheckIn.findUnique({
      where: key,
    })) as CheckInRow | null;

    let row: CheckInRow;
    if (existing) {
      // A check-in can be upgraded to verified, never downgraded.
      row =
        !existing.verified && verified
          ? ((await prisma.eventCheckIn.update({
              where: { id: existing.id },
              data: { verified: true },
            })) as CheckInRow)
          : existing;
    } else {
      row = (await prisma.eventCheckIn.create({
        data: { eventId, userId: person.id, verified },
      })) as CheckInRow;
    }

    if (!existing || row.verified !== existing.verified) {
      await writeAuditLog(prisma, {
        actorId: person.id,
        action: "event.checkin",
        targetType: "Event",
        targetId: eventId,
        meta: { verified: row.verified },
      });
    }

    return { ok: true, data: stateFor(event, row, now) };
  } catch (error) {
    console.error("[checkInToEvent]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not check you in. Try again in a moment.",
    };
  }
}
