import type { Metadata } from "next";
import { assets, copy } from "@/content/site";
import { content } from "@/lib/content";
import { PageShell } from "@/shared/ui/PageShell";
import { ScheduleView } from "@/components/ScheduleView";
import { SpatialSchedule } from "@/features/schedule/SpatialSchedule";

export const metadata: Metadata = {
  title: "Artist Schedule",
  description: copy.schedule.supportLine,
  openGraph: {
    title: "Artist Schedule",
    description: copy.schedule.supportLine,
    images: [assets.comingSoon],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.comingSoon],
  },
};

export default async function ArtistSchedulePage() {
  const events = await content.getEvents();

  return (
    <>
      <SpatialSchedule events={events} />
      <PageShell className="!pt-8">
        <h2 className="display mb-6 text-2xl text-paper">
          {copy.schedule.showcaseTitle}
        </h2>
        <ScheduleView events={events} />
      </PageShell>
    </>
  );
}
