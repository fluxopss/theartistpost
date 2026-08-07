"use client";

import { useMemo, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { KindnessNoteCard } from "./KindnessNoteCard";
import { KindnessNoteReader } from "./KindnessNoteReader";
import {
  FILTER_OPTIONS,
  type KindnessFilter,
  type KindnessNote,
} from "./types";

type KindnessWallProps = {
  notes: KindnessNote[];
  hydrated?: boolean;
};

export function KindnessWall({ notes, hydrated = true }: KindnessWallProps) {
  const [filter, setFilter] = useState<KindnessFilter>("all");
  const [active, setActive] = useState<KindnessNote | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    return notes.filter((n) => n.medium === filter);
  }, [notes, filter]);

  return (
    <section aria-labelledby="kindness-wall-heading" className="relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-teal">
            The wall
          </p>
          <h2
            id="kindness-wall-heading"
            className="display mt-2 text-3xl text-paper sm:text-4xl"
          >
            Notes between artists
          </h2>
        </div>

        <div
          role="radiogroup"
          aria-label="Filter notes by medium"
          className="flex flex-wrap gap-2"
        >
          {FILTER_OPTIONS.map((opt) => {
            const selected = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setFilter(opt.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition",
                  selected
                    ? "border-spark-teal bg-spark-teal/15 text-spark-teal"
                    : "border-line text-paper-muted hover:border-line-strong hover:text-paper",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!hydrated ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-sm" aria-hidden />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-paper-muted">
          No notes in this lane yet — be the first spark.
        </p>
      ) : (
        <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((note, i) => (
            <div key={note.id} className="mb-4 break-inside-avoid">
              <KindnessNoteCard
                note={note}
                index={i}
                compact
                float={i % 3 !== 1}
                onOpen={setActive}
              />
            </div>
          ))}
        </div>
      )}

      <KindnessNoteReader
        note={active}
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
      />
    </section>
  );
}
