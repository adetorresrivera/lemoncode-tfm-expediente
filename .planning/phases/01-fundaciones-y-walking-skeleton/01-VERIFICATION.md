---
phase: 01-fundaciones-y-walking-skeleton
verified: 2026-10-29T16:20:00Z
status: human_needed
score: 4/8 must-haves verified (4 of 5 roadmap success criteria; 1 behavior-unverified; 3 backstop truths await a human)
covered_files:
  - .env.example
  - .husky/pre-commit
  - .husky/pre-push
  - .lintstagedrc.json
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-01-PLAN.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-01-SUMMARY.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-02-PLAN.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-02-SUMMARY.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-03-PLAN.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-03-SUMMARY.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-04-PLAN.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-04-SUMMARY.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-05-PLAN.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-05-SUMMARY.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-06-PLAN.md
  - .planning/phases/01-fundaciones-y-walking-skeleton/01-06-SUMMARY.md
  - Dockerfile
  - README.md
  - apps/api/src/app.ts
  - apps/api/src/config.ts
  - apps/api/src/db/mongo.ts
  - apps/api/src/errors.ts
  - apps/api/src/llm/llm.client.ts
  - apps/api/src/llm/mock.provider.ts
  - apps/api/src/llm/ollama.provider.ts
  - apps/api/src/llm/openai.provider.ts
  - apps/api/src/main.ts
  - apps/api/src/storage/s3.ts
  - apps/web/index.html
  - apps/web/src/app.tsx
  - apps/web/src/common/components/theme-toggle.tsx
  - apps/web/src/core/router/router.ts
  - apps/web/src/core/theme/theme.ts
  - apps/web/src/layouts/app-layout.tsx
  - apps/web/src/main.tsx
  - apps/web/src/pods/application-list/index.ts
  - apps/web/src/scenes/application-list.scene.tsx
  - apps/web/src/styles.css
  - compose.yml
  - eslint.config.js
  - package.json
  - packages/contracts/src/application.schema.ts
  - packages/contracts/src/enums.ts
  - packages/contracts/src/error.schema.ts
  - packages/contracts/src/index.ts
  - scripts/compose-smoke.sh
covered_digest: "v4:sha256:16d06f2f7feae81734fe827edb87c7133e43c5a73487283009def6c104e70b70"
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "docker compose up with the committed 127.0.0.1:8080 and 127.0.0.1:9001 mappings brings the stack up and the app answers at http://localhost:8080 (ROADMAP SC2)"
    test: "On a clean host with nothing bound to 8080/9001, run `docker compose up --build` and wait for the app, mongo, s3 and ollama containers to be healthy; open http://localhost:8080"
    expected: "Shell loads at /applications; `curl http://localhost:8080/api/health` returns {\"status\":\"ok\",\"mongo\":\"ok\",\"s3\":\"ok\",\"llm\":\"ok\"}; Silo console reachable at http://127.0.0.1:9001 with bucket tfm-assets"
    why_human: "The executor ran the compose smoke (SMOKE OK, including the gemma4:e2b pull) only with an uncommitted port override (18080/19001). The committed host-port publishing was never exercised, and the verifier did not start compose to avoid leaving containers behind."
human_verification:
  - test: "Run `docker compose up --build` on a clean host (committed port mappings, no override) and open http://localhost:8080"
    expected: "App container healthy, mongo/s3/ollama healthy, s3-init exited 0, browser lands on /applications inside the themed shell; `curl http://localhost:8080/api/health` gives all four fields ok; Silo console at 127.0.0.1:9001 lists bucket tfm-assets"
    why_human: "Host-port publishing and a real browser cannot be confirmed from inside the devcontainer (Docker-outside-of-Docker); executor evidence used a port override."
  - test: "Resize a browser to 1024 px and 1023 px wide"
    expected: "At 1024 px the fixed sidebar is visible and the header with «Abrir menú» is hidden; at 1023 px the sidebar is hidden and the header button opens the Sheet"
    why_human: "Plan 01-05 tags this truth `verification: backstop`; jsdom has no layout engine. Code uses Tailwind lg: (64rem = 1024 px) with no custom breakpoint override in styles.css, which is consistent but not behavioral proof."
  - test: "Select Oscuro, reload the page (hard reload, throttled CPU if possible)"
    expected: "No light-theme frame is painted before React mounts; theme stays dark and the toggle shows Oscuro"
    why_human: "Plan 01-05 tags this truth `verification: backstop`. The pre-hydration script is present in apps/web/index.html and in the built apps/web/dist/index.html, but a paint-timing property cannot be proven by grep or jsdom."
  - test: "Open the mobile Sheet with the keyboard, Tab through it, press Esc"
    expected: "Focus stays trapped inside the Sheet; Esc closes it and focus returns to the «Abrir menú» button; the theme toggle fits the 256 px sidebar and the Sheet without clipping"
    why_human: "Radix focus management is exercised only partially in jsdom (Esc close and link-close are unit-tested; focus return and trap are not); visual fit needs eyes."
