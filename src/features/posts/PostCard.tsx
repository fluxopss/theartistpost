"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { PostSummary } from "@/features/posts/types";
import { TagChip } from "@/shared/ui/TagChip";
import { fadeUp } from "@/shared/motion/variants";
import { cn } from "@/shared/lib/cn";

export function PostCard({
  post,
  className,
  featured,
}: {
  post: PostSummary;
  className?: string;
  featured?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      variants={fadeUp}
      layout
      whileTap={reduce ? undefined : { scale: 0.985 }}
      className={cn("group relative", className)}
    >
      <Link
        href={`/post/${post.slug}`}
        className="block overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
      >
        <div
          className={cn(
            "relative overflow-hidden bg-surface-muted",
            featured ? "aspect-[4/5]" : "aspect-[5/4]",
          )}
        >
          {post.mediaUrl ? (
            <Image
              src={post.mediaUrl}
              alt={post.title}
              fill
              sizes="400px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-accent-soft text-ink">
              Canvas
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="display text-xl text-paper-on-dark">{post.title}</h3>
            <p className="mt-1 text-sm text-paper-on-dark/80">
              {post.artist.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-3">
          {post.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag.id} name={tag.name} slug={tag.slug} />
          ))}
          <span className="ml-auto text-[11px] text-paper-muted">
            ♥ {post.likeCount} · {post.viewCount}
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
