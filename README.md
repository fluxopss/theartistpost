# The Artist Post

Interactive playground for artists at [theartistpost.org](https://theartistpost.org) — creative **mobile-app UI** (phone frame + bottom tabs), brand marketing screens, and Prisma-backed Explore / Create.

## Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS v4** with design tokens in `src/styles/tokens.css`
- **Framer Motion** for UI motion
- **Three.js + React Three Fiber + Drei** for optional WebGL (Home hero + post detail accent)
- **Prisma** + PostgreSQL (fixtures fallback until DB is connected)
- **Mock auth** abstraction ready for NextAuth

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without a real `DATABASE_URL`, pages load **in-memory fixtures** so the UI stays alive.

## Environment

Copy `.env.example` → `.env` and set:

| Variable                    | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `DATABASE_URL`              | Postgres connection string              |
| `NEXT_PUBLIC_SITE_URL`      | Absolute URL for metadata               |
| `NEXT_PUBLIC_SITE_NAME`     | Brand name                              |
| `NEXT_PUBLIC_WEBGL_DEFAULT` | `true` / `false` — default WebGL on/off |

## Database (when ready)

Temp **VPS Postgres** is the wiring framework (Docker on `flux-vps`, port **5433**). See [deploy/vps-postgres.md](deploy/vps-postgres.md).

```bash
# .env DATABASE_URL must point at 2.25.206.39:5433 (password in local .env + VPS /opt/apps/theartistpost/.env)
pnpm db:push
pnpm db:seed
```

Prisma schema: `prisma/schema.prisma`  
Seed: `prisma/seed.ts`

UFW allows 5433 only from Flux Hub’s public IP. Rotate credentials before production and move to managed Postgres when ready.

## Routes

| Path               | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `/`                | Brand home — hero, Hacienda, Featured Coming Soon, contact |
| `/about`           | Mission, 501(c)(3), donate, partner                        |
| `/artist-schedule` | Showcase + artist onboarding                               |
| `/kindness-always` | Kindness Always merch                                      |
| `/supporters`      | Chapters + legal                                           |
| `/explore`         | Community post grid (VPS Postgres)                         |
| `/post/[slug]`     | Post detail + optional PostCard3D                          |
| `/artist/[handle]` | Artist profile                                             |
| `/create`          | Multi-step create wizard                                   |

## WebGL toggle

- Disabled automatically when WebGL is missing or `prefers-reduced-motion` is on
- User can toggle from the Home hero; preference stored in `localStorage` (`tap-webgl`)
- Components: `WebGLGate`, `InteractiveHeroScene`, `PostCard3D`

## Auth (TODO: NextAuth)

- Types + adapter: `src/features/auth/`
- `mockAuthAdapter` always returns a studio guest artist
- Swap `authAdapter` for NextAuth `auth()` / `getServerSession` when ready
- Env placeholders for `NEXTAUTH_URL` / `NEXTAUTH_SECRET` are in `.env.example`

## Scripts

| Command            | Action                                    |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Dev server                                |
| `pnpm build`       | Generate Prisma client + production build |
| `pnpm db:generate` | Prisma client only                        |
| `pnpm db:push`     | Push schema to DB                         |
| `pnpm db:seed`     | Seed artists / posts / tags               |
| `pnpm lint`        | ESLint                                    |

## Architecture

Feature folders under `src/features/{posts,artists,home,auth}` with shared UI, motion, and three modules in `src/shared/`. Server Components fetch via `queries.ts`; mutations live in `actions.ts`.
