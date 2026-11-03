---
phase: 01-fundaciones-y-walking-skeleton
plan: 06
subsystem: infra
tags: [readme, docker-compose, smoke-test, ollama, gemma4, verification]

requires:
  - phase: 01-fundaciones-y-walking-skeleton
    provides: "compose stack and smoke script (01-01), contracts and LLM providers (01-03), web shell (01-05)"
provides:
  - "README.md: Spanish start guide (requisitos, arrancar, mock, comprobar, desarrollo, comandos, variables, calidad)"
  - "scripts/compose-smoke.sh --with-model: waits for ollama-init and checks the model is listed"
  - "D-23 gate evidence on the final tree, including RESEARCH A1 (ollama/ollama:0.40.3 pulls and lists gemma4:e2b)"
affects: [phase-06-readme-completion, end-of-phase-review]

actuals:
  tokens: 1500 # chars/4 over the realized diff (README 4104 chars + smoke script ~1900 chars changed)
  tasks: 2
  commits: 2
plan_head_before: 3ad01df576a19c7bf97e6ef1fb95501926c33f72
plan_head_after: ba69d010438b316f6c2f9f83b488e556ce562854

tech-stack:
  added: []
  patterns:
    - "Smoke options parsed in any order (--with-model, --down); unknown options exit 2"
    - "Model pull awaited with `timeout 2400 docker compose wait ollama-init`, then exit code read through `docker compose ps -a --format '{{.ExitCode}}'`"

key-files:
  created:
    - README.md
  modified:
    - scripts/compose-smoke.sh

key-decisions:
  - "No dependency added: README and a bash script only; the gate installed from the committed lockfile with npm ci"
  - "compose.yml untouched: the host-port clash on 9001 was handled with an uncommitted compose override outside the repo (see Issues Encountered)"

requirements-completed: [FND-01, FND-08, FND-10]

coverage:
  - id: D1
    description: "README explains in Spanish how to start, develop, fall back to mock, check health and what the quality hooks do"
    requirement: FND-10
    verification:
      - kind: other
        ref: "README greps (docker compose up --build, http://localhost:8080, LLM_PROVIDER=mock, npm run dev, scripts/compose-smoke.sh, .env.example, minioadmin, 127.0.0.1:9001) and the no-emoji/no-exclamation node check"
        status: pass
    human_judgment: true
    rationale: "Whether a newcomer can follow the text unaided and whether the voice reads as the DS voice needs a human read."
  - id: D2
    description: "Full local suite from a clean npm ci, and typecheck/test/build without packages/contracts/dist"
    requirement: FND-01
    verification:
      - kind: other
        ref: "npm ci; npm run typecheck && lint && format:check && test && build; rm -rf packages/contracts/dist && npm run typecheck && npm run test && npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "bash scripts/compose-smoke.sh --with-model --down ends with SMOKE OK on the final tree, including the pinned Ollama pulling gemma4:e2b"
    requirement: FND-08
    verification:
      - kind: integration
        ref: "bash scripts/compose-smoke.sh --with-model --down (with the local port override described in Issues Encountered)"
        status: pass
    human_judgment: true
    rationale: "Ran through an uncommitted port override because the devcontainer still holds host port 9001; the committed 127.0.0.1:8080 and 127.0.0.1:9001 mappings have not bound unmodified here. The host-side curl, browser and Silo console checks remain for the end-of-phase review."
  - id: D4
    description: "Host-side curl to /api/health and a browser landing on /applications inside the themed shell"
    requirement: FND-08
    verification: []
    human_judgment: true
    rationale: "Backstop check: the devcontainer cannot reach published host ports (RESEARCH Pitfall 11)."

duration: 40min
completed: 2026-10-29
status: complete
---

# Phase 1 Plan 06: README and phase gate Summary

**Minimal Spanish README plus a `--with-model` compose smoke that proved, on the final tree, a green clean-install suite and that the pinned `ollama/ollama:0.40.3` pulls and lists `gemma4:e2b` (SMOKE OK, pull in 210 s)**

## Performance

- **Duration:** ~40 min (3 min `npm ci`, 5 min for the successful smoke run)
- **Started:** 2026-10-29T15:21:40Z
- **Completed:** 2026-10-29T15:40Z
- **Tasks:** 2
- **Files modified:** 2 (README.md created, scripts/compose-smoke.sh modified)

## Accomplishments

- `README.md` in Spanish (tuteo, no emojis, no exclamations) with the ten planned sections. It states that only `127.0.0.1:8080` and `127.0.0.1:9001` are published, that `minioadmin` is local-development only, and that `.env` is never committed (T-01-23).
- `scripts/compose-smoke.sh` accepts `--with-model` and `--down` in any order. With the model flag it waits for `ollama-init` (bounded to 2400 s), asserts exit code 0 and asserts `ollama list` shows the model.
- Phase gate evidence recorded below. Every check is green on the final tree.

## Task Commits

1. **Task 1: Minimal Spanish README** - `7708e75` (docs)
2. **Task 2: `--with-model` smoke and phase gate** - `ba69d01` (chore)

**Plan metadata:** committed after this file (docs).

## Gate evidence (Task 2)

