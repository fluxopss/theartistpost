"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { webApi } from "@/features/account/webApi";
import { GateHint } from "@/features/community/GateHint";
import type { CommunityGate } from "@/features/community/gate";
import {
  applyViewerReaction,
  REACTION_EMOJI,
  REACTION_LABEL,
  REACTIONS,
  topReactions,
  totalReactions,
  type Reaction,
  type ReactionCounts,
} from "@/features/community/domain/reactions";
import { joinHref } from "@/shared/lib/safeNext";
import { cn } from "@/shared/lib/cn";

type Post = {
  id: string;
  viewerReaction: Reaction | null;
  reactionCounts: ReactionCounts;
};

type ServerState = { viewerReaction: Reaction | null; reactionCounts: ReactionCounts };

/**
 * Kind-only reactions, like the app: one tap gives Support (tap again to take
 * it back), the chooser picks any of five. Nothing is ranked by reactions.
 */
export function ReactionBar({ post, gate, here }: { post: Post; gate: CommunityGate; here?: string }) {
  const [state, setState] = useState({ viewerReaction: post.viewerReaction, reactionCounts: post.reactionCounts });
  const [chooserOpen, setChooserOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const inFlight = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chooserOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && rootRef.current?.contains(event.target as Node)) return;
      setChooserOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [chooserOpen]);

  const total = totalReactions(state.reactionCounts);
  const summary = topReactions(state.reactionCounts);
  const mine = state.viewerReaction;

  async function choose(next: Reaction | null) {
    setChooserOpen(false);
    if (gate !== "ready") {
      setBlocked(true);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    const before = state;
    const optimistic = applyViewerReaction(state, next);
    setState({ viewerReaction: optimistic.viewerReaction, reactionCounts: optimistic.reactionCounts });

    const path = `/community/${encodeURIComponent(post.id)}/reaction` as const;
    const result = next
      ? await webApi<ServerState>(path, { method: "PUT", json: { reaction: next } })
      : await webApi<ServerState>(path, { method: "DELETE" });
    if (result.ok) {
      setState({ viewerReaction: result.data.viewerReaction, reactionCounts: result.data.reactionCounts });
    } else {
      setState(before);
      if (result.status === 403 && result.error.code === "forbidden") setBlocked(true);
      else setError(result.status === 429 ? "Try again in a moment." : result.error.message);
    }
    inFlight.current = false;
  }

  const mainLabel = mine ? `You reacted with ${REACTION_LABEL[mine]}. Tap to take it back` : "React with Support";
  const pill =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition";

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-2">
      {gate === "signedOut" ? (
        <Link href={joinHref(here ?? "/community")} className={cn(pill, "border-line text-paper-muted hover:text-paper")}>
          <span aria-hidden>{REACTION_EMOJI.SUPPORT}</span> React
        </Link>
      ) : (
        <>
          <button
            type="button"
            aria-label={mainLabel}
            aria-pressed={mine !== null}
            onClick={() => void choose(mine ? null : "SUPPORT")}
            className={cn(
              pill,
              mine ? "border-spark-teal bg-accent-soft text-spark-teal" : "border-line text-paper-muted hover:text-paper",
            )}
          >
            <span aria-hidden>{REACTION_EMOJI[mine ?? "SUPPORT"]}</span>
            <span aria-hidden>{mine ? REACTION_LABEL[mine] : "React"}</span>
          </button>
          <button
            type="button"
            aria-label="Choose a reaction"
            aria-haspopup="menu"
            aria-expanded={chooserOpen}
            onClick={() => setChooserOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-muted transition hover:text-paper"
          >
            <SmilePlus className="h-4 w-4" aria-hidden />
          </button>
        </>
      )}

      {chooserOpen ? (
        <div role="menu" aria-label="Reactions" className="absolute bottom-11 left-0 z-20 flex gap-1 rounded-full border border-line bg-ink-elevated p-1 shadow-xl">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction}
              type="button"
              role="menuitem"
              aria-label={REACTION_LABEL[reaction]}
              title={REACTION_LABEL[reaction]}
              onClick={() => void choose(mine === reaction ? null : reaction)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:bg-accent-soft",
                mine === reaction && "bg-accent-soft",
              )}
            >
              <span aria-hidden>{REACTION_EMOJI[reaction]}</span>
            </button>
          ))}
        </div>
      ) : null}

      {total > 0 ? (
        <Link
          href={`/community/${encodeURIComponent(post.id)}/reactions`}
          aria-label={`${total} ${total === 1 ? "reaction" : "reactions"}, see who reacted`}
          className="inline-flex items-center gap-1 text-sm text-paper-muted hover:text-paper"
        >
          <span aria-hidden>{summary.map((s) => s.emoji).join("")}</span>
          <span aria-hidden className="tabular-nums">{total}</span>
        </Link>
      ) : null}

      {blocked ? <div className="w-full"><GateHint gate={gate === "ready" ? "needsProfile" : gate} here={here} action="react" /></div> : null}
      {error ? (
        <p role="status" className="w-full text-xs text-spark-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
