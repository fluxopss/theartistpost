import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "About",
  description: site.aboutMetaDescription,
};

export default function AboutPage() {
  return (
    <>
      <div className="relative h-44 overflow-hidden section-dark">
        <Image
          src={assets.aboutHero}
          alt=""
          fill
          className="object-cover opacity-45"
          priority
          sizes="430px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-on-dark/70">
            Support Local Artists
          </p>
          <h1 className="display mt-1 text-3xl text-paper-on-dark">
            {copy.about.title}
          </h1>
        </div>
      </div>

      <PageShell className="space-y-4">
        <p className="text-sm leading-relaxed text-paper-muted">
          {copy.about.mission}
        </p>
        <p className="text-sm font-semibold text-ink">{site.nonprofitLine}</p>
        <p className="text-sm text-paper-muted">{copy.about.proceeds}</p>

        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface-muted p-4 text-sm">
          <div>
            <p className="text-xs text-paper-muted">EIN</p>
            <p className="font-semibold text-ink">{site.ein}</p>
          </div>
          <div>
            <p className="text-xs text-paper-muted">Venmo</p>
            <p className="font-semibold text-ink">{site.venmo}</p>
          </div>
        </div>

        <ButtonLink href={links.donate} external className="w-full">
          {copy.about.donateCta}
        </ButtonLink>
        <ButtonLink
          href={links.social.instagram}
          external
          variant="outline"
          className="w-full"
        >
          {copy.about.instagramCta}
        </ButtonLink>

        <div className="border-t border-line pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-muted">
            {copy.about.partnerLabel}
          </p>
          <a
            href={links.partnerSubCulture}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block"
          >
            <Image
              src={assets.partnerSubCulture}
              alt="SubCulture"
              width={180}
              height={64}
              className="h-12 w-auto object-contain"
            />
          </a>
        </div>
      </PageShell>
    </>
  );
}
