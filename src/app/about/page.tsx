import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { SectionReveal } from "@/components/SectionReveal";

export const metadata: Metadata = {
  title: "About",
  description: site.aboutMetaDescription,
  openGraph: {
    title: "About",
    description: site.aboutMetaDescription,
    images: [assets.aboutHero],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.aboutHero],
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate min-h-[42vh] overflow-hidden">
        <Image
          src={assets.aboutHero}
          alt=""
          fill
          className="object-cover opacity-45"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-ink/60 to-ink/30" />
        <div className="relative mx-auto flex max-w-[var(--content-max)] flex-col justify-end px-4 pb-12 pt-28 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            Support Local Artists
          </p>
          <h1 className="display mt-3 text-4xl text-paper-on-dark sm:text-5xl">
            {copy.about.title}
          </h1>
        </div>
      </section>

      <PageShell className="space-y-8">
        <SectionReveal>
          <p className="max-w-3xl text-base leading-relaxed text-paper-muted sm:text-lg">
            {copy.about.mission}
          </p>
          <p className="mt-6 text-base font-semibold text-paper">
            {site.nonprofitLine}
          </p>
          <p className="mt-2 text-sm text-paper-muted">{copy.about.proceeds}</p>
        </SectionReveal>

        <SectionReveal className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-glass p-5">
            <p className="text-xs text-paper-muted">EIN</p>
            <p className="mt-1 font-semibold text-paper">{site.ein}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-glass p-5">
            <p className="text-xs text-paper-muted">Venmo</p>
            <p className="mt-1 font-semibold text-paper">{site.venmo}</p>
          </div>
        </SectionReveal>

        <SectionReveal className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={links.donate}
            external
            className="rounded-full !bg-spark-coral !text-ink sm:min-w-[180px]"
          >
            {copy.about.donateCta}
          </ButtonLink>
          <ButtonLink
            href={links.social.instagram}
            external
            variant="outline"
            className="rounded-full"
          >
            {copy.about.instagramCta}
          </ButtonLink>
        </SectionReveal>

        <SectionReveal className="border-t border-line pt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
            {copy.about.partnerLabel}
          </p>
          <a
            href={links.partnerSubCulture}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block"
          >
            <Image
              src={assets.partnerSubCulture}
              alt="SubCulture"
              width={180}
              height={64}
              className="h-12 w-auto object-contain"
            />
          </a>
        </SectionReveal>
      </PageShell>
    </>
  );
}
