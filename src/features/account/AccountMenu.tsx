"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useSession } from "@/features/auth/AuthProvider";
import { accountLinks, initialsOf } from "@/features/account/accountLinks";
import { cn } from "@/shared/lib/cn";

/** Header account entry: "Sign in" when signed out, avatar + menu when signed in. */
export function AccountMenu({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const { user, signOut, signingOut } = useSession();
  // Remember which page the menu was opened on: navigating closes it with no effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((v: boolean) => boolean)) =>
    setOpenOn(() => {
      const value = typeof next === "function" ? next(open) : next;
      return value ? pathname : null;
    });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenOn(null);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const links = accountLinks(user, pathname);

  if (!user) {
    return (
      <Link
        href={links[0]!.href}
        className={cn(
          "inline-flex h-10 items-center rounded-full border border-line bg-surface-glass px-4 text-sm font-medium text-paper transition hover:border-spark-teal",
          className,
        )}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Account menu for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-glass text-xs font-semibold text-paper transition hover:border-spark-teal"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
          <img src={user.image} alt="" width={40} height={40} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initialsOf(user.name)}</span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-12 z-[60] w-56 overflow-hidden rounded-2xl border border-line bg-ink-elevated p-1.5 shadow-xl"
        >
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-paper-muted">
            Signed in as <span className="font-semibold text-paper">{user.name}</span>
          </p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              className="block rounded-xl px-3 py-2 text-sm text-paper transition hover:bg-accent-soft hover:text-spark-teal"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-line px-3 py-2 text-left text-sm text-paper-muted transition hover:text-paper disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Drawer version: the same links as large cards, plus sign out. */
export function AccountDrawerSection({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname() ?? "/";
  const { user, signOut, signingOut } = useSession();
  const links = accountLinks(user, pathname);

  return (
    <div className="px-4 pt-3">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-teal">
        {user ? `Signed in as ${user.name}` : "Your account"}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className="rounded-full border border-line-on-dark px-4 py-2 text-sm font-medium text-paper-on-dark"
          >
            {link.label}
          </Link>
        ))}
        {user ? (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              onNavigate();
              signOut();
            }}
            className="rounded-full border border-line-on-dark px-4 py-2 text-sm font-medium text-paper-on-dark/80 disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
