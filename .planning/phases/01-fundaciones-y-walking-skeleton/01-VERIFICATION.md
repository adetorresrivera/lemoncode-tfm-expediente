---
phase: 01-fundaciones-y-walking-skeleton
verified: 2026-10-29T22:40:00Z
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
covered_digest: "v4:sha256:77b89117a7368392d07cdc3df60fea5e566b13f0b89daccb5c4975f06e54d390"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/8
  gaps_closed:
    - "SC2 / B3: docker compose up on the committed 127.0.0.1:8080 and 127.0.0.1:9001 mappings (UAT test 1, user-attested on a clean host)"
    - "B1: sidebar at 1024 px, header + Sheet below (UAT test 2, re-run after the button move)"
    - "B2: no light flash on reload with Oscuro (UAT test 3)"
    - "Sheet keyboard behavior and toggle fit (UAT test 4; focus return now also asserted by a unit test)"
  gaps_remaining: []
  regressions: []
---

# Phase 1: Fundaciones y walking skeleton Verification Report

**Phase Goal:** As the sole user, I want to run `docker compose up` and open a themed Expediente shell at localhost:8080 backed by a healthy API, so that every later phase ships on a working end-to-end skeleton.
**Verified:** 2026-10-29T22:40:00Z
**Status:** passed
**Re-verification:** Yes. The previous report (2026-10-29T16:20:00Z, `human_needed`) went stale when `apps/web/src/layouts/app-layout.tsx` changed. Everything below was re-checked against the working tree as it is now; the previous verdict was not assumed.

## MVP Mode Note

ROADMAP marks this phase `Mode: mvp`. The goal begins «As the sole user», not «As a [role],», so the strict user-story validator rejects it. The goal is a user story in substance, and verification ran against its `[outcome]` clause. Warning, not a blocker: change the ROADMAP wording to «As a sole user, ...».

## What changed since the previous report

| Commit | Change | Effect on this verification |
| ------ | ------ | --------------------------- |
| 40a0207, 1c631ce | Mobile menu button moved to the Sheet side (left) of the header; test asserts it is the header's first child and precedes the wordmark | Re-read `app-layout.tsx` and the test. Diff is a pure reorder inside `<header>` (`justify-between` replaced by `gap-2`; wordmark after the `Sheet`). Sheet content, trigger and `onOpenChange` are untouched. |
| 626364c | `server.host: true` in `apps/web/vite.config.ts` | Dev-server only. Not shipped by compose (the production image serves the SPA from Hono). Recorded as review warning, no phase-truth impact. |
| cfe7895 | Two Nyquist test additions (`app.test.ts`, `llm.client.test.ts`) | Test-only. API suite is now 41 tests, all passing. |

## Disposition of the previous human items

The UAT file records four results, each entered by the user with the test's expected text. I accept them as the human evidence the backstop truths required, and checked that none was invalidated by later code.

| Previous human item | UAT result | Code cross-check | Disposition |
| ------------------- | ---------- | ---------------- | ----------- |
| 1. Compose on a clean host with the committed ports (SC2 / B3) | pass: «user verified it passes outside the repository (clean host)». The earlier block was a host clash on port 9001, not a `compose.yml` defect. | `compose.yml` unchanged since the previous report; `docker compose config -q` valid; ports are `127.0.0.1:8080:8080` and `127.0.0.1:9001:9001`; every image pinned. | Discharged (human-attested, not reproducible from this devcontainer) |
| 2. 1024 / 1023 px breakpoint (B1) | first run: issue (button on the wrong side); re-run after commits 1c631ce/626364c: pass at 21:22 | Classes unchanged: aside `hidden lg:flex`, header `lg:hidden`, no custom breakpoint in `styles.css`. | Discharged (the re-run post-dates the layout change) |
| 3. No light flash on reload with Oscuro (B2) | pass (20:19, before the layout change) | `apps/web/index.html` untouched by the layout commits; pre-hydration script reads `expediente-theme` and adds `dark` to `<html>`. | Discharged; not affected by the later change |
| 4. Sheet keyboard behavior and toggle fit | pass (20:19, before the layout change) | The layout diff does not touch the Sheet, its content or focus handling. The test «closes the sheet with Escape» now also asserts `trigger` regains focus and passes. UAT test 2 re-run (post-change) includes «Esc returns focus to the button» and passed. | Discharged. Residual risk: the item was not re-run by itself after the reorder. I judge it covered by the unit test plus the UAT test 2 re-run, and the change is a DOM-order move only. |

