"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { assets, copy, links } from "@/content/site";
import type { ContentChapter } from "@/lib/content";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { SectionReveal } from "@/components/SectionReveal";
import { Chip } from "@/design-system/primitives/Chip";
import { Card } from "@/design-system/primitives/Card";

const STATUS_LABEL: Record<ContentChapter["status"], string> = {
  active: "Active",
  forming: "Forming",
  planned: "Planned",
};

export function SupportersExperience({
  chapters,
}: {
  chapters: ContentChapter[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ContentChapter["status"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters.filter((c) => {
      const statusOk = status === "all" || c.status === status;
      const queryOk =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.city?.toLowerCase().includes(q) ?? false);
      return statusOk && queryOk;
    });
  }, [chapters, query, status]);

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
        <SectionReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search chapters</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or state…"
              className="min-h-11 w-full rounded-full border border-line bg-surface-glass py-2.5 pl-10 pr-4 text-sm outline-none focus:border-spark-teal"
            />
          </label>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Filter by chapter status"
          >
            {(["all", "active", "forming", "planned"] as const).map((s) => (
              <Chip
                key={s}
                label={s === "all" ? "All" : STATUS_LABEL[s]}
                active={status === s}
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
              />
            ))}
          </div>
        </SectionReveal>

        <SectionReveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((chapter, i) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="h-full p-5" interactive>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-teal">
                    {STATUS_LABEL[chapter.status]} · {chapter.stateCode}
                  </p>
                  <h2 className="display mt-2 text-2xl text-paper">
                    {chapter.name}
                  </h2>
                  {chapter.city ? (
                    <p className="mt-1 text-xs text-paper-muted">{chapter.city}</p>
                  ) : null}
                  <p className="mt-3 text-sm text-paper-muted">{chapter.summary}</p>
                </Card>
              </motion.div>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="mt-8 text-center text-sm text-paper-muted">
              No chapters match that search.
            </p>
          ) : null}
        </SectionReveal>

        <SectionReveal className="relative aspect-[21/9] overflow-hidden rounded-3xl border border-line">
          <Image
            src={assets.supportersMap}
            alt=""
            fill
            className="object-cover opacity-70"
            sizes="(max-width: 1024px) 100vw, 72rem"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
              Nationwide vision
            </p>
            <p className="mt-2 max-w-xl text-sm text-paper-on-dark/85">
              Atmospheric brand map — chapter details live in the cards above.
              Regions noted in our legal copy: Oklahoma, Idaho, Nevada,
              Tennessee, Washington, Florida, and Texas.
            </p>
          </div>
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
            magnetic
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
          <p className="text-sm text-paper-muted">{copy.supporters.legalNote}</p>
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
