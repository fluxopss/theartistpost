import Image from "next/image";
import Link from "next/link";
import { assets, copy, site } from "@/content/site";
import { HouseDoors } from "./HouseDoors";
import { LogoIntro } from "./LogoIntro";

/** Server-rendered house entrance — original TAP voice sitting with the five doors. */
export function HouseHero() {
  const words = copy.house.headline.split(" ");

  return (
    <section className="house-entrance" aria-labelledby="house-headline">
      <LogoIntro />
      <div className="house-entrance__stage">
        <Image
          src={assets.cover}
          alt=""
          fill
          priority
          unoptimized
          fetchPriority="high"
          className="object-cover object-[center_30%]"
          sizes="100vw"
        />
        <div className="house-entrance__veil" aria-hidden />
        <div className="house-entrance__grain" aria-hidden />
        <div className="hero-mesh house-entrance__mesh" aria-hidden />
      </div>

      <div className="house-entrance__inner">
        <header className="house-entrance__intro">
          <div className="hero-enter hero-enter-logo motion-reduce:animate-none">
            <Image
              src={assets.logo3d}
              alt={site.mark}
              width={280}
              height={284}
              priority
              className="house-entrance__mark"
            />
          </div>
          <p className="house-entrance__kicker hero-enter hero-enter-kicker motion-reduce:animate-none">
            {site.mark}
          </p>
          <p className="house-entrance__hub">{copy.house.hub}</p>
          <h1 id="house-headline" className="house-entrance__headline display">
            {words.map((word, i) => (
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
          <p className="house-entrance__support hero-enter hero-enter-copy motion-reduce:animate-none">
            {site.heroSupport}
          </p>
          <div className="house-entrance__ctas hero-enter hero-enter-cta motion-reduce:animate-none">
            <Link href="/get-involved" className="house-cta house-cta--primary">
              {copy.house.ctaInvolve}
            </Link>
            <Link
              href="/kindness-always"
              className="house-cta house-cta--ghost"
            >
              {copy.house.ctaKindness}
            </Link>
          </div>
        </header>

        <div className="house-entrance__doors">
          <p className="house-entrance__doors-kicker">{copy.house.kicker}</p>
          <p className="house-entrance__doors-lead">{copy.involve.lead}</p>
          <HouseDoors />
        </div>

        <div className="house-entrance__floor">
          <Link href="/explore" className="house-wall-opening">
            <span className="house-wall-opening__frame">
              <Image
                src={assets.hacienda}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 420px"
              />
              <span className="house-wall-opening__shade" />
            </span>
            <span className="house-wall-opening__copy">
              <span className="house-wall-opening__kicker">The Wall</span>
              <span className="house-wall-opening__title display">
                {copy.house.wallCta}
              </span>
              <span className="house-wall-opening__hint">
                {copy.house.wallHint}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
