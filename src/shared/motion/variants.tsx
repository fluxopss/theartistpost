"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return {
    reduce: Boolean(reduce),
    // Never SSR as opacity:0 — if client JS fails, content stays readable.
    initial: false as const,
    animate: "show" as const,
  };
}

export function MotionSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { reduce, animate } = useMotionSafe();
  return (
    <motion.section
      className={className}
      variants={staggerContainer}
      initial={false}
      whileInView={reduce ? undefined : animate}
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.section>
  );
}
