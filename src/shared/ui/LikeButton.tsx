"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import { useSession } from "@/features/auth/AuthProvider";
import {
  getLikeStatusAction,
  toggleLikeAction,
} from "@/features/posts/engagement";
import { isLiked, toggleLike } from "@/features/app/storage";
import { useHydratedState } from "@/hooks/useHydrated";

type RemoteLike = { key: string; liked: boolean; count: number };

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
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState(false);
  const reduce = useReducedMotion();

  // Signed out: the like lives on this device; re-read when the post or session changes.
  const [localLiked, setLocalLiked] = useHydratedState(
    `${id}:${signedIn}`,
    () => !signedIn && isLiked(id),
    false,
  );

  // Signed in: server status, tagged with what it was fetched for so a new
  // post/count/user falls back to the unliked baseline until it reloads.
  const remoteKey = `${id}:${initialCount}:${user?.id ?? ""}`;
  const [remote, setRemote] = useState<RemoteLike | null>(null);
  const fresh = signedIn && remote?.key === remoteKey ? remote : null;

  const liked = signedIn ? (fresh?.liked ?? false) : localLiked;
  const count = signedIn
    ? (fresh?.count ?? initialCount)
    : initialCount + (localLiked ? 1 : 0);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;
    void getLikeStatusAction({ postId: id }).then((result) => {
      if (cancelled || !result.ok) return;
      setRemote({ key: remoteKey, liked: result.liked, count: result.likeCount });
    });

    return () => {
      cancelled = true;
    };
  }, [id, remoteKey, signedIn]);

  function onClick() {
    if (signedIn) {
      startTransition(async () => {
        const result = await toggleLikeAction({ postId: id });
        if (!result.ok) {
          setHint(true);
          return;
        }
        setRemote({ key: remoteKey, liked: result.liked, count: result.likeCount });
        setHint(false);
      });
      return;
    }
    setLocalLiked(toggleLike(id));
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
