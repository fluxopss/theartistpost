"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { PostSummary, TagSummary } from "@/features/posts/types";
import { TagChip } from "@/shared/ui/TagChip";
import { Button, ButtonLink } from "@/shared/ui/Button";
import type { LightboxItem } from "@/design-system/primitives/Lightbox";
import { POSTS_PAGE_SIZE } from "@/shared/lib/constants";
import { cn } from "@/shared/lib/cn";
import { useIsTouchDevice } from "@/hooks/useMedia";

const Lightbox = dynamic(
  () =>
    import("@/design-system/primitives/Lightbox").then((m) => ({
      default: m.Lightbox,
    })),
  { ssr: false },
);

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const touch = useIsTouchDevice();
  const wallRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const momentumRaf = useRef<number | null>(null);

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.some((t) => t.slug === activeTag));
  }, [posts, activeTag]);

  const lightboxItems: LightboxItem[] = useMemo(
    () =>
      filtered.map((post) => ({
        src: post.mediaUrl || assetsFallback,
        alt: post.title,
        title: post.title,
        caption: `${post.artist.name}${post.tags[0] ? ` · ${post.tags[0].name}` : ""}`,
      })),
    [filtered],
  );

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

  function cancelMomentum() {
    if (momentumRaf.current) {
      cancelAnimationFrame(momentumRaf.current);
      momentumRaf.current = null;
    }
  }

  function glide() {
    const el = wallRef.current;
    if (!el) return;
    const step = () => {
      if (Math.abs(drag.current.velocity) < 0.05) {
        momentumRaf.current = null;
        return;
      }
      el.scrollLeft -= drag.current.velocity * 16;
      drag.current.velocity *= 0.92;
      momentumRaf.current = requestAnimationFrame(step);
    };
    momentumRaf.current = requestAnimationFrame(step);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!wallRef.current || touch) return;
    cancelMomentum();
    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: wallRef.current.scrollLeft,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    wallRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active || !wallRef.current) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.startX;
    wallRef.current.scrollLeft = drag.current.scrollLeft - dx;
    const dt = Math.max(1, now - drag.current.lastT);
    drag.current.velocity = (e.clientX - drag.current.lastX) / dt;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    glide();
  }

  return (
    <div>
      <div className="sticky top-[var(--nav-height)] z-30 -mx-4 border-b border-line bg-ink-glass px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 no-scrollbar">
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
          <div
            className="hidden shrink-0 items-center gap-1 sm:flex"
            role="group"
            aria-label="Wall zoom"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-label="Zoom out"
              disabled={scale <= 1}
              onClick={() =>
                setScale((s) => Math.max(1, Number((s - 0.15).toFixed(2))))
              }
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-label="Zoom in"
              disabled={scale >= 1.45}
              onClick={() =>
                setScale((s) => Math.min(1.45, Number((s + 0.15).toFixed(2))))
              }
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={wallRef}
        className={cn(
          "mt-6 overflow-x-auto overflow-y-hidden pb-2 no-scrollbar",
          !touch && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${100 / scale}%`,
          }}
        >
          {filtered.map((post, i) => (
            <WallTile
              key={post.id}
              post={post}
              onOpen={() => setLightboxIndex(i)}
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
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-surface-glass px-6 py-14 text-center">
          <p className="display text-2xl text-paper">Blank wall</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-paper-muted">
            No posts for this filter yet. Compose a scene and hang it here —
            nothing publishes without your confirmation.
          </p>
          <ButtonLink
            href="/create"
            variant="secondary"
            className="mt-6 rounded-full"
          >
            Create a post
          </ButtonLink>
        </div>
      ) : null}

      {lightboxIndex !== null ? (
        <Lightbox
          open
          onOpenChange={(open) => !open && setLightboxIndex(null)}
          items={lightboxItems}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}

const assetsFallback = "/brand/cover-opt.webp";

function WallTile({ post, onOpen }: { post: PostSummary; onOpen: () => void }) {
  return (
    <article className="mb-4 break-inside-avoid">
      <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface-muted">
        <button
          type="button"
          className="relative block min-h-11 w-full text-left"
          onClick={onOpen}
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
              <p className="display text-xl text-paper-on-dark">{post.title}</p>
              <p className="mt-1 text-sm text-paper-on-dark/80">
                {post.artist.name}
              </p>
            </div>
          </div>
          <span className="sr-only">Open {post.title} in lightbox</span>
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
