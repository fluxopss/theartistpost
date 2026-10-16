import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { writeAuditLog } from "@/features/posts/audit";
import { content } from "@/lib/content";
import { normalizeUploadUrl } from "@/server/api/community";
import {
  EVENT_ID_RE,
  type EventFailure,
} from "@/server/api/eventResult";
import { eventAudienceIds, notifyEventPeople } from "@/server/api/eventNotify";
import { eventRowToDTO, type EventRow } from "@/server/api/eventStore";
import {
  HOUSE_TIME_ZONE,
  formatLocalInZone,
  isSupportedTimeZone,
  parseEventInstant,
} from "@/server/api/eventTime";
import { storeUploadedMedia } from "@/server/api/media";
import { absoluteUrl } from "@/server/api/urls";
import { zodFieldErrors } from "@/server/api/validation";

type Admin = { id: string };
type Ok<T> = { ok: true; data: T };

export type EventCounts = {
  /** People holding confirmed seats (the waitlist is counted apart). */
  going: number;
  /** Confirmed seats (party sizes, waitlist excluded). */
  goingSeats: number;
  waitlisted: number;
  maybe: number;
  notGoing: number;
  checkedIn: number;
  verified: number;
};

export type AdminEventDTO = {
  id: string;
  sourceId: string | null;
  title: string;
  description: string;
  artist: string;
  medium: string;
  startsAt: string;
  endsAt: string;
  /** Wall time in `timeZone`, ready to edit ("2026-10-30T18:00"). */
  startsAtLocal: string;
  endsAtLocal: string;
  timeZone: string;
  venueName: string;
  venueAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  publishState: "DRAFT" | "PUBLISHED" | "CANCELLED";
  coverImageUrl: string | null;
  comingSoon: boolean;
  publishedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: EventCounts;
};

const EMPTY_COUNTS: EventCounts = {
  going: 0,
  goingSeats: 0,
  waitlisted: 0,
  maybe: 0,
  notGoing: 0,
  checkedIn: 0,
  verified: 0,
};

export function toAdminEventDTO(
  row: EventRow,
  counts: EventCounts = EMPTY_COUNTS,
): AdminEventDTO {
  return {
    id: row.id,
    sourceId: row.sourceId,
    title: row.title,
    description: row.description,
    artist: row.artist,
    medium: row.medium,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    startsAtLocal: formatLocalInZone(row.startsAt, row.timeZone),
    endsAtLocal: formatLocalInZone(row.endsAt, row.timeZone),
    timeZone: row.timeZone,
    venueName: row.venueName,
    venueAddress: row.venueAddress,
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity,
    publishState: row.status,
    coverImageUrl: absoluteUrl(row.coverImageUrl),
    comingSoon: row.comingSoon,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    counts,
  };
}

// --- counts -----------------------------------------------------------------

async function countsFor(
  prisma: PrismaClient,
  eventIds: string[],
): Promise<Map<string, EventCounts>> {
  const out = new Map<string, EventCounts>();
  for (const id of eventIds) out.set(id, { ...EMPTY_COUNTS });
  if (eventIds.length === 0) return out;

  const [rsvps, checkIns] = await Promise.all([
    prisma.eventRsvp.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, status: true, party: true, waitlistedAt: true },
    }),
    prisma.eventCheckIn.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, verified: true },
    }),
  ]);

  for (const r of rsvps) {
    const c = out.get(r.eventId);
    if (!c) continue;
    if (r.status === "GOING") {
      if (r.waitlistedAt) c.waitlisted += 1;
      else {
        c.going += 1;
        c.goingSeats += r.party;
      }
    } else if (r.status === "MAYBE") c.maybe += 1;
    else c.notGoing += 1;
  }
  for (const ci of checkIns) {
    const c = out.get(ci.eventId);
    if (!c) continue;
    c.checkedIn += 1;
    if (ci.verified) c.verified += 1;
  }
  return out;
}

// --- validation -------------------------------------------------------------

