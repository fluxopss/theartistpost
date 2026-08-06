"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { PostDetail } from "@/features/posts/types";
import { TagChip } from "@/shared/ui/TagChip";
import { LikeButton } from "@/shared/ui/LikeButton";
import { WebGLGate } from "@/shared/three/WebGLGate";
import {
  fadeUp,
  staggerContainer,
  useMotionSafe,
} from "@/shared/motion/variants";

const PostCard3D = dynamic(
  () => import("@/shared/three/PostCard3D").then((m) => m.PostCard3D),
  { ssr: false },
);

export function PostDetailView({ post }: { post: PostDetail }) {
  const { initial, animate } = useMotionSafe();
  const accent = post.theme?.primary ?? "#031a37";

  return (
    <article>
      <div className="relative isolate min-h-[42vh] overflow-hidden">
        {post.mediaUrl ? (
          <Image
            src={post.mediaUrl}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="relative z-10 flex min-h-[42vh] flex-col justify-end px-4 pb-6 pt-16">
          <Link
            href="/explore"
            className="mb-auto w-fit rounded-full bg-ink/40 px-3 py-1 text-xs font-semibold text-paper-on-dark backdrop-blur"
          >
            ← Explore
          </Link>
          <h1 className="display text-3xl text-paper-on-dark">{post.title}</h1>
          <p className="mt-2 text-sm text-paper-on-dark/80">
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

      <motion.div
        className="space-y-5 px-4 py-5"
        variants={staggerContainer}
        initial={initial}
        animate={animate}
      >
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center gap-2"
        >
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
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed text-paper-muted"
        >
          {post.description}
        </motion.p>

        <motion.div variants={fadeUp}>
          <WebGLGate
            fallback={
              <div
                className="flex h-44 items-center justify-center rounded-2xl border border-line bg-surface-muted text-xs text-paper-muted"
                style={{ boxShadow: `inset 0 0 40px ${accent}18` }}
              >
                3D preview paused
              </div>
            }
          >
            <PostCard3D accent={accent} mediaUrl={post.mediaUrl} />
          </WebGLGate>
        </motion.div>

        <motion.section variants={fadeUp}>
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
        </motion.section>
      </motion.div>
    </article>
  );
}
