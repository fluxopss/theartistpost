"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/shared/lib/cn";
import type { AddKindnessInput } from "./useKindnessNotes";
import { canLeaveComposeStep, clampKindnessBody } from "./composeValidation";
import {
  KINDNESS_ANON,
  KINDNESS_MAX_BODY,
  MEDIUM_LABELS,
  SPARK_HEX,
  SPARK_LABELS,
  type KindnessMedium,
  type KindnessSpark,
} from "./types";

const mediaOptions: KindnessMedium[] = [
  "anyone",
  "music",
  "visual",
  "theater",
  "open-heart",
];

const sparkOptions: KindnessSpark[] = ["coral", "gold", "teal"];

type KindnessComposeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddKindnessInput) => {
    ok: boolean;
    error?: string;
  };
};

export function KindnessCompose({
  open,
  onOpenChange,
  onSubmit,
}: KindnessComposeProps) {
  const reduce = useReducedMotion();
  const liveId = useId();
  const firstField = useRef<HTMLButtonElement | HTMLTextAreaElement | null>(
    null,
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [medium, setMedium] = useState<KindnessMedium>("anyone");
  const [body, setBody] = useState("");
  const [fromLabel, setFromLabel] = useState("");
  const [spark, setSpark] = useState<KindnessSpark>("teal");
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setStep(1);
        setMedium("anyone");
        setBody("");
        setFromLabel("");
        setSpark("teal");
        setError(null);
        setReleasing(false);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  function goNext() {
    const gate = canLeaveComposeStep(step, body);
    if (!gate.ok) {
      setError(gate.error ?? "Check this step.");
      return;
    }
    setError(null);
    setStep((s) => (s === 1 ? 2 : 3));
  }

  function release() {
    const result = onSubmit({
      body,
      fromLabel: fromLabel.trim() || KINDNESS_ANON,
      medium,
      spark,
    });
    if (!result.ok) {
      setError(result.error ?? "Couldn’t release that note.");
      return;
    }
    setReleasing(true);
    window.setTimeout(
      () => {
        setReleasing(false);
        onOpenChange(false);
      },
      reduce ? 120 : 720,
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/85 backdrop-blur-md" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[90] max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-line bg-surface outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(94vw,28rem)] sm:max-h-[min(90dvh,40rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          aria-describedby={liveId}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            firstField.current?.focus();
          }}
        >
          <div className="relative px-5 pb-8 pt-5 sm:px-7 sm:pt-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="display text-2xl text-paper">
                  Leave a note
                </Dialog.Title>
                <p
                  id={liveId}
                  className="mt-1 text-sm text-paper-muted"
                  aria-live="polite"
                >
                  Step {step} of 3{step === 1 && " — who it’s for"}
                  {step === 2 && " — your words"}
                  {step === 3 && " — pick a spark & release"}
                </p>
              </div>
              <Dialog.Close
                className="rounded-full p-2 text-paper-muted hover:bg-surface-hover hover:text-paper"
                aria-label="Close compose"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <div className="mb-6 flex gap-2" aria-hidden>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={cn(
                    "h-1 flex-1 rounded-full transition",
                    n <= step ? "bg-spark-teal" : "bg-line",
                  )}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={reduce ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -16 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-paper-muted">
                    Who should feel this spark?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mediaOptions.map((m, i) => (
                      <button
                        key={m}
                        type="button"
                        ref={
                          i === 0
                            ? (el) => {
                                firstField.current = el;
                              }
                            : undefined
                        }
                        onClick={() => setMedium(m)}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                          medium === m
                            ? "border-spark-coral bg-spark-coral/15 text-spark-coral"
                            : "border-line text-paper-muted hover:border-line-strong hover:text-paper",
                        )}
                      >
                        {MEDIUM_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={reduce ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -16 }}
                  className="space-y-4"
                >
                  <label className="block">
                    <span className="text-sm text-paper-muted">
                      Your kindness
                    </span>
                    <textarea
                      ref={(el) => {
                        firstField.current = el;
                      }}
                      value={body}
                      maxLength={KINDNESS_MAX_BODY}
                      onChange={(e) => setBody(clampKindnessBody(e.target.value))}
                      rows={5}
                      placeholder="A short note another artist might need tonight…"
                      className="mt-2 w-full resize-none rounded-xl border border-line bg-ink/40 px-4 py-3 text-paper outline-none placeholder:text-paper-muted/50 focus:border-spark-teal"
                    />
                    <span className="mt-1 block text-right text-xs text-paper-muted">
                      {body.length}/{KINDNESS_MAX_BODY}
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-sm text-paper-muted">
                      Sign as (optional)
                    </span>
                    <input
                      type="text"
                      value={fromLabel}
                      maxLength={48}
                      onChange={(e) => setFromLabel(e.target.value)}
                      placeholder={KINDNESS_ANON}
                      className="mt-2 w-full rounded-xl border border-line bg-ink/40 px-4 py-2.5 text-paper outline-none placeholder:text-paper-muted/50 focus:border-spark-teal"
                    />
                  </label>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={reduce ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -16 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-paper-muted">Choose your spark</p>
                  <div className="flex flex-wrap gap-3">
                    {sparkOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpark(s)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                          spark === s
                            ? "border-transparent text-ink"
                            : "border-line text-paper-muted hover:border-line-strong",
                        )}
                        style={
                          spark === s
                            ? {
                                background: SPARK_HEX[s],
                                boxShadow: `0 0 24px ${SPARK_HEX[s]}66`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: SPARK_HEX[s] }}
                          aria-hidden
                        />
                        {SPARK_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {releasing && !reduce ? (
                      <motion.div
                        className="pointer-events-none absolute inset-x-8 top-24 h-24 rounded-sm bg-[#f3e9d8]"
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -180, scale: 0.4 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          boxShadow: `0 0 32px ${SPARK_HEX[spark]}88`,
                        }}
                        aria-hidden
                      />
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {error ? (
              <p className="mt-4 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setStep((s) => (s === 3 ? 2 : 1));
                  }}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <Button type="button" variant="secondary" onClick={goNext}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={release}
                  disabled={releasing}
                  className="!bg-spark-coral !text-ink"
                >
                  {releasing ? "Releasing…" : "Release onto the wall"}
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
