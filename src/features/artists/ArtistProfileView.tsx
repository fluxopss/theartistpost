"use client";

import Image from "next/image";
import type { ArtistDetail } from "@/features/posts/types";
import { PostCard } from "@/features/posts/PostCard";

export function ArtistProfileView({ artist }: { artist: ArtistDetail }) {
  const social = artist.socialLinks ?? {};

  return (
    <div className="px-4 py-6">
      <header className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-line">
          {artist.avatarUrl ? (
            <Image
              src={artist.avatarUrl}
              alt={artist.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-spark-coral">
            @{artist.handle}
          </p>
          <h1 className="display mt-1 text-2xl text-paper">{artist.name}</h1>
        </div>
      </header>

      {artist.bio ? (
        <p className="mt-4 text-sm leading-relaxed text-paper-muted">
          {artist.bio}
        </p>
      ) : null}

      {Object.keys(social).length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {Object.entries(social).map(([key, href]) =>
            href ? (
              <li key={key}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-line px-3 py-1.5 text-xs font-semibold capitalize text-paper"
                >
                  {key}
                </a>
              </li>
            ) : null,
          )}
        </ul>
      ) : null}

      <section className="mt-8 space-y-4">
        <h2 className="display text-xl text-paper">On the wall</h2>
        {artist.posts.length === 0 ? (
          <p className="text-sm text-paper-muted">No posts yet.</p>
        ) : (
          artist.posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
