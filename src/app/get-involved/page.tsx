import type { Metadata } from "next";
import { copy, site } from "@/content/site";
import {
  isInvolveDoorId,
  type InvolveDoorId,
} from "@/content/involve";
import { InvolveHero } from "@/features/involve/InvolveHero";
import { InvolveExperience } from "@/features/involve/InvolveExperience";
import { MantraStrip } from "@/features/involve/MantraStrip";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: "Get Involved",
  description: copy.involve.lead,
  openGraph: {
    title: "Get Involved · The Artist Post",
    description: site.heroSupport,
  },
};

export default async function GetInvolvedPage({
  searchParams,
}: {
  searchParams: Promise<{ door?: string }>;
}) {
  const params = await searchParams;
  const door: InvolveDoorId = isInvolveDoorId(params.door)
    ? params.door
    : "space";
  const events = await content.getEvents();

  return (
    <>
      <InvolveHero />
      <MantraStrip />
      <InvolveExperience initialDoor={door} events={events} />
    </>
  );
}
