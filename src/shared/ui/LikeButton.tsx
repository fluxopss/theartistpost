"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { isLiked, toggleLike } from "@/features/app/storage";

export function LikeButton({
  id,
  initialCount,
  className,
}: {
  id: string;
  initialCount: number;
  className?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const reduce = useReducedMotion();

  useEffect(() => {
    const on = isLiked(id);
    setLiked(on);
    setCount(initialCount + (on ? 1 : 0));
  }, [id, initialCount]);

  return (
    <motion.button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm text-paper-muted transition hover:border-spark-coral hover:text-paper",
        liked && "border-spark-coral bg-spark-coral/10 text-spark-coral",
        className,
      )}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      onClick={() => {
        const next = toggleLike(id);
        setLiked(next);
        setCount(initialCount + (next ? 1 : 0));
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
