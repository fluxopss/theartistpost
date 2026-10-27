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
 */

function prismaOrNull() {
  try {
    return getPrisma();
  } catch (error) {
    console.error("[site-events] database client unavailable, serving schedule", error);
    return null;
  }
}

export async function listSiteEvents(now = new Date()): Promise<EventDTO[]> {
  try {
    return await listPublicEvents(prismaOrNull(), now);
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

/** A night people can still go to: published (not cancelled) and not ended. */
export const isUpcomingPublic = isUpcomingNight;

/** What public lists show: upcoming published nights, soonest first. */
export async function listUpcomingSiteEvents(
  now = new Date(),
): Promise<EventDTO[]> {
  return (await listSiteEvents(now)).filter((event) =>
    isUpcomingPublic(event, now),
  );
}

/** One night by id. Past and cancelled nights stay reachable (200). */
export async function findSiteEvent(
  id: string,
  now = new Date(),
): Promise<EventDTO | null> {
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
