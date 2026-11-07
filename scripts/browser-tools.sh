#!/usr/bin/env bash
# Browser tools for the defense documents (07-03, D-17).
# Usage: bash scripts/browser-tools.sh capture [shot,...] | mermaid <file.md>... | mermaid --self-test
#
# Runs a throwaway container from the pinned Playwright image on the compose network, installs the
# pinned packages INSIDE it (never in a package.json or the lockfile), runs the recipe against the
# running stack at http://app:8080 and removes the container on exit. The stack must be up and
# seeded (`docker compose up -d --wait`, then `docker compose exec app npm run seed`).
#
# `capture` takes the screenshots of docs/presentacion/capturas/ (all of them, or the comma
# separated list given). It only reads and navigates: it never saves a candidatura.
# `mermaid <file.md>...` parses every fenced `mermaid` block of the Markdown files with the pinned
# mermaid in the container and exits 1 on `MERMAID FAIL` (zero blocks is a failure too).
# `mermaid --self-test` proves the check accepts valid diagrams and rejects a broken one.
#
# Sandbox notes: a bind mount of a devcontainer path arrives empty, so files travel with `docker cp`;
# the stdout of a foreground `docker exec` can be swallowed, so every command in the container runs
# detached (`docker exec -d`), writes a log and an exit-code file, and the host polls them.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

IMAGE=mcr.microsoft.com/playwright:v1.56.1-noble
PW=playwright@1.56.1
MM=mermaid@11.17.2
NET=expediente_default
NAME=expediente-browser-$$

fail() {
  echo "BROWSER FAIL: $*" >&2
  exit 1
}

usage() {
  echo "Usage: bash scripts/browser-tools.sh capture [shot,...] | mermaid <file.md>... | mermaid --self-test" >&2
}

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}

SUBCOMMAND="${1:-}"
case "$SUBCOMMAND" in
  capture | mermaid) shift ;;
  *)
    usage
    exit 2
    ;;
esac

trap cleanup EXIT

# Runs `CMD` in /tmp of the container, detached, and waits for its exit code.
# `run_in LABEL TIMEOUT_SECONDS CMD`: prints the log, returns the exit code (124 on timeout).
run_in() {
  local label="$1" limit="$2" cmd="$3" deadline code="" log=""
  docker exec "$NAME" rm -f "/out/$label.exit" "/out/$label.log"
  docker exec -d "$NAME" bash -c "cd /tmp && { $cmd; } > /out/$label.log 2>&1; echo \$? > /out/$label.exit"
  deadline=$((SECONDS + limit))
  while [ "$SECONDS" -lt "$deadline" ]; do
    code="$(docker exec "$NAME" cat "/out/$label.exit" 2>/dev/null | tr -d '\r\n' || true)"
    [ -n "$code" ] && break
    sleep 2
  done
  log="$(docker exec "$NAME" cat "/out/$label.log" 2>/dev/null | tr -d '\r' || true)"
  [ -z "$log" ] || printf '%s\n' "$log"
  if [ -z "$code" ]; then
    echo "BROWSER FAIL: '$label' did not finish within ${limit} s" >&2
    return 124
  fi
  return "$code"
}

preflight() {
  docker image inspect "$IMAGE" >/dev/null 2>&1 \
    || fail "image $IMAGE is not present locally (docker pull $IMAGE)"
  docker network inspect "$NET" >/dev/null 2>&1 \
    || fail "network $NET does not exist: start the stack with 'docker compose up -d --wait'"
}

# Starts the container and installs the pinned packages inside it only (--ignore-scripts).
start_container() {
  local packages="$*"
  docker run -d --name "$NAME" --network "$NET" -w /tmp "$IMAGE" sleep 900 >/dev/null \
    || fail "could not start the browser container"
  docker exec "$NAME" mkdir -p /out /work
  run_in install 240 "npm init -y >/dev/null && npm i $packages --ignore-scripts --no-audit --no-fund" \
    || fail "npm install of $packages failed inside the container"
}

check_health() {
  run_in health 60 'node -e '\''fetch("http://app:8080/api/health").then((r) => r.json()).then((j) => { console.log("health " + JSON.stringify(j)); process.exit(j.status === "ok" ? 0 : 1); }).catch((e) => { console.log("health unreachable: " + e.message); process.exit(1); })'\''' \
    || fail "the app is not healthy at http://app:8080 (docker compose up -d --wait)"
}