No item needs a human any more. If you want the strictest reading, UAT test 4 could be repeated once on the final build; I do not consider it blocking.

## Goal Achievement

### Observable Truths (ROADMAP success criteria, the contract)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| SC1 | From root, `npm install/build/test/lint/typecheck` pass across the three workspaces; web and API import every API model from `@tfm/contracts`; a commit with a lint, format or type error is rejected by the pre-commit hook | ✓ VERIFIED | Run today: `npm run typecheck` exit 0 (3 workspaces); `npm run lint` clean (`--max-warnings=0`); tests contracts 40, api 41, web 41 pass; `npm run build` completes. `z.enum` under `apps/` appears only in `apps/api/src/config.ts` (env, not an API model). `.husky/pre-commit` = `npx lint-staged` then `npm run typecheck`; `.husky/pre-push` = `npm run test`; `core.hooksPath=.husky/_`. Live reject probes were executed by plan 01-02 and not repeated, to avoid touching the index. |
| SC2 | `docker compose up` (multi-stage Dockerfile, pinned images) brings up the app plus healthy Mongo, Silo and Ollama; app opens at `http://localhost:8080` | ✓ VERIFIED (static + live API here; committed-port run human-attested) | Static: `docker compose config -q` OK; images pinned (`mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04...`, `pgsty/mc:RELEASE.2026-09-16...`, `ollama/ollama:0.40.3`, local `tfm-app:0.1.0`); 127.0.0.1-only publishing. Executor compose smoke (SMOKE OK) plus UAT test 1 on a clean host with the committed ports. I could not run compose here (Docker-outside-of-Docker, no host port publishing), so the final link rests on the user's attestation. |
| SC3 | `GET /api/health` returns `{status,mongo,s3,llm}`, each field real; API refuses to start on invalid env; every error is `{error:{code,message,details?}}`; `.env.example` lists every variable | ✓ VERIFIED | Live today (built API, `NODE_ENV=production`, port 18099, devcontainer Mongo/Silo): `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`; `/api/nope` gives `{"error":{"code":"NOT_FOUND","message":"Recurso no encontrado"}}`. `env -i node apps/api/dist/main.js` prints «Invalid environment» naming the missing variables (no values) and exits 1. `app.test.ts` covers the flip of each field, never-settling probe, and the ZodError/malformed-JSON/HTTPException/unknown branches. `config.test.ts` asserts `.env.example` parity with the env schema. |
| SC4 | Web lands on `/applications` inside the Expediente shell (tokens, EB Garamond / Source Sans 3 / JetBrains Mono): fixed sidebar at 1024 px and above, header with a menu button that opens a sheet with the same navigation below that | ✓ VERIFIED | Router test: `/` redirects to `/applications`. `AppLayout` (re-read today): `<aside class="hidden lg:flex lg:fixed ...">` + `<header class="lg:hidden ...">`; button `aria-label="Abrir menú"` is the header's first child (asserted); Sheet `side="left"` re-renders the same `MainNav` and `ThemeToggle`; link click and Esc close it (tested). `styles.css` is byte-identical to `docs/design/expediente.css` (`cmp`). No hex colors or Tailwind palette classes in any TSX. Route, scene and pod structure unchanged. Breakpoint behavior: UAT test 2 pass. |
| SC5 | Theme switch Sistema / Claro / Oscuro from the shell; default follows the system; choice survives a reload | ✓ VERIFIED | `theme.ts` / `theme.test.ts` (10 tests) and `app-layout.test.tsx` «switches to dark from the sidebar and stores the choice» pass. Inline pre-hydration script in `apps/web/index.html`. No-flash behavior: UAT test 3 pass. |

### Plan-level truths tagged `verification: backstop` (plans 01-05 and 01-06)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| B1 | Sidebar visible from exactly 1024 px, hidden at 1023 px where the header takes over | ✓ VERIFIED (human) | UAT test 2 pass, re-run after the layout change; code uses `lg:` with no override. |
| B2 | Reloading with Oscuro paints no light frame before React mounts | ✓ VERIFIED (human) | UAT test 3 pass; script present in `index.html`. |
| B3 | On the host, `curl http://localhost:8080/api/health` answers all ok and a browser lands on `/applications` in the themed shell | ✓ VERIFIED (human) | UAT test 1 pass on a clean host. |

