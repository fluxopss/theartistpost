import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { passCode } from "@/features/night/rsvp";
import { writeAuditLog } from "@/features/posts/audit";
import { sendLeadToGhl } from "@/lib/ghl";
import type { EventDTO } from "@/server/api/dto";
import { decideSeats, promoteFromWaitlist } from "@/server/api/eventRules";
import {
  EVENT_ID_RE,
  NOT_FOUND_EVENT,
  type EventFailure,
} from "@/server/api/eventResult";
import { notifyEventPeople } from "@/server/api/eventNotify";
import { eventRowToDTO, type EventRow } from "@/server/api/eventStore";
import { fillRow, withEventColumns } from "@/server/api/eventColumns";
import { zodFieldErrors } from "@/server/api/validation";

export type RsvpStatus = "GOING" | "MAYBE" | "NOT_GOING";

export type RsvpDTO = {
  eventId: string;
  status: RsvpStatus;
  party: number;
  note: string | null;
  /** True while a GOING answer is waiting for a seat. */
  waitlisted: boolean;
  /** The door mark for the pass on this phone. */
  passCode: string;
  updatedAt: string;
};

export type SeatSummaryDTO = {
  capacity: number | null;
  seatsTaken: number;
  /** Null when the night has no seat limit. */
  seatsLeft: number | null;
  waitlisted: number;
};

type Person = { id: string; email: string; name: string };

type RsvpRow = {
  eventId: string;
  userId: string;
  status: RsvpStatus;
  party: number;
  note: string | null;
  waitlistedAt: Date | null;
  updatedAt?: Date;
};

const PUBLIC_STATUSES = ["PUBLISHED", "CANCELLED"] as const;

export const rsvpBodySchema = z.object({
  status: z.enum(["GOING", "MAYBE", "NOT_GOING"]),
  party: z
    .number()
    .int("Seats must be a whole number.")
    .min(1, "Hold at least one seat.")
    .max(6, "Six seats at a time.")
    .optional(),
  note: z
    .string()
    .trim()
    .max(160, "Keep the note under 160 characters.")
    .nullable()
    .optional(),
});

export function toRsvpDTO(row: RsvpRow, email: string): RsvpDTO {
  return {
    eventId: row.eventId,
    status: row.status,
    party: row.party,
    note: row.note ?? null,
    waitlisted: row.status === "GOING" && row.waitlistedAt !== null,
    passCode: passCode(row.eventId, email),
    updatedAt: (row.updatedAt ?? new Date()).toISOString(),
  };
}

export async function seatSummary(
  prisma: PrismaClient,
  eventId: string,
  capacity: number | null,
): Promise<SeatSummaryDTO> {
  const [sum, waitlisted] = await Promise.all([
    prisma.eventRsvp.aggregate({
      _sum: { party: true },
      where: { eventId, status: "GOING", waitlistedAt: null },
    }),
    prisma.eventRsvp.count({
      where: { eventId, status: "GOING", waitlistedAt: { not: null } },
    }),
  ]);
  const seatsTaken = sum._sum?.party ?? 0;
  return {
    capacity,
    seatsTaken,
    seatsLeft: capacity === null ? null : Math.max(0, capacity - seatsTaken),
    waitlisted,
  };
}

async function loadPublicEvent(
  prisma: PrismaClient,
  eventId: string,
): Promise<EventRow | null> {
  if (!EVENT_ID_RE.test(eventId)) return null;
  return (await withEventColumns(
    (select) =>
      prisma.event.findFirst({
        select,
        where: { id: eventId, status: { in: [...PUBLIC_STATUSES] } },
      }),
    fillRow,
  )) as EventRow | null;
}

type Ok<T> = { ok: true; data: T };

export async function getMyRsvp(
  prisma: PrismaClient,
  person: Person,
  eventId: string,
): Promise<Ok<{ rsvp: RsvpDTO | null; summary: SeatSummaryDTO }> | EventFailure> {
  const event = await loadPublicEvent(prisma, eventId);
  if (!event) return NOT_FOUND_EVENT;

  const [mine, summary] = await Promise.all([
    prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId: person.id } },
    }),
    seatSummary(prisma, eventId, event.capacity),
  ]);
  return {
    ok: true,
    data: {
      rsvp: mine ? toRsvpDTO(mine as RsvpRow, person.email) : null,
      summary,
    },
  };
}

async function inSerializableTx<T>(
  prisma: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
}

export async function setMyRsvp(
  prisma: PrismaClient,
  person: Person,
  eventId: string,
  raw: unknown,
): Promise<
  | Ok<{ rsvp: RsvpDTO; summary: SeatSummaryDTO; event: EventDTO }>
  | EventFailure
