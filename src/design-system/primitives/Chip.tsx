"use client";

import Link from "next/link";
import { cn } from "@/shared/lib/cn";

type ChipProps = {
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** When used in a filter radiogroup/tablist */
  role?: "radio" | "tab" | "button";
  "aria-checked"?: boolean;
  "aria-selected"?: boolean;
};

export function Chip({
  label,
  active,
  href,
  onClick,
  className,
  role,
  ...aria
}: ChipProps) {
  const classNames = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark-teal",
    active
      ? "border border-spark-teal bg-spark-teal/15 text-spark-teal"
      : "border border-line bg-surface-glass text-paper-muted hover:border-line-strong hover:text-paper",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classNames}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role={role}
      className={classNames}
      onClick={onClick}
      {...aria}
    >
      {label}
    </button>
  );
}

/** Explore/tag chip — active uses filled teal for stronger filter affordance */
export function FilterChip({
  name,
  slug,
  active,
  href,
}: {
  name: string;
  slug: string;
  active?: boolean;
  href?: string;
}) {
  const className = cn(
    "inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark-teal",
    active
      ? "bg-spark-teal !text-[#020b1a]"
      : "border border-line bg-surface-glass text-paper-muted hover:text-paper",
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`Filter ${name}`}>
        {name}
      </Link>
    );
  }

  return <span className={className}>{slug ? name : name}</span>;
}
