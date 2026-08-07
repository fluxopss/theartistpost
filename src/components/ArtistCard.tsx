"use client";

import Image from "next/image";
import { useState } from "react";
import type { Artist } from "@/data/artists";
import { cn } from "@/shared/lib/cn";

type ArtistCardProps = {
  artist: Artist;
  className?: string;
};

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={cn("perspective-card group", className)}>
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => setFlipped((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((v) => !v);
          }
        }}
        aria-pressed={flipped}
        aria-label={`${artist.name} — ${artist.medium}. Flip for details.`}
      >
        <div
          className={cn(
            "flip-inner relative aspect-[4/5] w-full",
            flipped && "is-flipped",
          )}
        >
          <div className="flip-face absolute inset-0 overflow-hidden rounded-2xl border border-line bg-surface-muted shadow-glow">
            {artist.comingSoon ? (
              <div className="absolute inset-0 skeleton" aria-hidden />
            ) : null}
            <Image
              src={artist.image}
              alt=""
              fill
              className={cn(
                "object-cover transition duration-500 group-hover:scale-105",
                artist.comingSoon && "opacity-50",
              )}
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-teal">
                {artist.medium}
              </p>
              <p className="display mt-1 text-xl text-paper-on-dark">
                {artist.comingSoon ? "Coming soon" : artist.name}
              </p>
            </div>
          </div>

          <div className="flip-face flip-back absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-ink-elevated p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
                {artist.medium}
              </p>
              <p className="display mt-2 text-2xl text-paper-on-dark">
                {artist.comingSoon ? "Coming soon" : artist.name}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-paper-muted">
                {artist.bio}
              </p>
            </div>
            <p className="text-xs text-paper-muted/80">Tap to flip back</p>
          </div>
        </div>
      </button>
    </div>
  );
}
