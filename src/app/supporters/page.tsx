import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy, links } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { SectionReveal } from "@/components/SectionReveal";

export const metadata: Metadata = {
  title: "Supporters",
  description: copy.supporters.expansion,
};

const regions = [
  "Oklahoma",
  "Idaho",
  "Nevada",
  "Tennessee",
  "Washington",
  "Florida",
  "Texas",
];

export default function SupportersPage() {
  return (
    <>
      <section className="border-b border-line bg-ink-elevated/50">
        <PageShell className="!pb-12 !pt-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
            {copy.supporters.findTitle}
          </p>
          <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
            {copy.supporters.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-paper-muted sm:text-base">
            {copy.supporters.expansion}
          </p>
        </PageShell>
      </section>

      <PageShell className="space-y-10">
        <SectionReveal className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-line">
          <Image
            src={assets.supportersMap}
            alt="Chapter map"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 72rem"
            priority
          />
        </SectionReveal>

        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-teal">
            Active regions
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {regions.map((r) => (
              <li
                key={r}
                className="rounded-full border border-line bg-surface-glass px-4 py-2 text-sm text-paper"
              >
                {r}
              </li>
            ))}
          </ul>
        </SectionReveal>

        <SectionReveal className="rounded-3xl border border-line bg-surface-glass p-6 sm:p-8">
          <h2 className="display text-2xl text-paper sm:text-3xl">
            {copy.supporters.launchTitle}
          </h2>
          <p className="mt-3 font-semibold text-spark-coral">
            {copy.supporters.wantTitle}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-paper-muted">
            {copy.supporters.applyBody}
          </p>
          <ButtonLink
            href={`mailto:Robbie@theartistpost.org?subject=${encodeURIComponent("Chapter Application — The Artist Post")}`}
            className="mt-6 rounded-full"
          >
            {copy.supporters.applyCta}
          </ButtonLink>
          <p className="mt-4 text-xs text-paper-muted">
            Artists: start with the{" "}
            <a
              href={links.artistAgreement}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-spark-teal underline"
            >
              artist agreement
            </a>
            .
          </p>
        </SectionReveal>

        <SectionReveal className="rounded-3xl border border-line p-6">
          <p className="text-sm text-paper-muted">
            {copy.supporters.legalNote}
          </p>
          <a
            href="/legal/IRS Final Letter Oklahoma 2020.pdf"
            className="mt-4 inline-block text-sm font-semibold text-spark-teal underline"
            target="_blank"
            rel="noreferrer"
          >
            IRS Final Letter — Oklahoma 2020
          </a>
        </SectionReveal>
      </PageShell>
    </>
  );
}
