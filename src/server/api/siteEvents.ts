import { cache } from "react";
import { findPublicEvent, listPublicEvents } from "@/server/api/eventStore";
import type { EventDTO } from "@/server/api/dto";
import { isUpcomingNight } from "@/features/night/program";
import { getPrisma } from "@/shared/lib/prisma";

/**
 * Events for the WEBSITE pages (home, /night, /artist-schedule, /event/[id],
 * The Wall, Get Involved, sitemap). Same merged source as /api/v1/events:
 * nights published in the app's Manage events, plus schedule nights no
 * managed night replaced. A page must never 500 because the database is
 * down, so every failure falls back to the schedule (or nothing).
 *
 * Lists only load DB nights that ended less than a day ago (plus adopted
 * rows); /event/[id] still finds a past night by id. With no `now`, the
 * loaders go through React cache(), so one server render does one query no
 * matter how many components ask (generateMetadata + page, etc.).
 */

/** How long after a night ends it still loads for the site lists. */
export const SITE_EVENTS_GRACE_MS = 24 * 60 * 60_000;

function prismaOrNull() {
  try {
    return getPrisma();
  } catch (error) {
    console.error("[site-events] database client unavailable, serving schedule", error);
    return null;
  }
}

async function listSiteEventsAt(now: Date): Promise<EventDTO[]> {
  const endedAfter = new Date(now.getTime() - SITE_EVENTS_GRACE_MS);
  try {
    return await listPublicEvents(prismaOrNull(), now, { endedAfter });
  } catch (error) {
    console.error("[site-events] list failed, retrying with schedule only", error);
    try {
      return await listPublicEvents(null, now);
    } catch (fallbackError) {
      console.error("[site-events] schedule unavailable", fallbackError);
      return [];
    }
  }
}

/** One query per server render (React cache is per request). */
const listSiteEventsCached = cache(() => listSiteEventsAt(new Date()));

export async function listSiteEvents(now?: Date): Promise<EventDTO[]> {
  return now ? listSiteEventsAt(now) : listSiteEventsCached();
}

/** A night people can still go to: published (not cancelled) and not ended. */
export const isUpcomingPublic = isUpcomingNight;

/** What public lists show: upcoming published nights, soonest first. */
export async function listUpcomingSiteEvents(
  now?: Date,
): Promise<EventDTO[]> {
  const at = now ?? new Date();
  return (await listSiteEvents(now)).filter((event) =>
    isUpcomingPublic(event, at),
  );
}

async function findSiteEventAt(id: string, now: Date): Promise<EventDTO | null> {
  try {
    return await findPublicEvent(prismaOrNull(), id, now);
  } catch (error) {
    console.error("[site-events] lookup failed, retrying with schedule only", error);
    try {
      return await findPublicEvent(null, id, now);
    } catch (fallbackError) {
      console.error("[site-events] schedule unavailable", fallbackError);
      return null;
    }
  }
}

const findSiteEventCached = cache((id: string) => findSiteEventAt(id, new Date()));

/** One night by id. Past and cancelled nights stay reachable (200). */
export async function findSiteEvent(
  id: string,
  now?: Date,
): Promise<EventDTO | null> {
  return now ? findSiteEventAt(id, now) : findSiteEventCached(id);
}
