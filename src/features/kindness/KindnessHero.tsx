"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { assets } from "@/content/site";
import { Button } from "@/shared/ui/Button";
import { useReducedMotion } from "@/hooks/useMedia";

type KindnessHeroProps = {
  onLeaveNote: () => void;
};

export function KindnessHero({ onLeaveNote }: KindnessHeroProps) {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-line bg-ink px-5 py-14 sm:px-10 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob blob-1 opacity-70" />
        <div className="blob blob-2 opacity-60" />
        <div className="blob blob-3 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-[#062044]" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4"
        >
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
            priority
          />
        </motion.div>

        <motion.h1
          className="display mt-8 text-[clamp(2.4rem,8vw,4.5rem)] text-paper-on-dark"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          Kindness Always
        </motion.h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-paper-on-dark/75 sm:text-lg">
          Leave a spark for another artist — creativity grows when we are kind.
        </p>

        <motion.div
          className="mt-10"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.25,
            duration: 0.5,
            type: "spring",
            stiffness: 120,
          }}
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onLeaveNote}
            className="rounded-full !bg-spark-coral !text-ink px-8 shadow-[0_0_40px_rgba(255,107,91,0.35)]"
          >
            Leave a note
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
