"use client";

import Image from "next/image";
import Link from "next/link";
import { mediaKindLabel } from "@/features/posts/mediaRule";
import type { PostDetail } from "@/features/posts/types";
import { TagChip } from "@/shared/ui/TagChip";
import { LikeButton } from "@/shared/ui/LikeButton";
import { SavePostButton } from "@/features/app/SaveButton";
import { CommentComposer } from "@/features/app/CommentComposer";

export function PostDetailView({ post }: { post: PostDetail }) {
  const photo = post.mediaType === "IMAGE" && Boolean(post.mediaUrl);
  const video = post.mediaType === "VIDEO" && Boolean(post.mediaUrl);
  const sound = post.mediaType === "EMBED" && Boolean(post.mediaUrl);

  return (
    <article>
      <div className="relative isolate min-h-[42vh] overflow-hidden md:min-h-[52vh]">
        {photo ? (
          <Image
            src={post.mediaUrl!}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
        {video ? (
          <video
            src={post.mediaUrl!}
            controls
            playsInline
            className="absolute inset-0 h-full w-full bg-black object-contain"
            aria-label={post.title}
          />
        ) : null}
        {sound ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink px-6">
            <div className="w-full max-w-lg">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-spark-gold">
                Sound
              </p>
              <audio src={post.mediaUrl!} controls className="w-full" aria-label={post.title} />
            </div>
          </div>
        ) : null}
        {!photo && !video && !sound ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
            <span className="display text-3xl text-spark-gold">
              {mediaKindLabel(post.mediaType)}
            </span>
          </div>
        ) : null}
        {photo ? (
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        ) : null}
        <Link
          href="/explore"
          className="absolute left-4 top-4 z-10 w-fit rounded-full bg-ink/40 px-3 py-1 text-xs font-semibold text-paper-on-dark backdrop-blur sm:left-6"
        >
          ← Explore
        </Link>
        {photo ? (
          <div className="relative z-10 mx-auto flex min-h-[42vh] max-w-[var(--content-max)] flex-col justify-end px-4 pb-8 pt-20 sm:px-6 md:min-h-[52vh]">
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
        ) : null}
      </div>

      {!photo ? (
        <div className="mx-auto max-w-[var(--content-max)] px-4 pt-6 sm:px-6">
          <h1 className="display text-3xl text-paper sm:text-5xl">{post.title}</h1>
          <p className="mt-2 text-sm text-paper-muted sm:text-base">
            by{" "}
            <Link
              href={`/artist/${post.artist.handle}`}
              className="font-semibold text-paper underline-offset-2 hover:underline"
            >
              {post.artist.name}
            </Link>
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-[var(--content-max)] space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <LikeButton id={post.id} initialCount={post.likeCount} />
          <SavePostButton
            post={{
              id: post.id,
              slug: post.slug,
              title: post.title,
              artist: post.artist.name,
            }}
          />
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

        <CommentComposer
          postId={post.id}
          existing={post.comments.map((comment) => ({
            id: comment.id,
            body: comment.body,
            author: comment.author.name,
          }))}
        />
      </div>
    </article>
  );
}
