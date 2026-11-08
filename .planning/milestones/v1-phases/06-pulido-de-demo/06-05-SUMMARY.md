---
phase: 06-pulido-de-demo
plan: 05
subsystem: api-hardening
tags: [hono, body-limit, zod, contracts, smoke, bash]
requires: []
provides:
  - 256 KiB JSON body cap on /api/applications (413 VALIDATION_ERROR)
  - bounded sourceUrl and document ids in @tfm/contracts
  - cleanup trap in the default compose smoke
affects: [apps/api, packages/contracts, scripts/compose-smoke.sh]
tech-stack:
  added: []
  patterns: ["per-router hono/body-limit", "EXIT trap with best-effort cleanup"]
key-files:
  created:
    - apps/api/src/applications/applications.limits.test.ts
  modified:
    - apps/api/src/applications/applications.routes.ts
    - packages/contracts/src/application.schema.ts
    - packages/contracts/src/application.schema.test.ts
    - scripts/compose-smoke.sh
    - .planning/phases/02-candidaturas/02-REVIEW-DISPOSITION.md
key-decisions:
  - "Body cap mounted on the applications router only, so the 5 MB upload route keeps its own limit; reuses VALIDATION_ERROR with status 413 (no new error code)"
  - "Salary bounds from the 02 WR-01 review text not applied: outside D-20 (strings and body limit)"
requirements-completed: [DEMO-05]
status: complete
commits: 3
plan_head_before: b5291beef861f609f52c6a08598f0d3b9d0ea042
plan_head_after: 4fccef6512c0b157befc64b69a7f0cec5f0b4280
actuals:
  tokens: 6000
  tasks: 2
  commits: 3
duration: 12 min
completed: 2026-11-06
coverage:
  - deliverable: "Oversized application bodies refused with 413 and the standard error"
    verification:
      - kind: test
        ref: "apps/api/src/applications/applications.limits.test.ts"
        status: pass
    human_judgment: false
  - deliverable: "Contracts bound sourceUrl (2048) and document ids (64)"
    verification:
      - kind: test
        ref: "packages/contracts/src/application.schema.test.ts"
        status: pass
    human_judgment: false
  - deliverable: "Failed smoke cleans up its records"
    verification:
      - kind: command
        ref: "bash scripts/compose-smoke.sh --down"
        status: pass
    human_judgment: true
    rationale: "The trap was exercised on the passing path only (ids already cleared); the failure path was reviewed, not forced"
---

# Phase 6 Plan 05: Body limit, contract bounds and smoke cleanup Summary

256 KiB `hono/body-limit` on `/api/applications` (413 `VALIDATION_ERROR` «Solicitud demasiado grande»), `.max()` bounds on `sourceUrl` and document ids in `@tfm/contracts`, and an EXIT cleanup trap in `scripts/compose-smoke.sh`. Closes Phase 2 WR-01 and WR-02.

## Accomplishments

- `applications.routes.ts`: `routes.use("*", bodyLimit({ maxSize: 256 * 1024, ... }))` after `requireJson`, throwing `ApiError(413, "VALIDATION_ERROR", "Solicitud demasiado grande")`. POST and PUT oversized bodies answer 413 and store nothing; a normal POST still answers 201. The offers router (own limit since Phase 3) and the documents upload (5 MB) are untouched.
- `application.schema.ts`: `sourceUrl` `.max(2048)`; `cvDocumentId` and `coverLetterDocumentId` `.max(64)` (still plain strings, so an unknown id still reaches the service). Tests check the 2048/2049 and 64/65 boundaries.
- `compose-smoke.sh`: `cleanup_smoke_records()` deletes `doc_app_id`, `app_id`, then `doc_id` (application before document, rule 4), each request `|| true`, function returns 0 so the original exit code survives; `trap cleanup_smoke_records EXIT` registered right after `app_id` is extracted; each section clears its variable after its own successful delete. `fail()` unchanged.
- `02-REVIEW-DISPOSITION.md`: WR-01 and WR-02 set to `fixed`, each with a `note`.

## Verification

- RED: new limit tests (2 of 3) and schema tests (2) failed before the change; commit `697a157`.
- `npm run test -w @tfm/contracts -- src/application.schema.test.ts`: 22 passed. `npm run test -w @tfm/api -- src/applications`: 9 files, 148 passed.
- `npm run typecheck && npm run test`: all green (contracts 59, api 410, web 615 tests). `npm run lint`: clean.
- `bash scripts/compose-smoke.sh --down`: last line `SMOKE OK`, exit 0 (image rebuilt from this worktree, so the new limit was in the stack).
- Acceptance greps (bodyLimit, message, `max(2048)`, `max(64)` x2, trap line, WR-01/WR-02 `fixed`) pass; `apps/api/src/offers/extract.routes.ts` not modified.

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies

No dependency added (`hono/body-limit` ships with `hono`).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- Created/modified files exist; commits `697a157`, `5c7f1bf`, `4fccef6` are ancestors of HEAD.
