import type { Metadata } from "next";
import { assets, site } from "@/content/site";
import { AboutPrograms } from "@/features/about/AboutPrograms";
import { PageShell } from "@/shared/ui/PageShell";
import { ButtonLink } from "@/shared/ui/Button";

const description =
  "Free artist showcases, nights at Hacienda, the Wall, Kindness Always, sponsors and local chapters: the programs of The Artist Post, a West Palm Beach nonprofit for local artists.";

export const metadata: Metadata = {
  title: "Programs",
  description,
  openGraph: {
    title: "Programs · The Artist Post",
    description,
    images: [assets.coverOg],
  },
};

export default function ProgramsPage() {
  return (
    <PageShell className="space-y-10">
      <AboutPrograms heading="h1" />
      <p className="text-sm font-semibold text-paper">{site.nonprofitLine}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink
          href="/get-involved"
          className="rounded-full !bg-spark-coral !text-ink sm:min-w-[180px]"
        >
          Get Involved
        </ButtonLink>
        <ButtonLink href="/join" variant="outline" className="rounded-full">
          Join the community
        </ButtonLink>
        <ButtonLink href="/about" variant="outline" className="rounded-full">
          About us
        </ButtonLink>
      </div>
    </PageShell>
  );
}
