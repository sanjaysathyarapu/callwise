#!/usr/bin/env bash
# Checks the public site and prints one line per check. Exits 1 if any check fails.
# Usage: scripts/uptime-check.sh [base-url]   (default: https://callwise-three.vercel.app)
# Used by .github/workflows/uptime.yml; safe to run by hand.
set -u

BASE="${1:-${SITE_URL:-https://callwise-three.vercel.app}}"
BASE="${BASE%/}"
ATTEMPTS="${ATTEMPTS:-3}"
RETRY_DELAY="${RETRY_DELAY:-10}"
failed=0

# Retries absorb a cold start or a single dropped request, so one blip does not page anyone.
fetch() { # url -> sets STATUS and BODY
  local n=1
  while [ "$n" -le "$ATTEMPTS" ]; do
    BODY="$(curl -sS -m 20 -w '\n%{http_code}' "$1" 2>/dev/null)" || BODY=$'\n000'
    STATUS="${BODY##*$'\n'}"
    BODY="${BODY%$'\n'*}"
    [ "$STATUS" = "200" ] && return 0
    n=$((n + 1))
    [ "$n" -le "$ATTEMPTS" ] && sleep "$RETRY_DELAY"
  done
  return 1
}

if fetch "$BASE/demo"; then
  echo "PASS /demo returned 200"
else
  echo "FAIL /demo returned $STATUS"
  failed=1
fi

if fetch "$BASE/api/health"; then
  # Compact JSON: {"status":"ok",...}. Any other status (for example "degraded") is a failure.
  if printf '%s' "$BODY" | grep -q '"status":"ok"'; then
    echo "PASS /api/health reports status ok"
  else
    echo "FAIL /api/health returned 200 but status is not ok: $(printf '%s' "$BODY" | head -c 300)"
    failed=1
  fi
else
  echo "FAIL /api/health returned $STATUS"
  failed=1
fi

exit "$failed"
