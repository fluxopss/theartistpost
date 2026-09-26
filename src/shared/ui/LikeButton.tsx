"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import { useSession } from "@/features/auth/AuthProvider";
import { toggleLikeAction } from "@/features/posts/engagement";
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
  const { isAuthenticated, user } = useSession();
  const signedIn = isAuthenticated && Boolean(user);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (signedIn) {
      setLiked(false);
      setCount(initialCount);
      return;
    }
    const on = isLiked(id);
    setLiked(on);
    setCount(initialCount + (on ? 1 : 0));
  }, [id, initialCount, signedIn]);

  function onClick() {
    if (signedIn) {
      startTransition(async () => {
        const result = await toggleLikeAction({ postId: id });
        if (!result.ok) {
          setHint(true);
          return;
        }
        setLiked(result.liked);
        setCount(result.likeCount);
        setHint(false);
      });
      return;
    }
    const next = toggleLike(id);
    setLiked(next);
    setCount(initialCount + (next ? 1 : 0));
    setHint(true);
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <motion.button
        type="button"
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm text-paper-muted transition hover:border-spark-coral hover:text-paper",
          liked && "border-spark-coral bg-spark-coral/10 text-spark-coral",
          className,
        )}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        onClick={onClick}
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
      {hint && !signedIn ? (
        <p className="text-[10px] text-paper-muted">
          On this device ·{" "}
          <Link href="/join?door=member" className="text-spark-teal hover:underline">
            join to sync
          </Link>
        </p>
      ) : null}
    </div>
  );
}
