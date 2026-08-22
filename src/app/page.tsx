import { HomeHero } from "@/features/home/HomeHero";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { HomeKindnessDeferred } from "@/features/home/HomeKindnessDeferred";
import { HomeLowerDeferred } from "@/features/home/HomeLowerDeferred";
import { InvolveBridge } from "@/features/involve/InvolveBridge";
import { MantraStrip } from "@/features/involve/MantraStrip";
import { content } from "@/lib/content";

export default async function HomePage() {
  const artists = await content.getArtists();

  return (
    <>
      <HomeHero />
      <MantraStrip />
      <InvolveBridge />
      <HomeKindnessDeferred />
      <FeaturedArtistsSection artists={artists} />
      <HomeLowerDeferred />
    </>
  );
}
