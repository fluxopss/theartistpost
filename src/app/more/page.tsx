"use client";

import Link from "next/link";
import { links, moreMenu, site } from "@/content/site";

export default function MorePage() {
  const socialEntries = Object.entries(links.social) as Array<[string, string]>;

  return (
    <div className="px-4 py-6">
      <h1 className="display text-3xl text-ink">More</h1>
      <p className="mt-1 text-sm text-paper-muted">{site.legalName}</p>

      <ul className="mt-6 space-y-2">
        {moreMenu.map((item) => {
          const className =
            "flex items-center justify-between rounded-xl border border-line bg-surface-muted px-4 py-4 active:scale-[0.98] transition";
          const body = (
            <>
              <span>
                <span className="block font-semibold text-ink">
                  {item.label}
                </span>
                <span className="block text-xs text-paper-muted">
                  {item.description}
                </span>
              </span>
              <span className="text-paper-muted" aria-hidden>
                →
              </span>
            </>
          );

          if ("external" in item && item.external) {
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  target={
                    item.href.startsWith("mailto:") ? undefined : "_blank"
                  }
                  rel={
                    item.href.startsWith("mailto:") ? undefined : "noreferrer"
                  }
                  className={className}
                >
                  {body}
                </a>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link href={item.href} className={className}>
                {body}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper-muted">
          Social
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {socialEntries.map(([name, href]) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold capitalize text-ink"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
