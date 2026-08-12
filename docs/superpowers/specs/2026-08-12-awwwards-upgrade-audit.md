# The Artist Post — Awwwards Upgrade Audit (current)

**Date:** 2026-08-12  
**Status:** Awaiting go-ahead before further large refactors  
**Repo:** `theartistpost/` · Next.js 16.3 · React 19 · Tailwind 4 · Framer Motion 13 · Prisma 6 · Vitest

This supersedes the 2026-08-11 notes. Much of the original brief is already in the tree. This document is a **gap analysis**, not a greenfield plan.

---

## 1. What is already shipped

### Product surfaces (routes preserved)

| Route | Status |
|-------|--------|
| `/` | Hero + KindnessBridge + featured artists + Hacienda + contact/subscribe |
| `/about` | Mission + nonprofit facts |
| `/artist-schedule` | List / month / agenda via `ScheduleView` + content service |
| `/event/[id]` | Event detail + JSON-LD |
| `/kindness-always` | Spark wall + physics canvas + compose + merch |
| `/supporters` | Chapter cards + SVG map (`SupportersExperience`) |
| `/explore` | The Wall + filters + lightbox + create CTA |
| `/create` | Multi-step wizard + confirm-before-publish |
| `/post/[slug]`, `/artist/[handle]` | Detail views |
| `/styleguide` | Dev design-system gallery (`app/(dev)/styleguide`) |

### Architecture already in place

- **Design system:** `src/design-system/` (tokens + Button, Card, Chip, Modal, Accordion, Tabs, Toast, Skeleton, Lightbox)
- **Content service:** `src/lib/content/` with Zod schemas, seed adapter, Supabase stub + RLS notes
- **SEO:** `sitemap.ts`, `robots.ts`, `NonprofitOrganization` JSON-LD (EIN, address), Event JSON-LD on event pages
- **Theme:** `data-theme` dark/light, Clash Display self-hosted, Jost via `next/font`
- **Motion:** `app/template.tsx` route enter; `prefers-reduced-motion` in hero, kindness physics, template
- **Tests:** Vitest (`pnpm test`) — primitives + content schemas
- **Brand facts intact** in `src/content/site.ts`: EIN `85-2609788`, 522 Clematis, PayPal donate, Venmo, 7 socials, mission copy

### Honest empty states (correct — do not invent)

- `src/data/artists.ts` is **empty** until real portraits/bios arrive
- Events remain labeled coming-soon placeholders in seed
- Chapters are **state-level** seeds (OK, ID, NV, TN, WA, FL, TX) — no fake city leads

---

## 2. Gaps vs the Awwwards brief

### High (quality / consistency)

| Gap | Evidence |
|-----|----------|
| **Dual primitive trees** | Pages still import `@/shared/ui/Button` while DS Button exists (`shared/ui/Button` re-exports, but Kindness merch still uses `@/components/Lightbox`) |
| **Featured artists bypass content service** | `FeaturedArtistsSection` imports `@/data/artists` directly, not `content.getArtists()` |
| **Hero is not yet award-tier** | Single cover + two static inset plates + CSS mesh/blobs. No GPU-cheap shader/canvas accent, no true layered parallax, no word-by-word headline craft at SOTD level |
| **Lighthouse ≥ 95 not gated** | `lighthouse` is in package.json; no CI script / documented mobile score |
| **A11y not systematically proven** | No axe/Playwright keyboard matrix; WCAG 2.2 AA is claimed in README, not verified |
| **Tests thin** | No interaction tests for lightbox swipe, Explore pan, compose validation, schedule ICS |

### Medium (craft)

| Gap | Notes |
|-----|-------|
| Magnetic buttons | Not applied globally (hero CTAs may have some; chrome/nav not magnetic) |
| Explore pinch-zoom / inertia | Implemented in `ExploreGrid` — needs device QA, not a rewrite |
| Kindness physics | Canvas field exists; reduced-motion grid fallback exists — polish + perf budget on low-end phones |
| Create flow | Confirm modal exists — image preview / optimistic UI need QA |
| Newsletter | SubscribeForm still needs a real webhook (do not fake) |
| Native-ready split | Business logic still mixed with DOM in feature components; `lib/content` is the good pattern to extend |

### Low / out of scope until you provide assets

- Real featured artist photos + bios
- Confirmed Hacienda event lineup
- Chapter city/lead contacts
- Hi-res WebP hero plates (~150–250KB LCP)
- Whether Google Form remains the legal agreement source of truth

---

## 3. Recommended approach (not a rewrite)

**Do not big-bang.** Keep `main` deployable. Finish the **craft + consistency** layer on top of what exists.

| Approach | Verdict |
|----------|---------|
| A. **Polish slices on existing systems** (recommended) | Highest SOTD gain, lowest regression |
| B. New visual language / new routes | Breaks brand + VPS continuity |
| C. Full DS rewrite of every page in one PR | Unreviewable; fails “keep runnable” |

---

## 4. Remaining roadmap (reviewable increments)

### Slice 0 — Audit freeze (this doc)

No code. Align on remaining work.

### Slice 1 — Design-system completion (1 PR)

- Migrate remaining `@/components/Lightbox` and ad-hoc chips to DS primitives
- Route Featured Artists through `content.getArtists()`
- Styleguide: document magnetic button, toast, lightbox keyboard
- Manual QA: `/styleguide` + home + kindness merch lightbox

### Slice 2 — Hero craft (1 PR)

- Layered parallax collage (existing brand images only)
- Cheap Canvas/CSS shader accent, code-split, static fallback
- Animated headline reveal; reduced-motion = current static plate
- LCP: keep `cover-opt` preload; no extra hero JS on mobile if possible

### Slice 3 — Interaction QA + tests ✅

- Vitest: lightbox keyboard, compose empty/spam/240 clamp, publish confirm gate
- README keyboard matrix + lighthouse commands

### Slice 4 — Perf / SEO gate ✅

- `pnpm lighthouse:mobile` / `pnpm lighthouse:gate` (A11y/SEO/BP ≥95, Perf ≥80 honest)
- Twitter cards + OG images on schedule, supporters, events
- Cursor trail JS skipped on touch / reduced-motion

### Slice 5 — Only if you supply content

- Artists, events, chapter cities — seed files only, no invented names

---

## 5. Constraints (unchanged)

- Preserve EIN, address, donate, Venmo, socials, Kindness Always voice
- Dark editorial, not garish
- Touch-first; reduced-motion on every new animation
- Git → Flux VPS; no Vercel production
- No lorem; no fake testimonials/artists

---

## 6. Go-ahead

Reply with which slice to start:

1. **Slice 1** — DS consistency + content service wiring (safest)
2. **Slice 2** — Hero craft (highest visual impact)
3. **Slice 3** — Tests + a11y proof
4. Something else

Default recommendation: **Slice 1**, then **Slice 2**.
