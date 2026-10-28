import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assets, copy } from "@/content/site";
import { JsonLd, eventJsonLd } from "@/lib/seo/json-ld";
import { googleCalendarUrl } from "@/lib/schedule/calendar";
import { PageShell } from "@/shared/ui/PageShell";
import { ButtonLink } from "@/shared/ui/Button";
import { SaveEventButton } from "@/features/app/SaveButton";
import { featuredNight, scheduleLabel } from "@/features/night/program";
import { findSiteEvent, listUpcomingSiteEvents } from "@/server/api/siteEvents";

type Props = { params: Promise<{ id: string }> };

/**
 * Nights published in Manage events appear (and change) without a rebuild,
 * so every night page is read per request. Past and cancelled nights stay
 * reachable; only upcoming ones are in the sitemap.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await findSiteEvent(id);
  if (!event) return { title: "Event" };
  return {
    title: event.title,
    description: event.description,
    openGraph: {
      title: event.title,
      description: event.description,
      type: "website",
      images: [assets.coverOg],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.description,
      images: [assets.coverOg],
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await findSiteEvent(id);
  if (!event) notFound();

  const cancelled = event.cancelled;
  const night = cancelled ? null : featuredNight(await listUpcomingSiteEvents());
  const holding = night?.id === event.id;
  const start = new Date(event.start);
  const end = new Date(event.end);
  const when: Intl.DateTimeFormatOptions = { timeZone: "America/New_York" };

  return (
    <>
      <JsonLd data={eventJsonLd(event)} />
      <PageShell className="space-y-8 !pt-16">
        <Link
          href="/artist-schedule"
          className="text-sm text-spark-teal hover:underline"
        >
          ← Artist Schedule
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
            {cancelled ? copy.schedule.cancelledLabel : scheduleLabel(event)}
          </p>
          <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
            {event.title}
          </h1>
          <p className="mt-4 text-sm text-paper-muted">
            {start.toLocaleString("en-US", {
              ...when,
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            –{" "}
            {end.toLocaleTimeString("en-US", {
              ...when,
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-2 text-sm text-paper">
            {event.artist} · {event.venue}
          </p>
        </div>
        {cancelled ? (
          <p
            role="status"
            className="max-w-2xl rounded-2xl border border-spark-coral/50 bg-spark-coral/10 px-4 py-3 text-sm font-semibold text-paper"
          >
            {copy.schedule.cancelledNote}
          </p>
        ) : null}
        <p className="max-w-2xl text-base leading-relaxed text-paper-muted">
          {event.description}
        </p>
        <div className="flex flex-wrap gap-3">
          {holding ? (
            <ButtonLink href="/night" className="rounded-full">
              {copy.night.hold}
            </ButtonLink>
          ) : null}
          {cancelled ? null : (
            <>
              <SaveEventButton
                event={{
                  id: event.id,
                  title: event.title,
                  venue: event.venue,
                  start: event.start,
                }}
              />
              <ButtonLink
                href={googleCalendarUrl(event)}
                external
                variant="secondary"
                className="rounded-full"
              >
                Add to Google Calendar
              </ButtonLink>
            </>
          )}
          <ButtonLink
            href="/artist-schedule"
            variant="outline"
            className="rounded-full"
          >
            Back to schedule
          </ButtonLink>
        </div>
      </PageShell>
    </>
  );
}
