# VPS deploy notes — theartistpost.fluxlab.agency

## Runtime

- App path: `/var/www/theartistpost`
- PM2 name: `theartistpost` (port **3013**)
- Traefik: `/docker/traefik/dynamic/theartistpost.yml`
- Temp URL: https://theartistpost.fluxlab.agency
- Postgres: Docker `theartistpost-postgres` on `127.0.0.1:5433`

## Deploy (from Flux Hub)

```bash
# after git push to fluxopss/theartistpost main
ssh flux-vps-deploy 'cd /var/www/theartistpost && git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart theartistpost'
```

Build uses **webpack** (`next build --webpack`). Next 16 Turbopack production builds were blanking the client after hydrate.

Keep `NEXT_PUBLIC_WEBGL_DEFAULT=false` unless you intentionally opt into the Three.js hero.

First-time bootstrap is done by the deploy agent (clone, .env, traefik, DNS, pm2 start).
