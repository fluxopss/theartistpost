# Gallery Night Redesign Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Redesign The Artist Post in-place into a dark-first interactive marketing + explore web app.

**Architecture:** Evolve existing Next 16 App Router tree — new design tokens, shared chrome (`components/`), data fixtures, Framer Motion reveals; keep Prisma explore/create under new shell.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Framer Motion, lucide-react, Clash Display + Jost, optional Radix Dialog for lightbox

## Global Constraints

- Copy/links only from `src/content/site.ts` unless adding placeholders in `src/data/`
- Dark default theme; `tap-theme` localStorage
- Reduced-motion must disable custom cursor, parallax intensity, and blob animation
- Breakpoints: 375 / 768 / 1024 / 1440

---

### Task 1: Design system + deps

**Files:** `package.json`, `src/styles/tokens.css`, `src/app/globals.css`, `src/app/layout.tsx`

- [ ] Add lucide-react, class-variance-authority, @radix-ui/react-dialog
- [ ] Dark/light CSS variables + glass/grain/blob utilities
- [ ] Load Clash Display (Fontshare) + Jost (next/font)

### Task 2: Hooks + data

**Files:** `src/hooks/*`, `src/data/artists.ts`, `src/data/events.ts`, `src/shared/motion/variants.tsx`

- [ ] Theme, reduced-motion, media-query, open-now, scroll-progress hooks
- [ ] Artist + event placeholder data

### Task 3: Shared components

**Files:** `src/components/*` — SectionReveal, ArtistCard, Lightbox, ThemeToggle, NavBar, Footer, CursorTrail, Atmosphere, ScrollProgress, SubscribeForm, OpenStatus, HaciendaShowcase, ScheduleView

- [ ] Replace AppShell to use NavBar + Footer + Atmosphere + ScrollProgress + CursorTrail

### Task 4: Home

**Files:** `src/app/page.tsx`, `src/features/home/*`

- [ ] Rebuild hero, featured, hacienda, contact/subscribe

### Task 5: Remaining routes

**Files:** about, artist-schedule, kindness-always, supporters, explore pages

- [ ] Restyle + interactive schedule + explore wall/lightbox

### Task 6: PWA + README

**Files:** `public/manifest.webmanifest`, `public/sw.js`, register component, `README.md`

- [ ] Installable PWA shell; document Git → VPS deploy only
