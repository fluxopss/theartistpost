import Image from "next/image";
import Link from "next/link";
import { assets, site } from "@/content/site";

const HEADLINE = "Creativity needs kindness";

/** Server hero — CSS only on the LCP path (no Framer, canvas, or magnetic CTAs). */
export function HomeHero() {
  return (
    <section className="relative isolate min-h-[min(100dvh,920px)] overflow-hidden">
      <div className="absolute inset-0 -z-30">
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          unoptimized
          fetchPriority="high"
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/72 to-surface" />
        <div className="hero-mesh absolute inset-0 opacity-80" aria-hidden />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[-5] opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
        aria-hidden
      />

      <div className="mx-auto flex min-h-[min(100dvh,920px)] max-w-[var(--content-max)] flex-col items-center justify-center px-4 pb-24 pt-20 text-center sm:px-6">
        <div className="hero-enter hero-enter-logo motion-reduce:animate-none">
          <Image
            src={assets.logo3d}
            alt={site.name}
            width={168}
            height={168}
            className="mx-auto h-28 w-28 object-contain drop-shadow-[0_0_48px_rgba(46,196,182,0.4)] sm:h-36 sm:w-36"
          />
        </div>

        <p className="hero-enter hero-enter-kicker mt-7 text-xs font-semibold uppercase tracking-[0.32em] text-spark-coral motion-reduce:animate-none sm:text-sm">
          {site.mark}
        </p>

        <h1 className="display mt-4 max-w-4xl text-[clamp(2.6rem,8vw,5.25rem)] text-paper-on-dark">
          {HEADLINE.split(" ").map((word, i) => (
            <span
              key={word + i}
              className="mr-[0.28em] inline-block overflow-hidden last:mr-0"
            >
              <span
                className="hero-enter-word inline-block motion-reduce:animate-none"
                style={{ animationDelay: `${0.2 + i * 0.09}s` }}
              >
                {word}
              </span>
            </span>
          ))}
        </h1>

        <p className="hero-enter hero-enter-copy mx-auto mt-5 max-w-xl text-base text-paper-on-dark/78 motion-reduce:animate-none sm:text-lg">
          {site.heroSupport}
        </p>

        <div className="hero-enter hero-enter-cta mt-10 flex w-full max-w-md flex-col gap-3 motion-reduce:animate-none sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/get-involved"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-spark-coral px-6 py-3 text-base font-semibold text-ink shadow-[0_0_36px_rgba(255,107,91,0.35)] transition hover:brightness-110"
          >
            Get Involved
          </Link>
          <Link
            href="/kindness-always"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-on-dark px-6 py-3 text-base font-semibold text-paper-on-dark transition hover:bg-white/10"
          >
            Leave a Kindness
          </Link>
        </div>
      </div>
    </section>
  );
}
