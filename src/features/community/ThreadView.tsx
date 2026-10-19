"use client";

import { useRouter } from "next/navigation";
import type { CommunityPostDTO } from "@/server/api/communityDto";
import { CommunityCard } from "@/features/community/CommunityCard";
import type { CommunityGate } from "@/features/community/gate";
import { ReplyBox } from "@/features/community/ReplyBox";

/** One post, its replies, and a box to answer. Deleting the post returns to the board. */
export function ThreadView({
  post,
  replies,
  gate,
  viewerHandle,
}: {
  post: CommunityPostDTO;
  replies: CommunityPostDTO[];
  gate: CommunityGate;
  viewerHandle: string | null;
}) {
  const router = useRouter();
  const here = `/community/${post.id}`;
  return (
    <div className="space-y-6">
      <CommunityCard post={post} variant="thread" gate={gate} here={here} viewerHandle={viewerHandle} onDeleted={() => router.push("/community")} />
      <section aria-labelledby="replies-title" className="space-y-2">
        <h2 id="replies-title" className="text-sm font-semibold text-paper">
          {replies.length === 0 ? "No replies yet" : replies.length === 1 ? "1 reply" : `${replies.length} replies`}
        </h2>
        {replies.length === 0 ? <p className="text-xs text-paper-muted">Be the first to answer kindly.</p> : null}
        <div>
          {replies.map((reply) => (
            <CommunityCard key={reply.id} post={reply} variant="reply" gate={gate} here={here} viewerHandle={viewerHandle} />
          ))}
        </div>
      </section>
      <ReplyBox parentId={post.id} kind={post.kind} gate={gate} here={here} />
    </div>
  );
}
