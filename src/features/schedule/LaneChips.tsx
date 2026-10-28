import Link from "next/link";
import { houseGenres } from "@/content/stage";
import { cn } from "@/shared/lib/cn";

export const SCHEDULE_PATH = "/artist-schedule";

/** A known house lane id ("music", "culinary", …), or null for all nights. */
export function scheduleLane(raw: string | string[] | undefined): string | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (!value) return null;
  if (value === COMMUNITY_LANE) return value;
  return houseGenres.some((genre) => genre.id === value) ? value : null;
}

/** Nights that aren't tied to one discipline (the API's default medium). */
const COMMUNITY_LANE = "community";

export function laneLabel(id: string): string {
  if (id === COMMUNITY_LANE) return "Community nights";
  return houseGenres.find((genre) => genre.id === id)?.label ?? id;
}

/**
 * Filter chips for the schedule, in house order (Musicians, then Culinary
 * Artists, …). Each chip is a plain link (`?lane=`), so filtering works
 * without JavaScript; the canonical URL stays /artist-schedule.
 */
export function LaneChips({ active }: { active: string | null }) {
  const chip = (current: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition",
      current
        ? "border-spark-teal bg-spark-teal/15 text-paper"
        : "border-line text-paper-muted hover:border-spark-teal hover:text-paper",
    );
  return (
    <nav aria-label="Schedule lanes" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={SCHEDULE_PATH}
            scroll={false}
            className={chip(active === null)}
            aria-current={active === null ? "page" : undefined}
          >
            All nights
          </Link>
        </li>
        {houseGenres.map((genre) => {
          const current = active === genre.id;
          return (
            <li key={genre.id}>
              <Link
                href={`${SCHEDULE_PATH}?lane=${genre.id}`}
                scroll={false}
                className={chip(current)}
                aria-current={current ? "page" : undefined}
              >
                {genre.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
