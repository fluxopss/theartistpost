"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { assets, mantra, site } from "@/content/site";
import { Button } from "@/shared/ui/Button";
import { useReducedMotion } from "@/hooks/useMedia";
import {
  getStudio,
  isOnboarded,
  markOnboarded,
  setStudio,
} from "@/features/app/storage";

const slides = [
  {
    kicker: site.shine,
    title: "Love ALL",
    body: "The Artist Post is a living gallery — free showcase space, kindness, and a house for local creatives at Hacienda on Clematis.",
  },
  {
    kicker: "Three doors",
    title: "Explore. Spark. Show up.",
    body: "Walk The Wall, leave a Kindness Always note, and book space without an account. The first move is showing up.",
  },
  {
    kicker: "Your studio",
    title: "Name this device",
    body: "Likes, saved nights, and sparks stay on this phone until artist accounts open. Nothing is invented — and nothing is posted in your name without you.",
  },
] as const;

export function Onboarding() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(getStudio().displayName);

  useEffect(() => {
    setReady(true);
    if (!isOnboarded()) setOpen(true);
    setName(getStudio().displayName);
  }, []);

  if (!ready || !open) return null;

  const last = step === slides.length - 1;
  const slide = slides[step];

  function finish() {
    setStudio({ displayName: name });
    markOnboarded();
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/80 p-4 backdrop-blur-xl sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to The Artist Post"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface shadow-glow"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${assets.cover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/90 to-ink/40" />
        <div className="relative px-6 pb-6 pt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            {slide.kicker}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.title}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
            >
              <h2 className="display mt-3 text-4xl text-paper">{slide.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-paper-muted">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {last ? (
            <label className="mt-6 block">
              <span className="text-xs font-semibold text-paper-muted">
                Studio name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="mt-2 min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm text-paper outline-none focus:border-spark-teal"
              />
            </label>
          ) : (
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-spark-gold">
              {mantra.map((line) => `${line.lead} ${line.rest}`).join(" · ")}
            </p>
          )}

          <div className="mt-6 flex items-center gap-2">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-spark-teal" : "bg-line"}`}
              />
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={finish}
            >
              Skip
            </Button>
            <Button
              className="flex-1 rounded-full !bg-spark-coral !text-[#020b1a]"
              onClick={() => (last ? finish() : setStep((n) => n + 1))}
            >
              {last ? "Enter the house" : "Continue"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
