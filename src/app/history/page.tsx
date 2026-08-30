import type { Metadata } from "next";
import Image from "next/image";
import { history, historyMetaDescription } from "@/content/history";
import { assets, site } from "@/content/site";
import { AboutHistory } from "@/features/about/AboutHistory";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: history.title,
  description: historyMetaDescription,
  openGraph: {
    title: history.title,
    description: historyMetaDescription,
    images: [assets.logo3d],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.logo3d],
  },
};

export default function HistoryPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-28 sm:px-6">
        <div className="logo-history-hero" aria-hidden />
        <div className="relative mx-auto flex max-w-[var(--content-max)] flex-col items-center text-center">
          <div className="logo-history-mark">
            <Image
              src={assets.logo3d}
              alt={site.mark}
              width={420}
              height={426}
              priority
              className="h-auto w-[min(18rem,70vw)] object-contain"
            />
          </div>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            {history.foundedLabel}
          </p>
          <h1 className="display mt-3 text-4xl text-paper sm:text-6xl">
            {history.title}
          </h1>
        </div>
      </section>

      <PageShell className="space-y-12">
        <AboutHistory heading="lead-only" />
        <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
          <ButtonLink
            href="/about"
            variant="outline"
            className="rounded-full"
          >
            About the house
          </ButtonLink>
          <ButtonLink href="/get-involved" className="rounded-full !bg-spark-coral !text-ink">
            Get Involved
          </ButtonLink>
        </div>
      </PageShell>
    </>
  );
}