---

# Phase 1: Fundaciones y walking skeleton Verification Report

**Phase Goal:** As the sole user, I want to run `docker compose up` and open a themed Expediente shell at localhost:8080 backed by a healthy API, so that every later phase ships on a working end-to-end skeleton.
**Verified:** 2026-10-29T16:20:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

## MVP Mode Note

ROADMAP marks this phase `Mode: mvp`. `gsd_run query user-story.validate` reports the goal as not valid because it starts with «As the sole user» instead of the canonical «As a [role],». The goal is plainly a user story (role, capability, outcome); only the article differs. Verification proceeded against the `[outcome]` clause («every later phase ships on a working end-to-end skeleton»). Warning, not a blocker: reword the ROADMAP goal to «As a sole user, ...» (plan 01-06 already uses that wording) if the strict guard is relied on later.

## User Flow Coverage

User story: «run `docker compose up`, open a themed Expediente shell at localhost:8080 backed by a healthy API».

| Step | Expected | Evidence | Status |
| ---- | -------- | -------- | ------ |
| Run `docker compose up` | Pinned images, app + healthy mongo/s3/ollama, s3-init and ollama-init one-shots | `compose.yml` parses (`docker compose config -q` OK); images pinned (`mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04...`, `pgsty/mc:RELEASE.2026-09-16...`, `ollama/ollama:0.40.3`, local `tfm-app:0.1.0`); healthchecks on app (Dockerfile), mongo, s3, ollama; app `depends_on` mongo/s3/s3-init only, never ollama | ✓ (config); runtime on committed ports ⚠️ human |
| Open localhost:8080 | API serves built SPA | Built API (`NODE_ENV=production`, run by verifier on port 18099 against the devcontainer Mongo/Silo/mock LLM) served `/` and `/applications/1` as `index.html` (200 text/html), hashed CSS asset 200 text/css, `/api/nope` 404 JSON | ✓ |
| Land on `/applications` in the shell | Redirect, scene header, empty state, sidebar/Sheet nav | `routes/index.tsx` `redirect({to:"/applications", replace:true})`; `router.test.tsx`, `app-layout.test.tsx` pass; `AppLayout` is the root route component | ✓ (visual breakpoint ⚠️ human) |
| API healthy | `/api/health` reflects real connectivity | Live: `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`; second instance with `LLM_BASE_URL=http://127.0.0.1:1` returned `"llm":"error"` with the others `ok` | ✓ |
| Outcome: skeleton for later phases | Workspaces, contracts, quality gate, error contract, pod/scene/route structure in place | See truths below | ✓ |

## Goal Achievement

