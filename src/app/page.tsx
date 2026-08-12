import { HomeHero } from "@/features/home/HomeHero";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { HomeKindnessDeferred } from "@/features/home/HomeKindnessDeferred";
import { HomeLowerDeferred } from "@/features/home/HomeLowerDeferred";
import { content } from "@/lib/content";

export default async function HomePage() {
  const artists = await content.getArtists();

  return (
    <>
      <HomeHero />
      <HomeKindnessDeferred />
      <FeaturedArtistsSection artists={artists} />
      <HomeLowerDeferred />
    </>
  );
}
