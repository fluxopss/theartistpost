"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { assets, links, site } from "@/content/site";

export function TopBar() {
  const pathname = usePathname();
  const hideOnImmersive = pathname === "/";

  if (hideOnImmersive) return null;

  return (
    <header className="sticky top-0 z-40 flex h-[var(--nav-height)] items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src={assets.logo}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
        <span className="display text-sm text-ink">{site.name}</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/create"
          className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Create
        </Link>
        <a
          href={links.donate}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper-on-dark"
        >
          Donate
        </a>
      </div>
    </header>
  );
}
