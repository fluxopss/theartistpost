import Image from "next/image";
import { assets, copy, site } from "@/content/site";

export function InvolveHero() {
  return (
    <section className="relative isolate min-h-[min(72dvh,720px)] overflow-hidden">
      <div className="absolute inset-0 -z-30">
        <Image
          src={assets.haciendaHero}
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/70 to-surface" />
      </div>

      <div className="mx-auto flex min-h-[min(72dvh,720px)] max-w-[var(--content-max)] flex-col items-center justify-center px-4 pb-16 pt-24 text-center sm:px-6">
        <p className="hero-enter hero-enter-kicker text-xs font-semibold uppercase tracking-[0.32em] text-spark-coral motion-reduce:animate-none">
          {copy.involve.kicker}
        </p>
        <h1 className="display mt-4 text-[clamp(2.6rem,8vw,5.25rem)] text-paper-on-dark">
          {copy.involve.title}
        </h1>
        <p className="hero-enter hero-enter-copy mx-auto mt-5 max-w-xl text-base text-paper-on-dark/78 motion-reduce:animate-none sm:text-lg">
          {site.heroSupport}
        </p>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-spark-gold">
          {copy.involve.shine}
        </p>
      </div>
    </section>
  );
}
