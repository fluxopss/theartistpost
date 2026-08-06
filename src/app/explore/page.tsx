import type { Metadata } from "next";
import { getAllTags, getPosts } from "@/features/posts/queries";
import { ExploreGrid } from "@/features/posts/ExploreGrid";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse artist posts with rich hover and scroll interactions.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [{ items, nextCursor }, tags] = await Promise.all([
    getPosts({ tag, take: 9 }),
    getAllTags(),
  ]);

  return (
    <PageShell className="pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-coral">
        Feed
      </p>
      <h1 className="display mt-1 text-3xl text-ink">Explore</h1>
      <div className="mt-4">
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
