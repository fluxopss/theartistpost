import Image from "next/image";
import { assets, copy, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { SectionReveal } from "@/components/SectionReveal";

export function AboutSupport() {
  return (
    <SectionReveal className="grid gap-6 lg:grid-cols-2 lg:items-center">
      <div className="overflow-hidden rounded-3xl border border-line bg-paper p-3 sm:p-5">
        <Image
          src={assets.donations}
          alt="Donations appreciated — toward a permanent home for art"
          width={900}
          height={1100}
          className="h-auto w-full object-contain"
        />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
          Support the mission
        </p>
        <h2 className="display mt-2 text-3xl text-paper sm:text-4xl">
          {copy.about.supportTitle}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-paper-muted sm:text-base">
          {copy.about.supportBody}
        </p>
        <p className="mt-4 text-sm text-paper-muted">
          PayPal and Venmo {site.venmo} are live.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={links.donate}
            external
            className="rounded-full !bg-spark-coral !text-ink"
          >
            {copy.about.donateCta}
          </ButtonLink>
          <ButtonLink
            href={links.merch}
            external
            variant="outline"
            className="rounded-full"
          >
            Shop merch
          </ButtonLink>
        </div>
      </div>
    </SectionReveal>
  );
}
