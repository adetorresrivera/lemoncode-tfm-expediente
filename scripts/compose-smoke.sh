#!/usr/bin/env bash
# Compose smoke test (D-23). Usage: bash scripts/compose-smoke.sh [--with-model] [--down]
#
# Runs entirely through `docker compose exec` because the runtime image has no curl and, from a
# devcontainer, the published host ports are not reachable (Docker-outside-of-Docker).
# `--with-model` also waits for the `ollama-init` one-shot (model pull) and checks the model is
# listed; the first pull downloads several GB, so it is opt-in.
# `--down` removes the containers at the end (never the volumes: the model volume is expensive).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DOWN=false
WITH_MODEL=false
for arg in "$@"; do
  case "$arg" in
    --down) DOWN=true ;;
    --with-model) WITH_MODEL=true ;;
    *)
      echo "Unknown option: $arg (usage: compose-smoke.sh [--with-model] [--down])" >&2
      exit 2
      ;;
  esac
done

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

# Same probe for any method: `http_send METHOD PATH [JSON_BODY]` prints "<status>\n<body>". Method,
# path and body travel as argv, so the JSON needs no shell or JavaScript quoting.
http_send() {
  local out="" deadline=$((SECONDS + 30))
  docker compose exec -T app rm -f /tmp/smoke.out
  docker compose exec -T app node -e "
    const fs = require('node:fs');
    const [method, path, body] = process.argv.slice(1);
    const done = (text) => { fs.writeFileSync('/tmp/smoke.tmp', text); fs.renameSync('/tmp/smoke.tmp', '/tmp/smoke.out'); };
    fetch('http://127.0.0.1:8080' + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body || undefined,
    })
      .then(async (r) => done(r.status + '\n' + (await r.text())))
      .catch(() => done('000\n'));
  " "$1" "$2" "${3:-}"
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

