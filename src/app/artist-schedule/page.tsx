import type { Metadata } from "next";
import Link from "next/link";
import { assets, copy } from "@/content/site";
import { PageShell } from "@/shared/ui/PageShell";
import { ScheduleView } from "@/components/ScheduleView";
import { SpatialSchedule } from "@/features/schedule/SpatialSchedule";
import { listUpcomingSiteEvents } from "@/server/api/siteEvents";

export const metadata: Metadata = {
  title: "Artist Schedule",
  description: copy.schedule.supportLine,
  openGraph: {
    title: "Artist Schedule",
    description: copy.schedule.supportLine,
    images: [assets.comingSoon],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.comingSoon],
  },
};

/** Nights come from the database (Manage events), so read them per request. */
export const dynamic = "force-dynamic";

export default async function ArtistSchedulePage() {
  const events = await listUpcomingSiteEvents();

  return (
    <>
      <SpatialSchedule events={events} />
      <PageShell className="!pt-8">
        {events.length > 0 ? (
          <>
            <h2 className="display mb-6 text-2xl text-paper">
              {copy.schedule.showcaseTitle}
            </h2>
            <ScheduleView events={events} />
          </>
        ) : (
          <section
            data-testid="schedule-empty"
            className="rounded-3xl border border-line bg-surface-glass p-6 sm:p-8"
          >
            <h2 className="display text-2xl text-paper">
              {copy.schedule.emptyTitle}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-paper-muted">
              {copy.schedule.emptyBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/get-involved"
                className="inline-flex min-h-11 items-center rounded-full bg-spark-coral px-5 text-sm font-semibold text-ink"
              >
                {copy.schedule.emptyInvolve}
              </Link>
              <Link
                href="/community"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-paper hover:border-spark-teal hover:text-spark-teal"
              >
                {copy.schedule.emptyCommunity}
              </Link>
            </div>
          </section>
        )}
      </PageShell>
    </>
  );
}
