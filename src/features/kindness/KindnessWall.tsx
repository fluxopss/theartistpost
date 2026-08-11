"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { KindnessNoteCard } from "./KindnessNoteCard";
import { KindnessNoteReader } from "./KindnessNoteReader";
import { KindnessPhysicsField } from "./KindnessPhysicsField";
import {
  FILTER_OPTIONS,
  type KindnessFilter,
  type KindnessNote,
} from "./types";
import { Chip } from "@/design-system/primitives/Chip";
import { Skeleton } from "@/design-system/primitives/Skeleton";
import { useIsTouchDevice, useReducedMotion } from "@/hooks/useMedia";

type KindnessWallProps = {
  notes: KindnessNote[];
  hydrated?: boolean;
};

export function KindnessWall({ notes, hydrated = true }: KindnessWallProps) {
  const [filter, setFilter] = useState<KindnessFilter>("all");
  const [active, setActive] = useState<KindnessNote | null>(null);
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  const defaultView = reduce || touch ? "grid" : "field";
  const [view, setView] = useState<"field" | "grid">(defaultView);

  useEffect(() => {
    setView(reduce || touch ? "grid" : "field");
  }, [reduce, touch]);

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    return notes.filter((n) => n.medium === filter);
  }, [notes, filter]);

  const showField = view === "field" && !reduce;

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

        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          {!reduce ? (
            <div
              className="inline-flex rounded-full border border-line bg-surface-glass p-1"
              role="group"
              aria-label="Wall presentation"
            >
              <button
                type="button"
                className={cn(
                  "min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold",
                  view === "field"
                    ? "bg-spark-teal !text-[#020b1a]"
                    : "text-paper-muted",
                )}
                aria-pressed={view === "field"}
                onClick={() => setView("field")}
              >
                Spark field
              </button>
              <button
                type="button"
                className={cn(
                  "min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold",
                  view === "grid"
                    ? "bg-spark-teal !text-[#020b1a]"
                    : "text-paper-muted",
                )}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                Grid
              </button>
            </div>
          ) : null}
          <div
            role="radiogroup"
            aria-label="Filter notes by medium"
            className="flex flex-wrap gap-2"
          >
            {FILTER_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                label={opt.label}
                active={filter === opt.id}
                role="radio"
                aria-checked={filter === opt.id}
                onClick={() => setFilter(opt.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {!hydrated ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-surface-glass px-6 py-12 text-center">
          <p className="display text-2xl text-paper">Quiet lane</p>
          <p className="mt-2 text-sm text-paper-muted">
            No notes here yet — be the first spark.
          </p>
        </div>
      ) : showField ? (
        <KindnessPhysicsField notes={filtered} onSelect={setActive} />
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
