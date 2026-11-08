---
phase: 01-fundaciones-y-walking-skeleton
verified: 2026-11-01T21:55:00Z
status: passed
score: 8/8 must-haves verified (5 roadmap success criteria; 3 backstop truths discharged by human UAT)
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
  - apps/api/src/app.test.ts
  - apps/api/src/app.ts
  - apps/api/src/config.ts
  - apps/api/src/db/mongo.ts
  - apps/api/src/errors.ts
  - apps/api/src/llm/llm.client.test.ts
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
  - apps/web/src/layouts/app-layout.test.tsx
  - apps/web/src/layouts/app-layout.tsx
  - apps/web/src/main.tsx
  - apps/web/src/pods/application-list/index.ts
  - apps/web/src/scenes/application-list.scene.tsx
  - apps/web/src/styles.css
  - apps/web/vite.config.ts
  - compose.yml
  - eslint.config.js
  - package.json
  - packages/contracts/src/application.schema.ts
  - packages/contracts/src/enums.ts
  - packages/contracts/src/error.schema.ts
  - packages/contracts/src/index.ts
  - scripts/compose-smoke.sh
covered_digest: "v4:sha256:4e4f6791a632bc07919025b36371fc2673dad961312ceed40010e4352f8b98db"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "No z.enum declaration exists under apps/ except the environment enums in apps/api/src/config.ts; every domain enum lives in packages/contracts (FND-02)"
    reason: "Phase 3 gap-closure plan 03-10 deliberately added two provider-facing model schemas in apps/api/src/offers/extract.service.ts (z.enum([...tagGroupSchema.options, 'idioma']) and z.enum(MODEL_TAG_GROUPS)), built from the contracts enum, shown to the LLM only and never leaving the API. @tfm/contracts is unchanged and still owns every domain enum and API model. FND-02's intent holds; only the literal grep gate of the 01-03 plan truth was refined (allowlist for extract.service.ts, recorded in 01-VALIDATION.md)."
    accepted_by: "orchestrator re-audit 2026-11-01 (Phase 3 plan 03-10 decision); pending explicit user confirmation"
    accepted_at: "2026-11-01T21:55:00Z"
re_verification:
  previous_status: passed
  previous_score: 8/8
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 1: Fundaciones y walking skeleton Verification Report

**Phase Goal:** As the sole user, I want to run `docker compose up` and open a themed Expediente shell at localhost:8080 backed by a healthy API, so that every later phase ships on a working end-to-end skeleton.
**Verified:** 2026-11-01T21:55:00Z
**Status:** passed
**Re-verification:** Yes. The previous report (2026-10-29T22:40:00Z, `passed`) became stale because Phases 2 and 3 later modified files it covered (`apps/api/src/app.ts`, `db/mongo.ts`, `llm/*`, `main.ts`, `core/router/router.ts`, `layouts/app-layout*.tsx`, `scenes/application-list.scene.tsx`, `application.schema.ts`, contracts `index.ts`, `scripts/compose-smoke.sh`). Every must-have was re-checked against the current tree (branch `phase/03-autocompletado-ia`); the previous verdict was not assumed.

## MVP Mode Note

ROADMAP marks this phase `Mode: mvp`. The goal begins «As the sole user», not «As a [role],», so the strict user-story validator rejects it. Verification ran against the `[outcome]` clause. Warning, not a blocker (unchanged from the previous report): ROADMAP wording could read «As a sole user, ...».

## What changed since the previous report

