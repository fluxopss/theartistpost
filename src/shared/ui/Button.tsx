"use client";

import Link from "next/link";
import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "onDark";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper-on-dark hover:bg-ink-elevated shadow-[0_0_24px_rgba(46,196,182,0.12)]",
  secondary:
    "bg-spark-teal text-[#020b1a] hover:brightness-110 shadow-[0_0_24px_rgba(46,196,182,0.25)]",
  ghost: "bg-transparent text-paper hover:bg-surface-hover",
  outline:
    "bg-transparent text-paper border border-line-strong hover:border-spark-teal hover:text-spark-teal",
  onDark:
    "bg-transparent text-paper-on-dark border border-line-on-dark hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm font-semibold",
  lg: "px-6 py-3 text-base font-semibold",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md transition duration-200 disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
}: CommonProps & { href: string; external?: boolean }) {
  const classNames = cn(
    "inline-flex items-center justify-center gap-2 rounded-md transition duration-200",
    variants[variant],
    sizes[size],
    className,
  );

  if (external) {
    return (
      <a href={href} className={classNames} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames}>
      {children}
    </Link>
  );
}
