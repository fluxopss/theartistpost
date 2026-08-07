"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import { assets, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { useReducedMotion } from "@/hooks/useMedia";

const collage = [
  assets.cover,
  assets.hacienda,
  assets.aboutHero,
  assets.comingSoon,
  "/merch/gallery.jpeg",
  "/merch/img-1605.jpg",
];

export function HomeHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 120]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 120, damping: 18 });
  const springY = useSpring(my, { stiffness: 120, damping: 18 });
  const rotateX = useTransform(springY, [-40, 40], reduce ? [0, 0] : [8, -8]);
  const rotateY = useTransform(springX, [-40, 40], reduce ? [0, 0] : [-8, 8]);

  function onMouseMove(e: React.MouseEvent) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left - rect.width / 2);
    my.set(e.clientY - rect.top - rect.height / 2);
  }

  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[min(100dvh,920px)] overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <motion.div className="absolute inset-0 -z-10" style={{ y: bgY }}>
        <div className="absolute inset-0 grid grid-cols-2 gap-1 opacity-40 sm:grid-cols-3 md:opacity-50">
          {collage.map((src, i) => (
            <div
              key={src + i}
              className="relative min-h-[28vh] overflow-hidden sm:min-h-[36vh]"
            >
              <Image
                src={src}
                alt=""
                fill
                priority={i < 2}
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/80 to-surface" />
      </motion.div>

      <div className="mx-auto flex max-w-[var(--content-max)] flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
        <motion.div
          style={{ rotateX, rotateY, transformPerspective: 900 }}
          className="will-change-transform"
        >
          <Image
            src={assets.logo}
            alt={site.name}
            width={160}
            height={160}
            className="h-28 w-28 object-contain drop-shadow-[0_0_40px_rgba(46,196,182,0.35)] sm:h-36 sm:w-36"
            priority
          />
        </motion.div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-spark-coral">
          {site.name}
        </p>

        <motion.h1
          className="display mt-4 max-w-4xl text-[clamp(2.4rem,7vw,5rem)] text-paper-on-dark"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatedHeadline text={site.headline} reduce={reduce} />
        </motion.h1>

        <p className="mx-auto mt-5 max-w-xl text-base text-paper-on-dark/75 sm:text-lg">
          {site.tagline}
        </p>

        <div className="mt-10 flex w-full max-w-lg flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink
            href="/artist-schedule"
            variant="secondary"
            size="lg"
            className="rounded-full"
          >
            Artist Schedule
          </ButtonLink>
          <ButtonLink
            href="/about"
            variant="onDark"
            size="lg"
            className="rounded-full"
          >
            About the Mission
          </ButtonLink>
          <ButtonLink
            href={site.mapsUrl}
            external
            variant="onDark"
            size="lg"
            className="rounded-full"
          >
            Visit Hacienda
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function AnimatedHeadline({ text, reduce }: { text: string; reduce: boolean }) {
  if (reduce) return <>{text}</>;
  const words = text.split(" ");
  return (
    <span className="inline-flex flex-wrap justify-center gap-x-[0.28em]">
      {words.map((word, i) => (
        <motion.span
          key={word + i}
          className="inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.12 + i * 0.08,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
