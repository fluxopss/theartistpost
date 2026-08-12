"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ContentArtist } from "@/lib/content";
import { Modal } from "@/design-system/primitives/Modal";
import { motion as motionTokens } from "@/design-system/tokens";
import { useIsTouchDevice, useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/shared/lib/cn";

type ArtistCardProps = {
  artist: ContentArtist;
  className?: string;
};

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), motionTokens.spring.tilt);
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), motionTokens.spring.tilt);

  function onMove(e: React.PointerEvent) {
    if (reduce || touch || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <>
      <motion.div
        ref={ref}
        className={cn("perspective-card group", className)}
        style={{
          rotateX: reduce || touch ? 0 : rx,
          rotateY: reduce || touch ? 0 : ry,
          transformStyle: "preserve-3d",
        }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        layout
      >
        <button
          type="button"
          className="block w-full min-h-11 text-left"
          onClick={() => {
            if (touch) setFlipped((v) => !v);
            else setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-pressed={touch ? flipped : undefined}
          aria-haspopup="dialog"
          aria-label={`${artist.name} — ${artist.medium}. View details.`}
        >
          <div
            className={cn(
              "flip-inner relative aspect-[4/5] w-full",
              touch && flipped && "is-flipped",
            )}
          >
            <div className="flip-face absolute inset-0 overflow-hidden rounded-2xl border border-line bg-surface-muted shadow-glow">
              {artist.comingSoon ? (
                <div className="absolute inset-0 skeleton" aria-hidden />
              ) : null}
              <Image
                src={artist.image}
                alt=""
                fill
                className={cn(
                  "object-cover transition duration-500 group-hover:scale-105",
                  artist.comingSoon && "opacity-50",
                )}
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-teal">
                  {artist.medium}
                </p>
                <p className="display mt-1 text-xl text-paper-on-dark">
                  {artist.comingSoon ? "Coming soon" : artist.name}
                </p>
              </div>
            </div>

            <div className="flip-face flip-back absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-ink-elevated p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
                  {artist.medium}
                </p>
                <p className="display mt-2 text-2xl text-paper-on-dark">
                  {artist.comingSoon ? "Coming soon" : artist.name}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-paper-muted">
                  {artist.bio}
                </p>
              </div>
              <p className="text-xs text-paper-muted/80">Tap to flip back</p>
            </div>
          </div>
        </button>
      </motion.div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={artist.comingSoon ? "Coming soon" : artist.name}
        description={`${artist.medium} · Featured artist`}
      >
        <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl border border-line">
          <Image
            src={artist.image}
            alt=""
            fill
            className="object-cover"
            sizes="640px"
          />
        </div>
        <p className="text-sm leading-relaxed text-paper-muted">{artist.bio}</p>
        {artist.comingSoon ? (
          <p className="mt-4 text-xs text-spark-gold">
            Showcase details will appear here as Hacienda residencies go live.
          </p>
        ) : null}
      </Modal>
    </>
  );
}
