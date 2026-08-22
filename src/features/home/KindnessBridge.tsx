"use client";

import Link from "next/link";
import Image from "next/image";
import { SectionReveal } from "@/components/SectionReveal";
import { KindnessNoteCard } from "@/features/kindness/KindnessNoteCard";
import { useKindnessNotes } from "@/features/kindness/useKindnessNotes";
import { assets, site } from "@/content/site";

export function KindnessBridge() {
  const { notes, hydrated } = useKindnessNotes();
  const preview = notes.slice(0, 3);

  return (
    <section
      aria-labelledby="kindness-bridge-heading"
      className="relative mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20"
    >
      <SectionReveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <Image
              src={assets.kindnessTrademark}
              alt=""
              width={96}
              height={96}
              className="mt-1 hidden h-16 w-auto shrink-0 object-contain sm:block"
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-coral">
                {site.kindnessMark}
              </p>
              <h2
                id="kindness-bridge-heading"
                className="display mt-2 max-w-xl text-3xl text-paper sm:text-4xl"
              >
                Sparks already on the wall
              </h2>
              <p className="mt-3 max-w-lg text-sm text-paper-muted sm:text-base">
                Artists leave notes for each other — short, human, and real.
              </p>
            </div>
          </div>
          <Link
            href="/kindness-always"
            className="inline-flex items-center justify-center rounded-full border border-spark-teal/50 bg-spark-teal/10 px-5 py-2.5 text-sm font-semibold text-spark-teal transition hover:bg-spark-teal/20"
          >
            Open the wall
          </Link>
        </div>
      </SectionReveal>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {!hydrated
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-sm" aria-hidden />
            ))
          : preview.map((note, i) => (
              <KindnessNoteCard
                key={note.id}
                note={note}
                compact
                float={false}
                index={i}
              />
            ))}
      </div>
    </section>
  );
}
