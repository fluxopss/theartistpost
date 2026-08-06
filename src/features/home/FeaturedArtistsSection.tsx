import Image from "next/image";
import type { PostSummary } from "@/features/posts/types";
import { PostCard } from "@/features/posts/PostCard";
import { assets, copy } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";

export function FeaturedArtistsSection({ posts }: { posts: PostSummary[] }) {
  const hasReal = posts.length > 0;

  return (
    <section className="mx-auto max-w-[var(--content-max)] px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl text-ink">{copy.home.featuredTitle}</h2>
          {!hasReal ? (
            <p className="mt-2 max-w-xl text-sm text-paper-muted sm:text-base">
              {copy.home.featuredEmpty}
            </p>
          ) : null}
        </div>
        <ButtonLink href="/explore" variant="outline" size="sm">
          Explore the wall
        </ButtonLink>
      </div>

      {hasReal ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line"
            >
              <Image
                src={assets.comingSoon}
                alt="Coming soon"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
