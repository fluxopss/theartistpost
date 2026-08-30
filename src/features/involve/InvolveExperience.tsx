import { InvolvePathRail } from "@/features/involve/InvolvePathRail";
import { DoorWorld } from "@/features/involve/DoorWorld";
import { PageShell } from "@/shared/ui/PageShell";
import type { InvolveDoorId } from "@/content/involve";
import type { ContentEvent } from "@/lib/content";

export function InvolveExperience({
  initialDoor,
  events,
}: {
  initialDoor: InvolveDoorId;
  events: ContentEvent[];
}) {
  return (
    <PageShell className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      <InvolvePathRail selected={initialDoor} heading="The other doors" />
      <DoorWorld doorId={initialDoor} events={events} />
    </PageShell>
  );
}
