import type { Metadata } from "next";
import { assets, copy, site } from "@/content/site";
import { DonateExperience } from "@/features/donate/DonateExperience";

export const metadata: Metadata = {
  title: "Donate",
  description: copy.donate.lead,
  openGraph: {
    title: `${copy.donate.kicker} · ${site.mark}`,
    description: copy.donate.lead,
    images: [assets.donations],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.donations],
  },
};

export default function DonatePage() {
  return <DonateExperience />;
}
