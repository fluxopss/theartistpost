import type { Metadata } from "next";
import { site } from "@/content/site";
import { SetupExpoExperience } from "@/features/expo-setup/SetupExpoExperience";

export const metadata: Metadata = {
  title: "Setup latest Expo Go",
  description: `Run the native ${site.name} app from your Mac into Expo Go on your phone — same Expo account, simple steps.`,
};

export default function SetupExpoPage() {
  return <SetupExpoExperience />;
}
