"use client";

import Image from "next/image";
import type { PostSummary } from "@/features/posts/types";
import { PostCard } from "@/features/posts/PostCard";
import { assets, copy } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";

export function FeaturedArtistsSection({ posts }: { posts: PostSummary[] }) {
  const hasReal = posts.length > 0;

  return (
    <section className="px-4 py-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-ink">
            {copy.home.featuredTitle}
          </h2>
          {!hasReal ? (
            <p className="mt-1 text-sm text-paper-muted">
              {copy.home.featuredEmpty}
            </p>
          ) : null}
        </div>
        <ButtonLink href="/explore" variant="ghost" size="sm">
          Wall
        </ButtonLink>
      </div>

      {hasReal ? (
        <div className="mt-4 space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative h-52 w-40 shrink-0 snap-center overflow-hidden rounded-2xl border border-line"
            >
              <Image
                src={assets.comingSoon}
                alt="Coming soon"
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