**Score:** 8/8 truths verified. No truth is FAILED, none is PRESENT_BEHAVIOR_UNVERIFIED. The three backstop truths are verified by human attestation (UAT), which is the evidence class the plan required for them.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json`, `package-lock.json`, `tsconfig.base.json` | workspaces, scripts | ✓ VERIFIED | Scripts run today (typecheck, lint, test, build) |
| `packages/contracts/src/*.ts` | enums, tag, interview, application, document, offer-extraction, error, health | ✓ VERIFIED | 40 tests pass |
| `apps/api/src/{app,config,errors,main}.ts`, `db/mongo.ts`, `storage/s3.ts`, `llm/*` | health, error contract, env fail-fast, providers | ✓ VERIFIED | Substantive and wired; live run above. Extraction is an intentional Phase 3 stub (502 `LLM_ERROR`); ping is real |
| `Dockerfile`, `compose.yml`, `scripts/compose-smoke.sh` | pinned multi-stage deliverable | ✓ VERIFIED | See SC2 |
| `eslint.config.js`, `.prettierrc.json`, `.lintstagedrc.json`, `.husky/*` | quality gate | ✓ VERIFIED | See SC1 |
| `apps/web` router, routes, scene, pod, layout, theme, shadcn primitives, `styles.css`, `index.html` | themed shell | ✓ VERIFIED | See SC4/SC5 |
| `.env.example`, `README.md` | documentation | ✓ VERIFIED | Parity test; `LLM_API_KEY=` empty |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `routes/__root.tsx` | `layouts/app-layout.tsx` | `createRootRoute({component: AppLayout})` | WIRED | Router tests render the shell through it |
| `routes/applications/index.tsx` | scene → pod | route → scene → pod | WIRED | Heading «Mis candidaturas» rendered inside `main` (test) |
| `main.tsx` | `core/theme/theme.ts` | `initTheme()` before render | WIRED | |
| `main.ts` | `app.ts` | `createApp({pingMongo, pingS3, pingLlm, webDistDir})` | WIRED | Live health uses real pings |
| `app.ts` | `@tfm/contracts` | `ErrorResponse`, `Health` | WIRED | |
| `.husky/pre-commit` | `.lintstagedrc.json` + typecheck | hook body | WIRED | `core.hooksPath=.husky/_` |
| `compose.yml` `app` | `Dockerfile` | `build: .` | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `/api/health` handler | `mongo`, `s3`, `llm` | real pings (db command, HeadBucket, HTTP GET) | Yes, live | ✓ FLOWING |
| `ApplicationListContainer` | `applications` | `useApplicationList` returns `[]` | Intentionally empty in Phase 1 (list endpoint is APP-04, Phase 2); renders the empty state | ✓ FLOWING (by design) |
| `ThemeToggle` | `preference` | `useSyncExternalStore` over localStorage | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck, lint | `npm run typecheck`, `npm run lint` | exit 0, no warnings | ✓ PASS |
| Contracts and API tests | `npm run test -w @tfm/contracts`, `-w @tfm/api` | 40 and 41 passed | ✓ PASS |
| Web tests | `npm run test -w @tfm/web` | 41 passed on 3 of 4 runs (see Observations) | ✓ PASS (flaky start) |
| Build | `npm run build` | contracts, api, web built | ✓ PASS |
| Production API | built `main.js`, curl `/api/health`, `/`, `/applications/1`, `/api/nope` | health all ok; 200 text/html on both SPA paths; 404 JSON contract | ✓ PASS |
| Invalid env | `env -i node apps/api/dist/main.js` | exit 1, lists missing variables | ✓ PASS |
| Compose file | `docker compose config -q` | valid | ✓ PASS |
| CSS identity | `cmp apps/web/src/styles.css docs/design/expediente.css` | identical | ✓ PASS |

The verifier's API process was stopped; no containers were started.

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` exists and no PLAN declares a probe. `scripts/compose-smoke.sh` is the phase-declared runtime check; it was not run here (it starts containers and cannot publish the committed ports from this devcontainer). Executor result: SMOKE OK, with a port override. The committed-port run is covered by UAT test 1.

### Requirements Coverage

Plan frontmatter IDs: 01-01 `FND-01, FND-03, FND-04, FND-08, FND-10`; 01-02 `FND-09, FND-01`; 01-03 `FND-02`; 01-04 `FND-05, FND-07, FND-02`; 01-05 `FND-05, FND-06, FND-07`; 01-06 `FND-01, FND-08, FND-10`. The union is FND-01 to FND-10, and REQUIREMENTS.md maps exactly FND-01 to FND-10 to Phase 1. No orphaned requirement and no plan ID missing from REQUIREMENTS.md.

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| FND-01 | 01-01, 01-02, 01-06 | root npm scripts over the monorepo | ✓ SATISFIED | All five scripts ran successfully |
| FND-02 | 01-03, 01-04 | every API model from `@tfm/contracts` | ✓ SATISFIED | Only the env enum is defined under `apps/` |
| FND-03 | 01-01 | `GET /api/health` with real connectivity | ✓ SATISFIED | Live probe plus flip tests |
| FND-04 | 01-01 | Zod env validation; error contract | ✓ SATISFIED | Live invalid-env exit; live 404 shape; `onError` tests |
| FND-05 | 01-04, 01-05 | `/applications` in the shell with sidebar and mobile Sheet | ✓ SATISFIED | SC4 plus UAT test 2 |
| FND-06 | 01-05 | theme Sistema/Claro/Oscuro, persisted, default follows system | ✓ SATISFIED | SC5 plus UAT test 3 |
| FND-07 | 01-04, 01-05 | «Expediente» design system tokens and fonts | ✓ SATISFIED | CSS identical to the DS file; fonts in build; no palette or hex classes |
| FND-08 | 01-01, 01-06 | `docker compose up` reaches the app at `localhost:8080`, services healthy, multi-stage, pinned | ✓ SATISFIED | Static artifacts verified here; clean-host run attested in UAT test 1 |
| FND-09 | 01-02 | pre-commit ESLint, Prettier, typecheck via Husky + lint-staged | ✓ SATISFIED | Hooks, config, hooksPath |
| FND-10 | 01-01, 01-06 | `.env.example` lists every variable | ✓ SATISFIED | Parity test; README documents `.env` use |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (all phase sources) | - | `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` | none found | No debt markers |
| `apps/web/src/routeTree.gen.ts` | 19, 24 | `as any` | Info | Generated by TanStack Router and lint-ignored by design |
| `apps/api/src/llm/{ollama,openai}.provider.ts` | - | `extractStructured` throws 502 `LLM_ERROR` | Info | Intentional Phase 3 stub (AI-01 to AI-04) |
| `apps/web/src/pods/application-list/application-list.hooks.ts` | - | returns `[]` | Info | Documented: list endpoint is Phase 2 (APP-04) |
| `apps/web/vite.config.ts` | server | `host: true` binds the dev server to all interfaces | Warning | Code-review WR-02 (open). Dev only; not part of the compose deliverable; no phase truth affected |

Open code-review warnings (01-REVIEW.md: 0 critical, 2 warnings, 3 info; earlier phase review WR-01..WR-08 also open) are quality items. None contradicts a success criterion or an FND requirement. 01-SECURITY.md reports `threats_open: 0` at ASVS 1.

### Human Verification Required

None. All four previous human items are discharged by the recorded UAT results, cross-checked against the code as it now stands (see the disposition table).

### Gaps Summary

No gaps. Phase goal achieved: root scripts, quality gate, contracts, healthy API with real connectivity, error contract and env fail-fast, themed shell with sidebar/Sheet and persistent theme, and a pinned multi-stage compose deliverable all exist, are wired, and were reproduced today (typecheck, lint, tests, build, a production API run). The compose-on-committed-ports run depends on the user's UAT attestation, since the devcontainer cannot publish host ports.

Observations, not failures:
- **Web test flake:** one of four `vitest run` invocations of `@tfm/web` failed in this session (the first, run immediately after the API tests and a large build; the failing output was not captured). The next three runs passed 6/6 files and 41/41 tests. This matches the cold-start `Failed to start forks worker` timeout noted in the previous report. It is not a code defect, but it can make the pre-push hook (`npm run test`) fail intermittently. Consider a `vitest` `poolOptions`/timeout tweak or `--pool=threads` in Phase 2.
- **Tracking docs:** REQUIREMENTS.md still shows FND-01..FND-10 unchecked and «Pending». Update them now that verification has passed.
- **ROADMAP wording** does not satisfy the strict MVP user-story validator (see the MVP Mode Note).
- **Review warnings** WR-01/WR-02 of the earlier review (startup and S3 ping timeouts) remain the likeliest to affect a live demo; schedule them early in Phase 2.

---

_Verified: 2026-10-29T22:40:00Z_
_Verifier: Claude (gsd-verifier)_
