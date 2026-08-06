"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";

export function LikeButton({
  initialCount,
  className,
}: {
  initialCount: number;
  className?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-paper-muted transition hover:border-ink hover:text-ink",
        liked && "border-ink bg-accent-soft text-ink",
        className,
      )}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      onClick={() => {
        setLiked((v) => {
          const next = !v;
          setCount((c) => c + (next ? 1 : -1));
          return next;
        });
      }}
    >
      <motion.span
        key={liked ? "on" : "off"}
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-base leading-none"
        aria-hidden
      >
        {liked ? "♥" : "♡"}
      </motion.span>
      <span>{count}</span>
    </motion.button>
  );
}
