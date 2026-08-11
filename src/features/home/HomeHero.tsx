"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { assets, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { useReducedMotion } from "@/hooks/useMedia";
import { motion as motionTokens } from "@/design-system/tokens";

export function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate min-h-[min(100dvh,920px)] overflow-hidden">
      <div className="absolute inset-0 -z-20">
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          unoptimized
          fetchPriority="high"
          className="object-cover object-center scale-105"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/75 to-surface" />
        <div className="hero-mesh absolute inset-0 opacity-90" aria-hidden />
      </div>

      {!reduce ? (
        <div
          className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden opacity-40 md:block"
          aria-hidden
        >
          <div className="absolute right-[-4%] top-[14%] h-[32%] w-[28%] overflow-hidden rounded-2xl border border-line-on-dark/30 shadow-glow rotate-3">
            <Image
              src={assets.hacienda}
              alt=""
              fill
              className="object-cover"
              sizes="28vw"
              quality={50}
              loading="lazy"
            />
          </div>
          <div className="absolute bottom-[12%] left-[-4%] h-[26%] w-[24%] overflow-hidden rounded-2xl border border-line-on-dark/30 -rotate-6">
            <Image
              src={assets.loveAll}
              alt=""
              fill
              className="object-cover"
              sizes="24vw"
              quality={50}
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 -z-[5] opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
        aria-hidden
      />

      {!reduce ? (
        <>
          <div className="blob blob-1 opacity-35" aria-hidden />
          <div className="blob blob-2 opacity-25" aria-hidden />
        </>
      ) : null}

      <div className="mx-auto flex min-h-[min(100dvh,920px)] max-w-[var(--content-max)] flex-col items-center justify-center px-4 pb-24 pt-20 text-center sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={motionTokens.spring.soft}
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
          transition={{ delay: 0.12, duration: motionTokens.duration.med }}
        >
          {site.name}
        </motion.p>

        <h1 className="display mt-4 max-w-4xl text-[clamp(2.6rem,8vw,5.25rem)] text-paper-on-dark">
          {"Creativity needs kindness".split(" ").map((word, i) => (
            <motion.span
              key={word + i}
              className="mr-[0.28em] inline-block last:mr-0"
              initial={reduce ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.18 + i * 0.08,
                duration: 0.55,
                ease: motionTokens.easeOut,
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mx-auto mt-5 max-w-xl text-base text-paper-on-dark/78 sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          West Palm Beach arts hub — freedom to create, courage to uplift.
        </motion.p>

        <motion.div
          className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, ...motionTokens.spring.soft }}
        >
          <ButtonLink
            href="/kindness-always"
            variant="secondary"
            size="lg"
            magnetic
            className="rounded-full !bg-spark-coral !text-ink shadow-[0_0_36px_rgba(255,107,91,0.35)]"
          >
            Leave a Kindness
          </ButtonLink>
          <ButtonLink
            href="/explore"
            variant="onDark"
            size="lg"
            magnetic
            className="rounded-full"
          >
            Explore the Wall
          </ButtonLink>
        </motion.div>
      </div>
    </section>
  );
}
