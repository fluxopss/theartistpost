export const LOGO_INTRO_KEY = "tap-logo-intro";

export function shouldPlayLogoIntro(input: {
  seen: boolean;
  reduceMotion: boolean;
  force: boolean;
}): boolean {
  if (input.force) return true;
  if (input.reduceMotion || input.seen) return false;
  return true;
}

export function readLogoIntroForce(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.has("intro");
}

export function readReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion")
  );
}
