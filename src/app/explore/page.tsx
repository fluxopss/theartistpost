import type { Metadata } from "next";
import { getAllTags, getPosts } from "@/features/posts/queries";
import { ExploreGrid } from "@/features/posts/ExploreGrid";
import { PageShell } from "@/shared/ui/PageShell";
import { ButtonLink } from "@/shared/ui/Button";
import { assets } from "@/content/site";

export const metadata: Metadata = {
  title: "Explore · The Wall",
  description:
    "Interactive gallery wall of artist posts — filter, scroll, and lightbox.",
  openGraph: {
    title: "Explore · The Wall",
    description:
      "Interactive gallery wall of artist posts — filter, scroll, and lightbox.",
    images: [assets.cover],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.cover],
  },
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
            Drag to pan on desktop. Tap a piece for lightbox — or open the full
            post.
          </p>
        </div>
        <ButtonLink
          href="/create"
          variant="outline"
          magnetic
          className="rounded-full"
        >
          Create a post
        </ButtonLink>
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
