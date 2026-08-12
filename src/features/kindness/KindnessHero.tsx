"use client";

import Image from "next/image";
import { assets } from "@/content/site";
import { Button } from "@/shared/ui/Button";

type KindnessHeroProps = {
  onLeaveNote: () => void;
};

export function KindnessHero({ onLeaveNote }: KindnessHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-line bg-ink px-5 py-14 sm:px-10 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob blob-1 opacity-70" />
        <div className="blob blob-2 opacity-60" />
        <div className="blob blob-3 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-[#062044]" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="hero-enter flex items-center gap-4 motion-reduce:animate-none">
          <Image
            src={assets.kindnessTrademark}
            alt="Kindness Always"
            width={96}
            height={96}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-spark-coral/40 sm:h-24 sm:w-24"
            priority
          />
          <Image
            src={assets.loveAll}
            alt="Love All"
            width={160}
            height={64}
            className="h-12 w-auto object-contain sm:h-14"
          />
        </div>

        <h1 className="display hero-enter hero-enter-kicker mt-8 text-[clamp(2.4rem,8vw,4.5rem)] text-paper-on-dark motion-reduce:animate-none">
          Kindness Always
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-paper-on-dark/75 sm:text-lg">
          Leave a spark for another artist — creativity grows when we are kind.
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
