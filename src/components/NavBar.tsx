"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeartHandshake, Menu, X } from "lucide-react";
import { assets, links, navMarketing, site } from "@/content/site";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonLink } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

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
              src={assets.logo}
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 object-contain sm:h-11 sm:w-11"
              priority
            />
            <span className="display hidden text-base text-paper sm:block md:text-lg">
              {site.name}
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
            <ButtonLink
              href={links.donate}
              external
              size="sm"
              variant="secondary"
              className="gap-1.5 rounded-full !bg-spark-coral !text-ink hover:brightness-110"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden />
              Donate
            </ButtonLink>
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

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            className="fixed inset-0 z-[55] flex flex-col bg-ink/95 backdrop-blur-xl xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex h-[var(--nav-height)] items-center justify-between px-4">
              <span className="display text-lg text-paper-on-dark">
                {site.name}
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
            <nav
              className="flex flex-1 flex-col justify-center gap-2 px-6 pb-16"
              aria-label="Mobile"
            >
              {navMarketing.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    href={link.href}
                    className="display block border-b border-line-on-dark py-4 text-3xl text-paper-on-dark"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <ButtonLink
                href={links.donate}
                external
                className="mt-8 w-full rounded-full !bg-spark-coral !text-ink"
                size="lg"
              >
                Donate
              </ButtonLink>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
