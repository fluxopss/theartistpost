import type { Metadata } from "next";
import Link from "next/link";
import { assets, copy, hours, site } from "@/content/site";
import { listUpcomingSiteEvents } from "@/server/api/siteEvents";
import { NightRoom } from "@/features/night/NightRoom";
import { GenreRail } from "@/features/stage/GenreRail";
import { featuredNight } from "@/features/night/program";
import { PageShell } from "@/shared/ui/PageShell";
import { ButtonLink } from "@/shared/ui/Button";

/** The next night comes from the database (Manage events), so read it per request. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const night = featuredNight(await listUpcomingSiteEvents());
  const title = night?.title ?? copy.night.kicker;
  const description = night ? copy.night.lineup : copy.night.emptyBody;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [assets.haciendaHero],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [assets.haciendaHero],
    },
  };
}

export default async function NightPage() {
  const night = featuredNight(await listUpcomingSiteEvents());

  if (!night) {
    return (
      <PageShell className="space-y-6 !pt-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
          {copy.night.kicker}
        </p>
        <h1 className="display text-4xl text-paper sm:text-5xl">
          {copy.night.emptyTitle}
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-paper-muted">
          {copy.night.emptyBody}
        </p>
        <GenreRail />
        <p className="text-sm text-paper">
          {site.address.full} · {hours.label}
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/get-involved" className="rounded-full">
            Get involved
          </ButtonLink>
          <ButtonLink
            href={site.mapsUrl}
            external
            variant="outline"
            className="rounded-full"
          >
            Directions
          </ButtonLink>
          <Link href="/artist-schedule" className="self-center text-sm text-spark-teal">
            Artist schedule
          </Link>
        </div>
      </PageShell>
    );
  }

  return <NightRoom event={night} />;
}
