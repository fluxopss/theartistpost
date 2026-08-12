/**
 * Fixed gallery atmosphere — CSS-only (no client JS).
 * Blobs hide via prefers-reduced-motion in globals.css.
 */
export function Atmosphere() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(42,90,158,0.18),_transparent_55%)]" />
      </div>
      <div className="grain-overlay" aria-hidden />
    </>
  );
}
