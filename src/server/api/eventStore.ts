import type { PrismaClient } from "@prisma/client";
import { content } from "@/lib/content";
import { nightPhase } from "@/features/night/program";
import { toEventDTO, type EventDTO } from "@/server/api/dto";
import { absoluteUrl } from "@/server/api/urls";
import { fillRow, fillRows, withEventColumns } from "@/server/api/eventColumns";
import { presentedByFromRow, vendorsFromJson } from "@/server/api/eventSponsors";

/** The columns of an `Event` row the API reads (structural, no client import). */
export type EventRow = {
  id: string;
  sourceId: string | null;
  title: string;
  description: string;
  artist: string;
  medium: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  venueName: string;
  venueAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  coverImageUrl: string | null;
  comingSoon: boolean;
  sponsorName: string | null;
  sponsorUrl: string | null;
  sponsorLogoUrl: string | null;
  /** Stored JSON; read it through vendorsFromJson. */
  vendors: unknown;
  createdById: string | null;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const PUBLIC_STATUSES = ["PUBLISHED", "CANCELLED"] as const;

export function eventRowToDTO(row: EventRow, now = new Date()): EventDTO {
  const start = row.startsAt.toISOString();
  const end = row.endsAt.toISOString();
  const cancelled = row.status === "CANCELLED";
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    medium: row.medium,
    start,
    end,
    venue: row.venueName,
    description: row.description,
    comingSoon: row.comingSoon,
    status: cancelled ? "closed" : nightPhase({ start, end }, now),
    source: "db",
    cancelled,
    timeZone: row.timeZone,
    venueAddress: row.venueAddress,
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity,
    coverImageUrl: absoluteUrl(row.coverImageUrl),
    presentedBy: presentedByFromRow(row),
    vendors: vendorsFromJson(row.vendors),
  };
}

function byStart(a: EventDTO, b: EventDTO): number {
  const ta = Date.parse(a.start);
  const tb = Date.parse(b.start);
  return (
    (Number.isNaN(ta) ? Infinity : ta) - (Number.isNaN(tb) ? Infinity : tb)
  );
}

/**
 * Every night people can see: published (and cancelled) DB nights, plus the
 * schedule's nights that no DB night has replaced. If the DB is missing or
 * the table is not there yet, the schedule alone is served — never an error.
 */
export async function listPublicEvents(
  prisma: PrismaClient | null,
  now = new Date(),
  options: {
    /**
     * Only load DB nights ending at or after this moment. Rows adopted from a
     * schedule night (sourceId set) are always loaded, so an old adopted night
     * keeps hiding the schedule night it replaced. Omit for every night
     * (the /api/v1/events default).
     */
    endedAfter?: Date;
  } = {},
): Promise<EventDTO[]> {
  const schedule = await content.getEvents();
  let rows: EventRow[] = [];
  if (prisma) {
    const status = { in: [...PUBLIC_STATUSES] };
    try {
      rows = (await withEventColumns(
        (select) =>
          prisma.event.findMany({
            select,
            where: options.endedAfter
              ? {
                  status,
                  OR: [
                    { endsAt: { gte: options.endedAfter } },
                    { sourceId: { not: null } },
                  ],
                }
              : { status },
            orderBy: { startsAt: "asc" },
          }),
        fillRows,
      )) as EventRow[];
    } catch (error) {
      console.error("[events] database unavailable, serving schedule", error);
    }
  }

  const replaced = new Set(
    rows.map((r) => r.sourceId).filter((id): id is string => Boolean(id)),
  );
  return [
    ...rows.map((row) => eventRowToDTO(row, now)),
    ...schedule
      .filter((event) => !replaced.has(event.id))
      .map((event) => toEventDTO(event, now)),
  ].sort(byStart);
}

/** One public night by id (or by the schedule id it replaced). */
export async function findPublicEvent(
  prisma: PrismaClient | null,
  id: string,
  now = new Date(),
): Promise<EventDTO | null> {
  if (prisma) {
    try {
      const row = (await withEventColumns(
        (select) =>
          prisma.event.findFirst({
            select,
            where: {
              status: { in: [...PUBLIC_STATUSES] },
              OR: [{ id }, { sourceId: id }],
            },
          }),
        fillRow,
      )) as EventRow | null;
      if (row) return eventRowToDTO(row, now);
    } catch (error) {
      console.error("[events] database unavailable, serving schedule", error);
    }
  }
  const event = await content.getEventById(id);
  return event ? toEventDTO(event, now) : null;
}
