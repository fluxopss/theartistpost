# The Artist Post — temp Postgres on Flux VPS

#

# Location: /opt/apps/theartistpost

# Container: theartistpost-postgres (postgres:16-alpine)

# Port: 5433 → container 5432

# DB/user: theartistpost

# Secrets: .env (POSTGRES_PASSWORD) — chmod 600, not in git

#

# Start/stop:

# cd /opt/apps/theartistpost && docker compose up -d

# docker compose down

#

# UFW: 5433/tcp allowed from Flux Hub public IP only (temp wiring).

# Before production: migrate to managed Postgres, revoke public 5433, rotate password.
