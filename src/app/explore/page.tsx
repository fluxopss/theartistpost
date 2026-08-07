import type { Metadata } from "next";
import { getAllTags, getPosts } from "@/features/posts/queries";
import { ExploreGrid } from "@/features/posts/ExploreGrid";
import { PageShell } from "@/shared/ui/PageShell";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explore · The Wall",
  description:
    "Interactive gallery wall of artist posts — filter, scroll, and lightbox.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [{ items, nextCursor }, tags] = await Promise.all([
    getPosts({ tag, take: 12 }),
    getAllTags(),
  ]);

  return (
    <PageShell className="!pt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            The Wall
          </p>
          <h1 className="display mt-2 text-4xl text-paper sm:text-5xl">
            Explore
          </h1>
          <p className="mt-2 max-w-xl text-sm text-paper-muted">
            Drag to pan on desktop, swipe on mobile. Tap a piece for lightbox —
            or open the full post.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-paper transition hover:border-spark-teal hover:text-spark-teal"
        >
          Create a post
        </Link>
      </div>
      <div className="mt-8">
        <ExploreGrid
          initialPosts={items}
          initialCursor={nextCursor}
          tags={tags}
          activeTag={tag}
        />
      </div>
    </PageShell>
  );
}
