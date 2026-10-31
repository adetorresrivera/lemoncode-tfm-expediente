---
phase: 02-candidaturas
plan: 05
subsystem: ui
tags: [tanstack-router, search-params, zod, react, debounce, vitest]
requires:
  - phase: 02-candidaturas
    provides: "02-03 list cards, useApplicationList, ListSkeleton/ListError/ResultCount/EmptyState, mockFetch"
provides:
  - "URL-backed list state: parseSearch/stringifySearch serializer and lenient listSearchSchema derived from applicationQuerySchema.shape"
  - "getApplications(query, signal) building the API query from known keys only"
  - "Buscar field (300 ms debounce, replace navigation), Limpiar filtros and the empty-by-filters state"
  - "Input, Label primitives and useDebouncedCallback"
affects: [02-06 filter controls, 02-04 merge (contract bounds), 02-12 list e2e]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
  plan_head_before: b6a645538e7ec44d802dca64ae9f87c651dac749
  plan_head_after: 2eb21ca64ac24bdd03f441ce03321d73db406bb3
tech-stack:
  added: []
  patterns:
    - "Custom router serializer (plain repeated keys, strings only) plus per-field .catch schema"
    - "Keyed-result hook: result key = API query string + attempt, aborted responses are ignored"
    - "Uncontrolled-by-URL text field remounted with key={clearCount}"
key-files:
  created:
    - apps/web/src/core/router/search-params.ts
    - apps/web/src/core/router/application-search.ts
    - apps/web/src/core/router/search-params.test.ts
    - apps/web/src/common/components/ui/input.tsx
    - apps/web/src/common/components/ui/label.tsx
    - apps/web/src/common/hooks/use-debounced-callback.ts
    - apps/web/src/pods/application-list/components/filter-panel.tsx
    - apps/web/src/pods/application-list/components/search-field.tsx
    - apps/web/src/pods/application-list/components/empty-filtered-state.tsx
  modified:
    - apps/web/src/core/router/router.ts
    - apps/web/src/core/router/router.test.tsx
    - apps/web/src/routes/applications/index.tsx
    - apps/web/src/scenes/application-list.scene.tsx
    - apps/web/src/pods/application-list/api/api.ts
    - apps/web/src/pods/application-list/application-list.hooks.ts
    - apps/web/src/pods/application-list/application-list.container.tsx
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
key-decisions:
  - "D-13 amendment (2026-10-30, user-approved, recorded in 02-CONTEXT.md): listSearchSchema is derived per field from applicationQuerySchema.shape with .catch, plus custom parseSearch/stringifySearch, instead of passing the contract schema as-is"
  - "Added pickListSearch in application-search.ts: the router merges raw URL keys into useSearch(), so the scene projects to the known keys before passing the query down or navigating"
  - "FilterPanel starts the field with query.q only on the first mount; after a clear it starts empty, so the async URL update cannot repopulate the field"
requirements-completed: [APP-05, APP-06, APP-07]
coverage:
  - id: D1
    description: "Filters and sort live in the URL as plain repeated keys; a numeric search stays text; reload issues the same API query; order of repeated values is kept"
    requirement: APP-07
    verification:
      - kind: unit
        ref: "apps/web/src/core/router/search-params.test.ts#parseSearch / stringifySearch"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#list state in the URL"
        status: pass
    human_judgment: false
  - id: D2
    description: "Invalid or hostile URL values degrade to not applied with no error screen; unknown keys never reach GET /api/applications"
    requirement: APP-07
    verification:
      - kind: unit
        ref: "apps/web/src/core/router/search-params.test.ts#listSearchSchema / getApplications query"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#renders the list unfiltered for hostile search params"
        status: pass
    human_judgment: false
  - id: D3
    description: "A query change in flight aborts the previous request and only the current response renders"
    requirement: APP-05
    verification:
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#renders only the response of the current query when the query changes in flight"
        status: pass
    human_judgment: false
  - id: D4
    description: "Buscar updates the URL 300 ms after the last keystroke without history entries; Limpiar filtros goes to exactly /applications, replaces the entry, empties and focuses the field"
    requirement: APP-06
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#search debounce / «Limpiar filtros»"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#search field and «Limpiar filtros» in the URL"
        status: pass
    human_judgment: false
  - id: D5
    description: "Empty-by-filters state with outline «Limpiar filtros» versus the plain empty state when only the sort is non-default"
    requirement: APP-05
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#empty states"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual fit of the filter panel and empty-by-filters card against the UI-SPEC (spacing, hierarchy, focus ring)"
    verification: []
    human_judgment: true
    rationale: "Class contract was applied from the UI-SPEC but no test asserts the rendered look"
