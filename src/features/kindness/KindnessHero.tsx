"use client";

import Image from "next/image";
import { assets, site } from "@/content/site";
import { Button } from "@/shared/ui/Button";
import { KindnessCount } from "./KindnessCount";

type KindnessHeroProps = {
  onLeaveNote: () => void;
  noteCount?: number;
};

export function KindnessHero({ onLeaveNote, noteCount = 0 }: KindnessHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-line bg-ink px-5 py-14 sm:px-10 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob blob-1 opacity-70" />
        <div className="blob blob-2 opacity-60" />
        <div className="blob blob-3 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-[#062044]" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="hero-enter flex w-full flex-col items-center gap-5 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-center">
          <Image
            src={assets.kindnessTrademark}
            alt={site.kindnessMark}
            width={280}
            height={280}
            className="h-40 w-auto object-contain sm:h-48"
            priority
          />
          <div className="rounded-2xl bg-paper px-5 py-4">
            <Image
              src={assets.loveAll}
              alt="Love | ALL · Dream | TOGETHER · Create | AS ONE"
              width={280}
              height={120}
              className="h-16 w-auto object-contain sm:h-20"
            />
          </div>
        </div>

        <h1 className="display hero-enter hero-enter-kicker mt-8 text-[clamp(2.4rem,8vw,4.5rem)] text-paper-on-dark motion-reduce:animate-none">
          Kindness Always
        </h1>

        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-spark-gold">
          {site.shine}
        </p>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-paper-on-dark/75 sm:text-lg">
          Leave a spark for another artist — creativity grows when we are kind.
        </p>
        <p className="mt-4 text-sm font-semibold text-spark-gold">
          <KindnessCount value={noteCount} /> notes already in the room
        </p>

        <div className="hero-enter hero-enter-cta mt-10 motion-reduce:animate-none">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onLeaveNote}
            className="rounded-full !bg-spark-coral !text-ink px-8 shadow-[0_0_40px_rgba(255,107,91,0.35)]"
          >
            Leave a note
          </Button>
        </div>
      </div>
    </section>
  );
}
