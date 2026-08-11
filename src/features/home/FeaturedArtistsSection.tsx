"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { ARTIST_MEDIUMS, artists, type ArtistMedium } from "@/data/artists";
import { ArtistCard } from "@/components/ArtistCard";
import { SectionReveal } from "@/components/SectionReveal";
import { Chip } from "@/design-system/primitives/Chip";
import { ButtonLink } from "@/design-system/primitives/Button";
import { assets, copy, links } from "@/content/site";
import { cn } from "@/shared/lib/cn";

export function FeaturedArtistsSection() {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState<ArtistMedium | "all">("all");
  const hasArtists = artists.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      const mediumOk = medium === "all" || a.medium === medium;
      const queryOk =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.medium.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q);
      return mediumOk && queryOk;
    });
  }, [query, medium]);

  return (
    <SectionReveal
      className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20"
      id="featured-artists"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
            Showcase
          </p>
          <h2 className="display mt-2 text-3xl text-paper sm:text-4xl">
            {copy.home.featuredTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-paper-muted">
            {hasArtists
              ? "Filter by medium or search — tap a card for the full story."
              : copy.home.featuredEmpty}
          </p>
        </div>
        {hasArtists ? (
          <label className="relative block w-full md:max-w-xs">
            <span className="sr-only">Search artists</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by medium…"
              className="min-h-11 w-full rounded-full border border-line bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-paper outline-none focus:border-spark-teal"
            />
          </label>
        ) : null}
      </div>

      {hasArtists ? (
        <div
          className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="Filter by medium"
        >
          {ARTIST_MEDIUMS.map((m) => (
            <Chip
              key={m.value}
              label={m.label}
              role="tab"
              aria-selected={medium === m.value}
              active={medium === m.value}
              onClick={() => setMedium(m.value)}
              className="shrink-0"
            />
          ))}
        </div>
      ) : null}

      {!hasArtists ? (
        <EmptyStage />
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-surface-glass px-6 py-12 text-center">
          <p className="display text-2xl text-paper">Empty stage</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-paper-muted">
            No artists match that filter — try another medium, or visit Hacienda
            for live showcases.
          </p>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div
            layout
            className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((artist, i) => (
                <motion.div
                  key={artist.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.28 }}
                  className={cn(
                    "mb-4 break-inside-avoid",
                    i % 3 === 1 && "sm:mt-8",
                  )}
                >
                  <ArtistCard artist={artist} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}
    </SectionReveal>
  );
}

function EmptyStage() {
  return (
    <div className="relative mt-10 overflow-hidden rounded-3xl border border-line">
      <div className="absolute inset-0">
        <Image
          src={assets.hacienda}
          alt=""
          fill
          className="object-cover opacity-35"
          sizes="(max-width: 1024px) 100vw, 72rem"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-ink/70 to-ink/40" />
      </div>
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
          <ButtonLink
            href={links.artistAgreement}
            external
            variant="secondary"
            magnetic
            className="rounded-full"
          >
            Artist agreement
          </ButtonLink>
          <ButtonLink
            href="/artist-schedule"
            variant="onDark"
            className="rounded-full"
          >
            View schedule
          </ButtonLink>
          <Link
            href="/explore"
            className="min-h-11 text-sm font-medium text-spark-teal underline-offset-4 hover:underline"
          >
            Explore the Wall
          </Link>
        </div>
      </div>
    </div>
  );
}