const fieldShape = {
  title: z.string().trim().min(1, "Give the night a title.").max(120),
  description: z.string().trim().max(2000),
  artist: z.string().trim().max(120),
  medium: z.string().trim().min(1).max(40),
  startsAt: z.string().trim().min(1, "Set when the night starts."),
  endsAt: z.string().trim().min(1, "Set when the night ends."),
  timeZone: z
    .string()
    .trim()
    .refine(isSupportedTimeZone, "Unknown time zone."),
  venueName: z.string().trim().min(1, "Name the venue.").max(120),
  venueAddress: z.string().trim().max(200).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  capacity: z
    .number()
    .int("Seats must be a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(5000)
    .nullable(),
  coverImageUrl: z.string().trim().max(500).nullable(),
  comingSoon: z.boolean(),
};

const createSchema = z.object({
  title: fieldShape.title,
  description: fieldShape.description.optional(),
  artist: fieldShape.artist.optional(),
  medium: fieldShape.medium.optional(),
  startsAt: fieldShape.startsAt,
  endsAt: fieldShape.endsAt,
  timeZone: fieldShape.timeZone.optional(),
  venueName: fieldShape.venueName,
  venueAddress: fieldShape.venueAddress.optional(),
  latitude: fieldShape.latitude.optional(),
  longitude: fieldShape.longitude.optional(),
  capacity: fieldShape.capacity.optional(),
  coverImageUrl: fieldShape.coverImageUrl.optional(),
  comingSoon: fieldShape.comingSoon.optional(),
  sourceId: z.string().trim().min(1).max(40).optional(),
});

const updateSchema = z.object({
  title: fieldShape.title.optional(),
  description: fieldShape.description.optional(),
  artist: fieldShape.artist.optional(),
  medium: fieldShape.medium.optional(),
  startsAt: fieldShape.startsAt.optional(),
  endsAt: fieldShape.endsAt.optional(),
  timeZone: fieldShape.timeZone.optional(),
  venueName: fieldShape.venueName.optional(),
  venueAddress: fieldShape.venueAddress.optional(),
  latitude: fieldShape.latitude.optional(),
  longitude: fieldShape.longitude.optional(),
  capacity: fieldShape.capacity.optional(),
  coverImageUrl: fieldShape.coverImageUrl.optional(),
  comingSoon: fieldShape.comingSoon.optional(),
});

function invalid(
  message: string,
  fields?: Record<string, string>,
): EventFailure {
  return { ok: false, code: "validation_failed", message, fields };
}

/** Cross-field checks on the merged values. Returns field errors or the data. */
function resolveFields(input: {
  startsAt: string | Date;
  endsAt: string | Date;
  timeZone: string;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
}):
  | { ok: true; startsAt: Date; endsAt: Date; coverImageUrl: string | null }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const startsAt =
    input.startsAt instanceof Date
      ? input.startsAt
      : parseEventInstant(input.startsAt, input.timeZone);
  const endsAt =
    input.endsAt instanceof Date
      ? input.endsAt
      : parseEventInstant(input.endsAt, input.timeZone);
  if (!startsAt) {
    fields.startsAt = "Use a date and time like 2026-10-30T18:00.";
  }
  if (!endsAt) {
    fields.endsAt = "Use a date and time like 2026-10-30T21:00.";
  }
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    fields.endsAt = "The night has to end after it starts.";
  }
  if ((input.latitude === null) !== (input.longitude === null)) {
    fields.latitude = "Set both a latitude and a longitude, or neither.";
  }
  let coverImageUrl: string | null = null;
  if (input.coverImageUrl) {
    coverImageUrl = normalizeUploadUrl(input.coverImageUrl);
    if (!coverImageUrl) {
      fields.coverImageUrl = "Use a photo uploaded through the app.";
    }
  }
  if (Object.keys(fields).length > 0 || !startsAt || !endsAt) {
    return { ok: false, fields };
  }
  return { ok: true, startsAt, endsAt, coverImageUrl };
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

function adminLimit(adminId: string): EventFailure | null {
  const limit = checkRateLimit(`v1:event-admin:${adminId}`, {
    windowMs: 10 * 60_000,
    max: 120,
  });
  if (limit.ok) return null;
  return {
    ok: false,
    code: "rate_limited",
    message: "Slow down a little.",
    retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
  };
}

const NOT_FOUND: EventFailure = {
  ok: false,
  code: "not_found",
  message: "That night was not found.",
};

async function loadRow(
  prisma: PrismaClient,
  id: string,
): Promise<EventRow | null> {
  if (!EVENT_ID_RE.test(id)) return null;
  return (await prisma.event.findUnique({ where: { id } })) as EventRow | null;
}

