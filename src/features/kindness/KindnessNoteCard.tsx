"use client";

import { Heart, Music, Palette, Sparkles, Theater } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  MEDIUM_LABELS,
  SPARK_HEX,
  SPARK_LABELS,
  type KindnessMedium,
  type KindnessNote,
} from "./types";

const mediumIcon: Record<KindnessMedium, typeof Heart> = {
  anyone: Sparkles,
  music: Music,
  visual: Palette,
  theater: Theater,
  "open-heart": Heart,
};

/** Deterministic slight tilt from id so SSR/client match */
function tiltFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 17;
  return (h - 8) * 0.35;
}

type KindnessNoteCardProps = {
  note: KindnessNote;
  onOpen?: (note: KindnessNote) => void;
  className?: string;
  compact?: boolean;
  float?: boolean;
  index?: number;
};

export function KindnessNoteCard({
  note,
  onOpen,
  className,
  compact = false,
  float = true,
  index = 0,
}: KindnessNoteCardProps) {
  const Icon = mediumIcon[note.medium];
  const spark = SPARK_HEX[note.spark];
  const tilt = tiltFromId(note.id);
  const preview =
    note.body.length > 120 ? `${note.body.slice(0, 117)}…` : note.body;

  const paperInk = "#1a1410";
  const paperMuted = "#5c4f45";
  const paperLabel = "#3a2f28";

  const inner = (
    <>
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <div
        className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: paperLabel }}
      >
        {MEDIUM_LABELS[note.medium]}
      </div>
      <p
        className={cn(
          "display relative mt-3 leading-snug",
          compact ? "text-base" : "text-lg sm:text-xl",
        )}
        style={{ color: paperInk }}
      >
        {compact ? preview : note.body}
      </p>
      <p className="relative mt-4 text-xs" style={{ color: paperMuted }}>
        — {note.fromLabel}
      </p>
      <span className="sr-only">{SPARK_LABELS[note.spark]}</span>
    </>
  );

  const baseClass = cn(
    "group relative w-full overflow-hidden rounded-sm border border-[#d4c4b0] bg-[#f3e9d8] px-4 py-4 text-left shadow-[0_12px_40px_rgba(2,11,26,0.35)] transition duration-300",
    "hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(2,11,26,0.45)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-spark-teal",
    float
      ? "motion-safe:animate-[blob-drift_10s_ease-in-out_infinite]"
      : "opacity-0 animate-[hero-rise_0.5s_var(--ease-out)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none",
    className,
  );

  const style = {
    transform: `rotate(${tilt}deg)`,
    boxShadow: `0 12px 40px rgba(2,11,26,0.35), 0 0 0 1px ${spark}33, 0 0 28px ${spark}40`,
    animationDelay: float ? undefined : `${index * 0.04}s`,
  } as const;

  const iconBadge = (
    <span
      className="absolute right-3 top-3 rounded-full p-1.5"
      style={{ background: `${spark}22`, color: spark }}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        className={baseClass}
        style={style}
        onClick={() => onOpen(note)}
        aria-label={`Read note: ${note.body.slice(0, 80)}`}
      >
        {inner}
        {iconBadge}
      </button>
    );
  }

  return (
    <article className={baseClass} style={style}>
      {inner}
      {iconBadge}
    </article>
  );
}
