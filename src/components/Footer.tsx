"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";
import { assets, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { TrackClick } from "@/components/TrackClick";

type SocialKey = keyof typeof links.social;

const socialLabels: Record<SocialKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
};

function SocialGlyph({ network }: { network: SocialKey }) {
  const common = "h-4 w-4";
  switch (network) {
    case "facebook":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.174 2.097 15.943 2 14.643 2 11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4z" />
        </svg>
      );
    case "instagram":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Zm5.35-8.55a1.16 1.16 0 1 1-2.32 0 1.16 1.16 0 0 1 2.32 0ZM12 2.5c-2.45 0-2.76.01-3.72.05a5.97 5.97 0 0 0-1.98.38 3.99 3.99 0 0 0-1.44.94 3.99 3.99 0 0 0-.94 1.44 5.97 5.97 0 0 0-.38 1.98C3.51 8.24 3.5 8.55 3.5 11s.01 2.76.05 3.72c.03.72.15 1.4.38 1.98.2.53.5 1 .94 1.44.44.44.91.74 1.44.94.58.23 1.26.35 1.98.38.96.04 1.27.05 3.72.05s2.76-.01 3.72-.05c.72-.03 1.4-.15 1.98-.38a3.99 3.99 0 0 0 1.44-.94 3.99 3.99 0 0 0 .94-1.44c.23-.58.35-1.26.38-1.98.04-.96.05-1.27.05-3.72s-.01-2.76-.05-3.72a5.97 5.97 0 0 0-.38-1.98 3.99 3.99 0 0 0-.94-1.44 3.99 3.99 0 0 0-1.44-.94 5.97 5.97 0 0 0-1.98-.38C14.76 2.51 14.45 2.5 12 2.5Zm0 1.62c2.4 0 2.69.01 3.63.05.58.03 1.1.13 1.5.28.5.2.86.43 1.24.8.37.38.6.74.8 1.24.15.4.25.92.28 1.5.04.94.05 1.23.05 3.63s-.01 2.69-.05 3.63a4.4 4.4 0 0 1-.28 1.5 2.6 2.6 0 0 1-.8 1.24 2.6 2.6 0 0 1-1.24.8c-.4.15-.92.25-1.5.28-.94.04-1.23.05-3.63.05s-2.69-.01-3.63-.05a4.4 4.4 0 0 1-1.5-.28 2.6 2.6 0 0 1-1.24-.8 2.6 2.6 0 0 1-.8-1.24 4.4 4.4 0 0 1-.28-1.5c-.04-.94-.05-1.23-.05-3.63s.01-2.69.05-3.63c.03-.58.13-1.1.28-1.5.2-.5.43-.86.8-1.24.38-.37.74-.6 1.24-.8.4-.15.92-.25 1.5-.28.94-.04 1.23-.05 3.63-.05Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M6.94 6.5A2.1 2.1 0 1 1 6.93 2.3a2.1 2.1 0 0 1 .01 4.2ZM4.9 8.6h4.1V21H4.9V8.6Zm6.2 0h3.93v1.7h.06c.55-1.04 1.9-2.14 3.91-2.14 4.18 0 4.95 2.75 4.95 6.33V21h-4.1v-5.6c0-1.34-.02-3.06-1.86-3.06-1.87 0-2.15 1.46-2.15 2.96V21h-4.1V8.6Z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12.04 2C6.87 2 3.5 5.7 3.5 9.9c0 2.6 1.46 4.84 3.83 5.69.28.1.53-.1.61-.33.06-.16.18-.58.24-.76.08-.28.05-.38-.17-.63-.48-.57-.79-1.31-.79-2.36 0-3.04 2.28-5.76 5.94-5.76 3.24 0 5.02 1.98 5.02 4.63 0 3.48-1.54 5.72-3.83 5.72-1.26 0-2.21-1.04-1.9-2.32.36-1.53 1.07-3.18 1.07-4.29 0-.99-.53-1.81-1.63-1.81-1.29 0-2.33 1.34-2.33 3.13 0 1.14.39 1.91.39 1.91l-1.55 6.58c-.46 1.94-.07 4.32-.04 4.56.02.14.2.18.29.07.13-.16 1.76-2.17 2.31-4.17.16-.56.89-3.42.89-3.42.44.84 1.73 1.58 3.1 1.58 4.08 0 6.85-3.72 6.85-8.7C20.5 5.45 16.9 2 12.04 2Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .56.04.82.12v-3.4a6.22 6.22 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.5 6.34 6.34 0 0 0 9.49 21.8a6.34 6.34 0 0 0 6.34-6.34V8.68a8.16 8.16 0 0 0 4.76 1.52V6.84a4.85 4.85 0 0 1-1-.15Z" />
        </svg>
      );
    case "x":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.913L1.254 2.25H8.08l4.253 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.75 15.5v-7l6.25 3.5-6.25 3.5Z" />
        </svg>
      );
    default: {
      const _exhaustive: never = network;
      return _exhaustive;
    }
  }
}

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-line bg-ink-elevated/80">
      <div className="mx-auto grid max-w-[var(--content-max)] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src={assets.logo}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <p className="display text-xl text-paper">{site.mark}</p>
          </div>
          <p className="mt-1 text-xs text-paper-muted">{site.legalName}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper-muted">
            {site.tagline}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <TrackClick event="cta_donate" payload={{ source: "footer" }}>
            <ButtonLink
              href={links.donate}
              external
              size="sm"
              className="rounded-full !bg-spark-coral !text-[#020b1a]"
            >
              Donate
            </ButtonLink>
            </TrackClick>
            <ButtonLink
              href={`mailto:${site.email}`}
              size="sm"
              variant="outline"
              className="rounded-full"
            >
              Email
            </ButtonLink>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spark-gold">
            Visit
          </p>
          <p className="mt-4 flex items-start gap-2 text-sm text-paper">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-spark-teal"
              aria-hidden
            />
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-spark-teal"
            >
              {site.address.full}
            </a>
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-paper-muted">
            <Phone className="h-4 w-4 text-spark-teal" aria-hidden />
            <a href={`tel:${site.phoneTel}`} className="hover:text-spark-teal">
              {site.phone}
            </a>
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-paper-muted">
            <Mail className="h-4 w-4 text-spark-teal" aria-hidden />
            <a href={`mailto:${site.email}`} className="hover:text-spark-teal">
              {site.email}
            </a>
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spark-gold">
            Connect
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {(Object.keys(links.social) as SocialKey[]).map((key) => (
              <li key={key}>
                <motion.a
                  href={links.social[key]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-glass text-paper transition hover:border-spark-teal hover:text-spark-teal"
                  aria-label={socialLabels[key]}
                  whileHover={{ y: -3, scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <SocialGlyph network={key} />
                </motion.a>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm">
            <Link
              href="/get-involved"
              className="text-paper hover:text-spark-teal"
            >
              Get Involved
            </Link>
          </p>
          <p className="mt-2 text-sm">
            <Link
              href="/supporters"
              className="text-paper hover:text-spark-teal"
            >
              Supporters & chapters
            </Link>
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/privacy" className="text-paper-muted hover:text-spark-teal">
              Privacy
            </Link>
            <Link href="/terms" className="text-paper-muted hover:text-spark-teal">
              Terms
            </Link>
            <Link href="/support" className="text-paper-muted hover:text-spark-teal">
              Support
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-paper-muted">
        {site.copyright}
      </div>
    </footer>
  );
}
