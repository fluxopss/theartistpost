import Image from "next/image";
import Link from "next/link";
import { assets, copy, site } from "@/content/site";
import { HouseDoors } from "./HouseDoors";
import { LogoIntro } from "./LogoIntro";

/** Server-rendered house entrance — LCP image stays CSS-free of Framer. */
export function HouseHero() {
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
      </div>

      <div className="house-entrance__inner">
        <header className="house-entrance__intro">
          <Image
            src={assets.logo3d}
            alt={site.mark}
            width={160}
            height={162}
            className="house-entrance__mark"
          />
          <p className="house-entrance__kicker">{site.mark}</p>
          <h1 id="house-headline" className="house-entrance__headline display">
            {copy.house.headline}
          </h1>
          <p className="house-entrance__support">{site.heroSupport}</p>
          <p className="house-entrance__mantra">{copy.house.floorLine}</p>
        </header>

        <p className="house-entrance__doors-kicker">{copy.house.kicker}</p>
        <HouseDoors />

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
