"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { ArtistDetail } from "@/features/posts/types";
import { PostCard } from "@/features/posts/PostCard";
import {
  staggerContainer,
  fadeUp,
  useMotionSafe,
} from "@/shared/motion/variants";

export function ArtistProfileView({ artist }: { artist: ArtistDetail }) {
  const { initial, animate } = useMotionSafe();
  const social = artist.socialLinks ?? {};

  return (
    <div className="px-4 py-6">
      <motion.header
        className="flex items-center gap-4"
        variants={staggerContainer}
        initial={initial}
        animate={animate}
      >
        <motion.div
          variants={fadeUp}
          className="relative h-20 w-20 overflow-hidden rounded-2xl border border-line"
        >
          {artist.avatarUrl ? (
            <Image
              src={artist.avatarUrl}
              alt={artist.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : null}
        </motion.div>
        <div>
          <motion.p
            variants={fadeUp}
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral"
          >
            @{artist.handle}
          </motion.p>
          <motion.h1 variants={fadeUp} className="display text-2xl text-ink">
            {artist.name}
          </motion.h1>
        </div>
      </motion.header>

      {artist.bio ? (
        <p className="mt-4 text-sm text-paper-muted">{artist.bio}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {Object.entries(social).map(([key, href]) =>
          href ? (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1 capitalize text-ink"
            >
              {key}
            </a>
          ) : null,
        )}
      </div>

      <div className="mt-6 space-y-4">
        {artist.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
