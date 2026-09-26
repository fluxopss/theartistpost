import type { Metadata } from "next";
import { GenreRail } from "@/features/stage/GenreRail";
import { PageShell } from "@/shared/ui/PageShell";
import { tapOrigin } from "@/content/stage";
import { assets } from "@/content/site";

export const metadata: Metadata = {
  title: "Create",
  description: "Publishing opens when an artist is approved.",
  openGraph: {
    title: "Create a post",
    description: "Publishing opens when an artist is approved.",
    images: [assets.coverOg],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.coverOg],
  },
};

export default function CreatePage() {
  return (
    <PageShell>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-coral">
        Create
      </p>
      <h1 className="display mt-1 text-3xl text-paper">Publishing is closed</h1>
      <p className="mt-2 text-sm text-paper-muted">
        {tapOrigin.short} New posts open when an artist is approved. Until then,
        nothing can be submitted from this page.
      </p>
      <GenreRail variant="strip" className="mb-6 !mx-0" />
      <div
        className="rounded-lg border border-paper/15 bg-ink/40 px-5 py-8 text-center"
        role="status"
      >
        <p className="text-sm text-paper">
          The compose wizard is off. When an artist is approved, this door
          unlocks for draft submissions.
        </p>
        <p className="mt-3 text-xs text-paper-muted">
          Upload and publish endpoints refuse mock and anonymous writes. An
          operator invites approved artists with OPERATOR_SECRET; passwordless
          sign-in lands after a transactional email provider is wired.
        </p>
      </div>
    </PageShell>
  );
}
