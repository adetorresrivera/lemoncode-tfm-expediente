---
phase: 01-fundaciones-y-walking-skeleton
plan: 01
subsystem: infra
tags: [npm-workspaces, typescript, zod, hono, mongodb, s3, docker, compose, vitest]

requires: []
provides:
  - "npm workspaces monorepo (@tfm/contracts, @tfm/api, @tfm/web) with exact pins and a committed lockfile"
  - "@tfm/source export condition: typecheck, tsx, Vite and Vitest read contracts from src without a build"
  - "Hono API: GET /api/health with bounded real probes, single onError/notFound, SPA hosting"
  - "fail-fast Zod env validation (loadConfig) and .env.example parity"
  - "Mongo named indexes + ensureBucket at startup; LlmClient interface with ollama ping"
  - "multi-stage Dockerfile (uid 1000, HEALTHCHECK) and compose.yml with pinned images"
  - "scripts/compose-smoke.sh reusable D-23 smoke"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, all later phases]

actuals:
  tokens: 10200   # chars/4 over the realized diff, package-lock.json excluded
  tasks: 2
  commits: 3

tech-stack:
  added:
    - "hono 4.13.13, @hono/node-server 2.1.5, mongodb 7.7.0, @aws-sdk/client-s3 3.1152.0, zod 4.6.7"
    - "react 19.3.1 + web stack from the RESEARCH Standard Stack (declared now so the lockfile is final for the phase)"
    - "typescript 6.0.3, vitest 5.0.4, eslint/prettier/husky/lint-staged/concurrently/tsx toolchain (pins only)"
  patterns:
    - "Custom export condition @tfm/source for dev-time contracts resolution; production resolves dist"
    - "createApp(deps) with injected ping functions so the API is testable without services"
    - "probe(fn, 2500): Promise.race against a timer, always cleared, never rejects"
    - "One top-level notFound and one onError; error bodies typed as ErrorResponse from contracts"

key-files:
  created:
    - package.json
    - .npmrc
    - package-lock.json
    - tsconfig.base.json
    - packages/contracts/src/error.schema.ts
    - apps/api/src/app.ts
    - apps/api/src/config.ts
    - apps/api/src/main.ts
    - apps/api/src/db/mongo.ts
    - apps/api/src/storage/s3.ts
    - apps/api/src/llm/llm.client.ts
    - apps/api/src/llm/ollama.provider.ts
    - apps/api/vitest.config.ts
    - Dockerfile
    - compose.yml
    - scripts/compose-smoke.sh
    - .env.example
  modified: []

key-decisions:
  - "Keep npm 10 with root .npmrc legacy-peer-deps=true (also copied into both Dockerfile npm ci stages)"
  - "Pin mongo:8.0.32 and tag the local image tfm-app:0.1.0; no latest or untagged image anywhere"
  - "Mongo text index title_company_text uses default_language none (mixed ES/EN titles, cannot change later without IndexOptionsConflict)"
  - "compose.yml keeps loopback-only publishing (127.0.0.1:8080 and 127.0.0.1:9001); see Issues Encountered for the devcontainer port clash"
  - "compose-smoke.sh starts ollama-init separately and polls responses through short exec calls"

patterns-established:
  - "Error contract: ApiError, ZodError, SyntaxError, HTTPException, unknown, in that order; HTTPException and unknown messages are never echoed"
  - "Config errors list variable names and messages only, never values; empty-string env counts as absent"

requirements-completed: [FND-01, FND-03, FND-04, FND-08, FND-10]

