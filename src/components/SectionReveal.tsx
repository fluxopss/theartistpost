"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeUp, reducedMotionVariants } from "@/shared/motion/variants";
import { cn } from "@/shared/lib/cn";

type SectionRevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
};

export function SectionReveal({
  children,
  className,
  delay = 0,
  id,
}: SectionRevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      id={id}
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={reduce ? reducedMotionVariants : fadeUp}
      transition={reduce ? undefined : { delay }}
    >
      {children}
    </motion.div>
  );
}
