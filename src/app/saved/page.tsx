import type { Metadata } from "next";
import { PageShell } from "@/shared/ui/PageShell";
import { SavedView } from "@/features/app/SavedView";

export const metadata: Metadata = {
  title: "Saved",
  description: "Works and Hacienda nights you kept on this device.",
};

export default function SavedPage() {
  return (
    <PageShell className="max-w-xl !pt-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
        On this device
      </p>
      <h1 className="display mt-3 text-4xl text-paper">Saved</h1>
      <div className="mt-8">
        <SavedView />
      </div>
    </PageShell>
  );
}
