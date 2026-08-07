import { HomeHero } from "@/features/home/HomeHero";
import { KindnessBridge } from "@/features/home/KindnessBridge";
import { FeaturedArtistsSection } from "@/features/home/FeaturedArtistsSection";
import { ContactSocialSection } from "@/features/home/ContactSocialSection";
import { HaciendaShowcase } from "@/components/HaciendaShowcase";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <KindnessBridge />
      <FeaturedArtistsSection />
      <HaciendaShowcase />
      <ContactSocialSection />
    </>
  );
}
