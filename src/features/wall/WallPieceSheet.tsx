"use client";

import Image from "next/image";
import Link from "next/link";
import { Modal } from "@/design-system/primitives/Modal";
import { ButtonLink } from "@/shared/ui/Button";
import { copy, links } from "@/content/site";
import type { KindnessNote } from "@/features/kindness/types";
import type { WallPiece } from "./types";

function kindLabel(kind: WallPiece["kind"]): string {
  switch (kind) {
    case "artist":
      return "Artist";
    case "event":
      return "Night";
    case "reserved":
      return "Open frame";
    case "venue":
      return "The live room";
    case "kindness":
      return "Kindness";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function WallPieceSheet({
  piece,
  notes,
  open,
  onOpenChange,
}: {
  piece: WallPiece | null;
  notes: KindnessNote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!piece) return null;

  const pinned = notes.filter((n) => piece.kindnessIds.includes(n.id));
  const bookHref = piece.bookHref ?? "/get-involved?door=space";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={piece.title}
      description={`${kindLabel(piece.kind)} · ${piece.subtitle}`}
      className="w-[min(96vw,40rem)]"
    >
      <div className="space-y-6">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-ink">
          {piece.image ? (
            <Image
              src={piece.image}
              alt={piece.imageAlt}
              fill
              unoptimized
              className="object-cover"
              sizes="640px"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-gold">
                Frame reserved
              </p>
              <p className="display mt-3 text-3xl text-paper">
                {copy.wall.reservedTitle}
              </p>
            </div>
          )}
        </div>

        <p className="text-sm leading-relaxed text-paper-muted sm:text-base">
          {piece.story}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-ink/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
              Available work
            </p>
            <p className="mt-2 text-sm text-paper-muted">
              {piece.kind === "artist"
                ? "Work hangs here once the artist publishes it."
                : "No named work on this frame yet — the room is ready."}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-ink/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
              Event history
            </p>
            <p className="mt-2 text-sm text-paper-muted">
              {piece.showcaseDate
                ? new Date(piece.showcaseDate).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Nights will attach here as the schedule is confirmed."}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-coral">
            Kindness notes
          </p>
          {pinned.length === 0 ? (
            <p className="mt-2 text-sm text-paper-muted">
              No sparks pinned to this frame yet. Leave one on Kindness Always.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pinned.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-[#d4c4b0] bg-[#f3e9d8] px-3 py-2 text-sm text-[#1a1410]"
                >
                  {note.body}
                  <span className="mt-1 block text-xs text-[#5c4f45]">
                    — {note.fromLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <ButtonLink
            href={bookHref}
            className="rounded-full !bg-spark-coral !text-ink"
          >
            {piece.kind === "reserved" ? copy.wall.bookFrame : "Request / book"}
          </ButtonLink>
          {piece.href ? (
            <ButtonLink href={piece.href} variant="outline" className="rounded-full">
              Open this room
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={links.artistAgreement}
            external
            variant="ghost"
            className="rounded-full"
          >
            Artist agreement
          </ButtonLink>
          <Link
            href="/kindness-always"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-spark-teal underline-offset-4 hover:underline"
          >
            Leave a kindness
          </Link>
        </div>
      </div>
    </Modal>
  );
}
