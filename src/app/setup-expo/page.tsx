import type { Metadata } from "next";
import { site } from "@/content/site";
import { SetupExpoExperience } from "@/features/expo-setup/SetupExpoExperience";

export const metadata: Metadata = {
  title: "Setup latest Expo Go",
  description: `Open the native ${site.name} tip in Expo Go over the live Metro tunnel — iPhone, Android, or Mac Simulator.`,
};

export default function SetupExpoPage() {
  return <SetupExpoExperience />;
}
