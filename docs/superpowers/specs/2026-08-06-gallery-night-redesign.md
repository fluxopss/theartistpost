# The Artist Post — Gallery Night Redesign

**Date:** 2026-08-06  
**Status:** Approved  
**Approach:** In-place redesign on existing Next.js 16 app (Option A / Approach 1)

## Goal

Elevate The Artist Post from a static/mobile-template feel into a modern, highly interactive, fully responsive arts hub for West Palm Beach — “gallery at night” aesthetic — while preserving all existing content and routes.

## Constraints

- Stay on **Next.js 16** + React 19 + Tailwind 4 + Framer Motion (do not downgrade to Next 14)
- Keep Prisma-backed `/explore`, `/create`, `/post/[slug]`, `/artist/[handle]`
- Fonts: **Clash Display** (display) + **Jost** (body) — not Inter
- Deploy path is **Git → Flux VPS only** (never Vercel)
- Preserve all copy/links in `src/content/site.ts`
- PayPal donate: `hosted_button_id=3DCYEFGX7GXMY`
- Honor `prefers-reduced-motion`
- Accessible: ARIA, keyboard, focus states

## Visual system

- Dark default (`localStorage` key `tap-theme`); light mode toggle
- Navy base `#031a37`, glassmorphic surfaces, coral/gold/teal sparks
- Grain overlay + animated gradient blobs
- Custom cursor/trail on desktop only (no touch)
- Motion tokens + `SectionReveal`

## Chrome

- Sticky glass nav → full-screen mobile menu; persistent Donate
- Global scroll progress bar
- Footer: socials, address, phone, email, Donate, © 2026 copyright

## Pages

| Route              | Behavior                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | Hero (tilt logo, parallax, CTAs), featured artists (flip/filter), Hacienda reveal, contact Open/Closed 09:00–21:30 ET, subscribe |
| `/about`           | Mission story restyle                                                                                                            |
| `/artist-schedule` | List ↔ calendar, expandable events, Google Calendar, onboarding steps                                                            |
| `/kindness-always` | Initiative + merch                                                                                                               |
| `/supporters`      | Sponsor/chapter wall                                                                                                             |
| `/explore`         | Wall gallery: filters, lightbox, infinite scroll over posts API                                                                  |

## Data

- `src/data/artists.ts` — featured placeholders
- `src/data/events.ts` — schedule placeholders

## PWA

- `manifest.webmanifest` + service worker for installable shell / offline chrome

## Out of scope

- Moving repo off OneDrive
- Removing Prisma or Three.js entirely (WebGL remains opt-in)
