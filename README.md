# The Artist Post

Local arts & entertainment hub for West Palm Beach — **gallery at night** redesign, elevated toward award-tier interaction.

Live brand: [theartistpost.org](https://theartistpost.org)

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript (strict)
- **Tailwind CSS v4** — tokens in `src/styles/tokens.css` + TS mirror in `src/design-system/tokens.ts`
- **Framer Motion** — reveals, hero, schedule, nav, layout transitions
- **Design system** — `src/design-system/` primitives (Button, Card, Chip, Modal, Accordion, Tabs, Toast, Skeleton, Lightbox)
- **Content service** — `src/lib/content/` (seed adapter now; Supabase stub ready)
- **Prisma** + PostgreSQL for Explore / Create (fixtures fallback)
- **PWA** — `public/manifest.webmanifest` + `public/sw.js`

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `DATABASE_URL`, Explore loads in-memory fixtures.

```bash
pnpm test   # unit tests (schemas, calendar, moderation)
pnpm build  # production build
```

## Design system

| Piece | Path |
|-------|------|
| CSS tokens (dark/light) | `src/styles/tokens.css` |
| JS/Framer tokens | `src/design-system/tokens.ts` |
| Primitives | `src/design-system/primitives/*` |
| Barrel export | `src/design-system/index.ts` |
| Live styleguide | `/styleguide` (dev) |

Fonts: **Clash Display** (display) · **Jost** (body). Theme key: `tap-theme`. All motion honors `prefers-reduced-motion`.

Reusable chrome still lives in `src/components/` and re-exports Button from the design system. Prefer `@/design-system` for new UI. Magnetic buttons: desktop only.

### Keyboard matrix (manual a11y)

| Surface | Keys |
|---------|------|
| Lightbox | `Esc` close · `←`/`→` gallery · focus trap in dialog |
| Tabs (schedule views, styleguide) | `←`/`→` move · `Home`/`End` when implemented in Tabs |
| Accordion (schedule events) | `Enter`/`Space` toggle · focus on header |
| Kindness filters | radiogroup / tablist · arrow or click |
| Kindness compose | `Esc` close · focus moves to first field on open |
| Create publish | Confirm modal required — no auto-post |
| Nav / Donate | Tab order · visible `:focus-visible` ring (teal) |

### Lighthouse (mobile)

```bash
pnpm build && pnpm start -- -p 3000
# other terminal:
pnpm lighthouse:mobile          # writes lighthouse-reports/
pnpm lighthouse:gate            # exit 1 if A11y/SEO/BP < 95 or Perf < 80
LH_BASE_URL=https://theartistpost.fluxlab.agency pnpm lighthouse:mobile
```

Perf target is honest: **≥80** mobile simulated (hero imagery + motion); Accessibility / Best Practices / SEO gate at **≥95**.

## Content adapters

```ts
import { content } from "@/lib/content";

const events = await content.getEvents();
const artists = await content.getArtists();
const chapters = await content.getChapters();
```

| Adapter | Env | Notes |
|---------|-----|-------|
| `seed` (default) | `CONTENT_ADAPTER=seed` | Uses `src/data/*`, kindness fixtures, chapter seed |
| `supabase` | `CONTENT_ADAPTER=supabase` | Stub — see RLS notes in `src/lib/content/adapters/supabase.ts` |
| Prisma posts | `DATABASE_URL` | Explore/Create remain on Prisma until migrated |

Do not invent nonprofit facts. Placeholder artists/events stay labeled “Coming soon” until real data is provided.

## Environment

Copy `.env.example` → `.env`:

| Variable                    | Purpose                          |
| --------------------------- | -------------------------------- |
| `DATABASE_URL`              | Postgres connection              |
| `NEXT_PUBLIC_SITE_URL`      | Absolute URL for metadata / PWA  |
| `NEXT_PUBLIC_SITE_NAME`     | Brand name                       |
| `NEXT_PUBLIC_WEBGL_DEFAULT` | Opt-in Three.js (`true`/`false`) |
| `CONTENT_ADAPTER`           | `seed` \| `supabase`             |

## Routes

| Path                                          | Purpose                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `/`                                           | Hero, featured artists, Hacienda, contact / subscribe |
| `/about`                                      | Mission & nonprofit                                   |
| `/artist-schedule`                            | List · month · agenda + onboarding wizard             |
| `/event/[id]`                                 | Event detail + JSON-LD                                |
| `/kindness-always`                            | Spark field + compose + merch                         |
| `/supporters`                                 | Chapters map/grid + start a chapter                   |
| `/explore`                                    | The Wall — filters, inertia pan, gallery lightbox     |
| `/create`, `/post/[slug]`, `/artist/[handle]` | Community product surfaces                            |
| `/styleguide`                                 | Design system reference                               |
| `/sitemap.xml`, `/robots.txt`                 | SEO                                                   |

**Donate:** PayPal `hosted_button_id=3DCYEFGX7GXMY` (persistent CTA in nav + footer).

**Nonprofit:** EIN `85-2609788` · 522 Clematis Street, West Palm Beach, FL.

## Deploy (Git → VPS only)

Production always ships **git push → Flux VPS**. Do not deploy this app to Vercel.

```bash
ssh flux-vps-deploy 'cd /var/www/theartistpost && git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart theartistpost'
```

Details: [`deploy/README.md`](deploy/README.md) · Postgres: [`deploy/vps-postgres.md`](deploy/vps-postgres.md)

## Specs

- Design: `docs/superpowers/specs/2026-08-06-gallery-night-redesign.md`
- Awwwards audit: `docs/superpowers/specs/2026-08-12-awwwards-upgrade-audit.md`
- Plan: `docs/superpowers/plans/2026-08-06-gallery-night-redesign.md`
