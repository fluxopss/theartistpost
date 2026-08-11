"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { motion as motionTokens } from "@/design-system/tokens";
import { useReducedMotion, useIsTouchDevice } from "@/hooks/useMedia";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "onDark";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper-on-dark hover:bg-ink-elevated shadow-[0_0_24px_rgba(46,196,182,0.12)]",
  secondary:
    "bg-spark-teal !text-[#020b1a] hover:brightness-110 shadow-[0_0_24px_rgba(46,196,182,0.25)]",
  ghost: "bg-transparent text-paper hover:bg-surface-hover",
  outline:
    "bg-transparent text-paper border border-line-strong hover:border-spark-teal hover:text-spark-teal",
  onDark:
    "bg-transparent text-paper-on-dark border border-line-on-dark hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 py-1.5 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm font-semibold",
  lg: "min-h-12 px-6 py-3 text-base font-semibold",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  magnetic?: boolean;
};

function MagneticWrap({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, motionTokens.spring.snappy);
  const springY = useSpring(y, motionTokens.spring.snappy);

  if (!enabled) return <>{children}</>;

  return (
    <motion.div
      ref={ref}
      className="inline-flex"
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - (rect.left + rect.width / 2)) * 0.22);
        y.set((e.clientY - (rect.top + rect.height / 2)) * 0.22);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  magnetic = false,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  const base = cn(
    "inline-flex items-center justify-center gap-2 rounded-md transition duration-200 disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  return (
    <MagneticWrap enabled={magnetic && !reduce && !touch}>
      <button className={base} {...props}>
        {children}
      </button>
    </MagneticWrap>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
  magnetic = false,
}: CommonProps & { href: string; external?: boolean }) {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  const classNames = cn(
    "inline-flex items-center justify-center gap-2 rounded-md transition duration-200",
    variants[variant],
    sizes[size],
    className,
  );

  const inner = external ? (
    <a href={href} className={classNames} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={classNames}>
      {children}
    </Link>
  );

  return (
    <MagneticWrap enabled={magnetic && !reduce && !touch}>{inner}</MagneticWrap>
  );
}