duration: 15min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 05: Search params, search field and empty-by-filters Summary

**List state now lives in the URL with a readable repeated-key serializer and a lenient per-field schema, feeding GET /api/applications from known keys only, plus the debounced «Buscar» field, «Limpiar filtros» and the empty-by-filters state.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-10-31T08:17:00Z
- **Completed:** 2026-10-31T08:32:00Z
- **Tasks:** 2
- **Files modified:** 18 (9 created, 9 modified)

## Accomplishments

- `parseSearch`/`stringifySearch` keep every value as a string and write plain repeated keys (`?status=enviada&status=rechazada`); `C#` and `.NET 8` round-trip. A search for «123» stays text in the field and in the API query across reloads.
- `listSearchSchema` reads each field from `applicationQuerySchema.shape` with `.catch`, so an invalid value drops only that filter (and `sort` falls back to `updatedAt`) with no error screen. `stripSearchParams` keeps the default sort out of the URL, so `/applications?sort=updatedAt` equals `/applications`.
- `getApplications(query, signal)` builds the query from the known keys only; `status[$ne]`-style junk never reaches the API (T-02-13).
- `useApplicationList(query)` keys results by API query string plus attempt, aborts the previous request on a query change and ignores any response from an aborted request. The test with an out-of-order response fails without that guard.
- «Buscar» (300 ms debounce, `replace: true`), «Limpiar filtros» (resets filters and sort, empties and focuses the field, `/applications` exactly) and the empty-by-filters card; the filter panel renders in every state.

## Task Commits

1. **Task 1: List state in the URL** - `5fa458b` (feat)
2. **Task 2: Search field, «Limpiar filtros», empty-by-filters** - `2eb21ca` (feat)

**Plan metadata:** the docs commit that adds this file.

## TDD Gate Compliance

The pre-commit hook runs the full suite, so a failing RED-only commit is impossible; as in earlier plans, RED was run locally and committed together with GREEN. No separate `test(02-05)` commit exists (flagged on purpose).

- **Task 1 RED:** `router.test.tsx` new cases failed on assertions (6 failed, 3 passed in the two router files): the default serializer coerced `q=123`, the hostile URL was not degraded, the API call carried no query string and the abort case rendered the wrong response. `search-params.test.ts` failed at load because `application-search.ts` and `search-params.ts` did not exist yet; that part is a load failure, not an assertion RED, and is recorded as such. The classifier `check tdd-red-evidence` was not run because the project reporter is not TAP and the evidence was inspected by hand. `semanticAssessment`: the router-level failures were on the planned behaviors.
- **Task 1 GREEN:** serializer, schema, route, scene, api and hook; 56 tests passed in `src/core/router` and `src/pods/application-list`. Removing the `aborted` guard from the hook makes the abort test fail again (checked, then restored).
- **Task 2 RED:** 13 new tests failed with "Unable to find role searchbox / search / button «Limpiar filtros»" and the missing empty-by-filters text, which are the planned assertions.
- **Task 2 GREEN:** primitives, hook, field, panel, empty card, component and container; full suite passed.

## Files Created/Modified

