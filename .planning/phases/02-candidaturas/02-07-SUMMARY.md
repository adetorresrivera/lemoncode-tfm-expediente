---
phase: 02-candidaturas
plan: 07
subsystem: api
tags: [hono, mongodb, objectid, vitest, zod]

requires:
  - phase: 02-candidaturas
    provides: "ApplicationsRepository/Service/routes, mapApplicationDocToApi, useTestDb, ApiError (plans 02-01, 02-03, 02-04)"
provides:
  - "GET /api/applications/:id returning the Application or a clean 404 JSON"
  - "parseObjectId: strict 24-hex id parser (404, never 500)"
  - "repository findById and service get, reused by plans 02-09 and 02-12"
affects: [02-08, 02-09, 02-12]

actuals:
  tokens: 2300
  tasks: 1
  commits: 1
plan_head_before: 41463dbc3d39a4a36f5cb2bac30088875971d97f
plan_head_after: d3c25ea

tech-stack:
  added: []
  patterns:
    - "Path ids go through parseObjectId before any service call; invalid and unknown ids share one 404 branch"

key-files:
  created:
    - apps/api/src/http/object-id.ts
    - apps/api/src/applications/applications.item.test.ts
  modified:
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.routes.ts

key-decisions:
  - "Malformed id answers 404 NOT_FOUND (not 400): it cannot identify anything and a single branch avoids an oracle (RESEARCH Q4f)"
  - "No dependency added; lockfile unchanged"

patterns-established:
  - "parseObjectId(c.req.param('id')) in the route, ApiError reaches the parent onError (no try/catch)"

requirements-completed: [APP-09]
requirements-partial:
  - "APP-09: read endpoint only; the detail UI is plan 02-08 and linked documents are owned by Phase 5 (DOC-03, DOC-04)"

coverage:
  - id: D1
    description: "GET /api/applications/:id answers 200 with the Application (no _id, no tag keys, same shape as list items)"
    requirement: APP-09
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.item.test.ts#answers 200 with the application, without _id or tag keys"
        status: pass
      - kind: integration
        ref: "apps/api/src/applications/applications.item.test.ts#has the same shape as the matching item of the list"
        status: pass
    human_judgment: false
  - id: D2
    description: "Unknown and malformed ids (abc, 23/25 chars, non-hex, 12 raw bytes) answer 404 NOT_FOUND JSON, never 500; upper-case hex addresses the same application"
    requirement: APP-09
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.item.test.ts#answers 404 JSON, never 500, for a malformed id"
        status: pass
      - kind: unit
        ref: "apps/api/src/applications/applications.item.test.ts#parseObjectId"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 07: Serve one application by id Summary

**GET /api/applications/:id backed by a strict 24-hex `parseObjectId` guard (T-02-16): returns the mapped Application, and unknown or malformed ids answer a clean 404 JSON, tested on real Mongo.**

## Performance

- **Duration:** 8 min
- **Tasks:** 1
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `parseObjectId` checks `/^[0-9a-f]{24}$/i` before constructing the ObjectId; anything else throws `ApiError(404, "NOT_FOUND", "Candidatura no encontrada")`.
- `findById` in the repository, `get` in the service (404 when null, mapped through `mapApplicationDocToApi`), and `GET /:id` in the routes with no try/catch.
- 16 integration/unit tests in `applications.item.test.ts` (real Mongo, `tfm_test`).
- No dependency added; `package-lock.json` unchanged. Malformed id is 404, not 400, by design.
- APP-09 is partial: this is the read endpoint only (detail UI in 02-08, linked documents in Phase 5).

## Task Commits

1. **Task 1: Serve one application by id with strict id handling** - `d3c25ea` (feat; RED and GREEN combined, see below)

## Files Created/Modified
- `apps/api/src/http/object-id.ts` - strict id parser
- `apps/api/src/applications/applications.repository.ts` - `findById`
- `apps/api/src/applications/applications.service.ts` - `get`
- `apps/api/src/applications/applications.routes.ts` - `GET /:id`
- `apps/api/src/applications/applications.item.test.ts` - item endpoint tests

## Decisions Made
- Malformed ids answer 404 NOT_FOUND with the same message as unknown ids (single branch, no oracle).

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

The pre-commit hook runs the full suite, so a failing RED-only commit is impossible; RED was run locally and committed together with GREEN (as in earlier plans). RED evidence: with the test file written and `parseObjectId` stubbed as the naive unchecked `new ObjectId(raw)` (and no route), `vitest run src/applications/applications.item.test.ts` reported 15 failed / 1 passed. The failing assertions were the planned ones: `expected 'Recurso no encontrado' to be 'Candidatura no encontrada'` on the 404 cases, status 200 expectations on the item route, and non-ApiError throws from `parseObjectId`. semanticAssessment: the target tests executed and failed on the planned assertions for the intended reason (not import, syntax or fixture faults). GREEN: the same file passes (16/16). No separate `test(02-07)` commit exists; this is the documented hook-driven deviation, not a skipped RED.

## Issues Encountered

None.

## Verification

- `npm run test -w @tfm/api -- src/applications`: 3 files, 58 tests pass, lists `applications.item.test.ts`.
- `npm run typecheck && npm run test && npm run lint`: pass (contracts 55, api 105, web 126).
- Acceptance greps (parseObjectId export and regex, route usage, `findById`): all pass.

## Known Stubs

None.

## Threat Flags

None. T-02-16 mitigated as planned; T-02-SC: no install.

## Next Phase Readiness

`parseObjectId`, `findById` and `get` are ready for the detail (02-08), status change/delete (02-09) and edit form (02-12).

## Self-Check: PASSED

- FOUND: apps/api/src/http/object-id.ts, apps/api/src/applications/applications.item.test.ts
- FOUND commit d3c25ea (ancestor of HEAD)

---
*Phase: 02-candidaturas*
*Completed: 2026-10-31*
