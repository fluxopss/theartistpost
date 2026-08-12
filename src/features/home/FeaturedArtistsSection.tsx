import Link from "next/link";
import { Sparkles } from "lucide-react";
import { copy, links } from "@/content/site";
import {
  type ContentArtist,
} from "@/lib/content";
import { FeaturedArtistsInteractive } from "./FeaturedArtistsInteractive";

type FeaturedArtistsSectionProps = {
  artists: ContentArtist[];
};

/** Server shell — empty stage stays static (no Framer) until real artists exist. */
export function FeaturedArtistsSection({
  artists,
}: FeaturedArtistsSectionProps) {
  if (artists.length === 0) {
    return <EmptyStage />;
  }
  return <FeaturedArtistsInteractive artists={artists} />;
}

function EmptyStage() {
  return (
    <section
      className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20"
      id="featured-artists"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
          Showcase
        </p>
        <h2 className="display mt-2 text-3xl text-paper sm:text-4xl">
          {copy.home.featuredTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-paper-muted">
          {copy.home.featuredEmpty}
        </p>
      </div>

      <div className="relative mt-10 overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,107,91,0.18),transparent_50%),radial-gradient(ellipse_at_80%_70%,rgba(46,196,182,0.16),transparent_45%),linear-gradient(160deg,#061428,#0a1f3d)]">
        <div className="relative px-6 py-16 text-center sm:px-10 sm:py-20">
          <Sparkles
            className="mx-auto h-8 w-8 text-spark-gold"
            aria-hidden
          />
          <p className="display mt-4 text-3xl text-paper-on-dark sm:text-4xl">
            The stage is set
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-paper-on-dark/75 sm:text-base">
            Featured Hacienda showcases will appear here with real portraits and
            stories — never placeholders. Visit us at Clematis, or start the
            artist agreement to get on the schedule.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={links.artistAgreement}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-spark-teal px-5 py-2.5 text-sm font-semibold !text-[#020b1a] shadow-[0_0_24px_rgba(46,196,182,0.25)] transition hover:brightness-110"
            >
              Artist agreement
            </a>
            <Link
              href="/artist-schedule"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-line-on-dark px-5 py-2.5 text-sm font-semibold text-paper-on-dark transition hover:bg-white/10"
            >
              View schedule
            </Link>
            <Link
              href="/explore"
              className="min-h-11 text-sm font-medium text-spark-teal underline-offset-4 hover:underline"
            >
              Explore the Wall
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
