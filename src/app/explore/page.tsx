import type { Metadata } from "next";
import { assets, copy } from "@/content/site";
import { content } from "@/lib/content";
import { listUpcomingSiteEvents } from "@/server/api/siteEvents";
import { LivingWall } from "@/features/wall/LivingWall";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Explore · The Wall",
  description: copy.house.exploreLine,
  openGraph: {
    title: "Explore · The Wall",
    description: copy.house.exploreLine,
    images: [assets.coverOg],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.coverOg],
  },
};

/** Nights on The Wall come from the database (Manage events): read per request. */
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const [artists, events] = await Promise.all([
    content.getArtists(),
    listUpcomingSiteEvents(),
  ]);

  return (
    <Suspense fallback={null}>
      <LivingWall artists={artists} events={events} />
    </Suspense>
  );
}
