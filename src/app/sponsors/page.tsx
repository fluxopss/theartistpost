import type { Metadata } from "next";
import Link from "next/link";
import { copy, links } from "@/content/site";
import { PresentedBy } from "@/features/sponsors/PresentedBy";
import { listUpcomingSiteEvents } from "@/server/api/siteEvents";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

const PARTNER_DOOR = "/get-involved?door=partner";

/** "Thu, Nov 6 · 6:00 PM" in Hacienda time. */
function nightWhen(iso: string): string {
  const d = new Date(iso);
  const zone = { timeZone: "America/New_York" } as const;
  const day = d.toLocaleDateString("en-US", {
    ...zone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    ...zone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

export const metadata: Metadata = {
  title: "Sponsors",
  description: copy.sponsors.lead,
  openGraph: {
    title: "Sponsor a night · The Artist Post",
    description: copy.sponsors.lead,
  },
};

/** The presented-nights list comes from the database, so read it per request. */
export const dynamic = "force-dynamic";

/**
 * What sponsorship is, how a presented night is labeled, and the nights that
 * are presented right now. Only real data: no sponsor names, prices, or reach
 * numbers are written into this page.
 */
export default async function SponsorsPage() {
  const presented = (await listUpcomingSiteEvents()).filter(
    (event) => event.presentedBy,
  );
  const s = copy.sponsors;

  return (
    <PageShell className="space-y-12 !pt-16">
      <header className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
          {s.kicker}
        </p>
        <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
          {s.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-paper-muted sm:text-lg">
          {s.lead}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={PARTNER_DOOR} className="rounded-full">
            {s.cta}
          </ButtonLink>
        </div>
      </header>

      <section aria-labelledby="sponsor-funds">
        <h2 id="sponsor-funds" className="display text-2xl text-paper">
          {s.fundsTitle}
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {s.funds.map((item) => (
            <li
              key={item.title}
              className="rounded-3xl border border-line bg-surface-glass p-5"
            >
              <p className="font-semibold text-paper">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-paper-muted">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="sponsor-how"
        className="grid gap-6 md:grid-cols-2"
      >
        <div>
          <h2 id="sponsor-how" className="display text-2xl text-paper">
            {s.howTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-paper-muted">
            {s.howBody}
          </p>
        </div>
        <div>
          <h2 className="display text-2xl text-paper">{s.promiseTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-paper-muted">
            {s.promise.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="sponsor-nights"
        className="rounded-3xl border border-line bg-surface-glass p-6 sm:p-8"
      >
        <h2 id="sponsor-nights" className="display text-2xl text-paper">
          {s.listTitle}
        </h2>
        {presented.length > 0 ? (
          <ul className="mt-5 divide-y divide-line">
            {presented.map((event) => (
              <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/event/${encodeURIComponent(event.id)}`}
                  className="display text-xl text-paper hover:text-spark-teal"
                >
                  {event.title}
                </Link>
                <p className="mt-1 text-xs text-paper-muted">
                  {nightWhen(event.start)}
                </p>
                <PresentedBy
                  sponsor={event.presentedBy}
                  size="sm"
                  className="mt-2"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p
            data-testid="sponsors-empty"
            className="mt-3 max-w-xl text-sm text-paper-muted"
          >
            {s.listEmpty}
          </p>
        )}
      </section>

      <section
        aria-labelledby="sponsor-cta"
        className="rounded-3xl border border-line bg-ink-elevated p-6 sm:p-8"
      >
        <h2 id="sponsor-cta" className="display text-2xl text-paper">
          {s.ctaTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-paper-muted">{s.ctaBody}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonLink href={PARTNER_DOOR} className="rounded-full">
            {s.cta}
          </ButtonLink>
          <span className="text-sm text-paper-muted">
            {s.donateLine}{" "}
            <Link
              href={links.donatePage}
              className="text-spark-teal underline-offset-4 hover:underline"
            >
              {s.donateCta}
            </Link>
          </span>
        </div>
      </section>
    </PageShell>
  );
}