# Multipart upload with the same probe: `http_upload PATH FILE_NAME TYPE SIZE_BYTES [PDF|TEXT]` prints
# "<status>\n<body>". The bytes are built inside the container (PDF: "%PDF-1.4\n" padded with spaces to
# SIZE_BYTES and ending in "\n%%EOF"; TEXT: SIZE_BYTES of "a"), so even the 6 MB body of the 413 check
# travels as a real multipart request with its real Content-Length and never crosses the shell.
http_upload() {
  local out="" deadline=$((SECONDS + 60))
  docker compose exec -T app rm -f /tmp/smoke.out
  docker compose exec -T app node -e "
    const fs = require('node:fs');
    const [path, fileName, type, size, kind] = process.argv.slice(1);
    const total = Number(size);
    const done = (text) => { fs.writeFileSync('/tmp/smoke.tmp', text); fs.renameSync('/tmp/smoke.tmp', '/tmp/smoke.out'); };
    let bytes;
    if (kind === 'TEXT') {
      bytes = Buffer.alloc(total, 'a');
    } else {
      const head = Buffer.from('%PDF-1.4\n');
      const tail = Buffer.from('\n%%EOF');
      bytes = Buffer.concat([head, Buffer.alloc(Math.max(0, total - head.length - tail.length), ' '), tail]);
    }
    const form = new FormData();
    form.set('type', type);
    form.set('name', 'Smoke CV');
    form.set('version', 'v1');
    form.set('file', new Blob([bytes], { type: 'application/pdf' }), fileName);
    fetch('http://127.0.0.1:8080' + path, { method: 'POST', body: form })
      .then(async (r) => done(r.status + '\n' + (await r.text())))
      .catch(() => done('000\n'));
  " "$1" "$2" "$3" "$4" "${5:-PDF}"
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

# Asserts the status line of an http_send answer: `expect_status LABEL EXPECTED ANSWER`.
expect_status() {
  echo "$3" | head -n 1 | grep -qx "$2" || fail "$1 answered '$(echo "$3" | head -n 1)', expected $2: $3"
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

echo "== applications round trip =="
# Writes one record into the compose Mongo volume and deletes it before finishing (T-02-29).
created="$(http_send POST /api/applications '{"title":"Smoke test","company":"Expediente"}')" \
  || fail "POST /api/applications did not answer"
expect_status "POST /api/applications" 201 "$created"
app_id="$(echo "$created" | grep -o '"id":"[0-9a-f]*"' | head -n 1 | cut -d'"' -f4)"
[ -n "$app_id" ] || fail "POST /api/applications returned no id: $created"

listed="$(http_send GET /api/applications)" || fail "GET /api/applications did not answer"
expect_status "GET /api/applications" 200 "$listed"
echo "$listed" | grep -q "$app_id" || fail "GET /api/applications does not list $app_id"

edited="$(http_send PUT "/api/applications/$app_id" '{"title":"Smoke test editado","company":"Expediente"}')" \
  || fail "PUT /api/applications/$app_id did not answer"
expect_status "PUT /api/applications/$app_id" 200 "$edited"
echo "$edited" | grep -q '"title":"Smoke test editado"' || fail "PUT did not store the new title: $edited"

moved="$(http_send PATCH "/api/applications/$app_id/status" '{"status":"enviada"}')" \
  || fail "PATCH status did not answer"
expect_status "PATCH /api/applications/$app_id/status" 200 "$moved"
echo "$moved" | grep -q '"appliedAt":"' || fail "move to enviada did not fill appliedAt: $moved"

echo "== interview rounds round trip =="
# Adding a round to an enviada application moves it to en_entrevistas (rule 3). The round is
# deleted here and the application right after, so nothing stays in the compose database.
round_added="$(http_send POST "/api/applications/$app_id/interviews" '{"type":"tecnica","mode":"online"}')" \
  || fail "POST /api/applications/$app_id/interviews did not answer"
expect_status "POST /api/applications/$app_id/interviews" 201 "$round_added"
echo "$round_added" | grep -q '"status":"en_entrevistas"' || fail "adding a round did not move the application to en_entrevistas: $round_added"
echo "$round_added" | grep -q '"round":1' || fail "the first round was not numbered 1: $round_added"
# The application's own id comes first in the body, so cut at the rounds array before taking an id.
rounds_part="${round_added#*\"interviews\":[}"
round_id="$(echo "$rounds_part" | grep -o '"id":"[0-9a-f]\{24\}"' | head -n 1 | cut -d'"' -f4)"
[ -n "$round_id" ] || fail "POST interviews returned no round id: $round_added"
[ "$round_id" != "$app_id" ] || fail "the round id equals the application id ($app_id): $round_added"

round_edited="$(http_send PUT "/api/applications/$app_id/interviews/$round_id" '{"type":"tecnica","mode":"online","outcome":"superada"}')" \
  || fail "PUT /api/applications/$app_id/interviews/$round_id did not answer"
expect_status "PUT /api/applications/$app_id/interviews/$round_id" 200 "$round_edited"
echo "$round_edited" | grep -q '"outcome":"superada"' || fail "PUT did not store the new outcome: $round_edited"

round_removed="$(http_send DELETE "/api/applications/$app_id/interviews/$round_id")" \
  || fail "DELETE /api/applications/$app_id/interviews/$round_id did not answer"
expect_status "DELETE /api/applications/$app_id/interviews/$round_id" 200 "$round_removed"
echo "$round_removed" | grep -qF '"interviews":[]' || fail "DELETE did not leave the rounds empty: $round_removed"

tags="$(http_send GET /api/tags)" || fail "GET /api/tags did not answer"
expect_status "GET /api/tags" 200 "$tags"

removed="$(http_send DELETE "/api/applications/$app_id")" \
  || fail "DELETE /api/applications/$app_id did not answer"
expect_status "DELETE /api/applications/$app_id" 204 "$removed"

gone="$(http_send GET "/api/applications/$app_id")" || true
expect_status "GET /api/applications/$app_id after delete" 404 "$gone"

echo "== documents round trip =="
# Writes one object into Silo and one record into Mongo and removes both before finishing (T-05-34).
# The application is deleted before the document: rule 4 refuses the reverse order with a 409. The
# rejected uploads (415, 413) store nothing, so only the first document needs cleaning.
doc_created="$(http_upload /api/documents smoke-cv.pdf cv 2048 PDF)" \
  || fail "POST /api/documents did not answer"
expect_status "POST /api/documents" 201 "$doc_created"
doc_id="$(echo "$doc_created" | grep -o '"id":"[0-9a-f]\{24\}"' | head -n 1 | cut -d'"' -f4)"
[ -n "$doc_id" ] || fail "POST /api/documents returned no id: $doc_created"

doc_listed="$(http_send GET /api/documents)" || fail "GET /api/documents did not answer"
expect_status "GET /api/documents" 200 "$doc_listed"
echo "$doc_listed" | grep -q "$doc_id" || fail "GET /api/documents does not list $doc_id: $doc_listed"
echo "$doc_listed" | grep -q '"usedBy":0' || fail "GET /api/documents does not report usedBy 0: $doc_listed"

doc_read="$(http_send GET "/api/documents/$doc_id")" || fail "GET /api/documents/$doc_id did not answer"
expect_status "GET /api/documents/$doc_id" 200 "$doc_read"

doc_download="$(http_send GET "/api/documents/$doc_id/download")" \
  || fail "GET /api/documents/$doc_id/download did not answer"
expect_status "GET /api/documents/$doc_id/download" 200 "$doc_download"
echo "$doc_download" | sed -n 2p | grep -q '^%PDF-' || fail "the download does not start with %PDF-: $doc_download"

doc_app="$(http_send POST /api/applications "{\"title\":\"Smoke documentos\",\"company\":\"Smoke\",\"cvDocumentId\":\"$doc_id\"}")" \
  || fail "POST /api/applications with a CV did not answer"
expect_status "POST /api/applications with cvDocumentId" 201 "$doc_app"
doc_app_id="$(echo "$doc_app" | grep -o '"id":"[0-9a-f]\{24\}"' | head -n 1 | cut -d'"' -f4)"
[ -n "$doc_app_id" ] || fail "POST /api/applications returned no id: $doc_app"

doc_blocked="$(http_send DELETE "/api/documents/$doc_id")" || fail "DELETE /api/documents/$doc_id did not answer"
expect_status "DELETE /api/documents/$doc_id while linked" 409 "$doc_blocked"
echo "$doc_blocked" | grep -q 'DOCUMENT_IN_USE' || fail "the 409 body lacks DOCUMENT_IN_USE: $doc_blocked"

# Rule 5: deleting the application leaves the document in place.
doc_app_removed="$(http_send DELETE "/api/applications/$doc_app_id")" \
  || fail "DELETE /api/applications/$doc_app_id did not answer"
expect_status "DELETE /api/applications/$doc_app_id" 204 "$doc_app_removed"
doc_kept="$(http_send GET "/api/documents/$doc_id")" || fail "GET /api/documents/$doc_id did not answer"
expect_status "GET /api/documents/$doc_id after deleting its application (rule 5)" 200 "$doc_kept"

doc_removed="$(http_send DELETE "/api/documents/$doc_id")" || fail "DELETE /api/documents/$doc_id did not answer"
expect_status "DELETE /api/documents/$doc_id" 204 "$doc_removed"
doc_gone="$(http_send GET "/api/documents/$doc_id")" || true
expect_status "GET /api/documents/$doc_id after delete" 404 "$doc_gone"

doc_text="$(http_upload /api/documents notas.txt cv 64 TEXT)" || fail "POST /api/documents (.txt) did not answer"
expect_status "POST /api/documents with a .txt" 415 "$doc_text"
echo "$doc_text" | grep -q 'UNSUPPORTED_FILE_TYPE' || fail "the 415 body lacks UNSUPPORTED_FILE_TYPE: $doc_text"

doc_big="$(http_upload /api/documents big.pdf cv 6291456 PDF)" || fail "POST /api/documents (6 MB) did not answer"
expect_status "POST /api/documents with a 6 MB pdf" 413 "$doc_big"
echo "$doc_big" | grep -q 'FILE_TOO_LARGE' || fail "the 413 body lacks FILE_TOO_LARGE: $doc_big"

echo "== offers route =="
# A too-short text is rejected by the request schema before any model call, so this proves the route
# is mounted in the image (no index.html fallthrough, no 404) without waiting on Ollama.
extract="$(http_send POST /api/offers/extract '{"text":"Oferta demasiado corta"}')" \
  || fail "POST /api/offers/extract did not answer"
expect_status "POST /api/offers/extract" 400 "$extract"
echo "$extract" | grep -q 'VALIDATION_ERROR' || fail "POST /api/offers/extract body lacks VALIDATION_ERROR: $extract"

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

if [ "$WITH_MODEL" = true ]; then
  echo "== model pull (ollama-init) =="
  model="${LLM_MODEL:-gemma4:e2b}"
  pull_start=$SECONDS
  # `docker compose wait` blocks until the container stops and prints its exit code; bounded so a
  # stalled download fails the smoke instead of hanging it.
  wait_code="$(timeout 2400 docker compose wait ollama-init | tr -d '\r')" \
    || fail "ollama-init did not finish within 2400 s"
  echo "ollama-init wait exit code: $wait_code (pull took $((SECONDS - pull_start)) s)"
  init_code="$(docker compose ps -a --format '{{.ExitCode}}' ollama-init | tr -d '\r')"
  echo "ollama-init exit code: $init_code"
  [ "$init_code" = "0" ] || fail "ollama-init exit code is $init_code, expected 0"
  models="$(docker compose exec -T ollama ollama list)"
  echo "$models"
  echo "$models" | grep -q "$model" || fail "ollama list does not show $model"
fi

if [ "$DOWN" = true ]; then
  echo "== down =="
  docker compose down
fi

echo "SMOKE OK"
