#!/usr/bin/env bash
# Refuses (exit 1) unless theartistpost.org is really served by this app:
#  1. every public resolver returns only the VPS address for the apex
#     (the VPS address is whatever theartistpost.fluxlab.agency resolves to);
#  2. https://theartistpost.org answers with a valid certificate;
#  3. that HTTPS answer comes from this app (the API returns {"ok":true}).
# Read-only. Safe to run any time.
set -uo pipefail

ORG="${CANONICAL_HOST:-theartistpost.org}"
LEGACY="${LEGACY_HOST:-theartistpost.fluxlab.agency}"

# DNS-over-HTTPS JSON endpoints (Cloudflare and Google use different paths).
doh_url() {
  case "$1" in
    cloudflare) echo "https://cloudflare-dns.com/dns-query" ;;
    google) echo "https://dns.google/resolve" ;;
  esac
}

resolve() { # name resolver -> sorted A records, one per line
  curl -s --max-time 10 -H 'accept: application/dns-json' \
    "$(doh_url "$2")?name=$1&type=A" |
    python3 -c 'import sys,json
try:
  d=json.load(sys.stdin)
  print("\n".join(sorted(a["data"] for a in d.get("Answer",[]) if a.get("type")==1)))
except Exception: pass'
}

fail() { echo "REFUSED: $*"; exit 1; }

vps="$(resolve "$LEGACY" cloudflare)"
[ -n "$vps" ] || fail "could not resolve $LEGACY"
echo "VPS address (from $LEGACY): $vps"

for r in cloudflare google; do
  got="$(resolve "$ORG" "$r")"
  echo "$ORG via $r: ${got//$'\n'/, }"
  [ -n "$got" ] || fail "$ORG has no A record at $r"
  [ "$got" = "$vps" ] || fail "$ORG does not point only at the VPS yet (via $r)"
done

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$ORG/")" ||
  fail "https://$ORG has no valid certificate yet (Traefik issues it on first hit; retry in a minute)"
[ "$code" = "200" ] || fail "https://$ORG/ returned $code"

curl -s --max-time 20 "https://$ORG/api/v1/topics" | grep -q '"ok":true' ||
  fail "https://$ORG is not serving The Artist Post app yet"

echo "OK: $ORG points at the VPS, has a valid certificate and serves the app."