// --- reads ------------------------------------------------------------------

export type AdminEventList = {
  items: AdminEventDTO[];
  /** Schedule nights no managed night has replaced yet (can be adopted). */
  fromSchedule: {
    id: string;
    title: string;
    start: string;
    end: string;
    venue: string;
  }[];
};

export async function listAdminEvents(
  prisma: PrismaClient,
): Promise<Ok<AdminEventList> | EventFailure> {
  try {
    const rows = (await prisma.event.findMany({
      orderBy: [{ startsAt: "desc" }],
    })) as EventRow[];
    const counts = await countsFor(
      prisma,
      rows.map((r) => r.id),
    );
    const adopted = new Set(
      rows.map((r) => r.sourceId).filter((id): id is string => Boolean(id)),
    );
    const schedule = await content.getEvents();
    return {
      ok: true,
      data: {
        items: rows.map((r) => toAdminEventDTO(r, counts.get(r.id))),
        fromSchedule: schedule
          .filter((e) => !adopted.has(e.id))
          .map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end,
            venue: e.venue,
          })),
      },
    };
  } catch (error) {
    console.error("[listAdminEvents]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not load the nights.",
    };
  }
}

export async function getAdminEvent(
  prisma: PrismaClient,
  id: string,
): Promise<Ok<{ event: AdminEventDTO }> | EventFailure> {
  const row = await loadRow(prisma, id);
  if (!row) return NOT_FOUND;
  const counts = await countsFor(prisma, [row.id]);
  return {
    ok: true,
    data: { event: toAdminEventDTO(row, counts.get(row.id)) },
  };
}

// --- writes -----------------------------------------------------------------

export async function createAdminEvent(
  prisma: PrismaClient,
  admin: Admin,
  raw: unknown,
): Promise<Ok<{ event: AdminEventDTO }> | EventFailure> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return invalid(
      parsed.error.issues[0]?.message ?? "Check the night's details.",
      zodFieldErrors(parsed.error),
    );
  }
  const input = parsed.data;
  const timeZone = input.timeZone ?? HOUSE_TIME_ZONE;
  const latitude = input.latitude ?? null;
  const longitude = input.longitude ?? null;

  const resolved = resolveFields({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timeZone,
    latitude,
    longitude,
    coverImageUrl: input.coverImageUrl ?? null,
  });
  if (!resolved.ok) {
    return invalid("Check the night's details.", resolved.fields);
  }

  if (input.sourceId) {
    const known = await content.getEventById(input.sourceId);
    if (!known) {
      return invalid("That schedule night does not exist.", {
        sourceId: "That schedule night does not exist.",
      });
    }
  }

  const limited = adminLimit(admin.id);
  if (limited) return limited;

  try {
    const row = (await prisma.event.create({
      data: {
        title: input.title,
        description: input.description ?? "",
        artist: input.artist ?? "",
        medium: input.medium ?? "community",
        startsAt: resolved.startsAt,
        endsAt: resolved.endsAt,
        timeZone,
        venueName: input.venueName,
        venueAddress: input.venueAddress || null,
        latitude,
        longitude,
        capacity: input.capacity ?? null,
        coverImageUrl: resolved.coverImageUrl,
        comingSoon: input.comingSoon ?? false,
        sourceId: input.sourceId ?? null,
        status: "DRAFT",
        createdById: admin.id,
      },
    })) as EventRow;
    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: "event.create",
      targetType: "Event",
      targetId: row.id,
      meta: { adoptedFrom: input.sourceId ?? null },
    });
    return { ok: true, data: { event: toAdminEventDTO(row) } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        code: "conflict",
        message: "That schedule night already has a managed copy.",
      };
    }
    console.error("[createAdminEvent]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save the night.",
    };
  }
}

const SIGNIFICANT = [
  "title",
  "startsAt",
  "endsAt",
  "venueName",
  "venueAddress",
  "latitude",
  "longitude",
] as const;

