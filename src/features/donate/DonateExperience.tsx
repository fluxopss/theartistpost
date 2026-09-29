import Image from "next/image";
import {
  assets,
  copy,
  links,
  site,
} from "@/content/site";
import { whatThisFunds } from "@/features/participate/content";
import { DonorStewardForm } from "@/features/donate/DonorStewardForm";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { SectionReveal } from "@/components/SectionReveal";
import { TrackClick } from "@/components/TrackClick";

const venmoUrl = `https://venmo.com/u/${site.venmo.replace(/^@/, "")}`;

/** Dedicated donate surface: brand, why, PayPal rails, paths, transparency. */
export function DonateExperience() {
  return (
    <>
      <section className="relative isolate min-h-[52vh] overflow-hidden">
        <Image
          src={assets.donations}
          alt=""
          fill
          className="object-cover object-center opacity-40"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-ink/70 to-ink/40" />
        <div className="relative mx-auto flex max-w-[var(--content-max)] flex-col justify-end px-4 pb-14 pt-32 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            {site.mark}
          </p>
          <h1 className="display mt-3 max-w-3xl text-4xl text-paper-on-dark sm:text-5xl md:text-6xl">
            {copy.donate.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-paper-on-dark/80 sm:text-lg">
            {copy.donate.lead}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackClick event="cta_donate" payload={{ source: "donate-hero", cadence: "one_time" }}>
              <ButtonLink
                href={links.donate}
                external
                size="lg"
                className="rounded-full !bg-spark-coral !text-ink"
              >
                {copy.donate.onceCta}
              </ButtonLink>
            </TrackClick>
            <TrackClick event="cta_donate" payload={{ source: "donate-hero", cadence: "monthly" }}>
              <ButtonLink
                href={links.donateMonthly}
                external
                size="lg"
                variant="onDark"
                className="rounded-full"
              >
                {copy.donate.monthlyCta}
              </ButtonLink>
            </TrackClick>
          </div>
          <p className="mt-4 max-w-lg text-xs leading-relaxed text-paper-on-dark/65">
            {copy.donate.monthlyNote}
          </p>
        </div>
      </section>

      <PageShell className="space-y-16">
        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
            {copy.donate.fundsTitle}
          </p>
          <ul className="mt-6 grid gap-8 sm:grid-cols-2">
            {whatThisFunds.map((item) => (
              <li key={item.id} className="border-l-2 border-spark-gold/50 pl-4">
                <h2 className="display text-xl text-paper sm:text-2xl">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-paper-muted sm:text-base">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </SectionReveal>

        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-teal">
            {copy.donate.pathsTitle}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            {copy.donate.pathsLead}
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-3">
            <div>
              <h2 className="display text-2xl text-paper">{copy.donate.donatePathTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-paper-muted">
                {copy.donate.donatePathBody}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <TrackClick event="cta_donate" payload={{ source: "donate-paths", cadence: "one_time" }}>
                  <ButtonLink
                    href={links.donate}
                    external
                    className="rounded-full !bg-spark-coral !text-ink"
                  >
                    {copy.donate.onceCta}
                  </ButtonLink>
                </TrackClick>
                <TrackClick event="cta_donate" payload={{ source: "donate-paths", cadence: "monthly" }}>
                  <ButtonLink
                    href={links.donateMonthly}
                    external
                    variant="outline"
                    className="rounded-full"
                  >
                    {copy.donate.monthlyCta}
                  </ButtonLink>
                </TrackClick>
                <ButtonLink
                  href={venmoUrl}
                  external
                  variant="ghost"
                  className="rounded-full"
                >
                  {copy.donate.venmoCta} {site.venmo}
                </ButtonLink>
              </div>
            </div>
            <div>
              <h2 className="display text-2xl text-paper">{copy.donate.sponsorPathTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-paper-muted">
                {copy.donate.sponsorPathBody}
              </p>
              <ButtonLink
                href="/get-involved?door=partner"
                variant="outline"
                className="mt-5 rounded-full"
              >
                {copy.donate.sponsorCta}
              </ButtonLink>
            </div>
            <div>
              <h2 className="display text-2xl text-paper">{copy.donate.shopPathTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-paper-muted">
                {copy.donate.shopPathBody}
              </p>
              <ButtonLink
                href={links.merch}
                external
                variant="outline"
                className="mt-5 rounded-full"
              >
                {copy.donate.shopCta}
              </ButtonLink>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="border-t border-line pt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-violet">
            {copy.donate.transparencyTitle}
          </p>
          <h2 className="display mt-2 text-2xl text-paper sm:text-3xl">
            {site.legalName}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            {copy.donate.transparencyBody}
          </p>
          <p className="mt-6 text-base font-semibold text-paper">{site.nonprofitLine}</p>
          <p className="mt-2 text-sm text-paper-muted">
            EIN {site.ein}
            <span className="mx-2 text-line-strong" aria-hidden>
              ·
            </span>
            {site.address.full}
          </p>
          <p className="mt-4 text-sm text-paper-muted">{copy.about.proceeds}</p>
        </SectionReveal>

        <SectionReveal className="border-t border-line pt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
            {copy.donate.stewardTitle}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-muted sm:text-base">
            {copy.donate.stewardLead}
          </p>
          <div className="mt-6 max-w-xl">
            <DonorStewardForm />
          </div>
        </SectionReveal>
      </PageShell>
    </>
  );
}
