import type { Metadata } from "next";
import Image from "next/image";
import { assets, copy, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Kindness Always",
  description: copy.kindness.body,
};

export default function KindnessAlwaysPage() {
  return (
    <div className="relative pb-20">
      <PageShell>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-teal">
          Merch
        </p>
        <h1 className="display mt-1 text-3xl text-ink">
          {copy.kindness.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-muted">
          {copy.kindness.body}
        </p>

        <div className="mt-5 flex items-center gap-4">
          <Image
            src={assets.kindnessTrademark}
            alt="Kindness Always"
            width={72}
            height={72}
            className="h-16 w-16 object-contain"
          />
          <Image
            src={assets.loveAll}
            alt="Love All"
            width={120}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </div>

        <p className="mt-5 text-sm text-paper-muted">
          {copy.kindness.merchBody}
        </p>
        <p className="mt-3 text-sm font-semibold text-ink">
          {copy.kindness.orderLine}:{" "}
          <a href={`tel:${site.phoneTel}`} className="underline">
            {site.phone}
          </a>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {assets.merch.map((src) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-2xl border border-line"
            >
              <Image
                src={src}
                alt="Merch"
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
          ))}
        </div>
      </PageShell>

      <div
        className="fixed inset-x-0 z-40 mx-auto w-full max-w-[var(--app-frame-max)] border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md md:left-1/2 md:-translate-x-1/2"
        style={{
          bottom: "calc(var(--tab-bar-height) + var(--safe-bottom))",
        }}
      >
        <ButtonLink href={links.merch} external className="w-full" size="lg">
          {copy.kindness.buyCta}
        </ButtonLink>
      </div>
    </div>
  );
}