| Check | Result |
| --- | --- |
| `npm ci` | exit 0, 421 packages added, 0 vulnerabilities, 3 min |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 (`--max-warnings=0`) |
| `npm run format:check` | exit 0 |
| `npm run test` | exit 0: contracts 40 tests (3 files), api 34 tests (3 files), web 40 tests (6 files). No worker-start flake on this run. |
| `npm run build` | exit 0 (contracts, api, web) |
| `rm -rf packages/contracts/dist` then `typecheck`, `test`, `build` | all exit 0; no "Failed to resolve entry for package @tfm/contracts"; `dist` regenerated by the build |
| `bash scripts/compose-smoke.sh --with-model --down` | last line `SMOKE OK`, exit 0 (with the port override below) |
| `/api/health` body (inside the app container) | `200` and `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}` |
| Mongo stop/start | health flipped to `"mongo":"error"` on stop and returned to `"mongo":"ok"` after start (script assertions passed) |
| S3 stop/start | health flipped to `"s3":"error"` on stop and returned to `"s3":"ok"` after start (script assertions passed) |
| Runtime user | asserted `id -u` equals `1000` (script fails otherwise; it does not echo the value) |
| SPA fallback | `/applications/1` returned 200 with the `id="root"` div; `/api/nope` returned 404 `NOT_FOUND` (asserted) |
| `ollama-init` exit code | `0` (`docker compose ps -a --format '{{.ExitCode}}' ollama-init`) |
| `ollama list` | `gemma4:e2b  b37049369adf  4.6 GB` (plus the earlier `all-minilm:latest`, 45 MB) |
| Model pull time | 210 s measured from the end of the app health checks (the pull started when the stack came up) to `ollama-init` exiting; whole smoke run 313 s |
| `! grep -nE 'image:.*:latest' compose.yml` | passes; images are `tfm-app:0.1.0`, `mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`, `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`, `ollama/ollama:0.40.3` (twice) |

RESEARCH A1 is closed: `ollama/ollama:0.40.3` pulls `gemma4:e2b` and lists it. No replacement tag was needed or proposed. The app was healthy before `ollama-init` finished (health asserted first), which backs T-01-24.

## Files Created/Modified

- `README.md` - Spanish start guide (created).
- `scripts/compose-smoke.sh` - `--with-model` option and argument parsing (modified).

## Decisions Made

No dependency added. No new image. No change to `compose.yml`, `Dockerfile`, `.env.example` or any application code.

## Deviations from Plan

None - plan executed exactly as written. The environmental port clash below is recorded as an issue, not a deviation, because `compose.yml` was not edited.

## Issues Encountered

- **Host port 9001 still taken in this devcontainer.** The first `bash scripts/compose-smoke.sh --with-model --down` (committed port mappings) failed at container start with exactly:
  `Error response from daemon: ports are not available: exposing port TCP 127.0.0.1:9001 -> 127.0.0.1:0: listen tcp4 127.0.0.1:9001: bind: Only one usage of each socket address (protocol/network address/port) is normally permitted.`
  The repository's `.devcontainer/devcontainer.json` no longer forwards 8080 or 9001, so the holder is most likely the already-running VS Code session, which keeps the forwards from the previous devcontainer config until it is rebuilt or restarted. I did not confirm the holder. I ran `docker compose down` (no containers left, volumes kept) and re-ran the same smoke command with an uncommitted compose override outside the repo (`COMPOSE_FILE=compose.yml:<scratchpad>/compose.ports-override.yml`, mapping `127.0.0.1:18080:8080` and `127.0.0.1:19001:9001`). That run printed `SMOKE OK`. The committed `compose.yml` mappings are therefore not proven in this environment, only the rest of the stack; the host-side check below covers them. Fix on the user's side: rebuild or restart the devcontainer so the stale forwards drop, or stop the processes holding 9001 and 8080.
- Final state: no `expediente` containers; named volumes `expediente_mongo-data`, `expediente_s3-data`, `expediente_ollama-data` remain (the last now holds `gemma4:e2b`, 4.6 GB, plus `all-minilm`).
- The label printed by the smoke for the `docker compose wait` result reads "ollama-init wait exit code:" but Compose 5.6.1 prints a sentence (`container "<id>" exited with status code 0`) instead of the bare number. The assertion that matters reads the exit code through `docker compose ps -a` and passed. Cosmetic; left as run so the committed script is exactly what was verified.
- The known web-workspace worker-start flake did not occur in either full test run.

## Known Stubs

None added by this plan. Stubs from earlier plans (the `seed` placeholder and the Phase 3 extraction path) are unchanged and tracked in their own summaries. `.planning/WINDOWS.md` was not written to (helper unavailable in this worktree; best-effort per protocol).

## Threat Flags

None. T-01-23 mitigated in the README (loopback ports, `minioadmin` local-only, `.env` never committed), T-01-24 mitigated (health asserted before `ollama-init` finishes, then exit code 0), T-01-25 accepted as planned, T-01-SC respected (lockfile `npm ci`, pinned images, nothing new introduced).

## Human checks pending for the end-of-phase review

On the host machine, outside the devcontainer, after freeing ports 8080 and 9001:

1. `docker compose up --build -d`, then `curl -s http://localhost:8080/api/health` must print `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`.
2. Open `http://localhost:8080`: it lands on `/applications` inside the Expediente shell with the parchment and Oxford tokens and the three fonts; the theme switch and the menu Sheet behave as in plan 01-05.
3. Open `http://localhost:9001` and confirm the Silo console shows the bucket `tfm-assets`.
4. Finish with `docker compose down`.

## Next Phase Readiness

- Phase 1 has all six plans executed; ready for the end-of-phase verification and the human checks above.
- Phase 6 (DEMO-02) completes the README with the seed and the demo script.

## Self-Check: PASSED

- `README.md`, `scripts/compose-smoke.sh` and this SUMMARY exist.
- Commits `7708e75` and `ba69d01` are ancestors of HEAD.
- Acceptance criteria re-run: README greps, `minioadmin` and `127.0.0.1:9001`, no-emoji/no-exclamation check, `--with-model` and `ollama-init` in the script, no `:latest` image, clean-install suite and the `SMOKE OK` run all pass.

---

_Phase: 01-fundaciones-y-walking-skeleton_
_Completed: 2026-10-29_
