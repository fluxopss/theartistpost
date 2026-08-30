# VPS deploy notes — theartistpost.fluxlab.agency

**Update flow:** Git → VPS only. Push `main` to `fluxopss/theartistpost`, then pull/build/restart on the server. Never deploy this app to Vercel.

## Runtime

- App path: `/var/www/theartistpost`
- PM2 name: `theartistpost` (port **3013**)
- Traefik: `/docker/traefik/dynamic/theartistpost.yml` (repo copy: `deploy/traefik-theartistpost.yml`)
- Live app URL: https://theartistpost.fluxlab.agency
- Apex `theartistpost.org` is still GoDaddy Website Builder — Traefik is ready for that host when DNS moves to the VPS
- Postgres: Docker `theartistpost-postgres` on `127.0.0.1:5433`
- GitHub Actions: `.github/workflows/vps-ship.yml` (needs `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`)

## Deploy (from Flux Hub)

**Preferred:** push `main` to `fluxopss/theartistpost`. VPS auto-updates within ~3 minutes via `redeploy-sites` (see Flux-Labs-HQ `brain/vps-autodeploy.md`). A push to `main` also runs **Ship The Artist Post to VPS**. The Flux master MCP ship (`flux-ghl-mcp`) redeploys this app after the MCP health check.

```bash
# force now
ssh flux-vps 'sudo -u deploy -H deploy-site theartistpost'

# legacy manual
ssh flux-vps-deploy 'cd /var/www/theartistpost && git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart theartistpost'
```

Build uses **webpack** (`next build --webpack`). Next 16 Turbopack production builds were blanking the client after hydrate.

Keep `NEXT_PUBLIC_WEBGL_DEFAULT=false` unless you intentionally opt into the Three.js hero.

First-time bootstrap is done by the deploy agent (clone, .env, traefik, DNS, pm2 start).
