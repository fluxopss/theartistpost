# The Artist Post — Kindness Notes + Home Installation

**Date:** 2026-08-06  
**Status:** Approved (Stages 1–2)  
**Approach:** Staged Option C — Kindness Notes first, then Home art installation that funnels into it  
**Repo:** `theartistpost/` (Next.js 16 · React 19 · Tailwind 4 · Framer Motion · Prisma)

## Goal

Make **kindness between artists** the signature interactive experience of The Artist Post, then rebuild the home hero as a brand-first art installation that leads visitors into that experience — while keeping the existing West Palm Beach hub (schedule, Hacienda, explore, merch, donate).

## Constraints

- In-place work on the existing app; do not scaffold a new repo
- Stack stays Next 16 + React 19 + Tailwind 4 + Framer Motion
- Fonts: **Clash Display** + **Jost** (no Inter / Geist / system as primary)
- Visual language extends “gallery at night” tokens in `src/styles/tokens.css` (navy base, coral/gold/teal sparks) — not cream/terracotta brochure, not purple SaaS
- Deploy: **Git → Flux VPS only** (PM2 port 3013); never Vercel
- Preserve marketing copy/links in `src/content/site.ts` unless a line is explicitly replaced for the new hero/kindness messaging
- PayPal donate CTA remains in nav/footer (`hosted_button_id=3DCYEFGX7GXMY`)
- Honor `prefers-reduced-motion`; keyboard + ARIA on all interactive note UI
- No auth required for v1 notes
- WebGL/Three.js remains opt-in elsewhere; Kindness Notes and Home hero are **2D + Framer Motion only** for this spec

## Product narrative

1. Visitor lands on Home → feels TAP as a night gallery → chooses **Leave a Kindness** or **Explore the Wall**
2. On Kindness Always → reads the living wall → optionally composes and releases a note
3. Merch / Bonfire remains available below the wall (not the hero of the page)

---

## Stage 1 — Kindness Notes (`/kindness-always`)

### Feeling

Quiet gallery after hours. Warm sparks on deep navy. Notes read like paper left on a studio wall — expressive, not SaaS cards.

### Page composition (top → bottom)

1. **Hero**
   - Display signal: “Kindness Always” (trademark mark + wordmark)
   - Supporting line (locked): “Leave a spark for another artist — creativity grows when we are kind.”
   - Primary CTA: **Leave a note** (opens compose ritual)
2. **The Wall**
   - Masonry / staggered grid of note cards with gentle float
   - Filters: All · Music · Visual · Theater · Open heart
   - Hover/focus expands; click/Enter opens a soft reading surface (lightbox-style, keyboard-dismissible)
3. **Compose ritual** (drawer or modal, 3 steps)
   - Step 1: Who it’s for — Anyone / Music / Visual / Theater / Open heart
   - Step 2: Message — short text (max **240** characters), optional display name (default “Anonymous artist”)
   - Step 3: Spark color — coral · gold · teal → **Release** animation arcs the note onto the wall
4. **Merch act** (existing content demoted)
   - Keep current merch body, trademark/love-all images, gallery lightbox, Bonfire CTA, phone order line

### Note model (v1)

```ts
type KindnessMedium = "anyone" | "music" | "visual" | "theater" | "open-heart";
type KindnessSpark = "coral" | "gold" | "teal";

type KindnessNote = {
  id: string; // cuid or crypto.randomUUID()
  body: string; // 1–240 chars
  fromLabel: string; // display name or "Anonymous artist"
  medium: KindnessMedium;
  spark: KindnessSpark;
  createdAt: string; // ISO
  source: "seed" | "local";
};
```

### Data & persistence

| Source                                              | Role                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Seed fixtures (`src/features/kindness/fixtures.ts`) | Always present so the wall looks alive                                                                             |
| `localStorage` key `tap-kindness-notes`             | Visitor-created notes (client-only)                                                                                |
| Prisma                                              | **Stub only** — optional `KindnessNote` model in schema comments or unused model; no production sync in this stage |

Merge rule: seed notes + local notes, sorted newest-first (local notes appear at top after release). Cap local notes at **50**; oldest local drops when exceeded.

### Validation & errors

- Empty body → inline error, do not advance
- Over 240 chars → prevent input / show counter
- XSS: render body as text only (no HTML)
- Storage full / quota errors → toast-style inline message; note still shows in-session until refresh

### Components (feature folder)

| Unit                 | Responsibility                         |
| -------------------- | -------------------------------------- |
| `KindnessHero`       | Brand + line + Leave a note CTA        |
| `KindnessWall`       | Filter bar + masonry + focus/hover     |
| `KindnessNoteCard`   | Single note visual (spark border/glow) |
| `KindnessNoteReader` | Expanded reading surface               |
| `KindnessCompose`    | 3-step ritual + release motion         |
| `useKindnessNotes`   | Load/merge/save notes; addNote         |
| `fixtures.ts`        | Seed notes (8–12)                      |
| `types.ts`           | Shared types                           |

