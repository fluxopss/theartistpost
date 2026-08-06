"use client";

import Image from "next/image";
import Link from "next/link";
import type { PostDetail } from "@/features/posts/types";
import { TagChip } from "@/shared/ui/TagChip";
import { LikeButton } from "@/shared/ui/LikeButton";

export function PostDetailView({ post }: { post: PostDetail }) {
  return (
    <article>
      <div className="relative isolate min-h-[42vh] overflow-hidden md:min-h-[52vh]">
        {post.mediaUrl ? (
          <Image
            src={post.mediaUrl}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="relative z-10 mx-auto flex min-h-[42vh] max-w-[var(--content-max)] flex-col justify-end px-4 pb-8 pt-20 sm:px-6 md:min-h-[52vh]">
          <Link
            href="/explore"
            className="mb-auto w-fit rounded-full bg-ink/40 px-3 py-1 text-xs font-semibold text-paper-on-dark backdrop-blur"
          >
            ← Explore
          </Link>
          <h1 className="display text-3xl text-paper-on-dark sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-2 text-sm text-paper-on-dark/80 sm:text-base">
            by{" "}
            <Link
              href={`/artist/${post.artist.handle}`}
              className="font-semibold underline-offset-2 hover:underline"
            >
              {post.artist.name}
            </Link>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[var(--content-max)] space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <LikeButton initialCount={post.likeCount} />
          <span className="text-xs text-paper-muted">
            {post.viewCount} views
          </span>
          {post.tags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              slug={tag.slug}
              href={`/explore?tag=${tag.slug}`}
            />
          ))}
        </div>

        <p className="max-w-2xl text-base leading-relaxed text-paper-muted">
          {post.description}
        </p>

        <section>
          <h2 className="display text-xl text-ink">Comments</h2>
          <ul className="mt-3 space-y-3">
            {post.comments.length === 0 ? (
              <li className="text-sm text-paper-muted">No comments yet.</li>
            ) : (
              post.comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-xl border border-line bg-surface-muted p-3"
                >
                  <p className="text-sm text-ink">{comment.body}</p>
                  <p className="mt-1 text-[11px] text-paper-muted">
                    {comment.author.name}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </article>
  );
}
