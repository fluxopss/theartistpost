"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { CommunityPostDTO } from "@/server/api/communityDto";
import { initialsOf } from "@/features/account/accountLinks";
import { COMMUNITY_KINDS } from "@/features/community/domain/compose";
import { formatActivityTime } from "@/features/community/domain/time";
import type { CommunityGate } from "@/features/community/gate";
import { MentionText } from "@/features/community/MentionText";
import { PostActions } from "@/features/community/PostActions";
import { ReactionBar } from "@/features/community/ReactionBar";
import { cn } from "@/shared/lib/cn";

type Variant = "feed" | "thread" | "reply";

const KIND_LABEL = Object.fromEntries(COMMUNITY_KINDS.map((k) => [k.id, k.label])) as Record<string, string>;

/** One community post, like the app's card: who, what kind, the words, a photo, React and Replies. */
export function CommunityCard({
  post,
  variant = "feed",
  gate,
  here,
  viewerHandle,
  onDeleted,
  onBlocked,
}: {
  post: CommunityPostDTO;
  variant?: Variant;
  gate: CommunityGate;
  here?: string;
  viewerHandle?: string | null;
  onDeleted?: () => void;
  onBlocked?: (handle: string) => void;
}) {
  const isReply = variant === "reply";
  const isOwn = Boolean(viewerHandle) && viewerHandle!.toLowerCase() === post.author.handle.toLowerCase();
  const time = formatActivityTime(post.createdAt);
  const thread = `/community/${encodeURIComponent(post.id)}`;
  const size = isReply ? "h-8 w-8" : "h-10 w-10";

  return (
    <article
      className={cn(
        "space-y-3",
        isReply ? "border-t border-line py-4" : "rounded-2xl border border-line bg-surface-glass p-4 sm:p-5",
      )}
    >
      <header className="flex items-center gap-3">
        <Link href={`/u/${encodeURIComponent(post.author.handle)}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-xs font-semibold text-paper", size)}>
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
              <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>{initialsOf(post.author.name)}</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-paper">
              {post.author.name}
              {post.author.isArtist ? (
                <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-spark-coral">Artist</span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-paper-muted">
              @{post.author.handle}
              {time ? (
                <>
                  {" · "}
                  <time dateTime={post.createdAt} suppressHydrationWarning>
                    {time}
                  </time>
                </>
              ) : null}
            </span>
          </span>
        </Link>
        <PostActions post={post} gate={gate} here={here ?? thread} isOwn={isOwn} onDeleted={onDeleted} onBlocked={onBlocked} />
      </header>

      {!isReply ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-spark-teal">
            {KIND_LABEL[post.kind] ?? post.kind}
          </span>
          {post.topic ? <span className="text-xs text-paper-muted">{post.topic.name}</span> : null}
        </div>
      ) : null}

      <MentionText body={post.body} className={cn("text-paper", isReply ? "text-sm" : "text-base")} />

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
        <img
          src={post.imageUrl}
          alt={`Photo shared by ${post.author.name}`}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-xl border border-line object-cover"
        />
      ) : null}

      <footer className="flex flex-wrap items-center gap-4">
        <ReactionBar post={post} gate={gate} here={here ?? thread} />
        {variant === "feed" ? (
          <Link href={thread} className="inline-flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper">
            <MessageCircle className="h-4 w-4" aria-hidden />
            {post.replyCount === 0 ? "Reply" : `${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}`}
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
