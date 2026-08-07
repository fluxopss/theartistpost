"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SubscribeForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setStatus("loading");
    // Client-side capture until GHL/webhook is wired
    await new Promise((r) => setTimeout(r, 700));
    setStatus("success");
    setEmail("");
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
              className="min-h-12 rounded-full !bg-spark-teal !text-ink"
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
