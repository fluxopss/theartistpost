import type { Metadata } from "next";
import { assets, copy } from "@/content/site";
import { content } from "@/lib/content";
import { SupportersExperience } from "@/features/supporters/SupportersExperience";

export const metadata: Metadata = {
  title: "Supporters",
  description: copy.supporters.expansion,
  openGraph: {
    title: "Supporters",
    description: copy.supporters.expansion,
    images: [assets.supportersMap],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.supportersMap],
  },
};

export default async function SupportersPage() {
  const chapters = await content.getChapters();
  return <SupportersExperience chapters={chapters} />;
}
