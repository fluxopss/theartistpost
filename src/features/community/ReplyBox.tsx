"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { webApi } from "@/features/account/webApi";
import { GateHint } from "@/features/community/GateHint";
import type { CommunityGate } from "@/features/community/gate";
import { COMMUNITY_BODY_MAX, validateCommunityBody, type CommunityKind } from "@/features/community/domain/compose";
import { graphemeLength } from "@/shared/lib/graphemes";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

/** Answer a post (one level deep, like the app). Keeps the words if sending fails. */
export function ReplyBox({
  parentId,
  kind,
  gate,
  here,
}: {
  parentId: string;
  kind: CommunityKind;
  gate: CommunityGate;
  here?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  if (gate !== "ready") {
    return <GateHint gate={gate} here={here ?? `/community/${parentId}`} action="reply" />;
  }

  const count = graphemeLength(body.trim());
  const check = validateCommunityBody(body);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!check.ok || busy) return;
    setBusy(true);
    setError(null);
    const result = await webApi("/community", { method: "POST", json: { kind, body: check.body, parentId } });
    setBusy(false);
    if (!result.ok) {
      if (result.status === 403 && result.error.code === "forbidden") setNeedsProfile(true);
      else setError(result.status === 429 ? "Try again in a moment." : result.error.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="space-y-2">
      <label htmlFor={`reply-${parentId}`} className="text-xs font-semibold text-paper-muted">
        Your reply
      </label>
      <textarea
        id={`reply-${parentId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Answer kindly…"
        className="min-h-24 w-full rounded-2xl border border-line bg-surface-glass p-3 text-sm text-paper outline-none focus:border-spark-teal"
      />
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs tabular-nums", count > COMMUNITY_BODY_MAX ? "text-spark-coral" : "text-paper-muted")}>
          {count}/{COMMUNITY_BODY_MAX}
        </span>
        <Button type="submit" size="sm" className="rounded-full" disabled={!check.ok || busy}>
          {busy ? "Sending…" : "Reply"}
        </Button>
      </div>
      {needsProfile ? <GateHint gate="needsProfile" action="reply" /> : null}
      {error ? (
        <p role="status" className="text-xs text-spark-coral">
          {error}
        </p>
      ) : null}
    </form>
  );
}