coverage:
  - id: D1
    description: "npm ci, build (contracts, api, web), typecheck and test work from the repo root, including on a checkout without packages/contracts/dist"
    requirement: FND-01
    verification:
      - kind: other
        ref: "npm ci && npm run build && npm run typecheck; rm -rf packages/contracts/dist && npm run typecheck && npm run test"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/health reflects real Mongo, S3 and LLM connectivity, caps each probe at 2.5 s and always answers 200"
    requirement: FND-03
    verification:
      - kind: unit
        ref: "apps/api/src/app.test.ts#GET /api/health"
        status: pass
      - kind: integration
        ref: "bash scripts/compose-smoke.sh --down (mongo and s3 stop/start flip only their own field)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Invalid environment is refused naming variables only; every error response has the contract shape; unknown errors do not leak the message"
    requirement: FND-04
    verification:
      - kind: unit
        ref: "apps/api/src/config.test.ts#loadConfig"
        status: pass
      - kind: unit
        ref: "apps/api/src/app.test.ts#error contract"
        status: pass
    human_judgment: false
  - id: D4
    description: "docker compose up brings the pinned stack up healthy, the app runs as uid 1000 and serves the SPA at :8080"
    requirement: FND-08
    verification:
      - kind: integration
        ref: "bash scripts/compose-smoke.sh --down (with the local port override described in Issues Encountered)"
        status: pass
    human_judgment: true
    rationale: "Verified through a local port override because the devcontainer's VS Code forwards hold host ports 8080 and 9001; the committed compose.yml port mapping has not run unmodified in this environment."
  - id: D5
    description: ".env.example lists every variable the API reads and carries no secret"
    requirement: FND-10
    verification:
      - kind: unit
        ref: "apps/api/src/config.test.ts#.env.example"
        status: pass
    human_judgment: false

duration: 100min
completed: 2026-10-29
status: complete
plan_head_before: ed4757e7db3bc3d8922075777fa442ca11e59076
plan_head_after: 4920f0a1a32dece0d9588c1f4ca9caa1ecea403d
---

# Phase 1 Plan 01: Walking-skeleton tracer Summary

**npm-workspaces monorepo with a Hono API serving real bounded Mongo/S3/Ollama health, a full error contract and fail-fast env validation, built into a pinned multi-stage Docker image and compose stack that a smoke script exercises end to end**

## Performance

- **Duration:** ~100 min (includes the 4 min npm install, two npm ci runs and four compose smoke runs)
- **Started:** 2026-10-29T10:27Z
- **Completed:** 2026-10-29T12:07Z
- **Tasks:** 2 (tracer + TDD task)
- **Files modified:** 37 (36 planned plus vitest/test files counted in the plan; package-lock.json is generated)

## Accomplishments

- Tracer slice proven on the riskiest seams first: npm 10 install with exact pins, contracts resolved through `@tfm/source` with no build, real `/api/health` against Mongo, Silo and Ollama, Hono static + SPA fallback, and the multi-stage image under compose. Tracer verified end-to-end before expansion.
- Error contract finished test-first: 6 RED assertions (ZodError, malformed JSON, HTTPException 404/400/503, `.env.example` parity) turned GREEN with one `onError`; 23 API tests and 6 contracts tests pass.
- `scripts/compose-smoke.sh --down` ends with `SMOKE OK`: health all `ok`, uid 1000, `/applications/1` returns index.html, `/api/nope` returns `NOT_FOUND`, and stopping then starting mongo and s3 flips only that field and recovers.

## Task Commits

1. **Task 1: Walking-skeleton tracer** - `b72fc5f` (feat)
2. **Task 2 RED: failing tests** - `6cb8e71` (test)
3. **Task 2 GREEN: error mapping + .env.example** - `4920f0a` (feat)

No REFACTOR commit (no cleanup needed). **Plan metadata:** committed after this file (docs).

## A1 pin check (Ollama) and other image pins

- `docker manifest inspect` succeeded for `node:22.23.2-slim`, `mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`, `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`, `ollama/ollama:0.40.3`.
- `docker pull ollama/ollama:0.40.3` succeeded (digest `sha256:adca95a12c2b386a8f9a995e7fa0600e187e3323b5e5522f5a6c3b1ec73eff99`); `ollama --version` printed `Warning: client version is 0.40.3` (no server in a bare `run`). Pin confirmed.
- The full gemma4:e2b pull through `ollama-init` was NOT run here: smoke runs used `LLM_MODEL=all-minilm` (45 MB) to avoid a 4.6 GB download. Plan 01-06 verifies the real model.

## Files Created/Modified

See `key-files` above. Noteworthy: `apps/api/src/app.ts` (health, onError, notFound, static), `apps/api/src/config.ts` (envSchema, loadConfig), `compose.yml` and `Dockerfile` (deliverable stack), `scripts/compose-smoke.sh` (D-23).