### Observable Truths (ROADMAP success criteria, the contract)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| SC1 | From root, `npm install/build/test/lint/typecheck` pass across the three workspaces; web and API import every API model from `@tfm/contracts`; a commit with a lint, format or type error is rejected by the pre-commit hook | ✓ VERIFIED | Verifier ran in this working tree: `npm run typecheck` exit 0 (3 workspaces); `npm run lint` (`eslint . --max-warnings=0`) clean; `npm run test` all green (contracts 40, api 34, web 40, no flake on this run); `npm run build` contracts, api and web all built. `z.enum` appears under `apps/` only in `apps/api/src/config.ts` (env enum); API and web import `ErrorResponse`, `Health`, `applicationSchema`, `OfferExtraction`, etc. from `@tfm/contracts`. `.husky/pre-commit` = `npx lint-staged` then `npm run typecheck`; `.husky/pre-push` = `npm run test`; `core.hooksPath` = `.husky/_` and `.husky/_` exists; ESLint on a stdin `any` source fails with `no-explicit-any`. The live reject probes (explicit `any`, type error) were executed and recorded by 01-02 and not repeated here to avoid touching the index. |
| SC2 | `docker compose up` (multi-stage Dockerfile, pinned images) brings up the app plus healthy Mongo, Silo and Ollama services; app opens at `http://localhost:8080` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Artifacts verified: 4-stage Dockerfile (`deps`, `build`, `prod-deps`, `runtime`; `node:22.23.2-slim`, `USER node`, `HEALTHCHECK`), `compose.yml` valid with every image pinned and no `latest`. Executor smoke `SMOKE OK` (incl. real `gemma4:e2b` pull, uid 1000, stop/start flips) was obtained only with an uncommitted 18080/19001 override. Commit `d4143d9` removed the 8080/9001 devcontainer forwards that caused the clash, but nobody has run the committed mapping since. Routed to human verification. |
| SC3 | `GET /api/health` returns `{status,mongo,s3,llm}`, each field real (stopping Mongo/Silo flips the matching field); API refuses to start on invalid env; every error is `{error:{code,message,details?}}`; `.env.example` lists every variable | ✓ VERIFIED | Live run (above): real health all ok; with an unreachable LLM only `llm` flips to `error`. `probe()` caps each dependency at 2.5 s and never rejects; `app.test.ts` covers flip-only-mongo, flip-only-s3, never-settling probe (200 within cap). Env: running `main.js` with an empty env exits 1 listing `MONGO_URL, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY` and no values; empty string counts as absent (`config.test.ts`). `onError` maps ApiError, ZodError, SyntaxError, HTTPException, unknown, in that order, typed as `ErrorResponse`; unknown messages are not echoed; verified live: `/api/nope` and a POST to a GET-only route return the contract `NOT_FOUND` shape; the ZodError, malformed-JSON, HTTPException and unknown-error branches are covered by `app.test.ts` only. `.env.example` parity is a test (`config.test.ts` ".env.example lists every key of envSchema") and `LLM_API_KEY=` carries no value. Mongo stop/Silo stop live flip was proven by the executor's compose smoke, not re-run here. |
| SC4 | Web lands on `/applications` inside the Expediente shell (tokens, EB Garamond / Source Sans 3 / JetBrains Mono): fixed sidebar at 1024 px and above, header with a menu button that opens a sheet with the same navigation below that | ✓ VERIFIED (visual sub-truth ⚠️ human) | `/` redirects to `/applications` (router test). `AppLayout`: `<aside class="hidden lg:flex lg:fixed ...">` + `<header class="lg:hidden ...">` with `aria-label="Abrir menú"` opening a `Sheet` that re-renders the same `MainNav` plus `ThemeToggle`; Sheet has title and sr-only description; Esc and link-click close are tested. `styles.css` is byte-identical to `docs/design/expediente.css` (`cmp`), built CSS contains `EB Garamond Variable`, `Source Sans 3 Variable`, `JetBrains Mono Variable` and ships woff2 files. No hex or Tailwind palette class in any TSX (grep). Pod structure: route → scene → pod, `pods/application-list/index.ts` exports only the container, all pod files of CLAUDE.md present, VM not derived from contracts type, empty barrels for the other three pods. |
| SC5 | Theme switch Sistema / Claro / Oscuro from the shell; default follows the system; choice survives a reload | ✓ VERIFIED (no-flash sub-truth ⚠️ human) | `theme.ts`: `readThemePreference` (try/catch, unknown value → system), `setThemePreference` persists `expediente-theme`, `applyTheme` toggles `dark` on `<html>`, `initTheme` listens to `prefers-color-scheme` only while preference is `system`; `main.tsx` calls `initTheme()` before render; `theme.test.ts` (10 tests) and `app-layout.test.tsx` "switches to dark from the sidebar and stores the choice" pass. Persistence across reload is implemented through localStorage read on init and by the inline pre-hydration script (present in source and in built `dist/index.html`). |

