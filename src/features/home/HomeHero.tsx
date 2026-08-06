"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { assets, copy, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { HeroFallback } from "@/shared/three/HeroFallback";
import { WebGLGate, useWebGLEnabled } from "@/shared/three/WebGLGate";

/** Lazy R3F — never block or crash the brand home if WebGL/Three fails. */
const InteractiveHeroScene = dynamic(
  () =>
    import("@/shared/three/InteractiveHeroScene").then(
      (m) => m.InteractiveHeroScene,
    ),
  { ssr: false, loading: () => <HeroFallback /> },
);

export function HomeHero() {
  const { enabled, setEnabled, supported } = useWebGLEnabled();

  return (
    <section className="relative isolate overflow-hidden section-dark px-4 pb-10 pt-12">
      <WebGLGate fallback={<HeroFallback />}>
        <InteractiveHeroScene />
      </WebGLGate>
      <div className="pointer-events-none absolute inset-0 -z-[5]">
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          className="object-cover opacity-25"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/75 to-ink" />
      </div>

      <div className="relative z-10 mx-auto max-w-md">
        <div className="flex justify-center">
          <Image
            src={assets.logo}
            alt={site.name}
            width={112}
            height={112}
            className="h-24 w-24 object-contain drop-shadow-lg"
            priority
          />
        </div>
        <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-spark-coral">
          {site.name}
        </p>
        <h1 className="display mt-3 text-center text-3xl text-paper-on-dark sm:text-4xl">
          {site.headline}
        </h1>
        <p className="mx-auto mt-3 max-w-[18rem] text-center text-sm text-paper-on-dark/80">
          {site.tagline}
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
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
        </div>
        {supported ? (
          <button
            type="button"
            className="mt-5 w-full text-center text-[10px] text-paper-on-dark/45"
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
            sizes="(max-width: 768px) 100vw, 480px"
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