- `apps/web/src/core/router/search-params.ts` - router serializer (strings only, repeated keys)
- `apps/web/src/core/router/application-search.ts` - `listSearchSchema`, `ListSearch`, `hasActiveFilters`, `isDefaultSort`, `pickListSearch`
- `apps/web/src/core/router/router.ts` - wires the serializer into `createRouter`
- `apps/web/src/routes/applications/index.tsx` - `validateSearch` and `stripSearchParams({ sort })`
- `apps/web/src/scenes/application-list.scene.tsx` - reads search, navigates with `replace: true`
- `apps/web/src/pods/application-list/api/api.ts` - `buildApplicationsQuery`, `getApplications(query, signal)`
- `apps/web/src/pods/application-list/application-list.hooks.ts` - query-keyed results with abort guard
- `apps/web/src/pods/application-list/application-list.container.tsx` / `.component.tsx` - new props, `clearCount`, panel and empty-state choice
- `apps/web/src/pods/application-list/components/{filter-panel,search-field,empty-filtered-state}.tsx` - new UI
- `apps/web/src/common/components/ui/{input,label}.tsx`, `common/hooks/use-debounced-callback.ts` - primitives and hook
- Tests: `search-params.test.ts` (new), `router.test.tsx` and `application-list.test.tsx` (extended, existing renders updated for the new props and for a router-backed scene)

## Decisions Made

- No dependency added; `package.json` and the lockfile are unchanged. `Label` uses the existing `radix-ui` package.
- D-13 amendment as above: derived-per-field lenient schema plus custom serializer; the contract stays the single source and is not edited.
- `pickListSearch` is an addition to the plan's exports (needed because raw URL keys leak through `useSearch()`).
- The hook reads the latest `query` through a ref updated in an effect so the request effect depends only on the key string.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Field could repopulate after «Limpiar filtros»**
- **Found during:** Task 2 design
- **Issue:** the URL update from a clear is asynchronous; remounting the field with `initialValue={query.q}` could restore the old text.
- **Fix:** `FilterPanel` passes `query.q` only while `clearCount === 0`, an empty string after a clear.
- **Files modified:** `apps/web/src/pods/application-list/components/filter-panel.tsx`
- **Verification:** `«Limpiar filtros» ... empties the field and leaves it focused` and the router-level clear test.
- **Committed in:** `2eb21ca`

**2. [Rule 2 - Missing critical] Ignore aborted successful responses in the hook**
- **Found during:** Task 1
- **Issue:** only the `catch` branch checked `signal.aborted`; a late response of an aborted request could overwrite the stored result and leave the list stuck on stale data.
- **Fix:** the `then` branch returns early when the controller is aborted.
- **Files modified:** `apps/web/src/pods/application-list/application-list.hooks.ts`
- **Verification:** the in-flight query change test (fails without the guard).
- **Committed in:** `5fa458b`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical). **Impact on plan:** no scope change.

## Issues Encountered

- Contract bounds from plan 02-04 (q at most 100 chars, tag items 1..40, arrays at most 20) are not in this tree, so no test here asserts that an oversized `q` degrades; the schema picks the bounds up through `.shape` once 02-04 merges. The blank-`q` and empty-tag-item degradations are tested. The field itself caps text with `maxLength={100}`.
- The sandbox rejects compound git/cd shell commands, so edits were applied with small scripts and plain commands. No effect on the result.

## Known Stubs

None.

## Threat Flags

None. T-02-13 is mitigated: per-field `.catch` plus the known-keys query builder, both tested with junk keys.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 02-06 can add status toggles, selects, sort control and stack tag filter inside `FilterPanel`; they only need to call `onQueryChange({ ...query, ... })`.
- After merging with 02-04, re-run `npm run typecheck && npm run test`; `listSearchSchema` follows the tighter contract bounds without code changes.

## Self-Check: PASSED

- Created files exist on disk (checked) and commits `5fa458b`, `2eb21ca` are ancestors of HEAD.
- Acceptance criteria of both tasks pass (grep checks A1-A6, B1-B5).
- `npm run typecheck`, `npm run test` (contracts 51, api 61, web 126) and `npm run lint` pass.

---
*Phase: 02-candidaturas*
*Completed: 2026-10-31*