export async function updateAdminEvent(
  prisma: PrismaClient,
  admin: Admin,
  id: string,
  raw: unknown,
): Promise<Ok<{ event: AdminEventDTO }> | EventFailure> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return invalid(
      parsed.error.issues[0]?.message ?? "Check the night's details.",
      zodFieldErrors(parsed.error),
    );
  }
  const input = parsed.data;
  if (Object.values(input).every((v) => v === undefined)) {
    return invalid("Change at least one thing.");
  }

  const existing = await loadRow(prisma, id);
  if (!existing) return NOT_FOUND;
  if (existing.status === "CANCELLED") {
    return {
      ok: false,
      code: "conflict",
      message: "A cancelled night cannot be edited. Duplicate it instead.",
    };
  }

  const timeZone = input.timeZone ?? existing.timeZone;
  const latitude =
    input.latitude !== undefined ? input.latitude : existing.latitude;
  const longitude =
    input.longitude !== undefined ? input.longitude : existing.longitude;
  const resolved = resolveFields({
    startsAt: input.startsAt ?? existing.startsAt,
    endsAt: input.endsAt ?? existing.endsAt,
    timeZone,
    latitude,
    longitude,
    coverImageUrl:
      input.coverImageUrl !== undefined
        ? input.coverImageUrl
        : existing.coverImageUrl,
  });
  if (!resolved.ok) {
    return invalid("Check the night's details.", resolved.fields);
  }

  const limited = adminLimit(admin.id);
  if (limited) return limited;

  const data: Prisma.EventUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.artist !== undefined ? { artist: input.artist } : {}),
    ...(input.medium !== undefined ? { medium: input.medium } : {}),
    ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
    ...(input.venueName !== undefined ? { venueName: input.venueName } : {}),
    ...(input.venueAddress !== undefined
      ? { venueAddress: input.venueAddress || null }
      : {}),
    ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
    ...(input.comingSoon !== undefined ? { comingSoon: input.comingSoon } : {}),
    ...(input.startsAt !== undefined ? { startsAt: resolved.startsAt } : {}),
    ...(input.endsAt !== undefined ? { endsAt: resolved.endsAt } : {}),
    ...(input.latitude !== undefined ? { latitude } : {}),
    ...(input.longitude !== undefined ? { longitude } : {}),
    ...(input.coverImageUrl !== undefined
      ? { coverImageUrl: resolved.coverImageUrl }
      : {}),
  };

  try {
    const row = (await prisma.event.update({
      where: { id },
      data,
    })) as EventRow;

    const changed = Object.keys(data);
    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: "event.update",
      targetType: "Event",
      targetId: id,
      meta: { fields: changed },
    });

    const significant = SIGNIFICANT.some((key) => {
      if (!(key in data)) return false;
      const before = existing[key];
      const after = row[key];
      const norm = (v: unknown) =>
        v instanceof Date ? v.getTime() : (v ?? null);
      return norm(before) !== norm(after);
    });
    if (existing.status === "PUBLISHED" && significant) {
      await notifyEventPeople(
        prisma,
        id,
        await eventAudienceIds(prisma, id),
        `${row.title} was updated — check the time and place.`,
      );
    }

    const counts = await countsFor(prisma, [id]);
    return { ok: true, data: { event: toAdminEventDTO(row, counts.get(id)) } };
  } catch (error) {
    console.error("[updateAdminEvent]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save the night.",
    };
  }
}

export async function publishAdminEvent(
  prisma: PrismaClient,
  admin: Admin,
  id: string,
): Promise<Ok<{ event: AdminEventDTO }> | EventFailure> {
  const existing = await loadRow(prisma, id);
  if (!existing) return NOT_FOUND;
  if (existing.status === "CANCELLED") {
    return {
      ok: false,
      code: "conflict",
      message: "A cancelled night cannot be published. Duplicate it instead.",
    };
  }
  if (existing.status === "PUBLISHED") {
    return { ok: true, data: { event: toAdminEventDTO(existing) } };
  }

  const limited = adminLimit(admin.id);
  if (limited) return limited;

  try {
    const row = (await prisma.event.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    })) as EventRow;
    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: "event.publish",
      targetType: "Event",
      targetId: id,
    });
    return { ok: true, data: { event: toAdminEventDTO(row) } };
  } catch (error) {
    console.error("[publishAdminEvent]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not publish the night.",
    };
  }
}

