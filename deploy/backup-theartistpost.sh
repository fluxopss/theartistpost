#!/usr/bin/env bash
# Nightly backup for The Artist Post on the Flux VPS (installed by
# .github/workflows/install-nightly-backups.yml). Dumps the Postgres DB from
# its Docker container, verifies the archive, tars member uploads, and keeps
# KEEP_DAYS days. Restore: pg_restore --clean --no-owner -d <db> db-<stamp>.dump
set -euo pipefail
umask 077

DEST="${TAP_BACKUP_DIR:-$HOME/backups/theartistpost}"
APP_DIR="${TAP_APP_DIR:-/var/www/theartistpost}"
UPLOADS="${TAP_UPLOAD_DIR:-$APP_DIR/public/uploads}"
CONTAINER="${TAP_PG_CONTAINER:-theartistpost-postgres}"
KEEP_DAYS="${TAP_BACKUP_KEEP_DAYS:-14}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DEST"

partial="$DEST/.db-$stamp.dump.partial"
trap 'rm -f "$partial"' EXIT
docker exec "$CONTAINER" pg_dump -U theartistpost -d theartistpost --format=custom --no-owner > "$partial"
# A dump that can't be listed is not a backup.
docker exec -i "$CONTAINER" pg_restore --list < "$partial" > /dev/null
mv "$partial" "$DEST/db-$stamp.dump"

if [[ -d "$UPLOADS" ]]; then
  tar -C "$(dirname "$UPLOADS")" -czf "$DEST/uploads-$stamp.tgz" "$(basename "$UPLOADS")"
fi

find "$DEST" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tgz' \) -mtime +"$KEEP_DAYS" -delete

echo "backup ok $stamp db=$(du -h "$DEST/db-$stamp.dump" | cut -f1)"
