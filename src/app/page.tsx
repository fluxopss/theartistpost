import { HomeHero } from "@/features/home/HomeHero";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { ContactSocialSection } from "@/features/home/ContactSocialSection";
import { HaciendaShowcase } from "@/components/HaciendaShowcase";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <FeaturedArtistsSection />
      <HaciendaShowcase />
      <ContactSocialSection />
    </>
  );
}
