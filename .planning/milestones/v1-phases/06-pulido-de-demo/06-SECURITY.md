---
phase: "06"
slug: "pulido-de-demo"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-07"
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| seed script → Mongo / Silo | A CLI with full write access to the configured database and bucket | demo records, PDF assets |
| CLI arguments → destructive path | A flag decides between replacing seed records and wiping the database and bucket | `--reset` |
| seed → user records | Normal runs must not alter what the user created | user applications / documents |
| committed assets → upload pipeline | Repository files enter the same file checks as user uploads | PDF bytes |
| Mongo documents / seeded data → API JSON | Storage-only fields must stay out of the public JSON | `seed`, internals |
| API process → Mongo / Silo at start | Dependencies that can be slow or absent on a clean machine | connection errors |
| client → `/api/applications` | Untrusted JSON bodies | request bodies |
| static root → browser | Built files served next to the SPA fallback | static files |
| thrown error / API error body → rendered screen | Internal error text must not reach the page | error messages |
| user action → destructive or in-flight request | A delete confirmation and a closing dialog must reflect the current attempt | delete / upload / save |
| npm registry → repo | `axe-core` devDependency enters the lockfile | third-party code (test only) |
| test runner → developer and CI signal | `run-vitest.mjs` sits between Vitest's verdict and the exit code | exit codes |
| smoke script → Docker volumes | The script can create, write to and delete volumes | demo data |
| README / screenshot → public repository | Commands copied verbatim; an image of the app is committed | docs, PNG |
| late fixes / test evidence → planning record | Validation files claim coverage that reviewers and the verifier trust | evidence rows |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-06-01 | Tampering | `runSeed` cleanup | high | mitigate | Deletes only `{ seed: true }` records and the S3 keys of those documents; integration test proves a pre-existing user application and document survive two runs — evidence: `seed.run.ts` filters `{ seed: true }`; `seed.run.test.ts` keeps user records across two runs | closed |
| T-06-02 | Information disclosure | seed logging | medium | mitigate | `seed.ts` logs counts and `db.databaseName` / bucket only; `Seed fallido:` prints `err.message`, never the Mongo URL, offer text, file names or keys — evidence: `seed.ts` prints `Seed fallido:` + `err.message` only | closed |
| T-06-03 | Tampering | demo PDF assets | low | mitigate | Uploaded through `documents.service.upload`, which runs `sanitizeFileName` and `detectDocument`; the integration test opens the uploaded bytes — evidence: `seed.run.ts` uploads through the documents service; `seed.run.test.ts` | closed |
| T-06-04 | Information disclosure | `seed` field | low | mitigate | Field written only through untyped `db.collection(...)`; mappers whitelist fields; test asserts no `seed` key in list responses — evidence: `applications.mapper.test.ts` / `documents.mapper.test.ts` assert no `seed` key | closed |
| T-06-05 | Tampering | `--reset` against the wrong environment | high | mitigate | Flag-only (never a default); prints database, bucket and counts before deleting; tests pinned to `tfm_test` / `tfm-assets-test`; verifies never pass `--reset` to the devcontainer database — evidence: `--reset` parsed only as a flag in `seed.run.ts`; tests on `tfm_test` | closed |
| T-06-06 | Tampering | mistyped option | medium | mitigate | `parseSeedArgs` rejects every unknown argument with exit 2 before any connection — evidence: `parseSeedArgs` in `seed.run.ts` + tests | closed |
| T-06-07 | Tampering | seed document linked by a user application | medium | mitigate | Normal run keeps and unmarks it (rule 4); test proves the link still resolves — evidence: `seed.run.ts` unmarks linked seed documents; `seed.run.test.ts` | closed |
| T-06-30 | Tampering | demo PDF assets (full set) | low | mitigate | All three go through `documents.service.upload` (`sanitizeFileName`, `detectDocument`); test asserts each committed asset is accepted — evidence: `seed.run.test.ts` accepts every committed asset | closed |
| T-06-08 | Information disclosure | offer fixtures in `docs/` | low | accept | Anonymised invented offers, already public in the repo; excluded from `dist` and from the Docker context — evidence: accepted (see log) | closed |
| T-06-10 | Denial of service | API start and `pingS3` | medium | mitigate | `retryStartup` (10 × 2 s, then exit 1) and `AbortSignal.timeout` on every S3 check — evidence: `startup.ts` `retryStartup`, used by `main.ts`; `startup.test.ts`; S3 checks with `AbortSignal.timeout` | closed |
| T-06-11 | Information disclosure | startup logs | medium | mitigate | Logs `err.message` and the attempt number only; `MONGO_URL` never logged — evidence: `startup.ts` logs attempt + `err.message` only | closed |
| T-06-12 | Tampering | SPA fallback hiding a broken build | low | mitigate | Extension-aware fallback answers 404 JSON for missing files; missing `index.html` warns and fails production start — evidence: `app.ts` extension-aware fallback; `app.test.ts` | closed |
| T-06-13 | Tampering | static root path traversal | medium | accept | Already covered by the Phase 1 tests (`static root is fixed`); this plan does not change `serveStatic` — evidence: accepted (see log) | closed |
| T-06-09 | Denial of service | `/api/applications` body | high | mitigate | `bodyLimit` 256 KiB on the router (413 `VALIDATION_ERROR`) plus `.max()` on `sourceUrl` and document ids in contracts — evidence: `bodyLimit` in `applications.routes.ts`; contracts `sourceUrl .max(2048)`, document ids `.max(64)` | closed |
| T-06-24 | Tampering | smoke records left in demo volumes | medium | mitigate | `trap cleanup_smoke_records EXIT` deletes created records on any failure (02 WR-02) — evidence: `scripts/compose-smoke.sh` `trap cleanup_smoke_records EXIT` | closed |
| T-06-31 | Tampering | skip link target | low | accept | Hard-coded in-page target `#main-content`; no user input in the href — evidence: accepted (see log) | closed |
| T-06-32 | Tampering | design tokens in shell components | low | accept | Presentation only; regressions caught by the class assertions and by the 06-12 axe and contrast tests — evidence: accepted (see log) | closed |
| T-06-16 | Tampering | design tokens in shared components | low | accept | Presentation only; regressions caught by the class assertions and by 06-12 axe and contrast tests — evidence: accepted (see log) | closed |
| T-06-33 | Tampering | design tokens in pod components | low | accept | Presentation only; regressions caught by the sweep greps and by 06-12 axe and contrast tests — evidence: accepted (see log) | closed |
| T-06-17 | Tampering | upload / round dialogs during a request | low | mitigate | Lock unchanged (only «Cancelar subida» aborts an upload); the X is `aria-disabled` and every close attempt is explained — evidence: `closeDisabled` in `ui/dialog.tsx`, `upload-dialog.tsx`, `interview-dialog.tsx` | closed |
| T-06-18 | Repudiation | stale delete error | low | mitigate | `resetDeleteError` on open; regression tests for the three delete dialogs — evidence: `resetDeleteError` in `application-detail.hooks.ts` / container | closed |
| T-06-14 | Information disclosure | `RouteError` | medium | mitigate | Fixed Spanish copy only; `error` goes to `console.error`; test asserts the thrown message is absent from the DOM — evidence: `route-error.tsx` fixed copy + `console.error`; `route-error.test.tsx` | closed |
| T-06-15 | Tampering | «Volver a Mis candidaturas» anchor | low | accept | Hard-coded same-origin path `/applications`; no user input in the href — evidence: accepted (see log) | closed |
| T-06-34 | Information disclosure | view error states | low | mitigate | `view-states.test.tsx` puts a server message in every 500 body and asserts it never reaches `document.body` — evidence: `apps/web/src/test/view-states.test.tsx` | closed |
| T-06-19 | Elevation of privilege | test dependency in the runtime image | low | mitigate | `devDependencies` only; the Dockerfile prod stage runs `npm ci --omit=dev --workspace=@tfm/api`, so it never ships — evidence: `Dockerfile` prod stage `npm ci --omit=dev` | closed |
| T-06-20 | Repudiation | `run-vitest.mjs` masking failures | medium | mitigate | Retries at most once, only when no «Test Files» summary exists and the worker-start message is present; prints the reason; verify proves a no-files failure is not retried — evidence: `apps/web/scripts/run-vitest.mjs` single conditional retry | closed |
| T-06-21 | Information disclosure | API mapper leaking storage fields | low | mitigate | Whitelist tests with extra fields (`seed`, `_internal`) asserted absent — evidence: mapper tests with `seed` / `_internal` extras | closed |
| T-06-22 | Repudiation | validation rows marked green without evidence | medium | mitigate | Closure rule: a row turns ✅ only after its named command ran green in this plan; a row without a test gets one first; the frontmatter flips only when every row is ✅ and the audit reads Escalated 0, otherwise the task fails its acceptance criteria — evidence: `06-VALIDATION.md` «Map evidence» rows C1-C147; `MAP EVIDENCE OK` | closed |
| T-06-23 | Tampering | `down -v` in cold mode | high | mitigate | Project name forced to `expediente-cold` and checked before any command; the verify asserts the default `expediente_ollama-data` volume still exists — evidence: `compose-smoke.sh` forces and checks `expediente-cold` | closed |
| T-06-25 | Information disclosure | cold project ports | low | mitigate | `ports: !reset []` on `app` and `s3`: the cold stack publishes nothing; checks run through `docker compose exec` — evidence: `scripts/compose.cold.yml` `ports: !reset []` | closed |
| T-06-26 | Information disclosure | README secrets | medium | mitigate | Only the dev-only `minioadmin` defaults appear, flagged as local-only; `LLM_API_KEY` goes in `.env`, which stays ignored — evidence: README: only `minioadmin` local defaults; `.env` ignored (`git check-ignore`) | closed |
| T-06-27 | Denial of service | `OLLAMA_KEEP_ALIVE` memory | low | accept | Chosen by the user (D-26); 30 minutes, local machine, reversible one-line change — evidence: accepted (see log) | closed |
| T-06-28 | Tampering | default project data | medium | mitigate | The executor runs only the normal seed (replaces `seed: true` records); `--reset` is left to the presenter — evidence: 06-17 SUMMARY: only the normal seed ran; `--reset` never run | closed |
| T-06-29 | Information disclosure | committed screenshot | low | mitigate | Captured from the seeded list only (invented companies and people, `.example` domains), no dialog or devtools — evidence: `docs/img/application-list.png` captured from the seeded list, no dialog/devtools | closed |
| T-06-35 | Repudiation | fixes made after the gate ran | medium | mitigate | Any change under `apps/` in Task 3 re-runs the full suite and the clean checkout, carries a guard test, and gets a `Re-check` test with `result: [pending]` in 06-UAT.md; the UAT gate rejects `status: complete` until the presenter's re-check is recorded — evidence: 06-17 Task 3 re-ran all 48 map commands twice (C49-C144) + guard tests | closed |
| T-06-36 | Repudiation | `06-VALIDATION.md` map rows set ✅ green without a run | medium | mitigate | Map closure rule: every row command runs in this plan and is recorded as `Cnn <exit status> <command>` in «## Map evidence (06-17)»; the map evidence gate re-derives each row's commands from the PLAN files and DEMO cells and fails on a missing line, a non-zero last line or wrong refs — evidence: `06-VALIDATION.md` evidence rows; `MAP EVIDENCE OK` | closed |
| T-06-37 | Repudiation | a timed demo run of 120 s or more recorded as a pass | medium | mitigate | The UAT gate fails on any `seconds:` value of 120 or more whatever the `status`; the planner tested it on fixtures (125 under `testing`, `issues` and `complete` fail, 120 fails, 119 passes); the recorded number is never edited — evidence: UAT gate fails on `seconds:` ≥ 120; recorded 13 s and 48 s; `UAT GATE OK` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08 | T-06-08 | Anonymised invented offers, already public in the repo; excluded from `dist` and from the Docker context | plan (06 threat model) | 2026-11-06 |
| AR-13 | T-06-13 | Already covered by the Phase 1 tests (`static root is fixed`); this plan does not change `serveStatic` | plan (06 threat model) | 2026-11-06 |
| AR-31 | T-06-31 | Hard-coded in-page target `#main-content`; no user input in the href | plan (06 threat model) | 2026-11-06 |
| AR-32 | T-06-32 | Presentation only; regressions caught by the class assertions and by the 06-12 axe and contrast tests | plan (06 threat model) | 2026-11-06 |
| AR-16 | T-06-16 | Presentation only; regressions caught by the class assertions and by 06-12 axe and contrast tests | plan (06 threat model) | 2026-11-06 |
| AR-33 | T-06-33 | Presentation only; regressions caught by the sweep greps and by 06-12 axe and contrast tests | plan (06 threat model) | 2026-11-06 |
| AR-15 | T-06-15 | Hard-coded same-origin path `/applications`; no user input in the href | plan (06 threat model) | 2026-11-06 |
| AR-27 | T-06-27 | Chosen by the user (D-26); 30 minutes, local machine, reversible one-line change | plan (06 threat model) | 2026-11-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-07 | 37 | 37 | 0 | `/gsd-secure-phase 06` (orchestrator, ASVS 1 grep-depth; auditor skipped by the short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-07
