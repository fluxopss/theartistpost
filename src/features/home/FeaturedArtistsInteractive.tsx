"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Search } from "lucide-react";
import { ArtistCard } from "@/components/ArtistCard";
import { SectionReveal } from "@/components/SectionReveal";
import { Chip } from "@/design-system/primitives/Chip";
import { copy } from "@/content/site";
import {
  ARTIST_MEDIUM_OPTIONS,
  type ContentArtist,
} from "@/lib/content";
import { filterArtists } from "@/features/home/filterArtists";
import { cn } from "@/shared/lib/cn";

export function FeaturedArtistsInteractive({
  artists,
}: {
  artists: ContentArtist[];
}) {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState<ContentArtist["medium"] | "all">(
    "all",
  );

  const filtered = useMemo(
    () => filterArtists(artists, query, medium),
    [artists, query, medium],
  );

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
            Filter by medium or search — tap a card for the full story.
          </p>
        </div>
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
      </div>

      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter by medium"
      >
        {ARTIST_MEDIUM_OPTIONS.map((m) => (
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

      {filtered.length === 0 ? (
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
