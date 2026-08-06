import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy, links } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Artist Schedule",
  description: copy.schedule.supportLine,
};

export default function ArtistSchedulePage() {
  return (
    <div className="section-dark min-h-full">
      <div className="px-4 pb-4 pt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
          {copy.schedule.venue}
        </p>
        <h1 className="display mt-2 text-3xl text-paper-on-dark">
          {copy.schedule.title}
        </h1>
        <p className="mt-2 text-sm text-paper-on-dark/75">
          {copy.schedule.supportLine}
        </p>
      </div>

      <PageShell className="space-y-4 !bg-transparent pt-0">
        <div className="overflow-hidden rounded-2xl border border-line-on-dark bg-ink-elevated">
          <div className="relative aspect-[16/10]">
            <Image
              src={assets.comingSoon}
              alt=""
              fill
              className="object-cover opacity-80"
              sizes="400px"
            />
          </div>
          <div className="p-4">
            <h2 className="display text-xl text-paper-on-dark">
              {copy.schedule.showcaseTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold text-spark-coral">
              {copy.schedule.status}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-line-on-dark bg-ink-elevated p-4">
          <h2 className="display text-lg text-paper-on-dark">
            {copy.schedule.ready}
          </h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-ink/50 p-3">
              <p className="text-sm font-semibold text-paper-on-dark">
                {copy.schedule.step1}
              </p>
              <ButtonLink
                href={links.artistAgreement}
                external
                variant="secondary"
                className="mt-3 w-full"
              >
                {copy.schedule.step1Cta}
              </ButtonLink>
            </div>
            <div className="rounded-xl bg-ink/50 p-3">
              <p className="text-xs text-paper-on-dark/70">
                {copy.schedule.step2Lead}
              </p>
              <p className="mt-1 text-sm font-semibold text-paper-on-dark">
                {copy.schedule.step2}
              </p>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
