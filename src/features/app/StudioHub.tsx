"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Compass,
  Download,
  HeartHandshake,
  MapPin,
  Phone,
  Settings,
  Sparkles,
  Bookmark,
} from "lucide-react";
import { appCopy, assets, links, moreMenu, site } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { getSaves, getStudio } from "@/features/app/storage";
import { useStandalone } from "@/features/app/useDisplayMode";
import { useEffect, useState } from "react";

const destinations = [
  {
    href: "/explore",
    label: "The Wall",
    detail: "Pan, filter, and open work in the lightbox.",
    icon: Compass,
  },
  {
    href: "/kindness-always",
    label: "Kindness Always",
    detail: "Leave a spark. Wear the mark.",
    icon: Sparkles,
  },
  {
    href: "/artist-schedule",
    label: "Artist Schedule",
    detail: "List, month, and agenda — add nights to calendar.",
    icon: CalendarDays,
  },
  {
    href: "/get-involved",
    label: "Get Involved",
    detail: "Five doors. Robbie reads every note.",
    icon: HeartHandshake,
  },
];

export function StudioHub() {
  const standalone = useStandalone();
  const [name, setName] = useState(site.name);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setName(getStudio().displayName);
    const library = getSaves();
    setSavedCount(library.posts.length + library.events.length);
  }, []);

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-line bg-ink-elevated">
        <div className="relative isolate px-5 py-8 sm:px-8">
          <Image
            src={assets.cover}
            alt=""
            fill
            className="object-cover opacity-25"
            sizes="800px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
              {appCopy.studioKicker}
            </p>
            <h1 className="display mt-3 text-4xl text-paper-on-dark sm:text-5xl">
              {appCopy.studioTitle}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-paper-on-dark/80">
              {appCopy.studioLead}
            </p>
            <p className="mt-4 text-sm text-spark-teal">
              {name} · {appCopy.guestLine}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-line bg-surface-muted/60 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
          Visit
        </p>
        <h2 className="display mt-2 text-2xl text-paper">Hacienda on Clematis</h2>
        <p className="mt-2 text-sm text-paper-muted">{site.address.full}</p>
        <p className="mt-1 text-sm text-paper-muted">Today {site.hoursToday}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink
            href={`tel:${site.phoneTel}`}
            size="sm"
            className="rounded-full !bg-spark-coral !text-[#020b1a]"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </ButtonLink>
          <ButtonLink
            href={site.mapsUrl}
            external
            size="sm"
            variant="outline"
            className="rounded-full"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Directions
          </ButtonLink>
          <ButtonLink
            href={links.donate}
            external
            size="sm"
            variant="ghost"
            className="rounded-full"
          >
            Donate
          </ButtonLink>
        </div>
      </section>

      <section>
        <h2 className="display text-2xl text-paper">In the house</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {destinations.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full gap-3 rounded-2xl border border-line bg-surface-glass p-4 transition hover:border-spark-teal"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-spark-teal" aria-hidden />
                <span>
                  <span className="block font-semibold text-paper">{item.label}</span>
                  <span className="mt-1 block text-sm text-paper-muted">
                    {item.detail}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/saved"
          className="rounded-2xl border border-line bg-surface-glass p-4 hover:border-spark-gold"
        >
          <Bookmark className="h-5 w-5 text-spark-gold" aria-hidden />
          <p className="mt-3 font-semibold text-paper">Saved</p>
          <p className="mt-1 text-sm text-paper-muted">
            {savedCount === 0
              ? "Keep a work or a night — it stays on this device."
              : `${savedCount} kept on this device.`}
          </p>
        </Link>
        <Link
          href="/settings"
          className="rounded-2xl border border-line bg-surface-glass p-4 hover:border-spark-teal"
        >
          <Settings className="h-5 w-5 text-spark-teal" aria-hidden />
          <p className="mt-3 font-semibold text-paper">Settings</p>
          <p className="mt-1 text-sm text-paper-muted">
            Theme, studio name, motion, and local data.
          </p>
        </Link>
      </section>

      {!standalone ? (
        <section className="rounded-2xl border border-spark-teal/30 bg-accent-soft p-5">
          <div className="flex items-start gap-3">
            <Download className="h-5 w-5 text-spark-teal" aria-hidden />
            <div>
              <p className="font-semibold text-paper">Install the web app</p>
              <p className="mt-1 text-sm text-paper-muted">
                Add The Artist Post to your home screen for a full-screen studio.
                The same site becomes the App Store binary via Capacitor.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <p className="text-sm text-spark-teal">Running as an installed app.</p>
      )}

      <section>
        <h2 className="display text-2xl text-paper">{appCopy.comingNextTitle}</h2>
        <ul className="mt-4 space-y-3">
          {appCopy.comingNext.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-line px-4 py-3"
            >
              <p className="font-semibold text-paper">{item.title}</p>
              <p className="mt-1 text-sm text-paper-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="display text-2xl text-paper">More</h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {moreMenu.map((item) => (
            <li key={item.label}>
              {"external" in item && item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-4 py-3 hover:bg-surface-hover"
                >
                  <span className="font-semibold text-paper">{item.label}</span>
                  <span className="mt-0.5 block text-sm text-paper-muted">
                    {item.description}
                  </span>
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="block px-4 py-3 hover:bg-surface-hover"
                >
                  <span className="font-semibold text-paper">{item.label}</span>
                  <span className="mt-0.5 block text-sm text-paper-muted">
                    {item.description}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