| Area | Change (Phases 2 and 3) | Effect on Phase 1 truths |
| ---- | ----------------------- | ------------------------ |
| API (`app.ts`, `main.ts`, `db/mongo.ts`, `llm/*`) | Applications, tags and offers routes mounted; Mongo indexes; real `LlmClient` extraction replaces the 502 stub | Health, error contract and env fail-fast still covered by `app.test.ts`/`config.test.ts`; API suite is 271 tests, all passing. The Phase 1 «extraction is a Phase 3 stub» observation is now resolved by Phase 3. |
| Contracts (`application.schema.ts`, `index.ts`, `offer-extraction.schema.ts`, `tag.normalize.ts`) | Filter/sort query, tag normalisation helpers, extraction limits | Additive. Contracts suite is 55 tests, all passing. All Phase 1 enums and schemas still exported. |
| Web (`router.ts`, `app-layout*.tsx`, `application-list.scene.tsx`) | Nested routes, search params, arrival notice, list pod now real | Shell structure intact: `/` redirects to `/applications`, aside `hidden lg:flex`, header `lg:hidden`, Sheet `side="left"`. Layout/router/theme tests re-run: 47 passed. |
| `scripts/compose-smoke.sh` | Extended with applications round trip, offers route | Orchestrator run on this tree: all app checks green (see SC2). |
| `.prettierignore` | `.gsd` runtime dir excluded (commit f47b260) | Restores `npm run format:check` to green. |
| `apps/api/src/offers/extract.service.ts` | Two provider-facing `z.enum` model schemas | Documented override for the 01-03 grep gate; see Overrides below. |

Unchanged since the previous verification (empty `git diff 4cdb021..HEAD`): `.husky/*`, `.lintstagedrc.json`, `eslint.config.js`, `tsconfig.base.json`, `compose.yml`, `Dockerfile`, `.env.example`, `apps/web/index.html`, `apps/web/src/styles.css`, `apps/web/src/core/theme/*`. The FND-09 hook evidence and the DS/theme evidence therefore stand.

## Overrides

| Must-have | Verdict | Reasoning |
| --------- | ------- | --------- |
| 01-03 truth: «No z.enum declaration exists under apps/ except the environment enums in apps/api/src/config.ts» | PASSED (override) | Today's grep finds `z.enum` in `apps/api/src/config.ts:21` (env) and `apps/api/src/offers/extract.service.ts:56,71`. Those two are not API models: `rawOfferExtractionSchema` only widens what a model may answer (accepts the alias `idioma`) and is never serialised; `modelOfferExtractionSchema` is shown to the provider through `responseSchema`. Both are built from `offerExtractionSchema`/`tagGroupSchema`/`tagSchema` imported from `@tfm/contracts`, so the group values derive from the contracts enum. No `ApplicationStatus`, work mode, seniority, contract type or document type enum is declared outside contracts. FND-02 (web and API import every API model from `@tfm/contracts`, never redefine) holds. The literal wording is superseded; the refined gate (allowlist for `extract.service.ts`) is recorded in `01-VALIDATION.md` row 01-03-T1/T2. The override is a documented later-phase decision (03-10), recorded here rather than silently passed. Please confirm acceptance explicitly (`accepted_by` is the orchestrator's recording, not a user statement). |

## Goal Achievement

