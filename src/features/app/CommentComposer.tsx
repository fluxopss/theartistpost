"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import {
  addComment,
  getComments,
  getStudio,
  type LocalComment,
} from "@/features/app/storage";

export function CommentComposer({
  postId,
  existing,
}: {
  postId: string;
  existing: { id: string; body: string; author: string }[];
}) {
  const [local, setLocal] = useState<LocalComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("Studio Guest");

  useEffect(() => {
    setLocal(getComments(postId));
    setAuthor(getStudio().displayName);
  }, [postId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = addComment(postId, body, author);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setLocal((prev) => [...prev, result]);
    setBody("");
    setError(null);
  }

  const all = [
    ...existing.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.author,
      local: false,
    })),
    ...local.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.author,
      local: true,
    })),
  ];

  return (
    <section>
      <h2 className="display text-xl text-paper">Comments</h2>
      <ul className="mt-3 space-y-3">
        {all.length === 0 ? (
          <li className="text-sm text-paper-muted">No comments yet.</li>
        ) : (
          all.map((comment) => (
            <li
              key={comment.id}
              className="rounded-xl border border-line bg-surface-muted p-3"
            >
              <p className="text-sm text-paper">{comment.body}</p>
              <p className="mt-1 text-[11px] text-paper-muted">
                {comment.author}
                {comment.local ? " · on this device" : ""}
              </p>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">Leave a comment</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder={`A note from ${author}…`}
            className="w-full rounded-2xl border border-line bg-surface-glass px-4 py-3 text-sm text-paper outline-none focus:border-spark-teal"
          />
        </label>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-paper-muted">
            Comments stay on this device until artist accounts open.
          </p>
        )}
        <Button type="submit" size="sm" className="rounded-full">
          Leave a note
        </Button>
      </form>
    </section>
  );
}
