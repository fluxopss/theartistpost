"use client";

import { useState, useTransition } from "react";
import { webApi } from "@/features/account/webApi";
import { Button } from "@/shared/ui/Button";

/**
 * Self-serve deletion on the web, through the same DELETE /api/v1/me the app
 * uses. The server clears the session cookie; a full reload then resets every
 * piece of signed-in state in the page.
 */
export function DeleteAccountForm() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = confirm === "DELETE";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      const result = await webApi<{ deleted: true }>("/me", {
        method: "DELETE",
        json: { confirm: "DELETE" },
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      window.location.assign("/?deleted=1");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-paper-muted">
        This removes your profile, posts and follows for good. It can&apos;t be undone.
      </p>
      <label className="block">
        <span className="text-xs font-semibold text-paper-muted">Type DELETE to confirm</span>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="mt-2 min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm text-paper outline-none focus:border-spark-coral"
        />
      </label>
      <Button
        type="submit"
        disabled={!ready || pending}
        className="rounded-full !bg-spark-coral !text-ink disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-spark-coral">
          {error}
        </p>
      ) : null}
    </form>
  );
}
