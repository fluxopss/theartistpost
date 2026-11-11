import type { BlockBookingConfig } from "@/content/booking";
import { formatLocalInZone, zonedLocalToDate } from "@/server/api/eventTime";

/** One sign-up block on one house day. Computed, never stored on its own. */
export type DayBlock = {
  /** House-zone date, "YYYY-MM-DD". */
  day: string;
  /** 0-based position within the day. */
  index: number;
  startsAt: Date;
  endsAt: Date;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function minutesOf(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : h * 60 + min;
}

/** Throws on a config that cannot produce clean blocks. Cheap; run on use. */
export function assertValidConfig(config: BlockBookingConfig): void {
  const open = minutesOf(config.opensAt);
  const close = minutesOf(config.closesAt);
  if (open === null || close === null || close <= open) {
    throw new Error("Block config: opensAt/closesAt must be HH:mm, open < close.");
  }
  const span = config.blockHours * config.blocksPerDay * 60;
  if (!(config.blockHours > 0) || !Number.isInteger(config.blocksPerDay) || config.blocksPerDay < 1) {
    throw new Error("Block config: blockHours > 0 and blocksPerDay >= 1.");
  }
  if (span > close - open) {
    throw new Error("Block config: blocks do not fit between open and close.");
  }
  for (const key of [
    "capacityPerBlock",
    "maxBlocksPerPersonPerDay",
    "maxUpcomingPerPerson",
    "horizonDays",
  ] as const) {
    if (!Number.isInteger(config[key]) || config[key] < 1) {
      throw new Error(`Block config: ${key} must be a whole number >= 1.`);
    }
  }
}

export function isDayString(day: string): boolean {
  return DAY_RE.test(day) && zonedLocalToDate(`${day}T00:00`, "UTC") !== null;
}

/** The house-zone calendar date of an instant. */
export function houseDay(date: Date, timeZone: string): string {
  return formatLocalInZone(date, timeZone).slice(0, 10);
}

/** Date arithmetic on "YYYY-MM-DD" strings (zone-free, DST-proof). */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function hhmm(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The blocks for one house day. Starts and ends are wall-clock times read in
 * the house zone, so a block is always the same clock hours year-round and
 * the UTC instants shift with daylight time.
 */
export function blocksForDay(
  day: string,
  config: BlockBookingConfig,
): DayBlock[] {
  assertValidConfig(config);
  if (!isDayString(day)) return [];
  const open = minutesOf(config.opensAt)!;
  const length = Math.round(config.blockHours * 60);
  const out: DayBlock[] = [];
  for (let index = 0; index < config.blocksPerDay; index += 1) {
    const startsAt = zonedLocalToDate(
      `${day}T${hhmm(open + index * length)}`,
      config.timeZone,
    );
    const endsAt = zonedLocalToDate(
      `${day}T${hhmm(open + (index + 1) * length)}`,
      config.timeZone,
    );
    if (startsAt && endsAt) out.push({ day, index, startsAt, endsAt });
  }
  return out;
}

/** Days people can see and book: today through `horizonDays` ahead. */
export function windowDays(now: Date, config: BlockBookingConfig): string[] {
  const today = houseDay(now, config.timeZone);
  return Array.from({ length: config.horizonDays }, (_, i) => addDays(today, i));
}

/** One block by key, only if it exists in the config and the booking window. */
export function findBlock(
  day: string,
  index: number,
  now: Date,
  config: BlockBookingConfig,
): DayBlock | null {
  if (!windowDays(now, config).includes(day)) return null;
  return blocksForDay(day, config).find((b) => b.index === index) ?? null;
}
