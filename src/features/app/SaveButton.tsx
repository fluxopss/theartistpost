"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  isEventSaved,
  isPostSaved,
  toggleSavedEvent,
  toggleSavedPost,
  type SavedEvent,
  type SavedPost,
} from "@/features/app/storage";

export function SavePostButton({
  post,
  className,
}: {
  post: SavedPost;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isPostSaved(post.id));
  }, [post.id]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => setSaved(toggleSavedPost(post))}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition",
        saved
          ? "border-spark-gold bg-spark-gold/10 text-spark-gold"
          : "border-line text-paper-muted hover:text-paper",
        className,
      )}
    >
      <Bookmark className="h-4 w-4" aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function SaveEventButton({
  event,
  className,
}: {
  event: SavedEvent;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isEventSaved(event.id));
  }, [event.id]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => setSaved(toggleSavedEvent(event))}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
        saved
          ? "border-spark-gold bg-spark-gold/10 text-spark-gold"
          : "border-line text-paper hover:border-spark-gold",
        className,
      )}
    >
      <Bookmark className="h-4 w-4" aria-hidden />
      {saved ? "Saved on this device" : "Save this night"}
    </button>
  );
}
