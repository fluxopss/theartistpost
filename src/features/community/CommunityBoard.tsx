"use client";

import { useState } from "react";
import type { CommunityPostDTO } from "@/server/api/communityDto";
import { webApi } from "@/features/account/webApi";
import { CommunityCard } from "@/features/community/CommunityCard";
import type { CommunityGate } from "@/features/community/gate";
import { Button } from "@/shared/ui/Button";

export type BoardQuery = {
  scope: "all" | "following" | "foryou";
  kind?: string;
  topic?: string;
};

export function boardSearch(query: BoardQuery, cursor?: string | null): string {
  const params = new URLSearchParams({ scope: query.scope });
  if (query.kind) params.set("kind", query.kind);
  if (query.topic) params.set("topic", query.topic);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

/** The board's posts with "Show more", reading the same /api/v1/community the app reads. */
export function CommunityBoard({
  initialItems,
  initialCursor,
  query,
  gate,
  viewerHandle,
}: {
  initialItems: CommunityPostDTO[];
  initialCursor: string | null;
  query: BoardQuery;
  gate: CommunityGate;
  viewerHandle: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    const result = await webApi<{ items: CommunityPostDTO[]; nextCursor: string | null }>(
      `/community?${boardSearch(query, cursor)}`,
      { onUnauthorized: "return" },
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setItems((current) => {
      const seen = new Set(current.map((p) => p.id));
      return [...current, ...result.data.items.filter((p) => !seen.has(p.id))];
    });
    setCursor(result.data.nextCursor);
  }

  return (
    <div className="space-y-4">
      {items.map((post) => (
        <CommunityCard
          key={post.id}
          post={post}
          gate={gate}
          here={`/community?${boardSearch(query)}`}
          viewerHandle={viewerHandle}
          onDeleted={() => setItems((current) => current.filter((p) => p.id !== post.id))}
          onBlocked={(handle) =>
            setItems((current) => current.filter((p) => p.author.handle.toLowerCase() !== handle.toLowerCase()))
          }
        />
      ))}
      {error ? (
        <p role="status" className="text-sm text-spark-coral">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" className="rounded-full" disabled={loading} onClick={() => void more()}>
            {loading ? "Loading…" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
