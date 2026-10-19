import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/features/auth/requireViewer";
import { EditProfileClient } from "@/features/account/EditProfileClient";
import { content } from "@/lib/content";
import { toMeDTO } from "@/server/api/meProfile";
import { listTopics } from "@/server/api/topics";
import { getPrisma } from "@/shared/lib/prisma";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const viewer = await requireViewer("/settings/profile");
  const prisma = getPrisma();
  const dbUser = prisma
    ? await prisma.user.findUnique({
        where: { email: viewer.email.toLowerCase() },
        include: { artistProfile: true },
      })
    : null;

  return (
    <PageShell className="max-w-xl !pt-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
        Your account
      </p>
      <h1 className="display mt-3 text-4xl text-paper">Edit profile</h1>
      <p className="mt-3 text-sm text-paper-muted">
        Same profile as the app. Change it here and it shows there too.
      </p>
      <div className="mt-8">
        {prisma && dbUser ? (
          <EditProfileClient
            me={await toMeDTO(prisma, dbUser)}
            topics={await listTopics(prisma)}
            chapters={(await content.getChapters()).map((c) => ({ id: c.id, name: c.name }))}
          />
        ) : (
          <p className="rounded-2xl border border-line p-4 text-sm text-paper-muted">
            We couldn&apos;t open your profile just now. Please sign out and back in, or{" "}
            <Link href="/support" className="text-spark-teal underline">
              reach out
            </Link>{" "}
            and we&apos;ll help.
          </p>
        )}
      </div>
    </PageShell>
  );
}
