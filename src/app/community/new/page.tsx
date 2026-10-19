import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/features/auth/requireViewer";
import { Composer } from "@/features/community/Composer";
import { GateHint } from "@/features/community/GateHint";
import { communityGate } from "@/features/community/gate";
import { listTopics } from "@/server/api/topics";
import { getPrisma } from "@/shared/lib/prisma";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Post to the board", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const viewer = await requireViewer("/community/new");
  const gate = await communityGate(viewer);
  const prisma = getPrisma();

  return (
    <PageShell className="max-w-2xl !pt-8">
      <Link href="/community" className="text-sm text-paper-muted hover:text-paper">
        ← Back to the board
      </Link>
      <h1 className="display mt-4 text-4xl text-paper">Post to the board</h1>
      <p className="mt-2 text-sm text-paper-muted">Shows up on the website and in the app. Be kind, credit the artist.</p>
      <div className="mt-8">
        {gate === "ready" && prisma ? (
          <Composer topics={await listTopics(prisma)} />
        ) : (
          <GateHint gate={gate === "ready" ? "signedOut" : gate} here="/community/new" action="post" />
        )}
      </div>
    </PageShell>
  );
}
