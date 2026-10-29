#!/usr/bin/env bash
# Compose smoke test (D-23). Usage: bash scripts/compose-smoke.sh [--down]
#
# Runs entirely through `docker compose exec` because the runtime image has no curl and, from a
# devcontainer, the published host ports are not reachable (Docker-outside-of-Docker).
# `--down` removes the containers at the end (never the volumes: the model volume is expensive).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DOWN=false
if [ "${1:-}" = "--down" ]; then
  DOWN=true
fi

fail() {
  echo "SMOKE FAIL: $*" >&2
  exit 1
}

# Prints "<status>\n<body>" for a GET against the app container itself.
#
# The probe writes its result to a file inside the container and the host polls it with short
# `exec` calls. Some Docker setups (this devcontainer's socket proxy) detach an `exec` stream
# after ~0.5 s and drop the rest of its output, while the process keeps running in the container;
# a slow answer (a dependency down makes /api/health take ~2.5 s) would otherwise read as empty.
http_get() {
  local out="" deadline=$((SECONDS + 30))
  docker compose exec -T app rm -f /tmp/smoke.out
  docker compose exec -T app node -e "
    const fs = require('node:fs');
    const done = (text) => { fs.writeFileSync('/tmp/smoke.tmp', text); fs.renameSync('/tmp/smoke.tmp', '/tmp/smoke.out'); };
    fetch('http://127.0.0.1:8080$1')
      .then(async (r) => done(r.status + '\n' + (await r.text())))
      .catch(() => done('000\n'));
  "
  while [ "$SECONDS" -lt "$deadline" ]; do
    out="$(docker compose exec -T app cat /tmp/smoke.out 2>/dev/null || true)"
    if [ -n "$out" ]; then
      printf '%s\n' "$out"
      return 0
    fi
    sleep 0.5
  done
  return 1
}

health() {
  http_get /api/health
}

assert_health() {
  local fragment="$1" out
  out="$(health)" || fail "health request failed"
  echo "$out" | head -n 1 | grep -qx '200' || fail "health status is not 200: $out"
  echo "$out" | grep -q "$fragment" || fail "health body lacks $fragment: $out"
}

wait_health() {
  local fragment="$1" deadline=$((SECONDS + 60)) out
  while [ "$SECONDS" -lt "$deadline" ]; do
    if out="$(health 2>/dev/null)" && echo "$out" | grep -q "$fragment"; then
      return 0
    fi
    sleep 2
  done
  fail "health never returned $fragment within 60 s"
}

echo "== up =="
# ollama-init is a one-shot (model pull) that exits 0 when done; `--wait` treats an exited
# container as a failure, so it is started separately and never awaited. s3-init is pulled in
# by app's depends_on (service_completed_successfully).
docker compose up -d --build --wait --wait-timeout 300 app mongo s3 ollama
docker compose up -d ollama-init

echo "== health (all dependencies) =="
assert_health '"mongo":"ok","s3":"ok","llm":"ok"'
health

echo "== runtime user =="
uid="$(docker compose exec -T app id -u | tr -d '\r')"
[ "$uid" = "1000" ] || fail "app runs as uid $uid, expected 1000"

echo "== SPA fallback and JSON 404 =="
spa="$(http_get /applications/1)"
echo "$spa" | head -n 1 | grep -qx '200' || fail "/applications/1 is not 200"
echo "$spa" | grep -q 'id="root"' || fail "/applications/1 does not return the index.html root div"
nope="$(http_get /api/nope)" || true
echo "$nope" | head -n 1 | grep -qx '404' || fail "/api/nope is not 404"
echo "$nope" | grep -q 'NOT_FOUND' || fail "/api/nope body lacks NOT_FOUND"

echo "== mongo stop/start =="
docker compose stop mongo
assert_health '"mongo":"error"'
docker compose start mongo
wait_health '"mongo":"ok"'

echo "== s3 stop/start =="
docker compose stop s3
assert_health '"s3":"error"'
docker compose start s3
wait_health '"s3":"ok"'

if [ "$DOWN" = true ]; then
  echo "== down =="
  docker compose down
fi

echo "SMOKE OK"
