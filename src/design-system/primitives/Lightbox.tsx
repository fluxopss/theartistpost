"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useReducedMotion } from "@/hooks/useMedia";

export type LightboxItem = {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
};

type LightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LightboxItem[];
  index: number;
  onIndexChange: (index: number) => void;
  className?: string;
};

export function Lightbox({
  open,
  onOpenChange,
  items,
  index,
  onIndexChange,
  className,
}: LightboxProps) {
  const reduce = useReducedMotion();
  const item = items[index] ?? null;
  const hasGallery = items.length > 1;
  const touchStartX = useRef(0);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!hasGallery) return;
      const next = (index + dir + items.length) % items.length;
      onIndexChange(next);
    },
    [hasGallery, index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/85 backdrop-blur-md" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[90] w-[min(96vw,960px)] -translate-x-1/2 -translate-y-1/2 outline-none",
            className,
          )}
          aria-describedby={undefined}
          onPointerDown={(e) => {
            touchStartX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            const dx = e.clientX - touchStartX.current;
            if (Math.abs(dx) > 56) go(dx > 0 ? -1 : 1);
          }}
        >
          <Dialog.Title className="sr-only">
            {item?.title ?? item?.alt ?? "Image preview"}
          </Dialog.Title>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-muted shadow-glow">
            <AnimatePresence mode="wait" initial={false}>
              {item ? (
                <motion.div
                  key={item.src + index}
                  initial={reduce ? false : { opacity: 0.4, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0.4, scale: 0.98 }}
                  transition={{ duration: 0.22 }}
                  className="relative aspect-[16/10] w-full bg-ink"
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-contain"
                    sizes="(max-width: 960px) 96vw, 960px"
                    priority
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            {(item?.title || item?.caption) && (
              <div className="border-t border-line px-4 py-3 sm:px-6">
                {item.title ? (
                  <p className="display text-lg text-paper">{item.title}</p>
                ) : null}
                {item.caption ? (
                  <p className="mt-1 text-sm text-paper-muted">{item.caption}</p>
                ) : null}
                {hasGallery ? (
                  <p className="mt-2 text-xs text-paper-muted" aria-live="polite">
                    {index + 1} / {items.length}
                  </p>
                ) : null}
              </div>
            )}
            <Dialog.Close
              className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/70 text-paper-on-dark backdrop-blur hover:border-spark-teal"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
            {hasGallery ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/70 text-paper-on-dark backdrop-blur hover:border-spark-teal"
                  aria-label="Previous image"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/70 text-paper-on-dark backdrop-blur hover:border-spark-teal sm:right-14"
                  aria-label="Next image"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
