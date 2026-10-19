import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/features/auth/adapter";
import { LegalLayout } from "@/features/app/LegalLayout";
import type { PersonSummaryDTO } from "@/server/api/communityDto";
import { listFollowers, listFollowing } from "@/server/api/people";
import { getPrisma } from "@/shared/lib/prisma";

export const FOLLOW_LIST_TAKE = 30;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

type ListProps = {
  side: "followers" | "following";
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

/** Shared body of /u/[handle]/followers and /u/[handle]/following. */
export async function FollowListPage({ side, params, searchParams }: ListProps) {
  const { handle } = await params;
  const { cursor } = await searchParams;
  const prisma = getPrisma();
  if (!prisma) notFound();

  const session = await getSession();
  const page = {
    take: FOLLOW_LIST_TAKE,
    ...(cursor && CURSOR_PATTERN.test(cursor) ? { cursor } : {}),
  };
  const list = side === "followers" ? listFollowers : listFollowing;
  const result = await list(prisma, handle, page, session?.id ?? null);
  if (!result.ok) notFound();

  const base = `/u/${encodeURIComponent(handle)}`;
  const { items, nextCursor } = result.page;

  return (
    <LegalLayout kicker={`@${handle}`} title={side === "followers" ? "Followers" : "Following"}>
      <p>
        <Link href={base}>Back to @{handle}</Link>
      </p>
      {items.length === 0 ? (
        <p>{side === "followers" ? "No followers yet." : "Not following anyone yet."}</p>
      ) : (
        <ul className="!list-none !pl-0 space-y-3">
          {items.map(personRow)}
        </ul>
      )}
      {nextCursor ? (
        <p>
          <Link href={`${base}/${side}?cursor=${encodeURIComponent(nextCursor)}`}>Show more</Link>
        </p>
      ) : null}
    </LegalLayout>
  );
}

function personRow(person: PersonSummaryDTO) {
  return (
    <li key={person.id}>
      <Link
        href={`/u/${encodeURIComponent(person.handle)}`}
        className="flex items-center gap-3 rounded-2xl border border-line p-3 !no-underline transition hover:border-spark-teal"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line text-sm font-semibold text-paper">
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
            <img src={person.avatarUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
          ) : (
            person.name.slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-paper">
            {person.name}
            {person.isArtist ? <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-spark-coral">Artist</span> : null}
          </span>
          <span className="block truncate text-xs text-paper-muted">
            @{person.handle}
            {person.headline ? ` · ${person.headline}` : ""}
          </span>
        </span>
      </Link>
    </li>
  );
}
