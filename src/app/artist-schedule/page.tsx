import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy } from "@/content/site";
import { PageShell } from "@/shared/ui/PageShell";
import { ScheduleView } from "@/components/ScheduleView";

export const metadata: Metadata = {
  title: "Artist Schedule",
  description: copy.schedule.supportLine,
};

export default function ArtistSchedulePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 -z-10">
          <Image
            src={assets.comingSoon}
            alt=""
            fill
            className="object-cover opacity-25"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 to-surface" />
        </div>
        <PageShell className="!pb-10 !pt-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
            {copy.schedule.venue}
          </p>
          <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
            {copy.schedule.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-paper-muted sm:text-base">
            {copy.schedule.status}
          </p>
        </PageShell>
      </section>

      <PageShell className="!pt-8">
        <h2 className="display mb-6 text-2xl text-paper">
          {copy.schedule.showcaseTitle}
        </h2>
        <ScheduleView />
      </PageShell>
    </>
  );
}
