"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { assets, copy, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import {
  HeroFallback,
  InteractiveHeroScene,
} from "@/shared/three/InteractiveHeroScene";
import { WebGLGate, useWebGLEnabled } from "@/shared/three/WebGLGate";

export function HomeHero() {
  const reduce = useReducedMotion();
  const { enabled, setEnabled, supported } = useWebGLEnabled();

  return (
    <section className="relative isolate overflow-hidden section-dark px-4 pb-8 pt-10">
      <WebGLGate fallback={<HeroFallback />}>
        <InteractiveHeroScene />
      </WebGLGate>
      <div className="pointer-events-none absolute inset-0 -z-[5]">
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          className="object-cover opacity-20"
          sizes="430px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/70 to-ink" />
      </div>

      <div className="relative z-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <Image
            src={assets.logo}
            alt={site.name}
            width={112}
            height={112}
            className="h-24 w-24 object-contain drop-shadow-lg"
            priority
          />
        </motion.div>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="display mt-5 text-center text-3xl text-paper-on-dark"
        >
          {site.headline}
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mx-auto mt-3 max-w-[18rem] text-center text-sm text-paper-on-dark/75"
        >
          {site.tagline}
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex flex-col gap-2"
        >
          <ButtonLink
            href="/artist-schedule"
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Artist Schedule
          </ButtonLink>
          <ButtonLink
            href="/explore"
            variant="onDark"
            size="lg"
            className="w-full"
          >
            Explore the wall
          </ButtonLink>
          <ButtonLink
            href={site.mapsUrl}
            external
            variant="onDark"
            size="lg"
            className="w-full"
          >
            Visit Hacienda
          </ButtonLink>
        </motion.div>
        {supported ? (
          <button
            type="button"
            className="mt-4 w-full text-center text-[10px] text-paper-on-dark/50"
            onClick={() => setEnabled(!enabled)}
          >
            {enabled ? "Disable scene" : "Enable scene"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function HaciendaStoryCard() {
  return (
    <section className="px-4 py-5">
      <Link
        href="/about"
        className="block overflow-hidden rounded-2xl border border-line bg-surface shadow-sm active:scale-[0.99] transition"
      >
        <div className="relative aspect-[16/10]">
          <Image
            src={assets.hacienda}
            alt=""
            fill
            className="object-cover"
            sizes="400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
          <p className="absolute bottom-3 left-3 right-3 display text-lg text-paper-on-dark">
            {copy.home.haciendaTitle}
          </p>
        </div>
        <p className="px-4 py-3 text-sm leading-relaxed text-paper-muted">
          {copy.home.haciendaBody}
        </p>
      </Link>
    </section>
  );
}
