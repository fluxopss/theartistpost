import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/content/site";
import { LegalLayout } from "@/features/app/LegalLayout";
import { getSession } from "@/features/auth/adapter";
import { FollowBar } from "@/features/people/FollowButton";
import { CommunityCard } from "@/features/community/CommunityCard";
import { communityGate } from "@/features/community/gate";
import { isPlausibleHandle } from "@/server/api/posts";
import { getPerson, listPersonCommunity } from "@/server/api/people";
import { getPrisma } from "@/shared/lib/prisma";

type Props = { params: Promise<{ handle: string }> };

export const dynamic = "force-dynamic";

async function loadProfile(handle: string) {
  if (!isPlausibleHandle(handle)) return null;
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const session = await getSession();
    const viewer = session ? { id: session.id, role: session.role } : null;
    const person = await getPerson(prisma, handle, viewer?.id ?? null);
    if (!person) return null;
    const posts = await listPersonCommunity(
      prisma,
      handle,
      { take: 10 },
      viewer,
    );
    return { person, posts: posts.ok ? posts.page.items : [], signedIn: Boolean(viewer), gate: await communityGate(session), viewerHandle: session?.handle ?? null };
  } catch (error) {
    console.error("[u/[handle]]", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) return { title: "Profile", robots: { index: false } };
  const { person } = profile;
  return {
    title: `${person.name} (@${person.handle})`,
    description:
      person.headline ?? person.bio ?? `${person.name} on ${site.name}.`,
    // Only artists get a search-indexable page; members stay shareable but unlisted.
    robots: person.isArtist ? { index: true } : { index: false },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) notFound();
  const { person, posts, signedIn, gate, viewerHandle } = profile;

  return (
    <LegalLayout kicker={person.isArtist ? "Artist" : "Member"} title={person.name}>
      <div className="flex items-center gap-4">
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- absolute upload URL on our own origin
          <img
            src={person.avatarUrl}
            alt={person.name}
            width={80}
            height={80}
            className="h-20 w-20 rounded-2xl border border-line object-cover"
          />
        ) : null}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-spark-coral">
            @{person.handle}
          </p>
          {person.headline ? <p>{person.headline}</p> : null}
          {person.location || person.chapter ? (
            <p>
              {[person.location, person.chapter?.name]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {person.bio ? <p>{person.bio}</p> : null}

      {person.topics.length > 0 ? (
        <ul aria-label="Topics" className="!list-none !pl-0 flex flex-wrap gap-2">
          {person.topics.map((topic) => (
            <li
              key={topic.slug}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-paper"
            >
              {topic.name}
            </li>
          ))}
        </ul>
      ) : null}

      <FollowBar
        handle={person.handle}
        initialFollowing={person.viewerFollows}
        initialFollowerCount={person.followerCount}
        followingCount={person.followingCount}
        postCount={person.communityPostCount}
        signedIn={signedIn}
        isSelf={person.isSelf}
        followsViewer={person.followsViewer}
      />

      {person.artist?.approved ? (
        <p>
          <a href={`/artist/${person.artist.handle}`}>See their work on the Wall</a>
        </p>
      ) : null}

      <h2>Recent on the community board</h2>
      {posts.length === 0 ? (
        <p>Nothing posted yet.</p>
      ) : (
        <div className="not-prose space-y-4">
          {posts.map((post) => (
            <CommunityCard key={post.id} post={post} gate={gate} here={`/u/${person.handle}`} viewerHandle={viewerHandle} />
          ))}
        </div>
      )}
      <p>
        <Link href="/community">See the whole community board</Link>
      </p>

      {signedIn ? null : (
        <p>
          Sign in to follow {person.name}, or open {site.name} in the app to
          join the conversation.
        </p>
      )}
    </LegalLayout>
  );
}
