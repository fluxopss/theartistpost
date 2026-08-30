import type { Metadata } from "next";
import { InstallApp } from "@/features/app/InstallApp";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Install The Artist Post on your phone — home screen, offline shell, and the same site Robbie wraps for the App Store.",
};

export default function InstallPage() {
  return (
    <PageShell className="!pt-8">
      <InstallApp />
    </PageShell>
  );
}
