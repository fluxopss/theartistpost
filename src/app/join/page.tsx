import type { Metadata } from "next";
import { JoinExperience } from "@/features/auth/JoinExperience";
import { PageShell } from "@/shared/ui/PageShell";
import { assets } from "@/content/site";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Two doors into The Artist Post — member of the night, or open the studio as an artist.",
  openGraph: {
    title: "Join · The Artist Post",
    description:
      "Member or Artist — enter the house. No invented roster.",
    images: [assets.coverOg],
  },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ door?: string }>;
}) {
  const params = await searchParams;
  const door =
    params.door === "member" || params.door === "artist" ? params.door : null;

  return (
    <PageShell className="!pt-6 sm:!pt-8">
      <JoinExperience initialDoor={door} />
    </PageShell>
  );
}
