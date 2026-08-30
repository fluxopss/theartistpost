import Image from "next/image";
import Link from "next/link";
import { assets, copy, site } from "@/content/site";
import type { ContentEvent } from "@/lib/content";
import { PageShell } from "@/shared/ui/PageShell";
import { ButtonLink } from "@/shared/ui/Button";

export function SpatialSchedule({ events }: { events: ContentEvent[] }) {
  const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(site.address.full)}&output=embed`;

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-10">
        <Image
          src={assets.haciendaHero}
          alt=""
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/75 to-surface" />
      </div>
      <PageShell className="!pb-12 !pt-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
          {copy.schedule.venue} · Clematis
        </p>
        <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
          {copy.schedule.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-paper-muted sm:text-base">
          {copy.schedule.status} {copy.schedule.supportLine}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <ol className="relative space-y-4 border-l border-spark-gold/40 pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span
                  className="absolute -left-[1.54rem] top-2 h-3 w-3 rounded-full bg-spark-gold"
                  aria-hidden
                />
                <Link
                  href={`/event/${event.id}`}
                  className="block rounded-2xl border border-line bg-ink/40 p-4 transition hover:border-spark-teal"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
                    {new Date(event.start).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {event.comingSoon ? " · Being prepared" : ""}
                  </p>
                  <h2 className="display mt-1 text-xl text-paper">{event.title}</h2>
                  <p className="mt-1 text-sm text-paper-muted">{event.venue}</p>
                </Link>
              </li>
            ))}
          </ol>

          <div className="overflow-hidden rounded-3xl border border-line bg-ink/40">
            <iframe
              title={`Map of ${site.address.full}`}
              src={mapsEmbed}
              className="h-64 w-full border-0 md:h-full md:min-h-[22rem]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="border-t border-line p-4">
              <p className="text-sm text-paper">{site.address.full}</p>
              <ButtonLink
                href={site.mapsUrl}
                external
                variant="outline"
                className="mt-3 rounded-full"
              >
                Open directions
              </ButtonLink>
            </div>
          </div>
        </div>
      </PageShell>
    </section>
  );
}
