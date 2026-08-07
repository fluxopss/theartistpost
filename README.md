# The Artist Post

Local arts & entertainment hub for West Palm Beach — **gallery at night** redesign.

Live brand: [theartistpost.org](https://theartistpost.org)

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — tokens in `src/styles/tokens.css`
- **Framer Motion** — reveals, hero, schedule, nav
- **lucide-react** + Radix Dialog (lightbox)
- **Prisma** + PostgreSQL for Explore / Create (fixtures fallback)
- **PWA** — `public/manifest.webmanifest` + `public/sw.js`

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `DATABASE_URL`, Explore loads in-memory fixtures.

## Environment

Copy `.env.example` → `.env`:

| Variable                    | Purpose                          |
| --------------------------- | -------------------------------- |
| `DATABASE_URL`              | Postgres connection              |
| `NEXT_PUBLIC_SITE_URL`      | Absolute URL for metadata / PWA  |
| `NEXT_PUBLIC_SITE_NAME`     | Brand name                       |
| `NEXT_PUBLIC_WEBGL_DEFAULT` | Opt-in Three.js (`true`/`false`) |

## Routes

| Path                                          | Purpose                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `/`                                           | Hero, featured artists, Hacienda, contact / subscribe |
| `/about`                                      | Mission & nonprofit                                   |
| `/artist-schedule`                            | Interactive list ↔ calendar schedule                  |
| `/kindness-always`                            | Kindness Always / merch                               |
| `/supporters`                                 | Chapters & legal                                      |
| `/explore`                                    | The Wall — filters, lightbox, infinite scroll         |
| `/create`, `/post/[slug]`, `/artist/[handle]` | Community product surfaces                            |

**Donate:** PayPal `hosted_button_id=3DCYEFGX7GXMY` (persistent CTA in nav + footer).

## Content & data

- Marketing copy: `src/content/site.ts`
- Featured artists placeholders: `src/data/artists.ts`
- Schedule placeholders: `src/data/events.ts`

## Design system

- Dark default theme (`localStorage` key `tap-theme`); toggle in nav
- Display: Clash Display (Fontshare) · Body: Jost
- Reusable UI: `src/components/` — `NavBar`, `Footer`, `SectionReveal`, `ArtistCard`, `Lightbox`, `ThemeToggle`, etc.
- Respects `prefers-reduced-motion` (cursor trail, blobs, parallax intensity)

## Deploy (Git → VPS only)

Production always ships **git push → Flux VPS**. Do not deploy this app to Vercel.

1. Commit locally and push to `fluxopss/theartistpost` (`main`)
2. On VPS: pull → install → build → PM2 restart (port **3013**)
3. Edge: Traefik at `/docker/traefik/dynamic/theartistpost.yml`
4. Temp URL: https://theartistpost.fluxlab.agency · DNS A → `2.25.206.39`

```bash
# after git push to fluxopss/theartistpost main
ssh flux-vps-deploy 'cd /var/www/theartistpost && git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart theartistpost'
```

Details: [`deploy/README.md`](deploy/README.md) · Postgres: [`deploy/vps-postgres.md`](deploy/vps-postgres.md)

## Scripts

| Command                    | Action                                  |
| -------------------------- | --------------------------------------- |
| `pnpm dev`                 | Local dev server                        |
| `pnpm build`               | Prisma generate + Next production build |
| `pnpm start`               | Serve production build                  |
| `pnpm lint`                | ESLint                                  |
| `pnpm db:push` / `db:seed` | Schema + seed when DB is ready          |

## Specs

- Design: `docs/superpowers/specs/2026-08-06-gallery-night-redesign.md`
- Plan: `docs/superpowers/plans/2026-08-06-gallery-night-redesign.md`
