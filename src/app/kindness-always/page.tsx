import type { Metadata } from "next";
import { copy, assets } from "@/content/site";
import { PageShell } from "@/shared/ui/PageShell";
import { KindnessContent } from "@/features/kindness/KindnessContent";

export const metadata: Metadata = {
  title: "Kindness Always",
  description: copy.kindness.body,
  openGraph: {
    title: "Kindness Always",
    description: copy.kindness.body,
    images: [assets.kindnessTrademark],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.kindnessTrademark],
  },
};

export default function KindnessAlwaysPage() {
  return (
    <PageShell className="!pt-16">
      <KindnessContent />
    </PageShell>
  );
}
