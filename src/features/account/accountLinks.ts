import type { SessionUser } from "@/features/auth/types";
import { joinHref, safeNextPath } from "@/shared/lib/safeNext";

export type AccountLink = { href: string; label: string };

/** What the account menu offers, signed out or in. Shared by header and drawer. */
export function accountLinks(user: SessionUser | null, pathname: string): AccountLink[] {
  if (!user) {
    return [
      { href: safeNextPath(pathname) ? joinHref(pathname) : "/join?door=return", label: "Sign in" },
      { href: "/join", label: "Join" },
    ];
  }

  const links: AccountLink[] = [];
  if (user.handle) links.push({ href: `/u/${encodeURIComponent(user.handle)}`, label: "Your profile" });
  links.push({ href: "/settings/profile", label: "Edit profile" });
  if (user.role === "ARTIST" || user.role === "ADMIN") links.push({ href: "/create", label: "Your studio" });
  links.push({ href: "/settings", label: "Settings" });
  return links;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0]];
  return letters.filter(Boolean).join("").toUpperCase() || "?";
}
