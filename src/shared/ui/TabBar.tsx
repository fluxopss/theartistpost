"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { appTabs, type AppTabIcon } from "@/content/site";
import { cn } from "@/shared/lib/cn";

function TabIcon({ icon, active }: { icon: AppTabIcon; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "explore":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path
            d="m10 14 5-2-2 5-1-3-2 0Z"
            fill={active ? "currentColor" : "none"}
          />
        </svg>
      );
    case "schedule":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
        </svg>
      );
    case "merch":
      return (
        <svg {...common}>
          <path d="M6 8h12l1 12H5L6 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.4" fill="currentColor" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          <circle cx="18" cy="12" r="1.4" fill="currentColor" />
        </svg>
      );
    default: {
      const _exhaustive: never = icon;
      return _exhaustive;
    }
  }
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App tabs"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[var(--app-frame-max)] border-t border-line bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="grid h-[var(--tab-bar-height)] grid-cols-5">
        {appTabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="relative">
              <Link
                href={tab.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  active ? "text-ink" : "text-paper-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-4 top-1 h-0.5 rounded-full bg-spark-coral"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <TabIcon icon={tab.icon} active={active} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
