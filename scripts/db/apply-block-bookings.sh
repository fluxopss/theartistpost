#!/usr/bin/env bash
# Apply the BlockBooking table (PR #54) to a database, safely and explicitly.
# The deploy workflow (vps-ship.yml) runs no migrations, and `prisma migrate deploy`
# fails on a fresh/unbaselined DB, so this is the go-live DB step.
#
# GO-LIVE STEPS (production):
#   1. Backup:   pg_dump "$DATABASE_URL" -Fc -f theartistpost-pre-blockbookings-$(date +%F).dump
#   2. Apply:    DATABASE_URL=... CONFIRM=yes ./scripts/db/apply-block-bookings.sh
#                (optional: add RESOLVE=yes to also record it in Prisma's _prisma_migrations
#                 via `npx prisma migrate resolve --applied 20261111120000_block_bookings`)
#   3. Merge PR #54 (main auto-deploys).
#
# Idempotent: safe to re-run. Additive only (CREATE ... IF NOT EXISTS).
set -euo pipefail

MIGRATION=20261111120000_block_bookings
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${DATABASE_URL:?DATABASE_URL must be set}"
if [ "${CONFIRM:-}" != "yes" ]; then
  echo "Refusing to run: set CONFIRM=yes to proceed." >&2
  exit 1
fi

# Print target with the password masked.
masked="$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:/@]*):[^@]*@#\1:****@#')"
echo "Target database: $masked"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DIR/apply-block-bookings.sql"

exists="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "SELECT to_regclass('public.\"BlockBooking\"') IS NOT NULL")"
if [ "$exists" != "t" ]; then
  echo "Verification FAILED: table BlockBooking not found." >&2
  exit 1
fi
echo "Verified: table \"BlockBooking\" exists."

RESOLVE_CMD="npx prisma migrate resolve --applied $MIGRATION"
echo "Prisma history command: $RESOLVE_CMD"
if [ "${RESOLVE:-}" = "yes" ]; then
  $RESOLVE_CMD
else
  echo "Not run (set RESOLVE=yes to record it in _prisma_migrations)."
fi
