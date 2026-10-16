/**
 * Wall-clock <-> instant helpers for the house time zone. Server-side so the
 * app never has to do time-zone math to create or edit a night.
 */

export const HOUSE_TIME_ZONE = "America/New_York";

const LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const OFFSET_RE = /(?:Z|[+-]\d{2}:?\d{2})$/;

export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-30T18:00" read as wall time in `timeZone`. Null if impossible. */
export function zonedLocalToDate(
  local: string,
  timeZone: string,
): Date | null {
  const match = LOCAL_RE.exec(local.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const parts = [y, mo, d, h, mi, s ?? "0"].map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const [year, month, day, hour, minute, second] = parts;
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  try {
    // Two passes settle the offset across a daylight-time boundary.
    let guess = probe.getTime();
    for (let i = 0; i < 2; i += 1) {
      guess = probe.getTime() - zoneOffsetMs(new Date(guess), timeZone);
    }
    return new Date(guess);
  } catch {
    return null;
  }
}

/** The instant as "YYYY-MM-DDTHH:mm" wall time in `timeZone`. */
export function formatLocalInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Accepts an ISO instant with an explicit offset/Z, or a wall-time string
 * without one (read in `timeZone`). Null for anything else.
 */
export function parseEventInstant(
  raw: string,
  timeZone: string,
): Date | null {
  const value = raw.trim();
  if (!value) return null;
  if (OFFSET_RE.test(value)) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t);
  }
  return zonedLocalToDate(value, timeZone);
}
