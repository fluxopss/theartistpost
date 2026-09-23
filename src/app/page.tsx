import { HouseHero } from "@/features/house/HouseHero";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { HistoryTeaser } from "@/features/home/HistoryTeaser";
import { HomeKindnessDeferred } from "@/features/home/HomeKindnessDeferred";
import { HomeLowerDeferred } from "@/features/home/HomeLowerDeferred";
import { MantraStrip } from "@/features/involve/MantraStrip";
import { OpeningDoor } from "@/features/night/OpeningDoor";
import { featuredNight } from "@/features/night/program";
import { content } from "@/lib/content";

export default async function HomePage() {
  const [artists, events] = await Promise.all([
    content.getArtists(),
    content.getEvents(),
  ]);
  const night = featuredNight(events);

  return (
    <>
      <HouseHero />
      {night ? <OpeningDoor event={night} /> : null}
      <MantraStrip />
      <HistoryTeaser />
      <HomeKindnessDeferred />
      <FeaturedArtistsSection artists={artists} />
      <HomeLowerDeferred />
    </>
  );
}
