---
phase: 06-pulido-de-demo
plan: 04
subsystem: api
tags: [startup, retry, s3, abort-signal, spa-fallback, hono]
requires: []
provides:
  - "retryStartup(step, options) bounded start-up retry"
  - "pingS3 and ensureBucket with AbortSignal deadlines"
  - "extension-aware SPA fallback and loud missing index.html"
affects: [apps/api, docker-compose demo start]
tech-stack:
  added: []
  patterns: ["injectable sleep/log for time-dependent helpers", "AbortSignal.timeout on AWS SDK v3 send()"]
key-files:
  created:
    - apps/api/src/startup.ts
    - apps/api/src/startup.test.ts
  modified:
    - apps/api/src/main.ts
    - apps/api/src/storage/s3.ts
    - apps/api/src/storage/storage.test.ts
    - apps/api/src/app.ts
    - apps/api/src/app.test.ts
    - .planning/phases/01-fundaciones-y-walking-skeleton/01-REVIEW-DISPOSITION.md
key-decisions:
  - "Retry loop lives in startup.ts with injectable sleep and log; main.ts only wires it (10 attempts, 2000 ms apart)"
  - "S3 deadlines are defaulted parameters (pingS3 2000 ms, ensureBucket 5000 ms) so callers did not change and tests use 300 ms"
  - "A path whose last segment has a file extension never gets the SPA shell"
requirements-completed: [DEMO-05]
status: complete
commits: 4
plan_head_before: b5291beef861f609f52c6a08598f0d3b9d0ea042
plan_head_after: 4d4de45
actuals:
  tokens: 12000
  tasks: 2
  commits: 4
duration: 15 min
completed: 2026-11-06
---

# Phase 6 Plan 04: Startup retry, S3 deadlines and honest SPA fallback Summary

The API now survives a cold or slow Mongo/Silo at start (10 retries, 2 s apart, then exit 1), every S3 check has an abort deadline, and a missing built file answers 404 JSON instead of `200 text/html`.

## Accomplishments

- **Startup retry (D-16, WR-01a).** `retryStartup` in `apps/api/src/startup.ts`: 10 attempts, 2000 ms between them, logging only `Startup attempt n/10 failed: <err.message>` (non-Error rejections log `unknown error`; stack, cause and `MONGO_URL` are never logged). `main.ts` wraps `connectMongo` + `ensureBucket`; if the bucket check fails the freshly opened Mongo client is closed before the next attempt. After the last failure it logs `API startup failed after 10 attempts` and exits 1.
- **S3 deadlines (D-16, WR-02a).** `pingS3(s3, bucket, timeoutMs = 2000)` and `ensureBucket(s3, bucket, timeoutMs = 5000)` pass `abortSignal: AbortSignal.timeout(ms)`; in `ensureBucket` one signal bounds both HeadBucket and CreateBucket. Against a local TCP server that accepts and never answers, `pingS3(..., 300)` resolves `false` and `ensureBucket(..., 300)` rejects, both under 1 s.
- **SPA fallback (D-18, WR-08).** `app.notFound` serves `index.html` only when the path's last segment has no extension (`/\.[A-Za-z0-9]+$/`); `/assets/missing-abc123.js` and `/favicon.ico` answer 404 `NOT_FOUND`. `createApp` logs one `console.warn` ("index.html not found in <dir>; SPA fallback disabled") when `webDistDir` has no index; `main.ts` exits 1 in production in that case.
- **Dispositions.** `01-REVIEW-DISPOSITION.md`: new rows WR-01a and WR-02a (fixed, source note "first review (commit b578856); id reused by the second review; fixed in 06-04"), WR-08 set to `fixed`. Counters now `open: 14`, `total: 17`.

## TDD record

- **RED (task 1):** `startup.test.ts` (4 tests) and `S3 deadlines` in `storage.test.ts` (2 tests) failed on the planned assertions (retry count/log lines; 5 s test timeout instead of a 300 ms deadline) with inert stubs in place; 6 failed, the 2 Silo contract tests stayed green. Semantic assessment: targets executed and failed for the intended reason, not load or syntax faults. The pre-commit hook runs `typecheck`, so the RED commit carries inert stubs (unused `timeoutMs` parameters, no-retry `retryStartup`). `gsd_run check tdd-red-evidence` was not run (resolver unavailable in the worktree shell); the assessment above is manual.
- **RED (task 2):** 3 of the 5 new tests failed (missing asset, favicon, missing index); the extensionless-route and no-warn tests were regression guards and passed.
- **GREEN:** `c8601d4` and `4d4de45`. No REFACTOR commits.

## Task Commits

| Commit | Type | Description |
|--------|------|-------------|
| da6bd85 | test | failing tests for startup retry and S3 deadlines |
| c8601d4 | feat | retry API startup and bound S3 checks with deadlines |
| 8b9e94e | test | failing tests for extension-aware SPA fallback |
| 4d4de45 | feat | extension-aware SPA fallback and loud missing index.html |

## Verification

- `npm run typecheck && npm run test && npm run lint` exit 0 (contracts 57, api 418, web 615 tests).
- Acceptance: `AbortSignal.timeout` count in `s3.ts` = 2; `retryStartup(` present in `main.ts`; `MONGO_URL` count in `main.ts` = 1 (baseline 1); `id: WR-01a`, `id: WR-02a` present; WR-08 `disposition: fixed`; `describe("static hosting with SPA fallback")` gained 5 tests (needed 3).

## Deviations from Plan

**1. [Rule 3 - Blocking] Silo `beforeAll`/`afterAll` moved inside the existing describe**
- **Found during:** Task 1
- **Issue:** The file-level hooks in `storage.test.ts` would have made the new, Silo-independent `S3 deadlines` tests depend on a reachable Silo.
- **Fix:** Moved the hooks (and `testStorage`) into the `DocumentStorage against Silo` describe; behaviour of those tests is unchanged.
- **Files modified:** `apps/api/src/storage/storage.test.ts`
- **Commit:** da6bd85

**2. [Rule 1 - Test comment] Updated stale comment in the traversal test**
- The comment said the SPA fallback "may answer 200 text/html (WR-08)"; it no longer does for extension paths, so it now says only the marker matters. `apps/api/src/app.test.ts`, commit 8b9e94e.

**Total deviations:** 2 (1 blocking, 1 comment). **Impact:** none on scope.

## Decisions / notes

- Paths with a dot in the last segment (for example `/applications/john.doe`) now 404 instead of getting the shell. The app has no such client routes; this is the accepted trade-off of the extension rule.
- No dependency was added; no package installed (`npm ci` only, lockfile untouched).

## Known Stubs

None.

## Threat Flags

None. T-06-10 to T-06-12 mitigated as planned; T-06-13 untouched (`serveStatic` unchanged).

## Self-Check: PASSED

- Files exist: `apps/api/src/startup.ts`, `apps/api/src/startup.test.ts`.
- Commits da6bd85, c8601d4, 8b9e94e, 4d4de45 are ancestors of HEAD.
