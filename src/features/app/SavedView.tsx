"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSaves, type SavedLibrary } from "@/features/app/storage";

export function SavedView() {
  const [library, setLibrary] = useState<SavedLibrary>({ posts: [], events: [] });

  useEffect(() => {
    setLibrary(getSaves());
  }, []);

  const empty = library.posts.length === 0 && library.events.length === 0;

  return (
    <div className="space-y-8">
      {empty ? (
        <p className="rounded-2xl border border-line bg-surface-glass px-4 py-6 text-sm text-paper-muted">
          Nothing saved yet. Open a work on The Wall or a night on the schedule
          and keep it here — on this device only.
        </p>
      ) : null}

      {library.posts.length > 0 ? (
        <section>
          <h2 className="display text-2xl text-paper">Works</h2>
          <ul className="mt-4 space-y-2">
            {library.posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/post/${post.slug}`}
                  className="block rounded-2xl border border-line px-4 py-3 hover:border-spark-teal"
                >
                  <span className="font-semibold text-paper">{post.title}</span>
                  <span className="mt-0.5 block text-sm text-paper-muted">
                    {post.artist}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {library.events.length > 0 ? (
        <section>
          <h2 className="display text-2xl text-paper">Nights</h2>
          <ul className="mt-4 space-y-2">
            {library.events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/event/${event.id}`}
                  className="block rounded-2xl border border-line px-4 py-3 hover:border-spark-gold"
                >
                  <span className="font-semibold text-paper">{event.title}</span>
                  <span className="mt-0.5 block text-sm text-paper-muted">
                    {event.venue}
                    {event.start
                      ? ` · ${new Date(event.start).toLocaleDateString()}`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
