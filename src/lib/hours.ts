/**
 * Weekly open hours, pure math only (no React). One schedule feeds the
 * Open/Closed pill, the "today" label, schema.org and the app bootstrap.
 *
 * Minutes are counted from local midnight in the schedule's time zone.
 * `closeMinutes` may be 1440 (midnight) or more (past midnight into the next
 * day), so a late night like Friday 11 AM – 1 AM is just { 660, 1500 }.
 */

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type DayHours = {
  day: DayIndex;
  openMinutes: number;
  closeMinutes: number;
};

export type WeeklyHours = {
  timeZone: string;
  /** Exactly one entry per day the house opens. A missing day = closed. */
  weekly: readonly DayHours[];
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_SCHEMA = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_INDEX: Record<string, DayIndex> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Day of week and minutes since local midnight, in `timeZone`. DST-safe via Intl. */
export function localClock(
  date: Date,
  timeZone: string,
): { day: DayIndex; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { day: WEEKDAY_INDEX[weekday] ?? 0, minutes: (hour % 24) * 60 + minute };
}

export function hoursFor(schedule: WeeklyHours, day: DayIndex): DayHours | null {
  return schedule.weekly.find((d) => d.day === day) ?? null;
}

export function isOpenAt(schedule: WeeklyHours, date = new Date()): boolean {
  const { day, minutes } = localClock(date, schedule.timeZone);
  const today = hoursFor(schedule, day);
  if (today && minutes >= today.openMinutes && minutes < today.closeMinutes) {
    return true;
  }
  // Still inside yesterday's late night (close past midnight)?
  const yesterday = hoursFor(schedule, ((day + 6) % 7) as DayIndex);
  return Boolean(
    yesterday && yesterday.closeMinutes > 1440 && minutes < yesterday.closeMinutes - 1440,
  );
}

/** 660 → "11 AM", 690 → "11:30 AM", 1440 → "Midnight", 720 → "Noon". */
export function formatMinutes(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  if (m === 0) return "Midnight";
  if (m === 720) return "Noon";
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? "AM" : "PM";
  return min === 0 ? `${h12} ${suffix}` : `${h12}:${String(min).padStart(2, "0")} ${suffix}`;
}

export function formatRange(d: Pick<DayHours, "openMinutes" | "closeMinutes">): string {
  return `${formatMinutes(d.openMinutes)} – ${formatMinutes(d.closeMinutes)}`;
}

/**
 * "Sun–Thu 11 AM – 11 PM · Fri–Sat 11 AM – Midnight". Consecutive days with
 * the same window collapse into one run (Sunday-first week).
 */
export function weeklyLabel(schedule: WeeklyHours): string {
  const runs: Array<{ from: DayIndex; to: DayIndex; range: string }> = [];
  for (let i = 0; i < 7; i++) {
    const day = i as DayIndex;
    const h = hoursFor(schedule, day);
    const range = h ? formatRange(h) : "Closed";
    const last = runs[runs.length - 1];
    if (last && last.range === range && last.to === i - 1) last.to = day;
    else runs.push({ from: day, to: day, range });
  }
  return runs
    .map((r) =>
      r.from === r.to
        ? `${DAY_SHORT[r.from]} ${r.range}`
        : `${DAY_SHORT[r.from]}–${DAY_SHORT[r.to]} ${r.range}`,
    )
    .join(" · ");
}

/** Today's window in the schedule's zone, e.g. "11 AM – Midnight", or "Closed today". */
export function todayLabel(schedule: WeeklyHours, date = new Date()): string {
  const { day } = localClock(date, schedule.timeZone);
  const h = hoursFor(schedule, day);
  return h ? formatRange(h) : "Closed today";
}

function hhmm(total: number): string {
  // schema.org wants "24:00" for a midnight close, not "00:00".
  if (total === 1440) return "24:00";
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** schema.org OpeningHoursSpecification[], grouping days that share a window. */
export function openingHoursSpecification(schedule: WeeklyHours) {
  const groups = new Map<string, string[]>();
  for (const d of schedule.weekly) {
    const key = `${hhmm(d.openMinutes)}-${hhmm(d.closeMinutes)}`;
    groups.set(key, [...(groups.get(key) ?? []), DAY_SCHEMA[d.day]]);
  }
  return [...groups.entries()].map(([key, days]) => {
    const [opens, closes] = key.split("-");
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens,
      closes,
    };
  });
}
