import type { Prisma } from "@prisma/client";

/**
 * Explicit column lists for every Prisma read of `Event`.
 *
 * The production deploy (pull, install, build, restart) does not run Prisma
 * migrations. If this build reaches production before
 * `20261027180000_event_sponsor_vendors` is applied, a default select would
 * name the four new columns and every Event query would fail (P2022). So
 * reads try `EVENT_SELECT` first and, only on a missing-column error, retry
 * with `EVENT_BASE_SELECT` and fill the new fields as "no sponsor, no vendors".
 * Installed apps keep getting nights either way.
 */
export const EVENT_BASE_SELECT = {
  id: true,
  sourceId: true,
  title: true,
  description: true,
  artist: true,
  medium: true,
  startsAt: true,
  endsAt: true,
  timeZone: true,
  venueName: true,
  venueAddress: true,
  latitude: true,
  longitude: true,
  capacity: true,
  status: true,
  coverImageUrl: true,
  comingSoon: true,
  createdById: true,
  publishedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.EventSelect;

export const EVENT_SPONSOR_SELECT = {
  sponsorName: true,
  sponsorUrl: true,
  sponsorLogoUrl: true,
  vendors: true,
} as const satisfies Prisma.EventSelect;

export const EVENT_SELECT = {
  ...EVENT_BASE_SELECT,
  ...EVENT_SPONSOR_SELECT,
} as const satisfies Prisma.EventSelect;

/** What a row read with the base select is missing. */
export const NO_SPONSOR_COLUMNS = {
  sponsorName: null,
  sponsorUrl: null,
  sponsorLogoUrl: null,
  vendors: [] as unknown,
};

/** Prisma's "column does not exist" (P2022), i.e. the migration is not applied. */
export function isMissingColumnError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2022";
}

let warned = false;

/**
 * Run a read with the full select; if the sponsor columns are not there yet,
 * run it again with the base select and fill them as empty. Any other error
 * is rethrown unchanged.
 */
export async function withEventColumns<T>(
  read: (select: typeof EVENT_SELECT | typeof EVENT_BASE_SELECT) => Promise<T>,
  fill: (result: T) => T,
): Promise<T> {
  try {
    return await read(EVENT_SELECT);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    if (!warned) {
      warned = true;
      console.warn(
        "[events] sponsor/vendor columns missing — apply migration 20261027180000_event_sponsor_vendors. Serving nights without them.",
      );
    }
    return fill(await read(EVENT_BASE_SELECT));
  }
}

/** Fill one base row (or null) with empty sponsor fields. */
export function fillRow<R extends object>(row: R | null): R | null {
  return row ? ({ ...NO_SPONSOR_COLUMNS, ...row } as R) : row;
}

export function fillRows<R extends object>(rows: R[]): R[] {
  return rows.map((row) => ({ ...NO_SPONSOR_COLUMNS, ...row }) as R);
}
