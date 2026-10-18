#!/usr/bin/env bash
# Post-cutover proof. Read-only. Exit 0 only if every check passes.
set -uo pipefail
ORG="${CANONICAL_HOST:-theartistpost.org}"
LEGACY="${LEGACY_HOST:-theartistpost.fluxlab.agency}"
fails=0
check() { # label expected actual
  if [ "$2" = "$3" ]; then echo "PASS  $1 ($3)"; else echo "FAIL  $1: expected $2, got $3"; fails=$((fails+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
loc()  { curl -s -o /dev/null -w '%{redirect_url}' --max-time 20 "$1"; }

check "home on $ORG" 200 "$(code "https://$ORG/")"
check "about on $ORG" 200 "$(code "https://$ORG/about")"
check "www goes to apex" "https://$ORG/about" "$(loc "https://www.$ORG/about")"
check "legacy page goes to $ORG" "https://$ORG/about" "$(loc "https://$LEGACY/about")"
check "legacy query kept" "https://$ORG/explore?lane=music" "$(loc "https://$LEGACY/explore?lane=music")"
check "app API on legacy host NOT redirected" 200 "$(code "https://$LEGACY/api/v1/topics")"
check "private API still private" 401 "$(code "https://$LEGACY/api/v1/me")"
check "API on $ORG" 200 "$(code "https://$ORG/api/v1/topics")"
check "old GoDaddy URL redirects" "https://$ORG/artist-schedule" "$(loc "https://$ORG/events")"
sm="$(curl -s --max-time 20 "https://$ORG/sitemap.xml" | grep -o "<loc>https://$ORG" | head -1)"
check "sitemap uses $ORG" "<loc>https://$ORG" "$sm"
rb="$(curl -s --max-time 20 "https://$ORG/robots.txt" | grep -o "Sitemap: https://$ORG/sitemap.xml")"
check "robots points at $ORG sitemap" "Sitemap: https://$ORG/sitemap.xml" "$rb"
canon="$(curl -s -D - -o /dev/null --max-time 20 "https://$ORG/about" | grep -i '^link:' | grep -o "<https://$ORG/about>; rel=\"canonical\"")"
[ -n "$canon" ] && echo "PASS  per-page canonical uses $ORG" || { echo "FAIL  no per-page canonical for $ORG/about"; fails=$((fails+1)); }
# Preload hints must survive alongside the canonical (fonts and CSS load early).
pre="$(curl -s -D - -o /dev/null --max-time 20 "https://$ORG/about" | grep -i '^link:' | grep -c 'rel=preload')"
[ "$pre" -ge 1 ] && echo "PASS  preload hints present" || { echo "FAIL  preload hints missing"; fails=$((fails+1)); }
hsts="$(curl -sI --max-time 20 "https://$ORG/" | grep -ci strict-transport-security)"
check "HSTS header on $ORG" 1 "$hsts"

echo "---"; [ "$fails" -eq 0 ] && { echo "ALL CHECKS PASSED"; exit 0; } || { echo "$fails CHECK(S) FAILED"; exit 1; }
