# Awwwards upgrade — implementation notes

**Date:** 2026-08-11  
**Status:** Incremental ship (Phases 1–5 in progress)

## Delivered

1. Design system (`src/design-system`) + `/styleguide`
2. Content service + seed/Supabase adapters
3. SEO: sitemap, robots, NonprofitOrganization + Event JSON-LD
4. Hero: layered collage, mesh, grain, word reveal, magnetic CTAs
5. Artists: 3D tilt + modal + layout filter transitions
6. Explore: inertia pan, pinch zoom, gallery lightbox
7. Kindness: physics spark field + moderation stub
8. Schedule: month/agenda/list, ICS, `/event/[id]`, onboarding wizard
9. Supporters: chapter cards + SVG highlight map
10. Create: confirm-before-publish modal
11. Vitest coverage for schemas/calendar/moderation

## Still needs client assets

- Real featured artist portraits + bios (empty stage ships until then)
- Confirmed event lineup
- Chapter leads (optional) beyond state-level seed
- Newsletter webhook (SubscribeForm)
- Optimized WebP hero plates for further LCP gains

## Manual QA checklist

- [ ] 360 / 768 / 1024 / 1440 — no horizontal scroll
- [ ] Keyboard: lightbox arrows, accordion, tabs, modals, kindness field arrows
- [ ] Theme toggle dark/light contrast
- [ ] `prefers-reduced-motion` — hero static; kindness defaults to grid
- [ ] Explore drag + lightbox; zoom buttons (no pinch fight)
- [ ] Create: upload image → preview → confirm modal → toast
- [ ] Featured artists shows empty stage (not fake Coming Soon cards)
- [ ] `/styleguide` renders primitives
- [ ] `pnpm test` + `pnpm build` green
