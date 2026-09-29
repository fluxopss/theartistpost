"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { copy, site } from "@/content/site";
import { parseSubscribeEmail } from "@/features/app/subscribe";
import { trackEvent } from "@/lib/analytics";

const CADENCES = [
  { value: "one_time", label: copy.donate.stewardOnce },
  { value: "monthly", label: copy.donate.stewardMonthly },
] as const;

type Cadence = (typeof CADENCES)[number]["value"];

/** Soft stewardship capture after a gift — CRM tag only, not a payment. */
export function DonorStewardForm() {
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<Cadence>("one_time");
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
      const response = await fetch("/api/v1/donate/steward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.email,
          cadence,
          platform: "web",
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: { message?: string } | string }
        | null;
      if (!response.ok || !data?.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message ||
              `We could not save that just now. Email ${site.email}.`;
        setError(message);
        setStatus("idle");
        return;
      }
      trackEvent("cta_donate", { source: "steward-form", cadence });
      setStatus("success");
      setEmail("");
    } catch {
      setError(`Network dropped. Email ${site.email} and we will catch you.`);
      setStatus("idle");
    }
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 text-success"
            role="status"
          >
            <Check className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium">{copy.donate.stewardSuccess}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            className="flex flex-col gap-3"
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <fieldset className="flex flex-wrap gap-3">
              <legend className="sr-only">Gift cadence</legend>
              {CADENCES.map((option) => (
                <label
                  key={option.value}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-paper"
                >
                  <input
                    type="radio"
                    name="cadence"
                    value={option.value}
                    checked={cadence === option.value}
                    onChange={() => setCadence(option.value)}
                    className="accent-[var(--spark-coral)]"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="donor-steward-email">
                Email address
              </label>
              <input
                id="donor-steward-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="min-h-11 flex-1 rounded-full border border-line bg-surface-glass px-4 text-sm text-paper placeholder:text-paper-muted focus:border-spark-teal focus:outline-none"
              />
              <Button
                type="submit"
                disabled={status === "loading"}
                className="rounded-full !bg-spark-coral !text-ink sm:min-w-[10rem]"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {copy.donate.stewardCta}
              </Button>
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