export async function cancelAdminEvent(
  prisma: PrismaClient,
  admin: Admin,
  id: string,
): Promise<Ok<{ event: AdminEventDTO }> | EventFailure> {
  const existing = await loadRow(prisma, id);
  if (!existing) return NOT_FOUND;
  if (existing.status === "CANCELLED") {
    return { ok: true, data: { event: toAdminEventDTO(existing) } };
  }

  const limited = adminLimit(admin.id);
  if (limited) return limited;

  try {
    const row = (await prisma.event.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    })) as EventRow;
    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: "event.cancel",
      targetType: "Event",
      targetId: id,
      meta: { wasPublished: existing.status === "PUBLISHED" },
    });
    if (existing.status === "PUBLISHED") {
      await notifyEventPeople(
        prisma,
        id,
        await eventAudienceIds(prisma, id),
        `${row.title} has been cancelled.`,
      );
    }
    const counts = await countsFor(prisma, [id]);
    return { ok: true, data: { event: toAdminEventDTO(row, counts.get(id)) } };
  } catch (error) {
    console.error("[cancelAdminEvent]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not cancel the night.",
    };
  }
}

export async function duplicateAdminEvent(
  prisma: PrismaClient,
  admin: Admin,
  id: string,
): Promise<Ok<{ event: AdminEventDTO }> | EventFailure> {
  const source = await loadRow(prisma, id);
  if (!source) return NOT_FOUND;

  const limited = adminLimit(admin.id);
  if (limited) return limited;

  try {
    const row = (await prisma.event.create({
      data: {
        title: `${source.title} (copy)`.slice(0, 120),
        description: source.description,
        artist: source.artist,
        medium: source.medium,
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        timeZone: source.timeZone,
        venueName: source.venueName,
        venueAddress: source.venueAddress,
        latitude: source.latitude,
        longitude: source.longitude,
        capacity: source.capacity,
        coverImageUrl: source.coverImageUrl,
        comingSoon: source.comingSoon,
        sourceId: null,
        status: "DRAFT",
        createdById: admin.id,
      },
    })) as EventRow;
    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: "event.duplicate",
      targetType: "Event",
      targetId: row.id,
      meta: { from: id },
    });
    return { ok: true, data: { event: toAdminEventDTO(row) } };
  } catch (error) {
    console.error("[duplicateAdminEvent]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not duplicate the night.",
    };
  }
}

// --- attendees & check-ins --------------------------------------------------

export type AttendeeDTO = {
  userId: string;
  name: string;
  email: string;
  status: "GOING" | "MAYBE" | "NOT_GOING";
  party: number;
  waitlisted: boolean;
  note: string | null;
  rsvpAt: string;
  checkedIn: boolean;
  verified: boolean;
  checkedInAt: string | null;
};

export type AttendeeTotals = {
  goingPeople: number;
  goingSeats: number;
  waitlistedPeople: number;
  waitlistedSeats: number;
  maybe: number;
  notGoing: number;
  checkedIn: number;
  verified: number;
};

type RsvpWithUser = {
  userId: string;
  status: "GOING" | "MAYBE" | "NOT_GOING";
  party: number;
  note: string | null;
  waitlistedAt: Date | null;
  createdAt: Date;
  user: { id: string; name: string; email: string };
};

const CSV_HEADER =
  "name,email,status,seats,waitlisted,note,rsvp_at,checked_in,verified,checked_in_at";

