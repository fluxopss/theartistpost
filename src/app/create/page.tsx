import type { Metadata } from "next";
import { CreatePostWizard } from "@/features/posts/CreatePostWizard";
import { PageShell } from "@/shared/ui/PageShell";
import { assets } from "@/content/site";

export const metadata: Metadata = {
  title: "Create",
  description: "Compose a post as a multi-step creative form.",
  openGraph: {
    title: "Create a post",
    description: "Compose a scene for The Wall — confirm before publish.",
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
      <h1 className="display mt-1 text-3xl text-paper">Compose a scene</h1>
      <p className="mt-2 mb-6 text-sm text-paper-muted">
        Multi-step form — basics, media upload, story, look, review. Nothing
        posts until you confirm.
      </p>
      <CreatePostWizard />
    </PageShell>
  );
}
