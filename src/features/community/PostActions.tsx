"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { webApi } from "@/features/account/webApi";
import type { CommunityGate } from "@/features/community/gate";
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from "@/features/community/domain/reasons";
import { joinHref } from "@/shared/lib/safeNext";
import { Button } from "@/shared/ui/Button";

type Mode = "closed" | "menu" | "report" | "confirmBlock" | "confirmDelete";

const item = "block w-full rounded-xl px-3 py-2 text-left text-sm text-paper transition hover:bg-accent-soft";

/** The "⋯" on a post: report, block the author, or delete your own. Same calls as the app. */
export function PostActions({
  post,
  gate,
  here,
  isOwn = false,
  onDeleted,
}: {
  post: { id: string; canDelete: boolean; author: { handle: string } };
  gate: CommunityGate;
  here?: string;
  isOwn?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("closed");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (mode !== "menu") return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && rootRef.current?.contains(event.target as Node)) return;
      setMode("closed");
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [mode]);

  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>, done: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error?.message ?? "Try again in a moment." });
      return false;
    }
    setMode("closed");
    setMessage({ tone: "ok", text: done });
    return true;
  }

  async function sendReport() {
    if (!reason) return;
    await run(
      () =>
        webApi("/reports", {
          method: "POST",
          json: { targetType: "COMMUNITY_POST", targetId: post.id, reason, ...(note.trim() ? { note: note.trim() } : {}) },
        }),
      "Thanks for telling us. The house team reviews reports within 24 hours.",
    );
  }

  async function block() {
    const ok = await run(
      () => webApi("/blocks", { method: "POST", json: { handle: post.author.handle } }),
      `You blocked @${post.author.handle}. You won't see each other's posts.`,
    );
    if (ok) router.refresh();
  }

  async function remove() {
    const ok = await run(() => webApi(`/community/${encodeURIComponent(post.id)}`, { method: "DELETE" }), "Deleted.");
    if (!ok) return;
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  const canTakePart = gate === "ready" || gate === "needsProfile";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="More for this post"
        aria-haspopup="menu"
        aria-expanded={mode === "menu"}
        aria-controls={mode === "menu" ? panelId : undefined}
        onClick={() => setMode(mode === "menu" ? "closed" : "menu")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-paper-muted transition hover:bg-accent-soft hover:text-paper"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>

      {mode === "menu" ? (
        <div id={panelId} role="menu" aria-label="Post actions" className="absolute right-0 top-10 z-30 w-56 rounded-2xl border border-line bg-ink-elevated p-1.5 shadow-xl">
          {gate === "signedOut" ? (
            <Link role="menuitem" href={joinHref(here ?? `/community/${post.id}`)} className={item}>
              Sign in to report or block
            </Link>
          ) : (
            <>
              {isOwn && post.canDelete ? (
                <button type="button" role="menuitem" className={item} onClick={() => setMode("confirmDelete")}>
                  Delete post
                </button>
              ) : null}
              {!isOwn && canTakePart ? (
                <>
                  <button type="button" role="menuitem" className={item} onClick={() => setMode("report")}>
                    Report post
                  </button>
                  <button type="button" role="menuitem" className={item} onClick={() => setMode("confirmBlock")}>
                    Block @{post.author.handle}
                  </button>
                </>
              ) : null}
              {!isOwn && !canTakePart ? (
                <p className="px-3 py-2 text-xs text-paper-muted">Your account is paused.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {mode === "report" || mode === "confirmBlock" || mode === "confirmDelete" ? (
        <div className="absolute right-0 top-10 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-ink-elevated p-4 shadow-xl">
          {mode === "report" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-paper">What&apos;s wrong with this post?</legend>
              {REPORT_REASONS.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm text-paper">
                  <input
                    type="radio"
                    name={`reason-${post.id}`}
                    checked={reason === option.id}
                    onChange={() => setReason(option.id)}
                  />
                  {option.label}
                </label>
              ))}
              <label className="block text-xs font-semibold text-paper-muted">
                Anything else? (optional)
                <textarea
                  value={note}
                  maxLength={REPORT_NOTE_MAX}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 min-h-20 w-full rounded-xl border border-line bg-surface-glass p-2 text-sm text-paper outline-none focus:border-spark-teal"
                />
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="rounded-full" disabled={!reason || busy} onClick={() => void sendReport()}>
                  {busy ? "Sending…" : "Send report"}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setMode("closed")}>
                  Cancel
                </Button>
              </div>
            </fieldset>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-paper">
                {mode === "confirmBlock"
                  ? `Block @${post.author.handle}? You won't see each other's posts, replies or profiles. You can unblock in the app's Settings.`
                  : "Delete this post for good? Replies under it go too."}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full !bg-spark-coral !text-ink"
                  disabled={busy}
                  onClick={() => void (mode === "confirmBlock" ? block() : remove())}
                >
                  {busy ? "One moment…" : mode === "confirmBlock" ? "Yes, block" : "Yes, delete"}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setMode("closed")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {message ? (
        <p role="status" className={`absolute right-0 top-10 z-20 w-64 rounded-xl border border-line bg-ink-elevated p-3 text-xs shadow-lg ${message.tone === "ok" ? "text-paper" : "text-spark-coral"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
