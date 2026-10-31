---
phase: 02-candidaturas
plan: 01
subsystem: api, web
tags: [hono, mongodb, vitest, react, tracer]
requires:
  - phase: 01-fundaciones
    provides: contracts schemas, createApp with onError/notFound, http-client, application-list pod stub
provides:
  - POST and GET /api/applications on real Mongo (repository, service, mapper, routes)
  - requireJson content-type guard for write methods
  - AppDeps.db and AppDeps.now injection seam
  - tfm_test integration-test helper (useTestDb) with sequential API test files
  - web mockFetch helper and keyed-result useApplicationList hook
affects: [02-02, 02-03, 02-04, 02-05, 02-09, 02-10, 02-12]
tech-stack:
  added: []
  patterns:
    - repository -> service (injectable clock) -> mapper -> Hono sub-app
    - keyed-result data hook (no setState in effect body)
key-files:
  created:
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.mapper.ts
    - apps/api/src/applications/applications.routes.ts
    - apps/api/src/applications/applications.create-list.test.ts
    - apps/api/src/http/require-json.ts
    - apps/api/src/test/mongo.ts
    - apps/web/src/test/mock-fetch.ts
  modified:
    - apps/api/vitest.config.ts
    - apps/api/src/db/mongo.ts
    - apps/api/src/app.ts
    - apps/api/src/main.ts
    - apps/web/src/test/setup.ts
    - apps/web/src/pods/application-list/application-list.hooks.ts
    - apps/web/src/pods/application-list/application-list.container.tsx
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
    - apps/web/src/core/router/router.test.tsx
key-decisions:
  - "D-11: API tests use the database literally named tfm_test, cleaned before each test; fileParallelism: false in apps/api/vitest.config.ts avoids races between files"
  - "AppDeps gains optional db and now; /api/applications is mounted only when db is set and always before serveStatic"
  - "ApplicationDoc.tags stores the contract Tag shape; plan 02-03 adds the normalized key"
requirements-completed: [APP-01, APP-05, APP-11, APP-13]
requirements-partial:
  - "APP-13: createdAt equals updatedAt on create only; PATCH status (02-09) and PUT (02-12) bump updatedAt later in this phase, and the interview-changes clause is owned by Phase 4 (INT-01, INT-03, INT-04)"
duration: 25 min
completed: 2026-10-31
status: complete
commits: 1
plan_head_before: ec4d6f1d0606917ba46f2cdf95d90aedd49b0ec0
plan_head_after: 5f6caeaec6d3047db21b5b5f51cec8882f7c6726
actuals:
  tokens: 14000
  tasks: 1
  commits: 1
---

# Phase 2 Plan 01: Tracer, applications created through the API are listed from Mongo Summary

**POST/GET /api/applications through repository, service, mapper and Hono sub-app on real Mongo (database tfm_test in tests), and /applications rendering that list through the course pod with an abortable keyed-result hook.**

## Accomplishments

- API create: title and company only answers 201 with a contract-valid Application (24-hex id, no _id, status guardada, one statusHistory entry, createdAt equal to updatedAt, ISO UTC dates). The document is built field by field, so forged id, createdAt, statusHistory, interviews and ownerId are ignored.
- APP-11 rules: status enviada without appliedAt stores the creation instant, an explicit appliedAt is kept, any other status stores null.
- API list: GET returns every application ordered by updatedAt desc then _id desc, and still answers JSON when the production static hosting is active (route mounted before serveStatic).
- Validation: invalid body, malformed JSON and non-JSON content-type answer 400 VALIDATION_ERROR and store nothing.
- Web: `useApplicationList` fetches with AbortController, maps on receipt, derives loading/refreshing, and retries with one new GET per click; the list renders in API order.
- Test infrastructure: `useTestDb` (tfm_test only), web `mockFetch`/`installDefaultFetch` wired into the global setup.

## Task Commits

1. Task 1 (tracer): `5f6caea` feat(02-01): tracer, create and list applications through the API and /applications

## Verification

- `npm run typecheck`, `npm run test` (contracts 40, api 55, web 43) and `npm run lint` pass. The pre-commit hook ran the same checks.
- All task acceptance criteria greps pass.
- Tracer verified end to end; expansion plans may proceed.

## Decisions Made

- No dependency added; the lockfile is unchanged.
- D-11 literal choice: `tfm_test` plus `fileParallelism: false` (reversible by changing the helper name).
- `AppDeps.db` and `AppDeps.now` are the seam later plans build on.
- Repository inserts through a second collection handle typed as `NewApplicationDoc` so the driver generates `_id` without a type escape.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

The list component states («Cargando candidaturas…», the short error line) are intentionally minimal; plan 02-02 replaces them with the real loading, error, empty and populated states.

## Self-Check: PASSED

- Created files exist on disk; commit `5f6caea` is an ancestor of HEAD.
