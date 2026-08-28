import type { Metadata } from "next";
import { PageShell } from "@/shared/ui/PageShell";
import { StudioHub } from "@/features/app/StudioHub";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Your Artist Post studio — install the app, visit Hacienda, and keep the nights that move you.",
};

export default function MorePage() {
  return (
    <PageShell className="!pt-8">
      <StudioHub />
    </PageShell>
  );
}
