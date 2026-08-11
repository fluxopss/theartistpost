"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Navigation } from "lucide-react";
import { assets, copy, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { SectionReveal } from "@/components/SectionReveal";
import { useReducedMotion } from "@/hooks/useMedia";

export function HaciendaShowcase() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -40]);

  return (
    <SectionReveal className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-24">
      <article
        ref={ref}
        className="grid overflow-hidden rounded-3xl border border-line bg-surface-glass md:grid-cols-2"
      >
        <div className="relative aspect-[16/11] overflow-hidden md:aspect-auto md:min-h-[360px]">
          <motion.div className="absolute inset-0" style={{ y }}>
            <Image
              src={assets.hacienda}
              alt="The Artist Post at The Hacienda"
              fill
              className="scale-110 object-cover"
              quality={60}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent md:bg-gradient-to-r" />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            Live creative space
          </p>
          <h2 className="display mt-3 text-3xl text-paper sm:text-4xl">
            {copy.home.haciendaTitle}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-paper-muted sm:text-base">
            {copy.home.haciendaBody}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink
              href={site.mapsUrl}
              external
              className="rounded-full gap-2"
              variant="secondary"
            >
              <Navigation className="h-4 w-4" aria-hidden />
              Get Directions
            </ButtonLink>
            <ButtonLink
              href="/about"
              variant="outline"
              className="rounded-full"
            >
              About the mission
            </ButtonLink>
          </div>
        </div>
      </article>
    </SectionReveal>
  );
}
