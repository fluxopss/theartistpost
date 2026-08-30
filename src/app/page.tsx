import { HouseHero } from "@/features/house/HouseHero";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { HomeKindnessDeferred } from "@/features/home/HomeKindnessDeferred";
import { HomeLowerDeferred } from "@/features/home/HomeLowerDeferred";
import { MantraStrip } from "@/features/involve/MantraStrip";
import { content } from "@/lib/content";

export default async function HomePage() {
  const artists = await content.getArtists();

  return (
    <>
      <HouseHero />
      <MantraStrip />
      <HomeKindnessDeferred />
      <FeaturedArtistsSection artists={artists} />
      <HomeLowerDeferred />
    </>
  );
}
