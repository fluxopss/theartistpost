import { InvolvePathRail } from "@/features/involve/InvolvePathRail";
import { DoorWorld } from "@/features/involve/DoorWorld";
import { PageShell } from "@/shared/ui/PageShell";
import type { InvolveDoorId } from "@/content/involve";
import type { ContentEvent } from "@/lib/content";
import Link from "next/link";

export function InvolveExperience({
  initialDoor,
  events,
}: {
  initialDoor: InvolveDoorId;
  events: ContentEvent[];
}) {
  return (
    <PageShell className="space-y-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <InvolvePathRail selected={initialDoor} heading="The other doors" />
        <DoorWorld doorId={initialDoor} events={events} />
      </div>
      <p className="text-sm text-paper-muted">
        Teammates testing the native app:{" "}
        <Link
          href="/setup-expo"
          className="font-semibold text-spark-teal hover:underline"
        >
          Setup latest Expo Go
        </Link>
        .
      </p>
    </PageShell>
  );
}
