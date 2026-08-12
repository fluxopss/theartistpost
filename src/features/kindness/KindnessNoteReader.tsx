"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Heart, Music, Palette, Sparkles, Theater } from "lucide-react";
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

type KindnessNoteReaderProps = {
  note: KindnessNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KindnessNoteReader({
  note,
  open,
  onOpenChange,
}: KindnessNoteReaderProps) {
  const spark = note ? SPARK_HEX[note.spark] : "#2ec4b6";
  const Icon = note ? mediumIcon[note.medium] : Sparkles;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/80 backdrop-blur-md" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[90] w-[min(94vw,34rem)] -translate-x-1/2 -translate-y-1/2 outline-none"
          aria-describedby={undefined}
        >
          <div
            className="relative overflow-hidden rounded-sm border border-[#d4c4b0] bg-[#f3e9d8] px-6 py-8 shadow-[0_24px_80px_rgba(2,11,26,0.55)] sm:px-10 sm:py-10"
            style={{
              boxShadow: `0 24px 80px rgba(2,11,26,0.55), 0 0 0 1px ${spark}44, 0 0 48px ${spark}33`,
            }}
          >
            <Dialog.Title className="sr-only">
              Kindness note from {note?.fromLabel ?? "an artist"}
            </Dialog.Title>

            <Dialog.Close
              className="absolute right-3 top-3 rounded-full p-2 text-[#5c4f45] transition hover:bg-[#e8dcc8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-spark-teal"
              aria-label="Close note"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>

            {note ? (
              <>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3a2f28]">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{ background: `${spark}22`, color: spark }}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {MEDIUM_LABELS[note.medium]}
                  </span>
                  <span className="text-[#8a7a6c]">
                    {SPARK_LABELS[note.spark]}
                  </span>
                </div>
                <p className="display mt-6 text-2xl leading-snug text-[#1a1410] sm:text-3xl">
                  {note.body}
                </p>
                <p className="mt-8 text-sm text-[#5c4f45]">
                  — {note.fromLabel}
                </p>
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
