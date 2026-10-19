import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, PenLine } from "lucide-react";
import { getSession } from "@/features/auth/adapter";
import { CommunityBoard, type BoardQuery } from "@/features/community/CommunityBoard";
import { FilterChips } from "@/features/community/FilterChips";
import { communityGate } from "@/features/community/gate";
import { COMMUNITY_KINDS } from "@/features/community/domain/compose";
import { COMMUNITY_DEFAULT_TAKE, listCommunity } from "@/server/api/community";
import { listTopics } from "@/server/api/topics";
import { getPrisma } from "@/shared/lib/prisma";
import { joinHref } from "@/shared/lib/safeNext";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Community",
  description: "Shout-outs, collab calls, showings, asks, kindness and studio updates from the house.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

type Search = { scope?: string; kind?: string; topic?: string };

const KIND_IDS = new Set<string>(COMMUNITY_KINDS.map((k) => k.id));

function readQuery(sp: Search): BoardQuery {
  const scope = sp.scope === "following" || sp.scope === "foryou" ? sp.scope : "all";
  const kind = sp.kind && KIND_IDS.has(sp.kind) ? sp.kind : undefined;
  const topic = sp.topic && /^[a-z0-9-]{1,40}$/.test(sp.topic) ? sp.topic : undefined;
  return { scope, kind, topic };
}

function href(query: BoardQuery, change: Partial<BoardQuery>): string {
  const next = { ...query, ...change };
  const params = new URLSearchParams();
  if (next.scope !== "all") params.set("scope", next.scope);
  if (next.kind) params.set("kind", next.kind);
  if (next.topic) params.set("topic", next.topic);
  const qs = params.toString();
  return qs ? `/community?${qs}` : "/community";
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = readQuery(await searchParams);
  const session = await getSession();
  const gate = await communityGate(session);
  const signedIn = gate !== "signedOut";
  const viewer = signedIn && session ? { id: session.id, role: session.role } : null;
  const prisma = getPrisma();

  const needsJoin = query.scope !== "all" && !viewer;
  const [topics, result] = prisma
    ? await Promise.all([
        listTopics(prisma),
        needsJoin
          ? Promise.resolve(null)
          : listCommunity(
              prisma,
              { scope: query.scope, kind: query.kind as never, topic: query.topic, page: { take: COMMUNITY_DEFAULT_TAKE } },
              viewer,
            ),
      ])
    : [[], null];

  const scopes = [
    ...(signedIn ? [{ id: "foryou", label: "For You" }] : []),
    { id: "all", label: "Everyone" },
    { id: "following", label: "Following" },
  ];
  const kinds = [{ id: "", label: "All kinds" }, ...COMMUNITY_KINDS.map((k) => ({ id: k.id, label: k.label }))];
  const topicChips = [{ id: "", label: "All topics" }, ...topics.map((t) => ({ id: t.slug, label: t.name }))];
  const filtered = Boolean(query.kind || query.topic);
  const composeHref = gate === "signedOut" ? joinHref("/community/new") : "/community/new";

  return (
    <PageShell className="max-w-2xl !pt-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">The house</p>
      <h1 className="display mt-3 text-4xl text-paper">Community</h1>
      <p className="mt-3 text-sm text-paper-muted">
        Shout-outs, collab calls, showings, asks, kindness and studio updates. Same board as the app.
      </p>

      <Link
        href={composeHref}
        className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface-glass px-4 py-4 text-paper-muted transition hover:border-spark-teal hover:text-paper"
      >
        <PenLine className="h-5 w-5 text-spark-teal" aria-hidden />
        Share something with the house…
      </Link>

      <div className="mt-6 space-y-3">
        <FilterChips label="Whose posts" options={scopes} value={query.scope} hrefFor={(id) => href(query, { scope: id as BoardQuery["scope"] })} />
        <FilterChips label="Kind of post" options={kinds} value={query.kind ?? ""} hrefFor={(id) => href(query, { kind: id || undefined })} />
        {topicChips.length > 1 ? (
          <FilterChips label="Topic" options={topicChips} value={query.topic ?? ""} hrefFor={(id) => href(query, { topic: id || undefined })} />
        ) : null}
      </div>

      <Link
        href="/kindness-always"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm text-paper transition hover:border-spark-teal"
      >
        <HeartHandshake className="h-5 w-5 text-spark-coral" aria-hidden />
        <span>
          <strong>Kindness Always</strong>
          <span className="block text-xs text-paper-muted">Read the kindness wall and leave a note.</span>
        </span>
      </Link>

      <div className="mt-6">
        {needsJoin ? (
          <Empty title="Join the house" body="Sign in to see posts from the people you follow." action={{ href: joinHref(href(query, {})), label: "Sign in" }} />
        ) : !result || !result.ok ? (
          <Empty title="The board is resting" body="We couldn't load the board just now. Try again in a moment." action={{ href: href(query, {}), label: "Try again" }} />
        ) : result.page.items.length === 0 ? (
          query.scope === "following" ? (
            <Empty title="No one to hear from yet" body="Follow a few artists and their posts land here." action={{ href: "/community", label: "See everyone" }} />
          ) : query.scope === "foryou" ? (
            <Empty title="Nothing on your topics yet" body="Posts on the topics you picked land here. Pick topics on your profile, or follow a few people." action={{ href: "/settings/profile", label: "Pick your topics" }} />
          ) : filtered ? (
            <Empty title="Nothing here yet" body="No posts match those filters. Try another kind or topic, or start the conversation." action={{ href: composeHref, label: "Post to the board" }} />
          ) : (
            <Empty title="The board is quiet" body="Be the first to lift someone up." action={{ href: composeHref, label: "Post to the board" }} />
          )
        ) : (
          <CommunityBoard
            key={href(query, {})}
            initialItems={result.page.items}
            initialCursor={result.page.nextCursor}
            query={query}
            gate={gate}
            viewerHandle={session?.handle ?? null}
          />
        )}
      </div>
    </PageShell>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <h2 className="display text-2xl text-paper">{title}</h2>
      <p className="mt-2 text-sm text-paper-muted">{body}</p>
      <Link href={action.href} className="mt-5 inline-flex h-10 items-center rounded-full bg-spark-teal px-5 text-sm font-semibold text-ink hover:brightness-110">
        {action.label}
      </Link>
    </div>
  );
}