/** Quote for CSV and defuse spreadsheet formulas. */
function csvCell(value: string | number | boolean | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export type RsvpListResult =
  | {
      ok: true;
      data: { items: AttendeeDTO[]; totals: AttendeeTotals };
      csv?: undefined;
      filename?: undefined;
    }
  | { ok: true; csv: string; filename: string; data?: undefined };

export async function listEventRsvps(
  prisma: PrismaClient,
  admin: Admin,
  id: string,
  options: { csv: boolean },
): Promise<RsvpListResult | EventFailure> {
  const event = await loadRow(prisma, id);
  if (!event) return NOT_FOUND;

  try {
    const [rows, checkIns] = await Promise.all([
      prisma.eventRsvp.findMany({
        where: { eventId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: "asc" }],
      }) as unknown as Promise<RsvpWithUser[]>,
      prisma.eventCheckIn.findMany({
        where: { eventId: id },
        select: { userId: true, verified: true, checkedInAt: true },
      }),
    ]);
    const checked = new Map(checkIns.map((c) => [c.userId, c]));

    const items: AttendeeDTO[] = rows.map((r) => {
      const ci = checked.get(r.userId);
      return {
        userId: r.userId,
        name: r.user.name,
        email: r.user.email,
        status: r.status,
        party: r.party,
        waitlisted: r.status === "GOING" && r.waitlistedAt !== null,
        note: r.note,
        rsvpAt: r.createdAt.toISOString(),
        checkedIn: Boolean(ci),
        verified: ci?.verified ?? false,
        checkedInAt: ci?.checkedInAt.toISOString() ?? null,
      };
    });

    const totals: AttendeeTotals = {
      goingPeople: 0,
      goingSeats: 0,
      waitlistedPeople: 0,
      waitlistedSeats: 0,
      maybe: 0,
      notGoing: 0,
      checkedIn: checkIns.length,
      verified: checkIns.filter((c) => c.verified).length,
    };
    for (const item of items) {
      if (item.status === "GOING") {
        if (item.waitlisted) {
          totals.waitlistedPeople += 1;
          totals.waitlistedSeats += item.party;
        } else {
          totals.goingPeople += 1;
          totals.goingSeats += item.party;
        }
      } else if (item.status === "MAYBE") totals.maybe += 1;
      else totals.notGoing += 1;
    }

    if (!options.csv) return { ok: true, data: { items, totals } };

    const lines = [
      CSV_HEADER,
      ...items.map((i) =>
        [
          i.name,
          i.email,
          i.status,
          i.party,
          i.waitlisted,
          i.note,
          i.rsvpAt,
          i.checkedIn,
          i.verified,
          i.checkedInAt,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];
    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: "event.rsvps_export",
      targetType: "Event",
      targetId: id,
      meta: { rows: items.length },
    });
    const slug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return {
      ok: true,
      csv: `${lines.join("\n")}\n`,
      filename: `${slug || "event"}-rsvps.csv`,
    };
  } catch (error) {
    console.error("[listEventRsvps]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not load the attendee list.",
    };
  }
}

export type CheckInListDTO = {
  items: {
    userId: string;
    name: string;
    handle: string | null;
    checkedInAt: string;
    verified: boolean;
  }[];
  count: number;
  verifiedCount: number;
};

export async function listEventCheckIns(
  prisma: PrismaClient,
  id: string,
): Promise<Ok<CheckInListDTO> | EventFailure> {
  const event = await loadRow(prisma, id);
  if (!event) return NOT_FOUND;
  try {
    const rows = (await prisma.eventCheckIn.findMany({
      where: { eventId: id },
      include: { user: { select: { id: true, name: true, handle: true } } },
      orderBy: [{ checkedInAt: "asc" }],
    })) as unknown as {
      userId: string;
      verified: boolean;
      checkedInAt: Date;
      user: { id: string; name: string; handle: string | null };
    }[];
    return {
      ok: true,
      data: {
        items: rows.map((r) => ({
          userId: r.userId,
          name: r.user.name,
          handle: r.user.handle,
          checkedInAt: r.checkedInAt.toISOString(),
          verified: r.verified,
        })),
        count: rows.length,
        verifiedCount: rows.filter((r) => r.verified).length,
      },
    };
  } catch (error) {
    console.error("[listEventCheckIns]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not load check-ins.",
    };
  }
}

// --- cover photo ------------------------------------------------------------

export async function storeEventCover(
  admin: Admin,
  file: File,
): Promise<{ ok: true; url: string } | EventFailure> {
  if (!file.type.startsWith("image/")) {
    return invalid("Cover photos must be images (JPEG, PNG, WebP or GIF).", {
      file: "Cover photos must be images.",
    });
  }
  const limit = checkRateLimit(`v1:event-cover:${admin.id}`, {
    windowMs: 10 * 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Too many uploads. Try again shortly.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }
  try {
    const stored = await storeUploadedMedia(file);
    if (!stored.ok) {
      return invalid(stored.error, { file: stored.error });
    }
    if (stored.media.mediaType !== "IMAGE") {
      return invalid("Cover photos must be images.", {
        file: "Cover photos must be images.",
      });
    }
    return { ok: true, url: stored.media.url };
  } catch (error) {
    console.error("[storeEventCover]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save that photo.",
    };
  }
}

export { eventRowToDTO };
