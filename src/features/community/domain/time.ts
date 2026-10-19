const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m ago", "3h ago", "2d ago", then a short date. */
export function formatActivityTime(iso: string, now: number = Date.now()): string | null {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const elapsed = Math.max(0, now - then);
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  return shortDate.format(new Date(then));
}
