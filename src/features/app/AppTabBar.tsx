"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Compass,
  Home,
  Sparkles,
  UserRound,
} from "lucide-react";
import { appTabs } from "@/content/site";
import { cn } from "@/shared/lib/cn";
import { isTabActive } from "./nav";
import type { AppTabIcon } from "@/content/site";

const icons: Record<AppTabIcon, typeof Home> = {
  home: Home,
  explore: Compass,
  schedule: CalendarDays,
  kindness: Sparkles,
  studio: UserRound,
};

const tones: Record<AppTabIcon, string> = {
  home: "text-spark-coral",
  explore: "text-spark-teal",
  schedule: "text-spark-gold",
  kindness: "text-spark-violet",
  studio: "text-paper-on-dark",
};

const pills: Record<AppTabIcon, string> = {
  home: "bg-spark-coral/20",
  explore: "bg-spark-teal/20",
  schedule: "bg-spark-gold/20",
  kindness: "bg-spark-violet/25",
  studio: "bg-white/12",
};

export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App"
      className="fixed inset-x-3 z-40 md:hidden"
      style={{ bottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-5 rounded-[1.7rem] border border-line bg-ink/90 p-1 shadow-[0_16px_40px_rgba(6,20,34,0.45)] backdrop-blur-xl">
        {appTabs.map((tab) => {
          const Icon = icons[tab.icon];
          const active = isTabActive(tab.href, pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "tap-tab flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-0.5 text-[10px] font-semibold leading-none tracking-wide transition",
                  active
                    ? cn(tones[tab.icon], pills[tab.icon])
                    : "text-paper-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
