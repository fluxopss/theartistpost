import Image from "next/image";
import { Navigation } from "lucide-react";
import { assets, copy, site } from "@/content/site";
import { SectionReveal } from "@/components/SectionReveal";

export function HaciendaShowcase() {
  return (
    <SectionReveal className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-24">
      <article className="grid overflow-hidden rounded-3xl border border-line bg-surface-glass md:grid-cols-2">
        <div className="relative aspect-[16/11] overflow-hidden md:aspect-auto md:min-h-[360px]">
          <Image
            src={assets.haciendaSm}
            alt="The Artist Post at The Hacienda"
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
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
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-spark-teal px-5 py-2.5 text-sm font-semibold !text-[#020b1a] shadow-[0_0_24px_rgba(46,196,182,0.25)] transition hover:brightness-110"
            >
              <Navigation className="h-4 w-4" aria-hidden />
              Get Directions
            </a>
            <a
              href="/about"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold text-paper transition hover:border-spark-teal hover:text-spark-teal"
            >
              About the mission
            </a>
          </div>
        </div>
      </article>
    </SectionReveal>
  );
}
