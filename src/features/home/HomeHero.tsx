"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { assets, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { useReducedMotion } from "@/hooks/useMedia";

export function HomeHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const plateScale = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [1, 1] : [1.08, 1.2],
  );
  const plateY = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [0, 80],
  );

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[min(100dvh,920px)] overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ scale: plateScale, y: plateY }}
      >
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/70 to-surface" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,107,91,0.22),transparent_50%),radial-gradient(ellipse_at_80%_60%,rgba(46,196,182,0.18),transparent_45%)]" />
      </motion.div>

      {!reduce ? (
        <>
          <div className="blob blob-1 opacity-40" aria-hidden />
          <div className="blob blob-2 opacity-30" aria-hidden />
        </>
      ) : null}

      <div className="mx-auto flex min-h-[min(100dvh,920px)] max-w-[var(--content-max)] flex-col items-center justify-center px-4 pb-24 pt-20 text-center sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={assets.logo}
            alt={site.name}
            width={168}
            height={168}
            className="mx-auto h-28 w-28 object-contain drop-shadow-[0_0_48px_rgba(46,196,182,0.4)] sm:h-36 sm:w-36"
            priority
          />
        </motion.div>

        <motion.p
          className="mt-7 text-xs font-semibold uppercase tracking-[0.32em] text-spark-coral sm:text-sm"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {site.name}
        </motion.p>

        <motion.h1
          className="display mt-4 max-w-4xl text-[clamp(2.6rem,8vw,5.25rem)] text-paper-on-dark"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Creativity needs kindness
        </motion.h1>

        <motion.p
          className="mx-auto mt-5 max-w-xl text-base text-paper-on-dark/78 sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.55 }}
        >
          West Palm Beach arts hub — freedom to create, courage to uplift.
        </motion.p>

        <motion.div
          className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.45,
            type: "spring",
            stiffness: 140,
            damping: 18,
          }}
        >
          <ButtonLink
            href="/kindness-always"
            variant="secondary"
            size="lg"
            className="rounded-full !bg-spark-coral !text-ink shadow-[0_0_36px_rgba(255,107,91,0.35)]"
          >
            Leave a Kindness
          </ButtonLink>
          <ButtonLink
            href="/explore"
            variant="onDark"
            size="lg"
            className="rounded-full"
          >
            Explore the Wall
          </ButtonLink>
        </motion.div>
      </div>
    </section>
  );
}