Replace the current merch-first `KindnessContent` with a thin orchestrator that composes the above + existing merch section.

### Motion

- Wall: staggered entrance; subtle y-float (disabled when reduced motion)
- Release: short arc from compose → wall insert (instant insert if reduced motion)
- Reader: fade + scale soft open/close

### Accessibility

- Filters are a radiogroup or tablist with aria-selected
- Notes are buttons/links with accessible names (truncated of body)
- Compose: focus trap, Esc closes, step announcements via `aria-live`
- Color is not the only spark cue (label or icon too)

---

## Stage 2 — Home art installation (`/`)

### First viewport (strict hero budget)

| Allowed                                                                                          | Forbidden in hero                |
| ------------------------------------------------------------------------------------------------ | -------------------------------- |
| Brand (logo + name at display scale)                                                             | Collage grid of many images      |
| One H1 (locked): “Creativity needs kindness”                                                     | Stats, schedule chips, cards     |
| One supporting line (locked): “West Palm Beach arts hub — freedom to create, courage to uplift.” | Floating badges / promo stickers |
| CTA group: **Leave a Kindness** → `/kindness-always` · **Explore the Wall** → `/explore`         | Forms, trust pills               |
| One dominant full-bleed plate (cover or Hacienda night crop) + slow Ken Burns + soft spark blobs | Inset media cards                |

Secondary nav destinations (schedule, about) remain in the site nav — not as hero CTAs.

### Below the fold (one job each)

1. **Kindness bridge** — three seed/local note previews using the same card language as Stage 1; CTA “Open the wall” → `/kindness-always`
2. **Featured artists** — existing flip/filter section; polish only (no redesign of data model)
3. **Hacienda showcase** — keep scroll reveal + Get Directions
4. **Contact / subscribe** — keep Open/Closed hours + subscribe

### Components

| Unit                   | Change                                                     |
| ---------------------- | ---------------------------------------------------------- |
| `HomeHero`             | Rebuild: single plate, brand-first, new CTAs, Ken Burns    |
| `KindnessBridge` (new) | Home strip reusing `KindnessNoteCard` + fixtures/hook      |
| Other home sections    | Keep; light token/spacing polish only if needed for rhythm |

### Motion

- Plate slow scale/translate drift
- Brand + H1 entrance
- CTA spring
- Bridge notes: shared entrance language with Stage 1
- All gated by `prefers-reduced-motion`

---

## Architecture summary

```
src/features/kindness/
  types.ts
  fixtures.ts
  useKindnessNotes.ts
  KindnessHero.tsx
  KindnessWall.tsx
  KindnessNoteCard.tsx
  KindnessNoteReader.tsx
  KindnessCompose.tsx
  KindnessMerchSection.tsx   // extracted from current KindnessContent
  KindnessContent.tsx        // orchestrator

src/features/home/
  HomeHero.tsx               // rebuilt
  KindnessBridge.tsx         // new
  FeaturedArtistsSection.tsx // keep
  ContactSocialSection.tsx   // keep
```

No new API routes required for v1. No auth changes.

## Testing (manual)

1. `/kindness-always` — wall loads with seeds; filters work; compose adds a note; refresh keeps local notes
2. Reduced motion — no float/arc; still usable
3. Keyboard — tab through filters, open reader, complete compose, Esc closes
4. Mobile 375 / tablet 768 / desktop 1440 — hero budget holds; wall readable; merch intact
5. `/` — hero is single composition; Leave a Kindness lands on kindness page; bridge shows notes
6. Donate / social / hours / schedule routes unchanged

## Out of scope

- Prisma production sync for kindness notes
- User accounts / moderation queue
- Notifications or email when a note is left
- Schedule, explore, create-post redesigns
- Moving repo off OneDrive (dev path note only)
- Full 3D constellation explore

## Implementation order

1. Types, fixtures, `useKindnessNotes`
2. Note card + reader + wall + compose → wire `/kindness-always`
3. Merch extraction under kindness page
4. Rebuild `HomeHero`
5. Add `KindnessBridge`
6. Manual QA checklist above → optional VPS deploy when requested

## Success criteria

- Kindness Always feels like TAP’s signature interactive moment, not a merch landing page with motion sprinkled on
- Home first viewport passes the brand test (remove nav → still unmistakably The Artist Post)
- A visitor can leave a kindness note in under ~30 seconds without creating an account
- Existing donate, schedule, explore, and Hacienda paths still work
