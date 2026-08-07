"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { PostSummary, TagSummary } from "@/features/posts/types";
import { TagChip } from "@/shared/ui/TagChip";
import { Button } from "@/shared/ui/Button";
import { Lightbox, type LightboxItem } from "@/components/Lightbox";
import { POSTS_PAGE_SIZE } from "@/shared/lib/constants";
import { cn } from "@/shared/lib/cn";
import { useIsTouchDevice } from "@/hooks/useMedia";

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
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const touch = useIsTouchDevice();
  const wallRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ active: boolean; startX: number; scrollLeft: number }>({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.some((t) => t.slug === activeTag));
  }, [posts, activeTag]);

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
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
  }, [cursor, pending, activeTag]);

  useEffect(() => {
    const el = wallRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "400px" },
    );
    const sentinel = el.querySelector("[data-sentinel]");
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, filtered.length]);

  function onPointerDown(e: React.PointerEvent) {
    if (touch || !wallRef.current) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: wallRef.current.scrollLeft,
    };
    wallRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active || !wallRef.current) return;
    const dx = e.clientX - drag.current.startX;
    wallRef.current.scrollLeft = drag.current.scrollLeft - dx;
  }

  function onPointerUp() {
    drag.current.active = false;
  }

  return (
    <div>
      <div className="sticky top-[var(--nav-height)] z-30 -mx-4 border-b border-line bg-ink-glass px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

      <div
        ref={wallRef}
        className={cn(
          "mt-6 overflow-x-auto pb-2 no-scrollbar",
          !touch && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {filtered.map((post) => (
            <WallTile
              key={post.id}
              post={post}
              onOpen={() =>
                setLightbox({
                  src: post.mediaUrl || assetsFallback,
                  alt: post.title,
                  title: post.title,
                  caption: `${post.artist.name}${post.tags[0] ? ` · ${post.tags[0].name}` : ""}`,
                })
              }
            />
          ))}
        </div>
        <div data-sentinel className="h-8 w-full" aria-hidden />
      </div>

      {cursor ? (
        <div className="mt-8 flex justify-center pb-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={pending}
            className="rounded-full"
          >
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-paper-muted">
          No posts on the wall yet for this filter.
        </p>
      ) : null}

      <Lightbox
        open={Boolean(lightbox)}
        onOpenChange={(open) => !open && setLightbox(null)}
        item={lightbox}
      />
    </div>
  );
}

const assetsFallback = "/brand/cover.jpg";

function WallTile({ post, onOpen }: { post: PostSummary; onOpen: () => void }) {
  return (
    <article className="mb-4 break-inside-avoid">
      <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface-muted">
        <button
          type="button"
          className="relative block w-full text-left"
          onClick={onOpen}
          aria-label={`Open ${post.title} in lightbox`}
        >
          <div className="relative aspect-[4/5] w-full">
            {post.mediaUrl ? (
              <Image
                src={post.mediaUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-accent-soft text-paper">
                Canvas
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="display text-xl text-paper-on-dark">
                {post.title}
              </h3>
              <p className="mt-1 text-sm text-paper-on-dark/80">
                {post.artist.name}
              </p>
            </div>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3">
          {post.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag.id} name={tag.name} slug={tag.slug} />
          ))}
          <Link
            href={`/post/${post.slug}`}
            className="ml-auto text-xs font-medium text-spark-teal hover:underline"
          >
            Open post
          </Link>
        </div>
      </div>
    </article>
  );
}
