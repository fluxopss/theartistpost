import Image from "next/image";
import { assets, copy, site } from "@/content/site";
import { SectionReveal } from "@/components/SectionReveal";

export function AboutHacienda() {
  return (
    <SectionReveal className="grid gap-6 overflow-hidden rounded-3xl border border-line bg-surface-glass lg:grid-cols-2 lg:items-stretch">
      <div className="relative aspect-[16/11] lg:aspect-auto lg:min-h-[280px]">
        <Image
          src={assets.hacienda}
          alt="The Hacienda on Clematis Street, West Palm Beach"
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div className="flex flex-col justify-center p-5 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
          {site.address.full}
        </p>
        <h2 className="display mt-2 text-3xl text-paper sm:text-4xl">
          {copy.about.liveRoomTitle}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-paper-muted sm:text-base">
          {copy.about.liveRoomBody}
        </p>
      </div>
    </SectionReveal>
  );
}
