import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assets } from "@/content/site";
import { content } from "@/lib/content";
import { JsonLd, eventJsonLd } from "@/lib/seo/json-ld";
import { googleCalendarUrl } from "@/lib/schedule/calendar";
import { PageShell } from "@/shared/ui/PageShell";
import { ButtonLink } from "@/shared/ui/Button";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const events = await content.getEvents();
  return events.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await content.getEventById(id);
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
  const event = await content.getEventById(id);
  if (!event) notFound();

  const start = new Date(event.start);
  const end = new Date(event.end);

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
            {event.medium}
            {event.comingSoon ? " · Coming soon" : ""}
          </p>
          <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
            {event.title}
          </h1>
          <p className="mt-4 text-sm text-paper-muted">
            {start.toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            –{" "}
            {end.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-2 text-sm text-paper">
            {event.artist} · {event.venue}
          </p>
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-paper-muted">
          {event.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink
            href={googleCalendarUrl(event)}
            external
            variant="secondary"
            className="rounded-full"
          >
            Add to Google Calendar
          </ButtonLink>
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
