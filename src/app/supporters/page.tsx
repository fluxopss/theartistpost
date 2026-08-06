import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy, links } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Supporters",
  description: copy.supporters.expansion,
};

export default function SupportersPage() {
  return (
    <>
      <div className="section-dark px-4 py-6">
        <h1 className="display text-3xl text-paper-on-dark">
          {copy.supporters.title}
        </h1>
        <p className="mt-2 text-sm text-paper-on-dark/75">
          {copy.supporters.findTitle}
        </p>
      </div>

      <PageShell className="space-y-5">
        <p className="text-sm leading-relaxed text-paper-muted">
          {copy.supporters.expansion}
        </p>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
          <Image
            src={assets.supportersMap}
            alt="Chapter map"
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>

        <div className="rounded-2xl border border-line bg-surface-muted p-4">
          <h2 className="display text-xl text-ink">
            {copy.supporters.launchTitle}
          </h2>
          <p className="mt-2 font-semibold text-ink">
            {copy.supporters.wantTitle}
          </p>
          <p className="mt-2 text-sm text-paper-muted">
            {copy.supporters.applyBody}
          </p>
          <ButtonLink
            href={`mailto:Robbie@theartistpost.org?subject=${encodeURIComponent("Chapter Application — The Artist Post")}`}
            className="mt-4 w-full"
          >
            {copy.supporters.applyCta}
          </ButtonLink>
          <p className="mt-3 text-xs text-paper-muted">
            Artists: start with the{" "}
            <a
              href={links.artistAgreement}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink underline"
            >
              artist agreement
            </a>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-paper-muted">
            {copy.supporters.legalNote}
          </p>
          <a
            href="/legal/IRS Final Letter Oklahoma 2020.pdf"
            className="mt-3 inline-block text-sm font-semibold text-ink underline"
            target="_blank"
            rel="noreferrer"
          >
            IRS Final Letter — Oklahoma 2020
          </a>
        </div>
      </PageShell>
    </>
  );
}
