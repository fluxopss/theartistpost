import Link from "next/link";
import { copy } from "@/content/site";
import { InvolvePathRail } from "@/features/involve/InvolvePathRail";
import { SectionReveal } from "@/components/SectionReveal";

export function InvolveBridge() {
  return (
    <section
      aria-labelledby="involve-bridge-heading"
      className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20"
    >
      <SectionReveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-coral">
              {copy.involve.kicker}
            </p>
            <h2
              id="involve-bridge-heading"
              className="display mt-2 max-w-xl text-3xl text-paper sm:text-4xl"
            >
              Five doors. One house for art.
            </h2>
            <p className="mt-3 max-w-lg text-sm text-paper-muted sm:text-base">
              {copy.involve.lead}
            </p>
          </div>
          <Link
            href="/get-involved"
            className="inline-flex items-center justify-center rounded-full bg-spark-coral px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            {copy.involve.title}
          </Link>
        </div>
      </SectionReveal>
      <div className="mt-8">
        <InvolvePathRail />
      </div>
    </section>
  );
}
