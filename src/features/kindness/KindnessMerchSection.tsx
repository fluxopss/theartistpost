"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { assets, copy, links, site } from "@/content/site";
import { ButtonLink } from "@/design-system/primitives/Button";
import {
  Lightbox,
  type LightboxItem,
} from "@/design-system/primitives/Lightbox";
import { SectionReveal } from "@/components/SectionReveal";

export function KindnessMerchSection() {
  const items: LightboxItem[] = useMemo(
    () =>
      assets.merchPhotos.map((src) => ({
        src,
        alt: "Kindness Always merch",
        title: "Kindness Always merch",
      })),
    [],
  );
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="kindness-merch-heading"
      className="mt-16 border-t border-line pt-14"
    >
      <SectionReveal>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
          Wear the message
        </p>
        <h2
          id="kindness-merch-heading"
          className="display mt-2 text-3xl text-paper sm:text-4xl"
        >
          Kindness Always merch
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-paper-muted">
          {copy.kindness.body}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-paper-muted">
          {copy.kindness.merchBody}
        </p>
        <p className="mt-4 text-sm font-semibold text-paper">
          {copy.kindness.orderLine}
        </p>
        <a
          href={`tel:${site.phoneTel}`}
          className="mt-2 inline-flex min-h-11 items-center text-base font-semibold text-paper-on-dark underline decoration-spark-teal underline-offset-4"
        >
          {site.phone}
        </a>
      </SectionReveal>

      <SectionReveal className="mt-10">
        <div className="overflow-hidden rounded-3xl border border-line bg-paper p-4 sm:p-8">
          <Image
            src={assets.merchLockup}
            alt="The Artist Post®, Kindness Always®, and Love All merch"
            width={1200}
            height={480}
            className="mx-auto h-auto w-full max-w-4xl object-contain"
          />
        </div>
      </SectionReveal>

      <SectionReveal className="mt-6 grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <button
            key={item.src}
            type="button"
            className="relative aspect-square min-h-11 overflow-hidden rounded-2xl border border-line transition hover:border-spark-teal"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            aria-label={`Open merch image ${i + 1} of ${items.length}`}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
          </button>
        ))}
      </SectionReveal>

      <SectionReveal className="mt-10">
        <ButtonLink
          href={links.merch}
          external
          size="lg"
          magnetic
          className="rounded-full !bg-spark-coral !text-ink"
        >
          {copy.kindness.buyCta}
        </ButtonLink>
      </SectionReveal>

      <Lightbox
        open={open}
        onOpenChange={setOpen}
        items={items}
        index={index}
        onIndexChange={setIndex}
      />
    </section>
  );
}
