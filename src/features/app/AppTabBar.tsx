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

export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/92 backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5 px-1 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
        {appTabs.map((tab) => {
          const Icon = icons[tab.icon];
          const active = isTabActive(tab.href, pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold tracking-wide transition",
                  active ? "text-spark-teal" : "text-paper-muted hover:text-paper",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_rgba(46,196,182,0.55)]")}
                  aria-hidden
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
