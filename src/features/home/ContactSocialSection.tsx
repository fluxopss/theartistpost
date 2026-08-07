"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { copy, site } from "@/content/site";
import { OpenStatus } from "@/components/OpenStatus";
import { SectionReveal } from "@/components/SectionReveal";
import { SubscribeForm } from "@/components/SubscribeForm";

const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(site.address.full)}&output=embed`;

export function ContactSocialSection() {
  return (
    <SectionReveal
      className="mx-auto max-w-[var(--content-max)] px-4 pb-20 pt-8 sm:px-6 sm:pb-28"
      id="contact"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface-glass p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            Visit
          </p>
          <h2 className="display mt-2 text-3xl text-paper">
            {copy.home.contactTitle}
          </h2>
          <p className="mt-2 text-sm text-paper-muted">
            {copy.home.contactLead}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper-muted">
            {copy.home.contactBody}
          </p>

          <div className="mt-6">
            <OpenStatus />
          </div>

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-spark-teal" aria-hidden />
              <a
                href={site.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-paper hover:text-spark-teal"
              >
                {site.address.full}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-spark-teal" aria-hidden />
              <a
                href={`tel:${site.phoneTel}`}
                className="text-paper hover:text-spark-teal"
              >
                {site.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-spark-teal" aria-hidden />
              <a
                href={`mailto:${site.email}`}
                className="text-paper hover:text-spark-teal"
              >
                {site.email}
              </a>
            </li>
          </ul>

          <div className="mt-6 overflow-hidden rounded-2xl border border-line">
            <iframe
              title="Map to The Artist Post at Hacienda"
              src={mapsEmbed}
              className="h-56 w-full grayscale-[30%] contrast-125"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-ink-elevated p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
            Stay close
          </p>
          <h2 className="display mt-2 text-3xl text-paper">
            {copy.home.subscribeTitle}
          </h2>
          <p className="mt-3 text-sm text-paper-muted">
            {copy.home.subscribeBody}
          </p>
          <SubscribeForm className="mt-8" />
          <p className="mt-6 text-xs text-paper-muted">
            {copy.home.dropLine}{" "}
            <a
              href={`mailto:${site.email}`}
              className="text-spark-teal hover:underline"
            >
              {site.email}
            </a>
          </p>
        </div>
      </div>
    </SectionReveal>
  );
}
