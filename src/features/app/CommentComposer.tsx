"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { useHydratedState } from "@/hooks/useHydrated";
import { useSession } from "@/features/auth/AuthProvider";
import { createCommentAction } from "@/features/posts/engagement";
import {
  addComment,
  getComments,
  getStudio,
  type LocalComment,
} from "@/features/app/storage";

type DisplayComment = {
  id: string;
  body: string;
  author: string;
  local: boolean;
};

export function CommentComposer({
  postId,
  existing,
}: {
  postId: string;
  existing: { id: string; body: string; author: string }[];
}) {
  const { user, isAuthenticated } = useSession();
  const signedIn = isAuthenticated && Boolean(user);
  // Device-only comments: re-read from storage per post and whenever the session flips.
  const [local, setLocal] = useHydratedState<LocalComment[]>(
    signedIn ? "signed-in" : `device:${postId}`,
    () => (signedIn ? [] : getComments(postId)),
    [],
  );
  const [serverExtra, setServerExtra] = useState<DisplayComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [studioName] = useHydratedState(
    `studio:${postId}:${signedIn}`,
    () => getStudio().displayName,
    "Guest",
  );
  const author = signedIn ? user!.name : studioName;
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (signedIn) {
      startTransition(async () => {
        const result = await createCommentAction({ postId, body });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setServerExtra((prev) => [
          ...prev,
          {
            id: result.comment.id,
            body: result.comment.body,
            author: result.comment.author,
            local: false,
          },
        ]);
        setBody("");
      });
      return;
    }

    const result = addComment(postId, body, author);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setLocal((prev) => [...prev, result]);
    setBody("");
  }

  const all: DisplayComment[] = [
    ...existing.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.author,
      local: false,
    })),
    ...serverExtra,
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
            placeholder={
              signedIn
                ? `A note from ${author}…`
                : "Join to leave a note on the Wall…"
            }
            className="w-full rounded-2xl border border-line bg-surface-glass px-4 py-3 text-sm text-paper outline-none focus:border-spark-teal"
          />
        </label>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : signedIn ? (
          <p className="text-xs text-paper-muted">
            Notes from {author} land on the shared Wall.
          </p>
        ) : (
          <p className="text-xs text-paper-muted">
            Signed-out notes stay on this device.{" "}
            <Link
              href="/join?door=member"
              className="font-semibold text-spark-teal underline-offset-2 hover:underline"
            >
              Join as a member
            </Link>{" "}
            to leave a real comment.
          </p>
        )}
        {signedIn ? (
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="rounded-full"
          >
            {pending ? "Sending…" : "Leave a note"}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="outline" className="rounded-full">
              Save on this device
            </Button>
            <ButtonLink href="/join?door=member" size="sm" className="rounded-full">
              Join to post publicly
            </ButtonLink>
          </div>
        )}
      </form>
    </section>
  );
}
