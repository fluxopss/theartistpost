"use client";

import { useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { copy } from "@/content/site";
import type { InvolveIntent } from "@/lib/ghl";
import { parseInvolveInquiry } from "@/features/involve/validation";
import { Button } from "@/shared/ui/Button";
import { trackEvent } from "@/lib/analytics";

const MEDIA = ["music", "visual", "theater", "multidisciplinary", "other"] as const;

export function InvolveInquiryForm({ intent }: { intent: InvolveIntent }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const intentLabel = useMemo(() => {
    switch (intent) {
      case "space":
        return "Artist space";
      case "partner":
        return "Partnership";
      case "volunteer":
        return "Volunteer";
      default: {
        const _exhaustive: never = intent;
        return _exhaustive;
      }
    }
  }, [intent]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(
      [...new FormData(form).entries()].map(([key, value]) => [
        key,
        String(value),
      ]),
    );
    const parsed = parseInvolveInquiry({ ...data, intent });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/involve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Could not send. Email Robbie and we will catch you.");
        setStatus("idle");
        return;
      }
      setStatus("success");
      trackEvent("involve_submit", { intent });
      form.reset();
    } catch {
      setError("Could not send. Email Robbie and we will catch you.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 px-4 py-4 text-success"
        role="status"
      >
        <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm font-medium">{copy.involve.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
        {intentLabel}
      </p>
      <h3 className="display text-2xl text-paper">{copy.involve.formTitle}</h3>
      <p className="text-sm text-paper-muted">{copy.involve.formBody}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">Name</span>
          <input
            name="name"
            required
            autoComplete="name"
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">Phone (optional)</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">City (optional)</span>
          <input
            name="city"
            autoComplete="address-level2"
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          />
        </label>
      </div>

      {intent === "space" ? (
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">Medium</span>
          <select
            name="medium"
            defaultValue="visual"
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          >
            {MEDIA.map((m) => (
              <option key={m} value={m}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block text-paper-muted">How do you want to show up?</span>
        <textarea
          name="message"
          required
          rows={4}
          maxLength={800}
          className="w-full rounded-2xl border border-line bg-surface-glass px-5 py-3 text-sm outline-none focus:border-spark-teal"
        />
      </label>

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full !bg-spark-coral !text-ink"
        size="lg"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          "Send to TAP"
        )}
      </Button>
    </form>
  );
}
