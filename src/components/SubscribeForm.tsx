"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import { site } from "@/content/site";
import { parseSubscribeEmail } from "@/features/app/subscribe";
import { trackEvent } from "@/lib/analytics";

export function SubscribeForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseSubscribeEmail(email);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setStatus("loading");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.email }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        setError(
          data?.error ||
            `We could not add that just now. Email ${site.email} and we will put you on the list.`,
        );
        setStatus("idle");
        return;
      }
      trackEvent("subscribe_submit", { source: "home" });
      setStatus("success");
      setEmail("");
    } catch {
      setError(`Network dropped. Email ${site.email} and we will catch you.`);
      setStatus("idle");
    }
  }

  return (
    <div className={cn(className)}>
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 px-4 py-4 text-success"
            role="status"
          >
            <Check className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium">
              You&apos;re on the list — talk soon.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            className="flex flex-col gap-3 sm:flex-row"
            noValidate
          >
            <label className="sr-only" htmlFor="subscribe-email">
              Email address
            </label>
            <input
              id="subscribe-email"
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "subscribe-error" : undefined}
              className="min-h-12 flex-1 rounded-full border border-line bg-surface-glass px-5 text-sm text-paper placeholder:text-paper-muted outline-none transition focus:border-spark-teal"
            />
            <Button
              type="submit"
              disabled={status === "loading"}
              className="min-h-12 rounded-full !bg-spark-teal !text-[#020b1a]"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Subscribe"
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      {error ? (
        <p
          id="subscribe-error"
          className="mt-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
