"use client";

import Image from "next/image";
import { useState } from "react";
import { assets, copy, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { Lightbox, type LightboxItem } from "@/components/Lightbox";
import { SectionReveal } from "@/components/SectionReveal";

export function KindnessContent() {
  const [item, setItem] = useState<LightboxItem | null>(null);

  return (
    <>
      <SectionReveal>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-teal">
          Merch
        </p>
        <h1 className="display mt-2 text-4xl text-paper sm:text-5xl">
          {copy.kindness.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-paper-muted">
          {copy.kindness.body}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Image
            src={assets.kindnessTrademark}
            alt="Kindness Always"
            width={88}
            height={88}
            className="h-20 w-20 object-contain"
          />
          <Image
            src={assets.loveAll}
            alt="Love All"
            width={140}
            height={56}
            className="h-12 w-auto object-contain"
          />
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-paper-muted">
          {copy.kindness.merchBody}
        </p>
        <p className="mt-4 text-sm font-semibold text-paper">
          {copy.kindness.orderLine}:{" "}
          <a
            href={`tel:${site.phoneTel}`}
            className="text-spark-teal hover:underline"
          >
            {site.phone}
          </a>
        </p>
      </SectionReveal>

      <SectionReveal className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {assets.merch.map((src) => (
          <button
            key={src}
            type="button"
            className="relative aspect-square overflow-hidden rounded-2xl border border-line transition hover:border-spark-teal"
            onClick={() =>
              setItem({ src, alt: "Kindness Always merch", title: "Merch" })
            }
            aria-label="Open merch image"
          >
            <Image
              src={src}
              alt="Merch"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </button>
        ))}
      </SectionReveal>

      <SectionReveal className="mt-10">
        <ButtonLink
          href={links.merch}
          external
          size="lg"
          className="rounded-full !bg-spark-coral !text-ink"
        >
          {copy.kindness.buyCta}
        </ButtonLink>
      </SectionReveal>

      <Lightbox
        open={Boolean(item)}
        onOpenChange={(open) => !open && setItem(null)}
        item={item}
      />
    </>
  );
}
