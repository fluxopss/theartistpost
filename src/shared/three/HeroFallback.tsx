/**
 * CSS-only hero atmosphere — safe for SSR and low-power devices.
 * Kept separate from R3F so Three.js never blocks the home screen.
 */
export function HeroFallback() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-ink" aria-hidden>
      <div className="absolute -left-1/4 top-[-20%] h-[70%] w-[70%] rounded-full bg-accent-secondary/30 blur-3xl" />
      <div className="absolute -right-1/4 bottom-[-10%] h-[60%] w-[60%] rounded-full bg-spark-coral/10 blur-3xl" />
      <div className="grain" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--ink)_75%)]" />
    </div>
  );
}
