"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ARTIST_MEDIUMS, artists, type ArtistMedium } from "@/data/artists";
import { ArtistCard } from "@/components/ArtistCard";
import { SectionReveal } from "@/components/SectionReveal";
import { copy } from "@/content/site";
import { cn } from "@/shared/lib/cn";

export function FeaturedArtistsSection() {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState<ArtistMedium | "all">("all");

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
            {copy.home.featuredEmpty}
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
            className="w-full rounded-full border border-line bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-paper outline-none focus:border-spark-teal"
          />
        </label>
      </div>

      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter by medium"
      >
        {ARTIST_MEDIUMS.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={medium === m.value}
            onClick={() => setMedium(m.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
              medium === m.value
                ? "border-spark-teal bg-spark-teal/15 text-spark-teal"
                : "border-line text-paper-muted hover:text-paper",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {filtered.map((artist, i) => (
          <div
            key={artist.id}
            className={cn("mb-4 break-inside-avoid", i % 3 === 1 && "sm:mt-8")}
          >
            <ArtistCard artist={artist} />
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-paper-muted">
          No artists match that filter — try another medium.
        </p>
      ) : null}
    </SectionReveal>
  );
}
