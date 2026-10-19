import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/features/auth/adapter";
import { communityGate } from "@/features/community/gate";
import { ThreadView } from "@/features/community/ThreadView";
import { getCommunityThread } from "@/server/api/community";
import { getPrisma } from "@/shared/lib/prisma";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const gate = await communityGate(session);
  const viewer = gate !== "signedOut" && session ? { id: session.id, role: session.role } : null;
  const prisma = getPrisma();
  const result = prisma && ID.test(id) ? await getCommunityThread(prisma, id, viewer) : null;

  return (
    <PageShell className="max-w-2xl !pt-8">
      <Link href="/community" className="text-sm text-paper-muted hover:text-paper">
        ← Back to the board
      </Link>
      <div className="mt-6">
        {result && result.ok ? (
          <ThreadView post={result.post} replies={result.replies} gate={gate} viewerHandle={session?.handle ?? null} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
            <h1 className="display text-2xl text-paper">That post is gone</h1>
            <p className="mt-2 text-sm text-paper-muted">It may have been removed, or you can no longer see it.</p>
            <Link href="/community" className="mt-5 inline-flex h-10 items-center rounded-full border border-line px-5 text-sm font-semibold text-paper hover:border-spark-teal">
              Back to the board
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