### Plan-level truths tagged `verification: backstop` (plan 01-05 and 01-06)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| B1 | Sidebar visible from exactly 1024 px and hidden at 1023 px, where the header takes over | ? insufficient_spec, human | `lg:` (64rem) classes only; no layout test possible in jsdom. See human_verification. |
| B2 | Reloading with Oscuro paints no light frame before React mounts | ? insufficient_spec, human | Pre-hydration script present and runs before module script; paint timing unprovable here. |
| B3 | On the host, `curl http://localhost:8080/api/health` answers all ok and a browser lands on `/applications` in the themed shell | ? insufficient_spec, human | Same evidence gap as SC2. |

**Score:** 4/8 (SC1, SC3, SC4, SC5 verified; SC2 behavior-unverified; B1 to B3 require a human). No truth is FAILED.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json`, `.npmrc`, `package-lock.json`, `tsconfig.base.json` | workspaces, scripts, exact pins | ✓ VERIFIED | Scripts `dev build test lint typecheck format format:check seed` present; `@tfm/source` export condition resolves contracts without a build |
| `packages/contracts/src/*.ts` | enums, tag, interview, application, document, offer-extraction, error, health | ✓ VERIFIED | Enum values and order match `docs/DOMAIN.md`; applicationSchema fields match; 40 tests |
| `apps/api/src/{app,config,errors,main}.ts`, `db/mongo.ts`, `storage/s3.ts`, `llm/*` | health, error contract, env fail-fast, indexes, bucket, providers | ✓ VERIFIED | Substantive and wired from `main.ts` into `createApp`; Mongo named indexes and `ensureBucket` at startup (indexes created against devcontainer Mongo during the live run); LLM `ollama`/`openai`/`mock` switch in `createLlmClient`; extraction itself is an intentional Phase 3 stub (502 `LLM_ERROR`) |
| `Dockerfile`, `compose.yml`, `.dockerignore`, `scripts/compose-smoke.sh` | pinned multi-stage deliverable | ✓ VERIFIED (static) | See SC2 |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.husky/*` | quality gate | ✓ VERIFIED | See SC1 |
| `apps/web` router, routes, scene, pod, layout, theme, shadcn primitives, `styles.css`, `index.html` | themed shell | ✓ VERIFIED | See SC4/SC5 |
| `.env.example`, `README.md` | documentation | ✓ VERIFIED | README in Spanish, tuteo, documents compose, mock fallback, smoke, dev mode; `.env`/`.env.*` git-ignored except the example |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `routes/__root.tsx` | `layouts/app-layout.tsx` | `createRootRoute({component: AppLayout})` | WIRED | Confirmed in source |
| `routes/applications/index.tsx` | `scenes/application-list.scene.tsx` → `pods/application-list` | route → scene → pod | WIRED | Scene renders `ApplicationListContainer`; no pod imports another pod (grep) |
| `main.tsx` | `core/theme/theme.ts` | `initTheme()` before render | WIRED | |
| `main.ts` | `app.ts` | `createApp({pingMongo, pingS3, pingLlm, webDistDir})` | WIRED | Live health uses real pings |
| `app.ts` | `@tfm/contracts` | `ErrorResponse`, `Health` types | WIRED | |
| `llm.client.ts` | `mock.provider.ts` / `openai.provider.ts` / `ollama.provider.ts` | switch on `LLM_PROVIDER` | WIRED | |
| `.husky/pre-commit` | `.lintstagedrc.json` and `npm run typecheck` | hook body | WIRED | `core.hooksPath=.husky/_` |
| `README.md` | `scripts/compose-smoke.sh` | documented command | WIRED | |
| `compose.yml` `app` | `Dockerfile` | `build: .` | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `/api/health` handler | `mongo`, `s3`, `llm` | `pingMongo` (db.command ping), `pingS3` (HeadBucket), `llm.ping()` (HTTP GET) | Yes, verified live; flips on an unreachable LLM | ✓ FLOWING |
| `ApplicationListContainer` | `applications` | `useApplicationList` returns mapped `[]` | Intentionally empty in Phase 1 (list endpoint is APP-04, Phase 2); renders the empty state, which is the Phase 1 contract | ✓ FLOWING (by design, not HOLLOW) |
| `ThemeToggle` | `preference` | `useSyncExternalStore` over localStorage | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck, lint | `npm run typecheck`, `npm run lint` | exit 0 | ✓ PASS |
| Tests | `npm run test` | contracts 40, api 34, web 40 passed | ✓ PASS |
| Build | `npm run build` | contracts, api, web built; CSS contains the 3 font families | ✓ PASS |
| Production API | `NODE_ENV=production PORT=18099 LLM_PROVIDER=mock node apps/api/dist/main.js` then curl `/api/health`, `/api/nope`, `/applications/1`, `/` | health all ok; 404 JSON; SPA fallback 200 HTML | ✓ PASS |
| LLM flip | same with `LLM_PROVIDER=ollama LLM_BASE_URL=http://127.0.0.1:1` | `"llm":"error"`, others ok | ✓ PASS |
| Invalid env | `env -i node apps/api/dist/main.js` | exit 1, names 5 variables, no values | ✓ PASS |
| Compose file | `docker compose config -q` | valid | ✓ PASS |
| `format:check` | `npm run format:check` | one warning: `.gsd/dispatch-isolation-sentinel.json` | observation, see below |

The verifier's API processes were stopped; no compose containers were started. Run side effects: the API created the (idempotent) named indexes in database `tfm` of the devcontainer Mongo and ensured bucket `tfm-assets`, both expected project state.

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` and no probe declared by any PLAN. The compose smoke (`scripts/compose-smoke.sh`) is the phase-declared runtime check; it was not run by the verifier (it starts and stops containers, and cannot publish the committed ports from this devcontainer). Executor result recorded in 01-06-SUMMARY.md: SMOKE OK with port override.

### Requirements Coverage

Plan frontmatter IDs: 01-01 `FND-01, FND-03, FND-04, FND-08, FND-10`; 01-02 `FND-09, FND-01`; 01-03 `FND-02`; 01-04 `FND-05, FND-07, FND-02`; 01-05 `FND-05, FND-06, FND-07`; 01-06 `FND-01, FND-08, FND-10`. Union = FND-01..FND-10; REQUIREMENTS.md maps exactly FND-01..FND-10 to Phase 1. No orphaned requirement, no ID claimed by a plan that is missing from REQUIREMENTS.md.

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| FND-01 | 01-01, 01-02, 01-06 | root npm install/build/test/lint/typecheck over the monorepo | ✓ SATISFIED | Ran all four scripts successfully |
| FND-02 | 01-03, 01-04 | every API model from `@tfm/contracts`, never redefined | ✓ SATISFIED | Contracts barrel exports all models; only env enum under `apps/`; web `getApplications` typed against contracts |
| FND-03 | 01-01 | `GET /api/health` with real connectivity | ✓ SATISFIED | Live probe + unit tests (Mongo/Silo flip confirmed by executor smoke) |
| FND-04 | 01-01 | Zod env validation at startup; error contract | ✓ SATISFIED | Live invalid-env exit; `onError` mapping; tests |
| FND-05 | 01-04, 01-05 | lands on `/applications` in shell with desktop sidebar and mobile sheet | ✓ SATISFIED (breakpoint exactness ⚠️ human B1) | See SC4 |
| FND-06 | 01-05 | theme Sistema/Claro/Oscuro, persisted, default follows system | ✓ SATISFIED (no-flash ⚠️ human B2) | See SC5 |
| FND-07 | 01-04, 01-05 | «Expediente» design system tokens and fonts | ✓ SATISFIED | CSS byte-identical to the DS file; fonts in build; no palette/hex classes |
| FND-08 | 01-01, 01-06 | `docker compose up` reaches app at `localhost:8080`, healthy Mongo/Silo/Ollama, multi-stage, pinned | ? NEEDS HUMAN | Static artifacts verified; committed port mapping unproven at runtime |
| FND-09 | 01-02 | pre-commit ESLint, Prettier, typecheck via Husky + lint-staged | ✓ SATISFIED | Hook files, config, hooksPath; live probes recorded by 01-02 |
| FND-10 | 01-01, 01-06 | `.env.example` lists every variable | ✓ SATISFIED | Parity test; `LLM_API_KEY` empty; README documents `.env` usage |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (all phase sources) | - | `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` | none found | No debt markers |
| `apps/web/src/routeTree.gen.ts` | 19, 24 | `as any` | ℹ️ Info | Generated by TanStack Router, ESLint-ignored and Prettier-ignored by design; not hand-written |
| `apps/api/src/llm/ollama.provider.ts`, `openai.provider.ts` | - | `extractStructured` throws 502 `LLM_ERROR` | ℹ️ Info | Intentional Phase 3 stub (AI-01..AI-04); ping is real |
| `apps/web/src/pods/application-list/application-list.hooks.ts` | - | no fetch; returns `[]` | ℹ️ Info | Documented: list endpoint belongs to APP-04 (Phase 2); not a stub against any Phase 1 truth |
| `apps/web/src/pods/{application-detail,application-edit,document-upload}/index.ts` | - | `export {}` barrels | ℹ️ Info | Intentional (D-14), filled in Phases 2 and 5 |

The eight open review warnings (WR-01..WR-08, 0 critical) concern startup robustness, theme desync, error mapping, tag normalisation (APP-12, Phase 2) and SPA 404 behavior. None contradicts a Phase 1 success criterion or an FND requirement. Observed while verifying: the built API took several seconds to log «API listening» against the devcontainer services (the Mongo connection alone took about 7 s in this environment), consistent with WR-01 (no startup timeout on S3, raw failure on Mongo); compose masks it with `depends_on` plus `restart: unless-stopped`.

### Deferred Items

None to defer: all gaps found are either not gaps or are routed to human verification. Items that later phases will address anyway (not counted against Phase 1): list endpoint and list UI (Phase 2), real LLM extraction (Phase 3), seed and full README (Phase 6).

### Human Verification Required

1. **Compose on a clean host with the committed ports**
   **Test:** `docker compose up --build` (no override), open http://localhost:8080, `curl http://localhost:8080/api/health`, open http://127.0.0.1:9001.
   **Expected:** All services healthy, shell at `/applications`, health all `ok`, Silo console shows bucket `tfm-assets`.
   **Why human:** Executor evidence used a 18080/19001 override; host publishing cannot be tested from the devcontainer.

2. **Breakpoint at 1024 / 1023 px**
   **Test:** Resize the browser.
   **Expected:** Sidebar at 1024 px and above; header with «Abrir menú» below.
   **Why human:** Layout behavior (backstop truth B1).

3. **No light flash on reload with Oscuro**
   **Test:** Choose Oscuro, hard reload.
   **Expected:** Dark from the first paint.
   **Why human:** Paint timing (backstop truth B2).

4. **Sheet keyboard behavior and toggle fit**
   **Test:** Open the Sheet from the keyboard, Tab around, Esc.
   **Expected:** Focus trapped; focus returns to «Abrir menú»; theme toggle fits sidebar and Sheet.
   **Why human:** Focus return and visual fit are not covered by jsdom tests.

### Gaps Summary

No blocking gaps. Every FND requirement has implementation evidence in the codebase, and the verifier reproduced typecheck, lint, tests, build and a production run of the API (real health, SPA fallback, error contract, env fail-fast) in this working tree. The phase is held at `human_needed` solely because the headline deliverable, `docker compose up` publishing on the committed `127.0.0.1:8080` and `127.0.0.1:9001`, and three backstop-tagged UI truths (exact breakpoint, no theme flash, Sheet focus) can only be confirmed by a human on a clean host.

Observations, not failures:
- **Flake:** the aggregate `npm test` web workspace has the known cold-start `Failed to start forks worker` timeout; it did not occur in this run (web suite took about 61 s).
- **`format:check`:** fails in this working tree on `.gsd/dispatch-isolation-sentinel.json`, a git-ignored GSD tooling artifact that Prettier does not skip because only the root `.gitignore` is honored. A clean checkout does not contain it. Consider adding `.gsd` to `.prettierignore` so the pre-commit and format gate stay green while GSD workflows run.
- **ROADMAP goal wording** does not pass the strict MVP user-story validator (see MVP Mode Note).
- **REQUIREMENTS.md** still shows FND-01..FND-10 unchecked and «Pending» in the traceability table; update after human verification closes.
- **Open review warnings** (01-REVIEW-DISPOSITION.md, all open): WR-01 and WR-02 (startup and S3 ping timeouts) are the ones most likely to affect the live demo environment; schedule them early in Phase 2.

---

_Verified: 2026-10-29T16:20:00Z_
_Verifier: Claude (gsd-verifier)_
