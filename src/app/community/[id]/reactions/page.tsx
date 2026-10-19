import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/features/auth/adapter";
import { initialsOf } from "@/features/account/accountLinks";
import { FilterChips } from "@/features/community/FilterChips";
import { REACTION_EMOJI, REACTION_LABEL, REACTIONS, type Reaction } from "@/features/community/domain/reactions";
import { listReactors, REACTORS_DEFAULT_TAKE } from "@/server/api/community";
import { getPrisma } from "@/shared/lib/prisma";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Reactions", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const CURSOR = /^[A-Za-z0-9_-]{1,64}$/;

export default async function ReactorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reaction?: string; cursor?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const prisma = getPrisma();
  if (!prisma || !ID.test(id)) notFound();
  const reaction = (REACTIONS as readonly string[]).includes(sp.reaction ?? "") ? (sp.reaction as Reaction) : undefined;
  const session = await getSession();
  const viewer = session ? { id: session.id, role: session.role } : null;
  const page = { take: REACTORS_DEFAULT_TAKE, ...(sp.cursor && CURSOR.test(sp.cursor) ? { cursor: sp.cursor } : {}) };
  const result = await listReactors(prisma, id, page, reaction, viewer);
  if (!result.ok) notFound();

  const base = `/community/${encodeURIComponent(id)}/reactions`;
  const chips = [{ id: "", label: "All" }, ...REACTIONS.map((r) => ({ id: r, label: `${REACTION_EMOJI[r]} ${REACTION_LABEL[r]}` }))];

  return (
    <PageShell className="max-w-2xl !pt-8">
      <Link href={`/community/${encodeURIComponent(id)}`} className="text-sm text-paper-muted hover:text-paper">
        ← Back to the conversation
      </Link>
      <h1 className="display mt-4 text-3xl text-paper">Who reacted</h1>
      <div className="mt-4">
        <FilterChips label="Reaction" options={chips} value={reaction ?? ""} hrefFor={(r) => (r ? `${base}?reaction=${r}` : base)} />
      </div>
      {result.page.items.length === 0 ? (
        <p className="mt-6 text-sm text-paper-muted">No reactions here yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {result.page.items.map((item) => (
            <li key={`${item.person.id}-${item.reaction}`}>
              <Link href={`/u/${encodeURIComponent(item.person.handle)}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-spark-teal">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-xs font-semibold text-paper">
                  {item.person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
                    <img src={item.person.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(item.person.name)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-paper">{item.person.name}</span>
                  <span className="block truncate text-xs text-paper-muted">@{item.person.handle}</span>
                </span>
                <span aria-label={REACTION_LABEL[item.reaction]} className="text-xl">
                  {REACTION_EMOJI[item.reaction]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {result.page.nextCursor ? (
        <p className="mt-4">
          <Link
            href={`${base}?${new URLSearchParams({ ...(reaction ? { reaction } : {}), cursor: result.page.nextCursor })}`}
            className="text-sm font-semibold text-spark-teal hover:underline"
          >
            Show more
          </Link>
        </p>
      ) : null}
    </PageShell>
  );
}
