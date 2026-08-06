import Image from "next/image";
import Link from "next/link";
import { assets, links, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";

const socialEntries = Object.entries(links.social) as Array<
  [keyof typeof links.social, string]
>;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-muted">
      <div className="mx-auto grid max-w-[var(--content-max)] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src={assets.logo}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <p className="display text-lg text-ink">{site.legalName}</p>
          </div>
          <p className="mt-3 max-w-sm text-sm text-paper-muted">
            {site.tagline}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={links.donate} external size="sm">
              Donate
            </ButtonLink>
            <ButtonLink
              href={`mailto:${site.email}`}
              size="sm"
              variant="outline"
            >
              Email
            </ButtonLink>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper-muted">
            Visit
          </p>
          <p className="mt-3 text-sm text-ink">{site.address.full}</p>
          <p className="mt-2 text-sm text-paper-muted">
            <a href={`tel:${site.phoneTel}`} className="hover:underline">
              {site.phone}
            </a>
          </p>
          <p className="mt-1 text-sm text-paper-muted">
            <a href={`mailto:${site.email}`} className="hover:underline">
              {site.email}
            </a>
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper-muted">
            Connect
          </p>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm capitalize text-ink">
            {socialEntries.map(([key, href]) => (
              <li key={key}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {key === "x" ? "X" : key}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link
              href="/supporters"
              className="font-medium text-ink hover:underline"
            >
              Supporters
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
