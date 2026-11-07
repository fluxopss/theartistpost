import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/adapter";
import { JoinExperience } from "@/features/auth/JoinExperience";
import { PageShell } from "@/shared/ui/PageShell";
import Link from "next/link";
import { assets, joinCopy, site } from "@/content/site";
import { safeNextPath } from "@/shared/lib/safeNext";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Join The Artist Post, a West Palm Beach nonprofit for local artists: open a member door, open an artist studio, or sign back in with a code.",
  openGraph: {
    title: "Join · The Artist Post",
    description:
      "Member, Artist, or returning — enter the house. No invented roster.",
    images: [assets.coverOg],
  },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ door?: string; next?: string }>;
}) {
  const params = await searchParams;
  const door =
    params.door === "member" ||
    params.door === "artist" ||
    params.door === "return"
      ? params.door
      : null;
  const nextPath = safeNextPath(params.next);

  // Already signed in and sent here to get back somewhere: go straight there.
  if (nextPath && (await getSession())) redirect(nextPath);

  return (
    <PageShell className="!pt-6 sm:!pt-8">
      <JoinExperience initialDoor={door} nextPath={nextPath} />
      <section
        aria-labelledby="join-why"
        className="mx-auto mt-10 max-w-3xl border-t border-line pt-8"
      >
        <h2 id="join-why" className="display text-2xl text-paper">
          {joinCopy.whyTitle}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {joinCopy.why.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-line bg-surface-glass p-4"
            >
              <p className="font-semibold text-paper">{item.title}</p>
              <p className="mt-1 text-sm text-paper-muted">{item.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-paper-muted">
          {site.nonprofitLine}{" "}
          <Link href="/about" className="font-semibold text-spark-teal hover:underline">
            About us
          </Link>
        </p>
      </section>
    </PageShell>
  );
}
