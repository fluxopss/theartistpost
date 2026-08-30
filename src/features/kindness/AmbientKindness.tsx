"use client";

import { useState } from "react";
import Link from "next/link";
import { copy, site } from "@/content/site";
import { KindnessNoteCard } from "./KindnessNoteCard";
import { KindnessNoteReader } from "./KindnessNoteReader";
import { KindnessCount } from "./KindnessCount";
import { useKindnessNotes } from "./useKindnessNotes";
import type { KindnessNote } from "./types";

export function AmbientKindness() {
  const { notes, hydrated } = useKindnessNotes();
  const [active, setActive] = useState<KindnessNote | null>(null);
  const drift = notes.slice(0, 5);

  return (
    <section
      aria-labelledby="ambient-kindness-heading"
      className="relative overflow-hidden border-y border-line py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-coral">
              {site.kindnessMark}
            </p>
            <h2
              id="ambient-kindness-heading"
              className="display mt-2 max-w-xl text-3xl text-paper sm:text-4xl"
            >
              Kindness already in the room
            </h2>
            <p className="mt-3 max-w-lg text-sm text-paper-muted sm:text-base">
              Notes float through the house — short, human, never a scoreboard.
              <span className="mt-2 block font-semibold text-paper">
                <KindnessCount value={hydrated ? notes.length : 0} /> sparks on
                the plaster
              </span>
            </p>
          </div>
          <Link
            href="/kindness-always"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-spark-teal/50 bg-spark-teal/10 px-5 py-2.5 text-sm font-semibold text-spark-teal transition hover:bg-spark-teal/20"
          >
            Leave a Kindness
          </Link>
        </div>
      </div>

      <div className="relative mx-auto mt-10 max-w-[80rem] px-4 sm:px-6">
        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-sm" aria-hidden />
            ))}
          </div>
        ) : (
          <ul className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {drift.map((note, i) => (
              <li
                key={note.id}
                className="w-full max-w-[18rem] sm:w-[16.5rem]"
                style={{ marginTop: i % 2 === 1 ? "1.5rem" : 0 }}
              >
                <KindnessNoteCard
                  note={note}
                  compact
                  float={i !== 2}
                  index={i}
                  onOpen={setActive}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mx-auto mt-8 max-w-lg px-4 text-center text-xs text-paper-muted">
        {copy.kindness.body.slice(0, 140)}…
      </p>

      <KindnessNoteReader
        note={active}
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
      />
    </section>
  );
}
