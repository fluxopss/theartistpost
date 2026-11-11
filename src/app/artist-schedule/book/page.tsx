import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { PageShell } from "@/shared/ui/PageShell";
import { BlockBooker } from "@/features/booking/BlockBooker";

export const metadata: Metadata = {
  title: "Book a Block",
  description: `Sign up for a free four-hour block at Hacienda on Clematis Street.`,
};

export default function BookBlockPage() {
  return (
    <PageShell className="max-w-4xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
        Artist schedule
      </p>
      <h1 className="display mt-3 text-4xl text-paper">Book a block</h1>
      <p className="mt-2 max-w-xl text-sm text-paper-muted">
        Free for approved artists at {site.address.full}. Pick a four-hour block
        in the next two weeks. Book as many as the fair-use limits allow, and
        cancel any time before it starts so someone else can have the spot.
      </p>
      <div className="mt-8">
        <BlockBooker />
      </div>
      <p className="mt-10 text-sm">
        <Link href="/artist-schedule" className="text-spark-teal hover:underline">
          Back to the schedule
        </Link>
      </p>
    </PageShell>
  );
}
