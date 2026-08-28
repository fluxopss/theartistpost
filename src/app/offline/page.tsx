import type { Metadata } from "next";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are offline. The Artist Post shell is still here.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <PageShell className="text-center !pt-24">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
        Offline
      </p>
      <h1 className="display mt-3 text-4xl text-paper">The room is still lit</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-paper-muted">
        Home, About, Explore, Schedule, and Kindness stay available from the
        last visit. Reconnect to publish or send a note to Robbie.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/" className="rounded-full">
          Home
        </ButtonLink>
        <ButtonLink href="/explore" variant="outline" className="rounded-full">
          The Wall
        </ButtonLink>
      </div>
    </PageShell>
  );
}
