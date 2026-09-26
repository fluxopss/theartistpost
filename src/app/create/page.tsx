import type { Metadata } from "next";
import Link from "next/link";
import { GenreRail } from "@/features/stage/GenreRail";
import { PageShell } from "@/shared/ui/PageShell";
import { tapOrigin } from "@/content/stage";
import { assets } from "@/content/site";
import { getSession } from "@/features/auth/adapter";
import { getPrisma } from "@/shared/lib/prisma";
import { isMockGuestSession } from "@/features/auth/publishGate";

export const metadata: Metadata = {
  title: "Create",
  description: "Publishing opens when an artist is approved.",
  openGraph: {
    title: "Create a post",
    description: "Publishing opens when an artist is approved.",
    images: [assets.coverOg],
  },
  twitter: {
    card: "summary_large_image",
    images: [assets.coverOg],
  },
};

export default async function CreatePage() {
  const session = await getSession();
  let pendingArtist = false;
  let approvedArtist = false;

  if (session && !isMockGuestSession(session)) {
    const prisma = getPrisma();
    if (prisma) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.email },
        include: { artistProfile: true },
      });
      if (dbUser?.role === "ARTIST" || dbUser?.role === "ADMIN") {
        if (dbUser.role === "ADMIN" || dbUser.artistProfile?.approved) {
          approvedArtist = true;
        } else if (dbUser.artistProfile && !dbUser.artistProfile.approved) {
          pendingArtist = true;
        }
      }
    }
  }

  return (
    <PageShell>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-coral">
        Create
      </p>
      <h1 className="display mt-1 text-3xl text-paper">
        {pendingArtist
          ? "Studio pending approval"
          : approvedArtist
            ? "Studio unlocked soon"
            : "Publishing is closed"}
      </h1>
      <p className="mt-2 text-sm text-paper-muted">
        {pendingArtist
          ? "Your artist profile is not published yet. Robbie still has to approve you — Create stays locked until then. Install the app so this feels like your studio."
          : approvedArtist
            ? `${tapOrigin.short} You are approved. The compose wizard unlocks in the next studio pass — drafts only until publish is wired for your session.`
            : `${tapOrigin.short} New posts open when an artist is approved. Until then, nothing can be submitted from this page.`}
      </p>
      <GenreRail variant="strip" className="mb-6 !mx-0" />
      <div
        className="rounded-lg border border-paper/15 bg-ink/40 px-5 py-8 text-center"
        role="status"
      >
        {pendingArtist ? (
          <>
            <p className="text-sm text-paper">
              Pending approval — not published yet. The compose wizard stays off.
            </p>
            <p className="mt-3 text-xs text-paper-muted">
              <Link href="/install" className="text-spark-teal hover:underline">
                Install / open as app
              </Link>
              {" · "}
              <Link href="/settings" className="text-spark-teal hover:underline">
                Settings / sign out
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-paper">
              The compose wizard is off. When an artist is approved, this door
              unlocks for draft submissions.
            </p>
            <p className="mt-3 text-xs text-paper-muted">
              Upload and publish refuse anonymous and mock writes.{" "}
              <Link href="/join?door=artist" className="text-spark-teal hover:underline">
                Open the artist door
              </Link>{" "}
              to register a pending studio, or ask an operator to invite you.
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}
