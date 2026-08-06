"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PostSummary, TagSummary } from "@/features/posts/types";
import { PostCard } from "@/features/posts/PostCard";
import { TagChip } from "@/shared/ui/TagChip";
import { Button } from "@/shared/ui/Button";
import { staggerContainer, useMotionSafe } from "@/shared/motion/variants";
import { POSTS_PAGE_SIZE } from "@/shared/lib/constants";

export function ExploreGrid({
  initialPosts,
  initialCursor,
  tags,
  activeTag,
}: {
  initialPosts: PostSummary[];
  initialCursor: string | null;
  tags: TagSummary[];
  activeTag?: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();
  const { initial, animate } = useMotionSafe();

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.some((t) => t.slug === activeTag));
  }, [posts, activeTag]);

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const params = new URLSearchParams({
        cursor,
        take: String(POSTS_PAGE_SIZE),
      });
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: PostSummary[];
        nextCursor: string | null;
      };
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...data.items.filter((p) => !ids.has(p.id))];
      });
      setCursor(data.nextCursor);
    });
  }

  return (
    <div>
      <div className="sticky top-[var(--nav-height)] z-30 -mx-4 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <TagChip name="All" slug="all" active={!activeTag} href="/explore" />
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              slug={tag.slug}
              active={activeTag === tag.slug}
              href={`/explore?tag=${tag.slug}`}
            />
          ))}
        </div>
      </div>

      <motion.div
        className="mt-4 space-y-4"
        variants={staggerContainer}
        initial={initial}
        animate={animate}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </AnimatePresence>
      </motion.div>

      {cursor ? (
        <div className="mt-6 flex justify-center pb-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={pending}
            aria-busy={pending}
            className="w-full"
          >
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
