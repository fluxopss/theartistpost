"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HeartHandshake, Menu, X } from "lucide-react";
import { assets, navMarketing, site } from "@/content/site";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonLink } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import { TrackClick } from "@/components/TrackClick";

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-line bg-ink-glass backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-[var(--nav-height)] max-w-[var(--content-max)] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Home">
            <Image
              src={assets.logo3d}
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            />
            <span className="display hidden text-base text-paper sm:block md:text-lg">
              {site.mark}
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-0.5 xl:flex"
          >
            {navMarketing.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-accent-soft text-spark-teal"
                      : "text-paper-muted hover:text-paper",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <TrackClick event="cta_donate" payload={{ source: "nav" }}>
            <ButtonLink
              href="/donate"
              size="sm"
              variant="secondary"
              className="gap-1.5 rounded-full !bg-spark-coral !text-ink hover:brightness-110"
            >
                <HeartHandshake className="h-4 w-4" aria-hidden />
                <span className="max-[420px]:sr-only">Donate</span>
              </ButtonLink>
            </TrackClick>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-glass text-paper xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-[55] flex flex-col bg-ink/95 backdrop-blur-xl nav-sheet-in xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex h-[var(--nav-height)] items-center justify-between px-4">
            <span className="display text-lg text-paper-on-dark">
              {site.mark}
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-on-dark text-paper-on-dark"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="px-4 pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-gold">
            Pick a room
          </p>
          <nav className="tap-nav-board" aria-label="Mobile">
            {[...navMarketing, { href: "/more", label: "Studio" }].map(
              (link, index) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                const tilt = ["-1.4deg", "1.2deg", "-0.6deg", "1.5deg"][
                  index % 4
                ];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="tap-nav-card"
                    style={{ ["--tilt" as string]: tilt }}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              },
            )}
            <TrackClick event="cta_donate" payload={{ source: "nav-mobile" }}>
              <ButtonLink
                href="/donate"
                className="col-span-2 mt-1 w-full rounded-full !bg-spark-coral !text-ink"
                size="lg"
              >
                Donate
              </ButtonLink>
            </TrackClick>
          </nav>
        </div>
      ) : null}
    </>
  );
}
