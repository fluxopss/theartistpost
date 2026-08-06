import type { Metadata } from "next";
import { CreatePostWizard } from "@/features/posts/CreatePostWizard";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Create",
  description: "Compose a post as a multi-step creative form.",
};

export default function CreatePage() {
  return (
    <PageShell>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-coral">
        Create
      </p>
      <h1 className="display mt-1 text-3xl text-ink">Compose a scene</h1>
      <p className="mt-2 mb-6 text-sm text-paper-muted">
        Multi-step form — basics, media, story, look, review.
      </p>
      <CreatePostWizard />
    </PageShell>
  );
}
