import Image from "next/image";
import Link from "next/link";
import { assets, copy, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden section-dark">
      <div className="absolute inset-0 -z-10">
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          className="object-cover opacity-35"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/75 to-ink" />
      </div>

      <div className="mx-auto flex max-w-[var(--content-max)] flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20">
        <Image
          src={assets.logo}
          alt={site.name}
          width={128}
          height={128}
          className="h-28 w-28 object-contain drop-shadow-lg sm:h-32 sm:w-32"
          priority
        />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-spark-coral">
          {site.name}
        </p>
        <h1 className="display mt-4 max-w-3xl text-4xl text-paper-on-dark sm:text-5xl md:text-6xl">
          {site.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-paper-on-dark/80 sm:text-lg">
          {site.tagline}
        </p>
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href="/artist-schedule" variant="secondary" size="lg">
            Artist Schedule
          </ButtonLink>
          <ButtonLink href="/about" variant="onDark" size="lg">
            About the mission
          </ButtonLink>
          <ButtonLink href={site.mapsUrl} external variant="onDark" size="lg">
            Visit Hacienda
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function HaciendaStoryCard() {
  return (
    <section className="mx-auto max-w-[var(--content-max)] px-4 py-12 sm:px-6">
      <Link
        href="/about"
        className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:opacity-95 md:grid-cols-2"
      >
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px]">
          <Image
            src={assets.hacienda}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="display text-2xl text-ink sm:text-3xl">
            {copy.home.haciendaTitle}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper-muted sm:text-base">
            {copy.home.haciendaBody}
          </p>
        </div>
      </Link>
    </section>
  );
}
