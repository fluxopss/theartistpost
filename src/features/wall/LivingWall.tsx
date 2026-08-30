"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { copy } from "@/content/site";
import { Chip } from "@/design-system/primitives/Chip";
import { useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/shared/lib/cn";
import { ARTIST_MEDIUMS } from "@/data/artists";
import type { ContentArtist, ContentEvent } from "@/lib/content";
import { useKindnessNotes } from "@/features/kindness/useKindnessNotes";
import { buildWallPieces } from "./buildWallPieces";
import { filterWallPieces } from "./filterWall";
import { WALL_CANVAS, DEFAULT_WALL_FILTERS, type WallFilters, type WallPiece } from "./types";
import { WallPieceSheet } from "./WallPieceSheet";

const MIN_SCALE = 0.42;
const MAX_SCALE = 1.85;

const NEIGHBORHOODS: { id: WallFilters["neighborhood"]; label: string }[] = [
  { id: "all", label: "All rooms" },
  { id: "hacienda", label: "Hacienda" },
  { id: "clematis", label: "Clematis" },
  { id: "downtown", label: "Downtown" },
];

const AVAILABILITY: { id: WallFilters["availability"]; label: string }[] = [
  { id: "all", label: "Any status" },
  { id: "open", label: "Open frames" },
  { id: "reserved", label: "Reserved" },
  { id: "upcoming", label: "Upcoming" },
];

export function LivingWall({
  artists,
  events,
}: {
  artists: ContentArtist[];
  events: ContentEvent[];
}) {
  const { notes } = useKindnessNotes();
  const reduce = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    x: 0,
    y: 0,
    originX: 0,
    originY: 0,
    pointers: new Map<number, { x: number; y: number }>(),
    pinch: 0,
    startScale: 1,
  });

  const [filters, setFilters] = useState<WallFilters>(DEFAULT_WALL_FILTERS);
  const [scale, setScale] = useState(0.62);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [selected, setSelected] = useState<WallPiece | null>(null);
  const [dragging, setDragging] = useState(false);

  const pieces = useMemo(
    () => buildWallPieces({ artists, events, notes }),
    [artists, events, notes],
  );

  const visible = useMemo(
    () => filterWallPieces(pieces, filters),
    [pieces, filters],
  );

  const applyZoom = useCallback((next: number, cx?: number, cy?: number) => {
    setScale((prev) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      if (cx == null || cy == null || !viewportRef.current) return clamped;
      const rect = viewportRef.current.getBoundingClientRect();
      const vx = cx - rect.left;
      const vy = cy - rect.top;
      setPan((p) => {
        const wx = (vx - p.x) / prev;
        const wy = (vy - p.y) / prev;
        return { x: vx - wx * clamped, y: vy - wy * clamped };
      });
      return clamped;
    });
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewportRef.current?.setPointerCapture(e.pointerId);
    if (drag.current.pointers.size === 1) {
      drag.current.active = true;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      drag.current.originX = pan.x;
      drag.current.originY = pan.y;
      setDragging(true);
    } else if (drag.current.pointers.size === 2) {
      const pts = [...drag.current.pointers.values()];
      drag.current.pinch = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      drag.current.startScale = scale;
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.pointers.has(e.pointerId)) return;
    drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.current.pointers.size === 2) {
      const pts = [...drag.current.pointers.values()];
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      if (drag.current.pinch > 0) {
        applyZoom(
          drag.current.startScale * (dist / drag.current.pinch),
          (pts[0]!.x + pts[1]!.x) / 2,
          (pts[0]!.y + pts[1]!.y) / 2,
        );
      }
      return;
    }
    if (!drag.current.active) return;
    setPan({
      x: drag.current.originX + (e.clientX - drag.current.x),
      y: drag.current.originY + (e.clientY - drag.current.y),
    });
  }

  function endPointer(e: ReactPointerEvent<HTMLDivElement>) {
    drag.current.pointers.delete(e.pointerId);
    if (drag.current.pointers.size === 0) {
      drag.current.active = false;
      setDragging(false);
    }
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || reduce) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      applyZoom(scale * factor, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom, reduce, scale]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 48;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x + step }));
        break;
      case "ArrowRight":
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x - step }));
        break;
      case "ArrowUp":
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y + step }));
        break;
      case "ArrowDown":
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y - step }));
        break;
      case "+":
      case "=":
        e.preventDefault();
        applyZoom(scale + 0.12);
        break;
      case "-":
      case "_":
        e.preventDefault();
        applyZoom(scale - 0.12);
        break;
      default:
        break;
    }
  }

  return (
    <div className="living-wall">
      <div className="living-wall__plaster" aria-hidden />

      <div className="relative z-10 border-b border-line bg-ink/55 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-coral">
              {copy.wall.kicker}
            </p>
            <h1 className="display mt-2 text-3xl text-paper sm:text-5xl">
              {copy.wall.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-paper-muted">
              {copy.wall.lead}
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-1"
            role="group"
            aria-label="Wall zoom"
          >
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
              aria-label="Zoom out"
              onClick={() => applyZoom(scale - 0.14)}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
              aria-label="Zoom in"
              onClick={() => applyZoom(scale + 0.14)}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
              aria-label="Reset wall view"
              onClick={() => {
                setScale(0.62);
                setPan({ x: 40, y: 30 });
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-[var(--content-max)] flex-col gap-3">
          <FilterRow
            label={copy.wall.filters.medium}
            items={[
              { id: "all", label: "All mediums" },
              ...ARTIST_MEDIUMS.filter((m) => m.value !== "all").map((m) => ({
                id: m.value,
                label: m.label,
              })),
              { id: "community", label: "Community" },
              { id: "kindness", label: "Kindness" },
            ]}
            value={filters.medium}
            onChange={(id) =>
              setFilters((f) => ({ ...f, medium: id as WallFilters["medium"] }))
            }
          />
          <FilterRow
            label={copy.wall.filters.neighborhood}
            items={NEIGHBORHOODS}
            value={filters.neighborhood}
            onChange={(id) =>
              setFilters((f) => ({
                ...f,
                neighborhood: id as WallFilters["neighborhood"],
              }))
            }
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <FilterRow
              label={copy.wall.filters.availability}
              items={AVAILABILITY}
              value={filters.availability}
              onChange={(id) =>
                setFilters((f) => ({
                  ...f,
                  availability: id as WallFilters["availability"],
                }))
              }
            />
            <FilterRow
              label={copy.wall.filters.date}
              items={[
                { id: "all", label: "Any night" },
                { id: "upcoming", label: "Upcoming showcase" },
              ]}
              value={filters.date}
              onChange={(id) =>
                setFilters((f) => ({ ...f, date: id as WallFilters["date"] }))
              }
            />
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn("living-wall__viewport", dragging && "is-dragging")}
        role="application"
        aria-label="Zoomable gallery wall. Arrow keys pan, plus and minus zoom."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
      >
        <div
          className="living-wall__canvas"
          style={{
            width: WALL_CANVAS.width,
            height: WALL_CANVAS.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: reduce || dragging ? undefined : "transform 160ms var(--ease-out)",
          }}
        >
          <div
            className="absolute inset-8 border border-dashed border-white/10"
            aria-hidden
          />
          <p className="absolute left-1/2 top-10 -translate-x-1/2 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
            {copy.wall.preparingTitle}
          </p>

          {visible.map((piece) => (
            <WallTile
              key={piece.id}
              piece={piece}
              onOpen={() => setSelected(piece)}
            />
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md rounded-3xl border border-line bg-ink/80 px-6 py-10 text-center backdrop-blur-md">
              <p className="display text-3xl text-paper">{copy.wall.quietTitle}</p>
              <p className="mt-3 text-sm text-paper-muted">{copy.wall.quietBody}</p>
            </div>
          </div>
        ) : null}
      </div>

      <p className="relative z-10 px-4 py-3 text-center text-xs text-paper-muted sm:px-6">
        Drag or swipe to walk the wall. Pinch or use + − to lean in.
      </p>

      <WallPieceSheet
        piece={selected}
        notes={notes}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function FilterRow({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-muted">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2"
      >
        {items.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            active={value === item.id}
            role="radio"
            aria-checked={value === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function WallTile({
  piece,
  onOpen,
}: {
  piece: WallPiece;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "wall-piece",
        piece.kind === "reserved" && "wall-piece--reserved",
        piece.kind === "kindness" && "wall-piece--kindness",
      )}
      style={{
        left: piece.x,
        top: piece.y,
        width: piece.w,
        height: piece.h,
        transform: `rotate(${piece.rotate}deg)`,
      }}
      onClick={onOpen}
      aria-label={`${piece.title}. ${piece.subtitle}`}
    >
      {piece.image ? (
        <span className="wall-piece__media">
          <Image
            src={piece.image}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="400px"
          />
        </span>
      ) : piece.kind === "reserved" ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
            {piece.subtitle}
          </span>
          <span className="display mt-3 text-2xl text-paper">{piece.title}</span>
        </span>
      ) : null}
      <span className="wall-piece__copy">
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-[0.16em]",
            piece.kind === "kindness" ? "text-[#5c4f45]" : "text-spark-gold",
          )}
        >
          {piece.kind === "kindness" ? "Spark" : piece.subtitle}
        </span>
        <span
          className={cn(
            "display mt-1 block leading-tight",
            piece.kind === "kindness" ? "text-base text-[#1a1410]" : "text-lg text-paper",
          )}
        >
          {piece.kind === "kindness" ? piece.story : piece.title}
        </span>
      </span>
    </button>
  );
}
