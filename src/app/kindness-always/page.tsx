import type { Metadata } from "next";
import { copy } from "@/content/site";
import { PageShell } from "@/shared/ui/PageShell";
import { KindnessContent } from "@/features/kindness/KindnessContent";

export const metadata: Metadata = {
  title: "Kindness Always",
  description: copy.kindness.body,
};

export default function KindnessAlwaysPage() {
  return (
    <PageShell className="!pt-16">
      <KindnessContent />
    </PageShell>
  );
}
