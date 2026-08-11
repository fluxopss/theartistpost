"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SPARK_HEX, type KindnessNote } from "./types";
import { useReducedMotion } from "@/hooks/useMedia";

type Particle = {
  id: string;
  note: KindnessNote;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  w: number;
  h: number;
};

type KindnessPhysicsFieldProps = {
  notes: KindnessNote[];
  onSelect: (note: KindnessNote) => void;
};

function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function KindnessPhysicsField({
  notes,
  onSelect,
}: KindnessPhysicsFieldProps) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const visible = useRef(true);
  const focused = useRef(0);
  const listId = useId();
  const [live, setLive] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);

  const rebuild = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssH = Math.max(420, rect.width * 0.55);
    canvas.width = rect.width * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = cssH;
    particles.current = notes.slice(0, 24).map((note, i) => {
      const seed = hash(note.id);
      return {
        id: note.id,
        note,
        x: ((seed % 1000) / 1000) * (w - 160) + 20,
        y: (((seed >> 3) % 1000) / 1000) * (h - 120) + 20,
        vx: reduce ? 0 : ((seed % 7) - 3) * 0.05,
        vy: reduce ? 0 : (((seed >> 5) % 7) - 3) * 0.05,
        rot: ((seed % 17) - 8) * 0.02,
        w: 140 + (i % 3) * 16,
        h: 88,
      };
    });
  }, [notes, reduce]);

  useEffect(() => {
    rebuild();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => rebuild());
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(
        w * 0.3,
        h * 0.2,
        0,
        w * 0.5,
        h * 0.5,
        w * 0.7,
      );
      g.addColorStop(0, "rgba(46,196,182,0.08)");
      g.addColorStop(0.5, "rgba(255,107,91,0.05)");
      g.addColorStop(1, "rgba(2,11,26,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      particles.current.forEach((p, i) => {
        if (!reduce && visible.current) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 8 || p.x + p.w > w - 8) p.vx *= -1;
          if (p.y < 8 || p.y + p.h > h - 8) p.vy *= -1;
        }

        const isFocus = i === focused.current;
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.rot);
        ctx.translate(-p.w / 2, -p.h / 2);
        ctx.fillStyle = "#f3e9d8";
        ctx.strokeStyle = isFocus ? "#2ec4b6" : SPARK_HEX[p.note.spark];
        ctx.lineWidth = isFocus ? 2.5 : 1.5;
        ctx.shadowColor = `${SPARK_HEX[p.note.spark]}55`;
        ctx.shadowBlur = isFocus ? 22 : 16;
        ctx.fillRect(0, 0, p.w, p.h);
        ctx.strokeRect(0.5, 0.5, p.w - 1, p.h - 1);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#1a1410";
        ctx.font = "600 12px Jost, sans-serif";
        const text =
          p.note.body.slice(0, 56) + (p.note.body.length > 56 ? "…" : "");
        wrapText(ctx, text, 10, 28, p.w - 20, 14);
        ctx.fillStyle = "#5c4f45";
        ctx.font = "10px Jost, sans-serif";
        ctx.fillText(`— ${p.note.fromLabel.slice(0, 22)}`, 10, p.h - 12);
        ctx.restore();
      });

      if (visible.current) {
        raf.current = requestAnimationFrame(draw);
      } else {
        raf.current = null;
        // still paint once when hidden so last frame remains
      }
    };

    const tick = () => {
      if (!raf.current && visible.current) {
        raf.current = requestAnimationFrame(function loop() {
          draw();
          if (visible.current) raf.current = requestAnimationFrame(loop);
          else raf.current = null;
        });
      }
    };

    // Restart loop when visibility returns
    const io2 = new IntersectionObserver(([entry]) => {
      visible.current = Boolean(entry?.isIntersecting);
      if (visible.current) tick();
      else if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
        draw();
      }
    });
    io2.observe(wrap);
    tick();

    return () => {
      ro.disconnect();
      io.disconnect();
      io2.disconnect();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [rebuild, reduce]);

  function hitTest(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i]!;
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return { p, i };
    }
    return null;
  }

  function openIndex(i: number) {
    const p = particles.current[i];
    if (!p) return;
    focused.current = i;
    setFocusIndex(i);
    setLive(`Opened note from ${p.note.fromLabel}`);
    onSelect(p.note);
  }

  return (
    <div
      ref={wrapRef}
      className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-ink-elevated/40"
    >
      <canvas
        ref={canvasRef}
        className="block w-full cursor-pointer touch-manipulation"
        role="listbox"
        id={listId}
        aria-label="Floating kindness notes"
        aria-activedescendant={
          particles.current[focusIndex]
            ? `${listId}-opt-${particles.current[focusIndex]!.id}`
            : undefined
        }
        tabIndex={0}
        onClick={(e) => {
          const hit = hitTest(e.clientX, e.clientY);
          if (hit) openIndex(hit.i);
        }}
        onKeyDown={(e) => {
          const len = particles.current.length;
          if (!len) return;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = (focused.current + 1) % len;
            focused.current = next;
            setFocusIndex(next);
            setLive(
              `Note ${next + 1} of ${len}: ${particles.current[next]!.note.fromLabel}`,
            );
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = (focused.current - 1 + len) % len;
            focused.current = next;
            setFocusIndex(next);
            setLive(
              `Note ${next + 1} of ${len}: ${particles.current[next]!.note.fromLabel}`,
            );
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openIndex(focused.current);
          } else if (e.key === "Home") {
            e.preventDefault();
            focused.current = 0;
            setFocusIndex(0);
          } else if (e.key === "End") {
            e.preventDefault();
            focused.current = len - 1;
            setFocusIndex(len - 1);
          }
        }}
      />
      {/* Accessible option mirrors for SR — visually hidden */}
      <ul className="sr-only" aria-hidden>
        {notes.slice(0, 24).map((n, i) => (
          <li key={n.id} id={`${listId}-opt-${n.id}`}>
            <button type="button" onClick={() => openIndex(i)}>
              {n.fromLabel}: {n.body}
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink/70 px-3 py-1 text-[10px] uppercase tracking-wide text-paper-on-dark">
        Arrow keys to browse · Enter to read · tap a note
      </p>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
      lines++;
      if (lines >= 3) {
        ctx.fillText(line.slice(0, 18) + "…", x, yy);
        return;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}