> {
  const parsed = rsvpBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Check your answer.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const limit = checkRateLimit(`v1:event-rsvp:${person.id}`, {
    windowMs: 10 * 60_000,
    max: 30,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down a little.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  const event = await loadPublicEvent(prisma, eventId);
  if (!event) return NOT_FOUND_EVENT;
  if (event.status === "CANCELLED") {
    return {
      ok: false,
      code: "conflict",
      message: "This night has been cancelled.",
    };
  }
  const now = new Date();
  if (now.getTime() > event.endsAt.getTime()) {
    return {
      ok: false,
      code: "conflict",
      message: "That night has already closed.",
    };
  }

  const { status } = parsed.data;
  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;

  try {
    const outcome = await inSerializableTx(prisma, async (tx) => {
      const existing = (await tx.eventRsvp.findUnique({
        where: { eventId_userId: { eventId, userId: person.id } },
      })) as RsvpRow | null;

      const party = parsed.data.party ?? existing?.party ?? 1;
      let waitlistedAt: Date | null = null;
      if (status === "GOING") {
        const others = await tx.eventRsvp.aggregate({
          _sum: { party: true },
          where: {
            eventId,
            status: "GOING",
            waitlistedAt: null,
            userId: { not: person.id },
          },
        });
        const fit = decideSeats({
          capacity: event.capacity,
          otherSeats: others._sum?.party ?? 0,
          party,
        });
        if (fit === "waitlisted") {
          waitlistedAt = existing?.waitlistedAt ?? now;
        }
      }

      const saved = (await tx.eventRsvp.upsert({
        where: { eventId_userId: { eventId, userId: person.id } },
        create: { eventId, userId: person.id, status, party, note, waitlistedAt },
        update: { status, party, note, waitlistedAt },
      })) as RsvpRow;

      // Seats this person just gave up (or shrank) may belong to the waitlist.
      const hadSeats = existing?.status === "GOING" && existing.waitlistedAt === null;
      const stillConfirmed = status === "GOING" && waitlistedAt === null;
      const freed = hadSeats && (!stillConfirmed || party < (existing?.party ?? 0));

      let promotedUserIds: string[] = [];
      if (freed) {
        const taken = await tx.eventRsvp.aggregate({
          _sum: { party: true },
          where: { eventId, status: "GOING", waitlistedAt: null },
        });
        const waiting = (await tx.eventRsvp.findMany({
          where: { eventId, status: "GOING", waitlistedAt: { not: null } },
          orderBy: { waitlistedAt: "asc" },
          select: { id: true, userId: true, party: true, waitlistedAt: true },
        })) as { id: string; userId: string; party: number; waitlistedAt: Date }[];
        const ids = promoteFromWaitlist({
          capacity: event.capacity,
          confirmedSeats: taken._sum?.party ?? 0,
          waitlist: waiting.map((w) => ({
            id: w.id,
            party: w.party,
            waitlistedAt: w.waitlistedAt,
          })),
        });
        if (ids.length > 0) {
          await tx.eventRsvp.updateMany({
            where: { id: { in: ids }, eventId, waitlistedAt: { not: null } },
            data: { waitlistedAt: null },
          });
          promotedUserIds = waiting
            .filter((w) => ids.includes(w.id))
            .map((w) => w.userId);
        }
      }

      return { saved, existing, promotedUserIds };
    });

    await writeAuditLog(prisma, {
      actorId: person.id,
      action: "event.rsvp",
      targetType: "Event",
      targetId: eventId,
      meta: {
        status,
        party: outcome.saved.party,
        waitlisted: outcome.saved.waitlistedAt !== null,
      },
    });

    if (outcome.promotedUserIds.length > 0) {
      await notifyEventPeople(
        prisma,
        eventId,
        outcome.promotedUserIds,
        `A seat opened up — you're going to ${event.title}.`,
      );
    }

    // Robbie's CRM has always heard about new seats; keep that, best effort.
    if (status === "GOING" && outcome.existing?.status !== "GOING") {
      void sendLeadToGhl({
        name: person.name,
        email: person.email,
        message: [
          `RSVP: ${event.title}`,
          `When: ${event.startsAt.toISOString()}`,
          `Party of ${outcome.saved.party}`,
          outcome.saved.waitlistedAt ? "On the waitlist" : "Seats held",
          `Pass: ${passCode(eventId, person.email)}`,
          note ? `Note: ${note}` : "",
          `Venue: ${event.venueName}`,
        ]
          .filter(Boolean)
          .join("\n"),
        intent: "rsvp",
        source: "theartistpost-app-event-rsvp",
        page: `/events/${eventId}`,
      }).catch((error) => console.error("[event rsvp lead]", error));
    }

    const summary = await seatSummary(prisma, eventId, event.capacity);
    return {
      ok: true,
      data: {
        rsvp: toRsvpDTO(outcome.saved, person.email),
        summary,
        event: eventRowToDTO(event, now),
      },
    };
  } catch (error) {
    console.error("[setMyRsvp]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save your answer. Try again in a moment.",
    };
  }
}

export type MyRsvpItem = { rsvp: RsvpDTO; event: EventDTO };

export async function listMyRsvps(
  prisma: PrismaClient,
  person: Person,
): Promise<Ok<{ items: MyRsvpItem[] }> | EventFailure> {
  try {
    const rows = (await withEventColumns(
      (select) =>
        prisma.eventRsvp.findMany({
          where: {
            userId: person.id,
            status: { in: ["GOING", "MAYBE"] },
            event: { status: "PUBLISHED" },
          },
          include: { event: { select } },
          orderBy: { event: { startsAt: "asc" } },
        }),
      (found) => found.map((r) => ({ ...r, event: fillRow(r.event)! })),
    )) as unknown as (RsvpRow & { event: EventRow })[];
    const now = new Date();
    return {
      ok: true,
      data: {
        items: rows.map((row) => ({
          rsvp: toRsvpDTO(row, person.email),
          event: eventRowToDTO(row.event, now),
        })),
      },
    };
  } catch (error) {
    console.error("[listMyRsvps]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not load your nights.",
    };
  }
}
