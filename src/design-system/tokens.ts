/**
 * Design tokens — TypeScript mirror of `src/styles/tokens.css`.
 * Prefer CSS variables in components; use these for JS/Framer Motion.
 */

export const colors = {
  ink: "#061422",
  inkElevated: "#0b2740",
  surface: "#071a2e",
  surfaceMuted: "#0d2c48",
  paper: "#f4f1ea",
  paperOnDark: "#fffaf3",
  paperMuted: "#9aaeb8",
  accent: "#2ec4b6",
  sparkCoral: "#ff6b5b",
  sparkGold: "#f0b429",
  sparkTeal: "#2ec4b6",
  sparkViolet: "#8b5cf6",
  danger: "#f07178",
  success: "#3dd68c",
} as const;

export const fonts = {
  display: 'var(--font-clash), "Clash Display", sans-serif',
  body: 'var(--font-jost), "Jost", sans-serif',
} as const;

export const space = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.5rem",
  6: "2rem",
  7: "3rem",
  8: "4rem",
  9: "6rem",
} as const;

export const radii = {
  sm: "0.5rem",
  md: "0.875rem",
  lg: "1.25rem",
  xl: "1.75rem",
  "2xl": "2rem",
  full: "9999px",
} as const;

export const shadows = {
  glow: "0 0 40px rgba(46, 196, 182, 0.15)",
  elevated: "0 16px 48px rgba(2, 11, 26, 0.45)",
} as const;

export const motion = {
  easeOut: [0.22, 1, 0.36, 1] as const,
  easeSpring: [0.34, 1.56, 0.64, 1] as const,
  duration: {
    fast: 0.16,
    med: 0.32,
    slow: 0.56,
  },
  spring: {
    soft: { type: "spring" as const, stiffness: 140, damping: 18 },
    snappy: { type: "spring" as const, stiffness: 320, damping: 24 },
    tilt: { type: "spring" as const, stiffness: 280, damping: 22 },
  },
};

export const layout = {
  navHeight: "4rem",
  contentMax: "72rem",
  tapMin: 44,
} as const;

export const typeScale = {
  display: "clamp(2.6rem, 8vw, 5.25rem)",
  h1: "clamp(2rem, 5vw, 3.5rem)",
  h2: "clamp(1.5rem, 3vw, 2.25rem)",
  h3: "1.25rem",
  body: "1rem",
  sm: "0.875rem",
  xs: "0.75rem",
  eyebrow: "0.625rem",
} as const;

export const tokens = {
  colors,
  fonts,
  space,
  radii,
  shadows,
  motion,
  layout,
  typeScale,
} as const;

export type DesignTokens = typeof tokens;
