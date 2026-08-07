# Kindness Notes + Home Installation — Implementation Plan

> **For agentic workers:** Execute inline in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Kindness Notes as TAP’s signature interactive wall, then rebuild Home as a brand-first night gallery that funnels into it.

**Architecture:** Client feature module under `src/features/kindness/` (types, fixtures, hook, UI). Home reuses `KindnessNoteCard` via `KindnessBridge`. Persistence is seed + `localStorage` only.

**Tech Stack:** Next.js 16 · React 19 · Tailwind 4 · Framer Motion · existing Radix Dialog patterns · Clash Display + Jost

## Global Constraints

- In-place in `theartistpost/`; no new repo
- Clash Display + Jost; gallery-night tokens; no Inter/Geist
- Locked copy from `docs/superpowers/specs/2026-08-06-kindness-notes-home-design.md`
- `prefers-reduced-motion` honored; no WebGL for these surfaces
- Do not commit unless user asks
- VPS deploy only when requested

## File map

| Path                                             | Role                               |
| ------------------------------------------------ | ---------------------------------- |
| `src/features/kindness/types.ts`                 | Medium, spark, note types + labels |
| `src/features/kindness/fixtures.ts`              | 10 seed notes                      |
| `src/features/kindness/useKindnessNotes.ts`      | Merge/save/addNote                 |
| `src/features/kindness/KindnessNoteCard.tsx`     | Paper note visual                  |
| `src/features/kindness/KindnessNoteReader.tsx`   | Reading dialog                     |
| `src/features/kindness/KindnessWall.tsx`         | Filters + masonry                  |
| `src/features/kindness/KindnessCompose.tsx`      | 3-step ritual                      |
| `src/features/kindness/KindnessHero.tsx`         | Page hero                          |
| `src/features/kindness/KindnessMerchSection.tsx` | Existing merch demoted             |
| `src/features/kindness/KindnessContent.tsx`      | Orchestrator                       |
| `src/features/home/HomeHero.tsx`                 | Full-bleed installation hero       |
| `src/features/home/KindnessBridge.tsx`           | Home strip                         |
| `src/app/page.tsx`                               | Insert KindnessBridge              |
| `src/content/site.ts`                            | Optional hero copy keys if needed  |

---

### Task 1: Kindness data layer

**Files:** Create `types.ts`, `fixtures.ts`, `useKindnessNotes.ts`

- [x] Types + spark/medium label maps
- [x] 10 seed notes with varied sparks/media
- [x] Hook: load local, merge with seed (newest first), `addNote`, cap 50 local, storage key `tap-kindness-notes`

**Verify:** Import hook in a temp client component without runtime error; seeds length 10.

### Task 2: Note UI + wall + compose

**Files:** Create card, reader, wall, compose, hero; rewrite `KindnessContent.tsx`; extract merch

- [x] Card: paper feel, spark glow, float when motion ok
- [x] Reader: Radix Dialog, Esc closes, text-only body
- [x] Wall: filter radiogroup, masonry, open reader
- [x] Compose: 3 steps, 240 char limit, release → `addNote`
- [x] Hero + merch section + orchestrator wired to `/kindness-always`

**Verify:** `pnpm dev` → `/kindness-always` shows wall; leave a note; refresh keeps it.

### Task 3: Home installation + bridge

**Files:** Rebuild `HomeHero.tsx`; create `KindnessBridge.tsx`; update `page.tsx`

- [x] Single full-bleed plate + Ken Burns + locked H1/support/CTAs
- [x] Bridge: 3 notes + Open the wall
- [x] Page order: Hero → Bridge → Featured → Hacienda → Contact

**Verify:** `/` brand-first hero; Leave a Kindness → kindness page; bridge notes visible.

### Task 4: Smoke QA

- [x] Reduced motion usable
- [x] Keyboard: filters, reader, compose Esc
- [x] Mobile + desktop layout sanity
- [x] Donate/nav untouched