## Decisions Made

See `key-decisions`. Dependencies: no dependency outside the closed stack added; every pin comes from the RESEARCH Standard Stack (the full phase dependency set, including the web stack, is installed once here so no later plan touches `package-lock.json`). `@tanstack/react-form` deliberately not installed (OQ6).

## Vitest resolution fallback

Not needed. `ssr.resolve.conditions` plus `ssr.resolve.externalConditions` set to `@tfm/source` in `apps/api/vitest.config.ts` resolves `@tfm/contracts` from `src`; the `resolve.alias` fallback was never used. Verified with `packages/contracts/dist` deleted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `docker compose up --wait` fails on the ollama-init one-shot**
- **Found during:** Task 1 (compose smoke)
- **Issue:** `up -d --build --wait` over all services aborts with `container expediente-ollama-init-1 exited (0)`: `--wait` treats an exited container as a failure unless something depends on it. The plan's script would be flaky as soon as the model pull finished inside the wait window.
- **Fix:** the smoke runs `up -d --build --wait --wait-timeout 300 app mongo s3 ollama` (pulls `s3-init` in through `depends_on`), then `up -d ollama-init` without waiting. `compose.yml` itself is unchanged: plain `docker compose up` is unaffected.
- **Files modified:** scripts/compose-smoke.sh
- **Committed in:** b72fc5f

**2. [Rule 3 - Blocking] Docker `exec` output is cut after about 0.5 s in this environment**
- **Found during:** Task 1 (compose smoke, mongo stop assertion)
- **Issue:** `docker exec`/`docker compose exec` (and `docker run`) return after about 0.5 s with exit 0 and drop later output, while the process keeps running in the container. A slow `/api/health` (about 2.5 s when a dependency is down) therefore read as an empty body. Reproduced with `sh -c 'sleep 2; echo x'`.
- **Fix:** `http_get` in the smoke script has the probe write its result to `/tmp/smoke.out` inside the container (atomic rename) and polls it with short `exec` calls. Works in normal Docker setups too.
- **Files modified:** scripts/compose-smoke.sh
- **Committed in:** b72fc5f

**3. [Rule 3 - Blocking] `docker-compose` host ports clash with VS Code forwards (OQ4)**
- **Found during:** Task 1 (first `compose up`)
- **Issue:** `127.0.0.1:9001` and `127.0.0.1:8080` cannot be bound on the host (`Only one usage of each socket address`): the devcontainer forwards 8080 and `s3:9001`. `0.0.0.0:8080` and `0.0.0.0:9001` do bind.
- **Fix:** none in `compose.yml`. The plan's fallback (`8080:8080`) would still leave the Silo console on 9001 unbindable and would publish a default-credentials console on all interfaces (threat T-01-05, severity high). The committed file keeps both loopback mappings; the smoke was run with an uncommitted override moving them to `127.0.0.1:18080` and `127.0.0.1:19001` (`COMPOSE_FILE=compose.yml:<override>`). See Issues Encountered for the decision this leaves open.
- **Files modified:** none
- **Verification:** `SMOKE OK` with the override, run twice (before and after Task 2).

**4. [Rule 2 - Missing Critical] HTTPException messages are not echoed**
- **Found during:** Task 2 (onError)
- **Issue:** plan asks to keep the HTTPException status and map the code; echoing its message would risk leaking internal wording (T-01-01).
- **Fix:** fixed Spanish messages per code (404 «Recurso no encontrado», 400 «Solicitud no válida», other «Error interno»); tested.
- **Files modified:** apps/api/src/app.ts
- **Committed in:** 4920f0a

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 missing critical)
**Impact on plan:** no scope creep. Items 1 and 2 are confined to the smoke script; item 3 is environmental and needs a user decision before the stack runs unmodified in this devcontainer.

## Issues Encountered

