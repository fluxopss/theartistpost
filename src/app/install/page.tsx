import type { Metadata } from "next";
import { InstallApp } from "@/features/app/InstallApp";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Get The Artist Post app: add it to your iPhone, Android, or desktop home screen to browse nights at Hacienda, the Wall, and the community, even offline.",
};

export default function InstallPage() {
  return (
    <PageShell className="!pt-8">
      <InstallApp />
    </PageShell>
  );
}
