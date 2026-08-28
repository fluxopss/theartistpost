import type { Metadata } from "next";
import { PageShell } from "@/shared/ui/PageShell";
import { SettingsPanel } from "@/features/app/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme, studio name, motion, and local data for The Artist Post.",
};

export default function SettingsPage() {
  return (
    <PageShell className="max-w-xl !pt-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
        Studio
      </p>
      <h1 className="display mt-3 text-4xl text-paper">Settings</h1>
      <div className="mt-8">
        <SettingsPanel />
      </div>
    </PageShell>
  );
}
