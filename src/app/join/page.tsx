import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/adapter";
import { JoinExperience } from "@/features/auth/JoinExperience";
import { PageShell } from "@/shared/ui/PageShell";
import { assets } from "@/content/site";
import { safeNextPath } from "@/shared/lib/safeNext";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Three doors into The Artist Post — member, artist studio, or returning with a sign-in code.",
  openGraph: {
    title: "Join · The Artist Post",
    description:
      "Member, Artist, or returning — enter the house. No invented roster.",
    images: [assets.coverOg],
  },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ door?: string; next?: string }>;
}) {
  const params = await searchParams;
  const door =
    params.door === "member" ||
    params.door === "artist" ||
    params.door === "return"
      ? params.door
      : null;
  const nextPath = safeNextPath(params.next);

  // Already signed in and sent here to get back somewhere: go straight there.
  if (nextPath && (await getSession())) redirect(nextPath);

  return (
    <PageShell className="!pt-6 sm:!pt-8">
      <JoinExperience initialDoor={door} nextPath={nextPath} />
    </PageShell>
  );
}
