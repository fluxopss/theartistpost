import { HomeHero, HaciendaStoryCard } from "@/features/home/HomeHero";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { ContactSocialSection } from "@/features/home/ContactSocialSection";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HaciendaStoryCard />
      <FeaturedArtistsSection posts={[]} />
      <ContactSocialSection />
    </>
  );
}