### Observable Truths (ROADMAP success criteria, the contract)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| SC1 | From root, `npm install/build/test/lint/typecheck` pass across the three workspaces; web and API import every API model from `@tfm/contracts`; a commit with a lint, format or type error is rejected by the pre-commit hook | ✓ VERIFIED | Orchestrator run today: typecheck, lint, build, test exit 0 (contracts 55, api 271, web 407); `format:check` exit 0. I re-ran typecheck (exit 0) and contracts/api tests (55 and 271 passed). No `any` in sources (only the lint-ignored generated `routeTree.gen.ts`). `.husky/pre-commit` = `npx lint-staged` then `npm run typecheck`; `.husky/pre-push` = `npm run test`; `core.hooksPath=.husky/_`; hook/lint config unchanged since Phase 1, so its reject probes (01-02) still apply. `z.enum` under `apps/`: see Overrides. |
| SC2 | `docker compose up` (multi-stage Dockerfile, pinned images) brings up the app plus healthy Mongo, Silo and Ollama; app opens at `http://localhost:8080` | ✓ VERIFIED (compose smoke today; browser on host human-attested) | `docker compose config -q` valid; `compose.yml` and `Dockerfile` unchanged since the last verification (images pinned, 127.0.0.1-only ports). Orchestrator `bash scripts/compose-smoke.sh --with-model --down` today: all app checks passed (health 200 `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`, runtime user, SPA fallback + JSON 404, applications round trip, offers route, mongo stop/start, s3 stop/start). Only the final `ollama-init` model re-pull failed with a registry network timeout (`dial tcp …:443 i/o timeout`): environmental, not code; moved to Manual-Only in `01-VALIDATION.md` (the model was pulled in earlier runs and UAT test 1). The browser at `localhost:8080` on a clean host rests on UAT test 1 (user-attested). |
| SC3 | `GET /api/health` returns `{status,mongo,s3,llm}`, each field real; API refuses to start on invalid env; every error is `{error:{code,message,details?}}`; `.env.example` lists every variable | ✓ VERIFIED | Compose smoke today: health all ok and the matching field flips to error and back when Mongo or Silo is stopped/started (the roadmap's «stopping Mongo or Silo changes the matching field»). `main.ts` wires real `pingMongo`, `pingS3`, `llm.ping()`. `app.test.ts` and `config.test.ts` (inside the 271 passing API tests) cover the field flips, never-settling probe, error branches, env fail-fast and `.env.example` parity with the env schema. JSON 404 shape confirmed in the smoke. |
| SC4 | Web lands on `/applications` inside the Expediente shell (tokens, EB Garamond / Source Sans 3 / JetBrains Mono): fixed sidebar at 1024 px and above, header with a menu button that opens a sheet with the same navigation below that | ✓ VERIFIED | `routes/index.tsx` throws `redirect({to:"/applications"})`. `app-layout.tsx` (re-read): `<aside class="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 ...">`, `<header class="lg:hidden ...">`, button `aria-label="Abrir menú"`, `SheetContent side="left"`, `<main class="lg:pl-64">`. Layout, router and theme tests re-run: 3 files, 47 passed. `styles.css` byte-identical to `docs/design/expediente.css` (`cmp`). No hex colours or Tailwind palette classes in any non-test TSX. Breakpoint behaviour: UAT test 2 (human). |
| SC5 | Theme switch Sistema / Claro / Oscuro from the shell; default follows the system; choice survives a reload | ✓ VERIFIED | `core/theme/*`, `theme-toggle.tsx` and `index.html` pre-hydration script unchanged since the last verification; `theme.test.ts` and `app-layout.test.tsx` (switch to dark from the sidebar and storage) pass in today's run. No-flash behaviour: UAT test 3 (human). |

### Plan-level truths tagged `verification: backstop` (plans 01-05 and 01-06)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| B1 | Sidebar visible from exactly 1024 px, hidden at 1023 px where the header takes over | ✓ VERIFIED (human) | UAT test 2 pass (re-run after the layout reorder). Classes unchanged and re-read today (`lg:` only, no custom breakpoint). Later phases touched `app-layout.tsx` for navigation/notice content, not for these classes. |
| B2 | Reloading with Oscuro paints no light frame before React mounts | ✓ VERIFIED (human) | UAT test 3 pass; `index.html` unchanged since. |
| B3 | On the host, `curl http://localhost:8080/api/health` answers all ok and a browser lands on `/applications` in the themed shell | ✓ VERIFIED (human) | UAT test 1 pass on a clean host; reconfirmed at the API/HTTP level by today's compose smoke. The devcontainer cannot reach host-published ports (RESEARCH Pitfall 11), so a fresh host-side browser look remains a manual-only item in `01-VALIDATION.md`, not a blocker. |

**Score:** 8/8 truths verified (1 via documented override on a plan-level sub-gate). No truth FAILED, none PRESENT_BEHAVIOR_UNVERIFIED.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json`, `package-lock.json`, `tsconfig.base.json` | workspaces, scripts | ✓ VERIFIED | Scripts ran today |
| `packages/contracts/src/*.ts` | enums, tag, interview, application, document, offer-extraction, error, health | ✓ VERIFIED | 55 tests pass; additive Phase 2/3 changes only |
| `apps/api/src/{app,config,errors,main}.ts`, `db/mongo.ts`, `storage/s3.ts`, `llm/*` | health, error contract, env fail-fast, providers | ✓ VERIFIED | Substantive and wired; 271 tests pass; real pings in `main.ts` |
| `Dockerfile`, `compose.yml`, `scripts/compose-smoke.sh` | pinned multi-stage deliverable | ✓ VERIFIED | See SC2 |
| `eslint.config.js`, `.prettierrc.json`, `.lintstagedrc.json`, `.husky/*` | quality gate | ✓ VERIFIED | Unchanged; lint and format:check exit 0 |
| `apps/web` router, routes, scene, pod, layout, theme, shadcn primitives, `styles.css`, `index.html` | themed shell | ✓ VERIFIED | See SC4/SC5 |
| `.env.example`, `README.md` | documentation | ✓ VERIFIED | Parity test passes |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `routes/__root.tsx` | `layouts/app-layout.tsx` | `createRootRoute({component: AppLayout})` | WIRED | Router tests render the shell through it |
| `routes/index.tsx` | `/applications` | `redirect` | WIRED | |
| `routes/applications/index.tsx` | scene → pod | route → `application-list.scene.tsx` → `@/pods/application-list` | WIRED | Scene imports only the pod's `index.ts` |
| `main.tsx` | `core/theme/theme.ts` | `initTheme()` before render | WIRED | |
| `main.ts` | `app.ts` | `createApp({pingMongo, pingS3, pingLlm, webDistDir, …})` | WIRED | Smoke shows the fields flip on stop/start |
| `app.ts` | `@tfm/contracts` | `ErrorResponse`, `Health` | WIRED | |
| `.husky/pre-commit` | `.lintstagedrc.json` + typecheck | hook body | WIRED | `core.hooksPath=.husky/_` |
| `compose.yml` `app` | `Dockerfile` | `build: .` | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `/api/health` handler | `mongo`, `s3`, `llm` | real pings (db command, HeadBucket, `llm.ping()`) | Yes (compose smoke flips) | ✓ FLOWING |
| `ApplicationListContainer` | `applications` | Phase 2 list endpoint (applications round trip in the smoke) | Yes. The Phase 1 empty `[]` placeholder was replaced by Phase 2 (APP-04) | ✓ FLOWING |
| `ThemeToggle` | `preference` | `useSyncExternalStore` over localStorage | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck | `npm run typecheck` | exit 0 | ✓ PASS |
| Contracts tests | `npm run test -w @tfm/contracts` | 4 files, 55 passed | ✓ PASS |
| API tests | `npm run test -w @tfm/api` | 15 files, 271 passed | ✓ PASS |
| Shell tests | `vitest run src/layouts src/core/router/router.test.tsx src/core/theme` (web) | 3 files, 47 passed | ✓ PASS |
| Full gate (orchestrator) | typecheck, lint, build, test, format:check | all exit 0; web 407 passed | ✓ PASS |
| Compose file | `docker compose config -q` | valid | ✓ PASS |
| CSS identity | `cmp apps/web/src/styles.css docs/design/expediente.css` | identical | ✓ PASS |
| Compose smoke (orchestrator) | `bash scripts/compose-smoke.sh --with-model --down` | app checks green; model re-pull step network timeout (environmental) | ✓ PASS (see SC2) |

I did not start containers or a server in this pass; compose evidence is the orchestrator's run on this tree.

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` exists and no PLAN declares a probe. `scripts/compose-smoke.sh` is the phase-declared runtime check; its result is recorded above (orchestrator run).

### Requirements Coverage

Plan frontmatter IDs: 01-01 `FND-01, FND-03, FND-04, FND-08, FND-10`; 01-02 `FND-09, FND-01`; 01-03 `FND-02`; 01-04 `FND-05, FND-07, FND-02`; 01-05 `FND-05, FND-06, FND-07`; 01-06 `FND-01, FND-08, FND-10`. The union is FND-01 to FND-10, matching the ten IDs REQUIREMENTS.md maps to Phase 1 (all checked and «Complete» in the traceability table). No orphaned requirement and no plan ID missing from REQUIREMENTS.md.

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| FND-01 | 01-01, 01-02, 01-06 | root npm scripts over the monorepo | ✓ SATISFIED | All five scripts plus format:check exit 0 today |
| FND-02 | 01-03, 01-04 | every API model from `@tfm/contracts` | ✓ SATISFIED (override on literal gate) | Contracts own every enum and API model; the only extra `z.enum` are env (`config.ts`) and the two API-internal, contracts-derived provider schemas (see Overrides) |
| FND-03 | 01-01 | `GET /api/health` with real connectivity | ✓ SATISFIED | Smoke: all ok; fields flip on stop/start |
| FND-04 | 01-01 | Zod env validation; error contract | ✓ SATISFIED | `config.test.ts`, `app.test.ts`; JSON 404 in smoke |
| FND-05 | 01-04, 01-05 | `/applications` in the shell with sidebar and mobile Sheet | ✓ SATISFIED | SC4 plus UAT test 2 |
| FND-06 | 01-05 | theme Sistema/Claro/Oscuro, persisted, default follows system | ✓ SATISFIED | SC5 plus UAT test 3 |
| FND-07 | 01-04, 01-05 | «Expediente» design system tokens and fonts | ✓ SATISFIED | CSS identical to the DS file; no palette or hex classes |
| FND-08 | 01-01, 01-06 | `docker compose up` reaches the app at `localhost:8080`, services healthy, multi-stage, pinned | ✓ SATISFIED | Compose smoke today; clean-host run attested in UAT test 1 |
| FND-09 | 01-02 | pre-commit ESLint, Prettier, typecheck via Husky + lint-staged | ✓ SATISFIED | Hooks, config and hooksPath unchanged and re-read |
| FND-10 | 01-01, 01-06 | `.env.example` lists every variable | ✓ SATISFIED | Parity test passes |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| files changed since phase 1 (apps, packages, scripts) | - | `TBD`/`FIXME`/`XXX` | none found | No debt markers |
| `apps/web/src/routeTree.gen.ts` | 19, 24 | `as any` | Info | Generated by TanStack Router, lint-ignored by design |
| `apps/api/src/offers/extract.service.ts` | 56, 71 | `z.enum` outside contracts | Info | Documented override (see Overrides) |
| `apps/web/vite.config.ts` | server | `host: true` | Warning | Dev server only (review WR-02); not in the compose deliverable |

01-SECURITY.md re-audit (commit c8f7d3b): 26/26 threats closed.

### Human Verification Required

None blocking. The four earlier items remain discharged by the recorded UAT results, and the code they depend on (layout classes, theme script, compose file) is unchanged in the relevant parts. A host-side look at `http://localhost:8080` and the Ollama model re-pull (`ollama-init`) remain listed as Manual-Only in `01-VALIDATION.md`; the first needs host ports the devcontainer cannot reach, the second a working registry connection.

### Gaps Summary

No gaps. Phase 1's goal still holds on the current tree after Phases 2 and 3: the root scripts and quality gate pass, the API reports real health and the error contract, the themed shell with sidebar/Sheet and persistent theme is intact, and the pinned multi-stage compose deliverable passed the smoke today apart from the environmental model re-pull. One literal plan-level gate (no `z.enum` outside `config.ts`) no longer holds by design and is recorded as an override; FND-02's intent is preserved.

Observations, not failures:
- **Override acceptance:** the `accepted_by` of the override was recorded on the orchestrator's instruction; please confirm it explicitly if you want it to count as user-approved.
- **ROADMAP wording** still does not satisfy the strict MVP user-story validator.
- **Web test cold-start flake** noted in the previous report did not recur in the orchestrator's full run (407 passed) or in my targeted run.

---

_Verified: 2026-11-01T21:55:00Z_
_Verifier: Claude (gsd-verifier)_
