---
phase: 02-candidaturas
plan: 04
subsystem: api, contracts
tags: [mongo, filters, sort, regex, query-validation, hono]
requires:
  - phase: 02-candidaturas
    provides: applications repository/service/routes, stored tags.key, tagKey (plans 02-01 to 02-03)
provides:
  - GET /api/applications filters status (multi), stack tags (AND), workMode, seniority and q, sorted by updatedAt or appliedAt, no pagination
  - applicationQuerySchema hardened (q <= 100, tags items 1..40 trimmed, arrays <= 20)
  - escapeRegex, buildApplicationsFilter, buildApplicationsSort (pure builders)
  - queryInput (Hono queries() to Zod input adapter)
affects: [02-05, 02-07, 02-09, 02-12]
tech-stack:
  added: []
  patterns:
    - filter built field by field from the parsed query, never spread
    - conditions $in/$all added only for non-empty arrays
    - sort keys always end in _id for a deterministic order
key-files:
  created:
    - apps/api/src/http/query-input.ts
    - apps/api/src/applications/applications.query.ts
    - apps/api/src/applications/applications.query.test.ts
  modified:
    - packages/contracts/src/application.schema.ts
    - packages/contracts/src/application.schema.test.ts
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.routes.ts
    - apps/api/src/applications/applications.mapper.ts
key-decisions:
  - "q uses an escaped case-insensitive regex on title and company; the text index stays unused (D-03)"
  - "Tag filter compares tags.key (tagKey of the filter label) with group stack inside $elemMatch, AND via $all (D-04)"
  - "Unknown query keys are stripped by the non-strict Zod object; invalid values answer 400 VALIDATION_ERROR"
requirements-completed: [APP-06, APP-08]
duration: 20 min
completed: 2026-10-31
status: complete
commits: 1
plan_head_before: b6a645538e7ec44d802dca64ae9f87c651dac749
plan_head_after: bf420efc468e409a694e40083fba5b9508d13bfc
actuals:
  tokens: 14000
  tasks: 1
  commits: 1
---

# Phase 2 Plan 04: API filters and sort on real Mongo Summary

**`GET /api/applications` now filters by escaped-regex text, status (`$in`), stack tags (AND on the stored normalized key) work mode and seniority, and sorts by `updatedAt` or `appliedAt` with nulls last and a deterministic `_id` tiebreaker; hostile or oversized queries answer 400.**

## Accomplishments

- Contracts: `multi` takes a `max` (default 20) applied to the array; `tags` items are `trim().min(1).max(40)`; `q` is `trim().min(1).max(100)`. Boundary tests added (100/101 characters, 40/41-character tag, whitespace-only tag, 20/21 tags and statuses, unknown keys stripped).
- `queryInput` unwraps single values and keeps repeated keys as arrays; the route does `applicationQuerySchema.parse(queryInput(c.req.queries()))`.
- `applications.query.ts` is pure: `escapeRegex`, `buildApplicationsFilter` (field by field, no spread; `$in`/`$all` only for non-empty arrays) and `buildApplicationsSort` (`{updatedAt:-1,_id:-1}` or `{appliedAt:-1,updatedAt:-1,_id:-1}`).
- Repository `list(query)` = `find(filter).sort(sort).toArray()` with no limit or skip (D-10); service `list(query)` maps the result.
- Real-Mongo tests (`tfm_test`, 28 tests): tag filter `react` matches `React` and not `React Native` or a `nice_to_have` React; AND of tags; `éxito`/`ñandú` match `Éxito`/`Ñandú`; `q` as substring across title and company, Unicode case-insensitive (`ÉPSILON` matches `Épsilon`), `c++`, `(test)` literal, `.*` matches nothing, `(a+)+$` answers 200 promptly; statuses, workMode, seniority and combinations; filtering never reorders; default and `appliedAt` order with null and missing last; tie-break on `_id`; read-only idempotency; 400 for `status=foo`, 101-character `q`, 21 tags, 41-character tag; `status[$ne]` and `__proto__` ignored with 200 and every application.

## Task Commits

1. Task 1: `bf420ef` feat(02-04): filter and sort applications on the API with hardened query parsing

## Verification

- `npm run typecheck`, `npm run lint` and `npm run test` pass (contracts 55, api 89, web 83). The pre-commit hook ran the same checks on the commit.
- All acceptance-criteria greps pass (`max(100)`, `export function escapeRegex` plus `tagKey(`, `c.req.queries()`, `export function queryInput`); `npm run test -w @tfm/api -- src/applications` lists `applications.query.test.ts`.
- No dependency added; `package-lock.json` unchanged. Tightened query bounds: q <= 100, tags items 1..40 (trimmed), status and tags arrays <= 20.

## TDD Gate Compliance

`tdd="true"`, but the pre-commit hook runs the whole suite, so a failing RED-only commit is impossible without bypassing hooks. RED was run locally and committed together with GREEN as a single `feat(02-04)` commit (no separate `test(02-04)` commit):

- Contracts RED: the new boundary tests failed on the planned assertions (q of 101, 41-character tag, 21 tags/statuses accepted) before the schema change; 20/20 pass after.
- API RED: against stub builders (`escapeRegex` identity, empty filter, no `_id` in sort, `queryInput` identity) the target file ran 28 tests with 18 failing on the planned assertions (filter results, sort order, 400 codes) and 10 passing for reasons of behaviour that already existed. semanticAssessment: the failures were assertion failures on the planned behaviour, not load, import or fixture faults. After the real implementation 28/28 pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mapper crashed on a document without the `appliedAt` field**
- **Found during:** Task 1 (RED run; fixture E is inserted without `appliedAt`, as the plan requires)
- **Issue:** `doc.appliedAt === null ? null : doc.appliedAt.toISOString()` threw on `undefined`, so `GET /api/applications` answered 500 for any document with the field absent.
- **Fix:** `doc.appliedAt ? doc.appliedAt.toISOString() : null` (a missing field reads as null).
- **Files modified:** `apps/api/src/applications/applications.mapper.ts` (not in the plan's `files_modified`; one line)
- **Commit:** bf420ef

**2. [Test authoring] Fixture E company**
- The «Unicode case-insensitive q» test first used `ÉPSILON` against `Epsilon` (E is not É); the fixture company became `Épsilon`. Test-only change.

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** none on scope; the mapper now tolerates older documents.

## Known Stubs

None.

## Threat Flags

None. T-02-10, T-02-11 and T-02-12 are mitigated as planned (schema strips unknown keys, field-by-field builder, escaped regex with max 100, arrays capped).

## Notes for later plans

- 02-05 (web) reads `applicationQuerySchema.shape`: `tags` items are now trimmed 1..40 and `q` max 100, `status`/`tags` arrays max 20.
- The backstop truth (a list read concurrent with a status change sees a document fully before or after) rests on Mongo single-document atomicity; it is not tested here and is covered when the status-change plan lands.

## Self-Check: PASSED

- Created files exist: query-input.ts, applications.query.ts, applications.query.test.ts.
- Commit `bf420ef` is an ancestor of HEAD.
