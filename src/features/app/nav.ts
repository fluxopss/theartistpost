import { appTabs } from "@/content/site";

export type AppTab = (typeof appTabs)[number];

const TAB_PREFIXES: Record<string, string[]> = {
  "/": ["/"],
  "/explore": ["/explore", "/post", "/create", "/artist"],
  "/artist-schedule": ["/artist-schedule", "/event"],
  "/kindness-always": ["/kindness-always"],
  "/more": [
    "/more",
    "/settings",
    "/saved",
    "/privacy",
    "/terms",
    "/support",
    "/install",
  ],
};

export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  const prefixes = TAB_PREFIXES[href] ?? [href];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function tabForPath(pathname: string): AppTab | undefined {
  return appTabs.find((tab) => isTabActive(tab.href, pathname));
}