- **Decision for the user (blocks `docker compose up` unmodified inside this devcontainer):** host ports 8080 and 9001 are held by VS Code port forwards on loopback (forwardPorts `8080` and `s3:9001` in `.devcontainer/devcontainer.json`). On a clean host with no devcontainer running, the committed mappings work. Options: (a) drop 8080 and `s3:9001` from `forwardPorts` (devcontainer is out of this plan's scope), (b) parametrise the host ports in `compose.yml` with `${APP_PORT:-8080}` and `${S3_CONSOLE_PORT:-9001}` (changes the literal `127.0.0.1:9001:9001` acceptance grep), (c) accept the plan's `8080:8080` fallback for the app only. Not applied here; flagged for the orchestrator.
- The first smoke attempt left a Compose stack running after a failed assertion; it was torn down with `docker compose down` (volumes kept). Final state: no `expediente` containers remain; named volumes `expediente_mongo-data`, `expediente_s3-data`, `expediente_ollama-data` exist (ollama-data holds only the 45 MB all-minilm model).
- Shared services were used for the local production-mode check: the built API ran against the devcontainer Mongo and Silo (created collection indexes on database `tfm` and ensured bucket `tfm-assets`, both idempotent and expected by the project).
- `.devcontainer/docker-compose.yml` still uses `mongo:8` and `:latest` tags (OQ3, out of scope).

## Known Stubs

| File | Stub | Reason / resolving plan |
|------|------|-------------------------|
| apps/api/src/llm/ollama.provider.ts | `extractStructured` throws `ApiError(502, LLM_ERROR)` | Phase 3 implements extraction (AI-01, AI-02) |
| apps/api/src/llm/llm.client.ts | `openai` and `mock` providers throw `LLM provider <name> is wired in plan 01-03` | Plan 01-03 |
| apps/api/package.json | `seed` prints a placeholder | Phase 6 |
| apps/web/src/main.tsx | bare `<h1>Expediente</h1>` | Plan 01-04 replaces it with router and shell |

`.planning/WINDOWS.md` does not exist and the `gsd_run` helper is unavailable in this worktree, so these were not appended to the broken-windows ledger (best-effort per protocol).

## Threat Flags

None beyond the plan's threat model. Mitigations present: T-01-01/02 (no value or message leaks, tested), T-01-03 (2.5 s probe cap, tested), T-01-04 (uid 1000 asserted by smoke), T-01-05 (loopback ports), T-01-06 (absolute static root, in-memory index.html), T-01-07 (.env ignored by git and excluded from the build context).

## User Setup Required

None - no external service configuration required.

## TDD Gate Compliance

Task 2 followed RED then GREEN: `test(01-01)` commit `6cb8e71` (6 assertion failures on the planned behavior, 17 characterisation tests already green because Task 1 had implemented config and health), then `feat(01-01)` `4920f0a` with all 29 tests green. No REFACTOR commit. `workflow.tdd_mode` is off, so `check tdd-red-evidence` was not run; the RED failures were inspected manually: each failed on its planned assertion (status 500 instead of 400/404/503, missing `.env.example` keys), not on syntax, import or fixture errors.

## Next Phase Readiness

- Ready for 01-02 (ESLint, Prettier, Husky): scripts and pins exist; remember `lint` is `eslint . --max-warnings=0` and that `eslint.config.js` must ignore `.claude`, `.planning`, `gsd`, `.devcontainer`, `docs`.
- Ready for 01-03 (contracts + LLM providers): `createLlmClient` switch is the seam; `error.schema.ts` shows the Zod 4 idioms.
- Ready for 01-04 (web shell): `vite.config.ts` needs the TanStack Router plugin prepended and Tailwind appended; add the web `test` script and `vitest.config.ts` then.
- The port decision above should be settled before anyone runs `docker compose up` from the devcontainer.

## Self-Check: PASSED

- Files: `.npmrc`, `package.json`, `package-lock.json`, `Dockerfile`, `compose.yml`, `scripts/compose-smoke.sh`, `.env.example`, `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `apps/api/src/config.test.ts`, `packages/contracts/src/error.schema.test.ts` all exist.
- Commits `b72fc5f`, `6cb8e71`, `4920f0a` are on the branch (ancestors of HEAD).
- Task 1 and Task 2 acceptance criteria re-run: all pass (the 8080/9001 literal mapping exists in compose.yml; the smoke passed with the local port override).

---
*Phase: 01-fundaciones-y-walking-skeleton*
*Completed: 2026-10-29*
