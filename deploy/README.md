# VPS deploy notes — theartistpost.fluxlab.agency

**Update flow:** Git → VPS only. Push `main` to `fluxopss/theartistpost`, then pull/build/restart on the server. Never deploy this app to Vercel.

## Runtime

- App path: `/var/www/theartistpost`
- PM2 name: `theartistpost` (port **3013**)
- Traefik: `/docker/traefik/dynamic/theartistpost.yml`
- Temp URL: https://theartistpost.fluxlab.agency
- Postgres: Docker `theartistpost-postgres` on `127.0.0.1:5433`

## Deploy (from Flux Hub)

**Preferred:** push `main` to `fluxopss/theartistpost`. VPS auto-updates within ~3 minutes via `redeploy-sites` (see Flux-Labs-HQ `brain/vps-autodeploy.md`).

```bash
# force now
ssh flux-vps 'sudo -u deploy -H deploy-site theartistpost'

# legacy manual
ssh flux-vps-deploy 'cd /var/www/theartistpost && git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart theartistpost'
```

Build uses **webpack** (`next build --webpack`). Next 16 Turbopack production builds were blanking the client after hydrate.

Keep `NEXT_PUBLIC_WEBGL_DEFAULT=false` unless you intentionally opt into the Three.js hero.

First-time bootstrap is done by the deploy agent (clone, .env, traefik, DNS, pm2 start).
