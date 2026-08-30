import type { Metadata } from "next";
import { assets, copy } from "@/content/site";
import { content } from "@/lib/content";
import { LivingWall } from "@/features/wall/LivingWall";

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

export default async function ExplorePage() {
  const [artists, events] = await Promise.all([
    content.getArtists(),
    content.getEvents(),
  ]);

  return <LivingWall artists={artists} events={events} />;
}