run_capture() {
  local shots="${1:-}" provider out_dir count
  case "$shots" in
    *[!a-z0-9,-]*) fail "invalid shot list '$shots'" ;;
  esac

  preflight
  start_container "$PW"
  check_health

  provider="$(docker inspect "$(docker compose ps -q app)" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
    | tr -d '\r' | sed -n 's/^LLM_PROVIDER=//p' | head -n 1 || true)"
  echo "PROVIDER ${provider:-unknown}"

  docker cp docs/presentacion/capturas/capture.mjs "$NAME":/tmp/capture.mjs
  docker cp docs/demo/ofertas/remote-senior.txt "$NAME":/work/remote-senior.txt

  run_in capture 300 "SHOTS='$shots' BASE=http://app:8080 node capture.mjs" \
    || fail "capture.mjs failed (see the log above)"

  out_dir="$(mktemp -d)"
  docker cp "$NAME":/out/. "$out_dir"
  mkdir -p docs/presentacion/capturas
  count=0
  for png in "$out_dir"/*.png; do
    [ -e "$png" ] || continue
    mv "$png" docs/presentacion/capturas/
    count=$((count + 1))
  done
  rm -rf "$out_dir"
  [ "$count" -gt 0 ] || fail "capture.mjs produced no PNG"
  echo "CAPTURE OK ($count PNG)"
}

# Parses the mermaid blocks of the given Markdown files in the (already started) container.
# Prints the log and returns the exit code of the in-container check.
mermaid_exec() {
  local index=0 file args=""
  docker exec "$NAME" mkdir -p /work/md
  docker cp docs/presentacion/mermaid-check.mjs "$NAME":/tmp/mermaid-check.mjs
  for file in "$@"; do
    docker cp "$file" "$NAME":/work/md/$index.md
    args="$args $(printf '%q' "$file=/work/md/$index.md")"
    index=$((index + 1))
  done
  run_in mermaid 180 "node mermaid-check.mjs$args"
}

run_mermaid() {
  [ "$#" -gt 0 ] || {
    usage
    exit 2
  }
  local file
  if [ "$1" != "--self-test" ]; then
    for file in "$@"; do
      [ -f "$file" ] || fail "no such file: $file"
    done
  fi
  preflight
  start_container "$PW" "$MM"

  if [ "$1" = "--self-test" ]; then
    local dir good_out bad_out
    dir="$(mktemp -d)"
    printf '%s\n' '# Valid' '' '```mermaid' 'flowchart LR' '  A[Pegar oferta] --> B[Guardar]' '```' '' '```mermaid' 'sequenceDiagram' '  Usuario->>API: POST /api/offers/extract' '  API-->>Usuario: borrador' '```' >"$dir/good.md"
    printf '%s\n' '# Broken' '' '```mermaid' 'flowchart LR' '  A[Pegar oferta --> B[Guardar' '  B ---> ???' '```' >"$dir/bad.md"
    good_out="$(mermaid_exec "$dir/good.md")" || {
      printf '%s\n' "$good_out"
      rm -rf "$dir"
      fail "SELF-TEST FAIL: a valid flowchart and sequenceDiagram were rejected"
    }
    printf '%s\n' "$good_out" | grep -q 'MERMAID OK (2 diagramas)' || {
      rm -rf "$dir"
      fail "SELF-TEST FAIL: the valid file did not report MERMAID OK (2 diagramas)"
    }
    if bad_out="$(mermaid_exec "$dir/bad.md")"; then
      rm -rf "$dir"
      fail "SELF-TEST FAIL: the broken block was accepted"
    fi
    printf '%s\n' "$bad_out" | grep -q 'MERMAID FAIL' || {
      rm -rf "$dir"
      fail "SELF-TEST FAIL: the broken file did not report MERMAID FAIL"
    }
    rm -rf "$dir"
    echo "MERMAID SELF-TEST OK"
    return 0
  fi

  mermaid_exec "$@" || exit 1
}

case "$SUBCOMMAND" in
  capture) run_capture "${1:-}" ;;
  mermaid) run_mermaid "$@" ;;
esac
