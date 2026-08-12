"use client";

import { useEffect, useRef } from "react";

/**
 * GPU-cheap 2D canvas accent — three soft sparks, paused off-screen.
 * No WebGL. Hidden when prefers-reduced-motion.
 */
export function HeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    let visible = true;
    const start = performance.now();
    const surface = canvas;
    const draw = ctx;

    const sparks = [
      { x: 0.22, y: 0.28, r: 0.22, color: "255, 107, 91", speed: 0.00018 },
      { x: 0.78, y: 0.42, r: 0.26, color: "46, 196, 182", speed: 0.00014 },
      { x: 0.52, y: 0.78, r: 0.18, color: "240, 180, 41", speed: 0.00011 },
    ];

    function resize() {
      const parent = surface.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      surface.width = Math.max(1, Math.floor(w * dpr));
      surface.height = Math.max(1, Math.floor(h * dpr));
      surface.style.width = `${w}px`;
      surface.style.height = `${h}px`;
      draw.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(now: number) {
      if (!visible) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const parent = surface.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      draw.clearRect(0, 0, w, h);
      const t = now - start;
      for (const s of sparks) {
        const ox = Math.sin(t * s.speed) * w * 0.04;
        const oy = Math.cos(t * s.speed * 0.85) * h * 0.03;
        const cx = s.x * w + ox;
        const cy = s.y * h + oy;
        const radius = Math.max(w, h) * s.r;
        const g = draw.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, `rgba(${s.color}, 0.28)`);
        g.addColorStop(0.45, `rgba(${s.color}, 0.08)`);
        g.addColorStop(1, `rgba(${s.color}, 0)`);
        draw.fillStyle = g;
        draw.fillRect(0, 0, w, h);
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (surface.parentElement) ro.observe(surface.parentElement);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(surface);

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      aria-hidden
    />
  );
}
