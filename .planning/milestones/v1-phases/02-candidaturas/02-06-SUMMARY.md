---
phase: 02-candidaturas
plan: 06
subsystem: ui
tags: [react, radix-toggle-group, native-select, tanstack-router, vitest, tailwind]
requires:
  - phase: 02-candidaturas
    provides: "02-05 FilterPanel, URL-backed ListSearch, SearchField, Limpiar filtros, useApplicationList; 02-03 TagChip, Skeleton, enum labels; 02-04 GET /api/tags and query bounds"
provides:
  - "Complete filter panel: Estado (ToggleGroup multiple), Modalidad, Seniority, Ordenar por, Stack tag picker, mobile disclosure «Filtros y orden»"
  - "NativeSelect / NativeSelectOption primitive and RequestStatus primitive"
  - "getTags, StackTagOptionVm, mapStackTagsFromApiToVm, useStackTags in the list pod"
  - "Button, Toggle, ToggleGroup restyled to the DS (semibold, solid 2px ring, no dark: variants)"
affects: [02-12 list e2e, 02-08..02-11 forms reuse NativeSelect and RequestStatus, shell theme toggle and sheet buttons (visual only)]
actuals:
  tokens: 13300
  tasks: 2
  commits: 2
  plan_head_before: 41463dbc3d39a4a36f5cb2bac30088875971d97f
  plan_head_after: 49271bf2bc4cdc8a4960e8c739e48d3e6d2caf93
tech-stack:
  added: []
  patterns:
    - "Keyed-result hook for a second request in the same pod (useStackTags, key = attempt)"
    - "Plain disclosure button + hidden lg:flex area instead of Radix Collapsible (UI-SPEC A-4)"
    - "URL-active filters rendered regardless of option loading state, so they can always be removed"
key-files:
  created:
    - apps/web/src/common/components/ui/native-select.tsx
    - apps/web/src/common/components/request-status.tsx
    - apps/web/src/pods/application-list/components/status-filter.tsx
    - apps/web/src/pods/application-list/components/select-filters.tsx
    - apps/web/src/pods/application-list/components/tag-filter.tsx
  modified:
    - apps/web/src/common/components/ui/button.tsx
    - apps/web/src/common/components/ui/toggle.tsx
    - apps/web/src/common/components/ui/toggle-group.tsx
    - apps/web/src/common/components/common-components.test.tsx
    - apps/web/src/pods/application-list/api/api.ts
    - apps/web/src/pods/application-list/application-list.vm.ts
    - apps/web/src/pods/application-list/application-list.mapper.ts
    - apps/web/src/pods/application-list/application-list.hooks.ts
    - apps/web/src/pods/application-list/application-list.container.tsx
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/components/filter-panel.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
    - apps/web/src/core/router/router.test.tsx
    - apps/web/src/test/mock-fetch.ts
key-decisions:
  - "No dependency added: native select plus the Radix ToggleGroup already shipped in the installed radix-ui package"
  - "mockFetch now answers GET /api/tags with [] unless a test routes it, because the list pod always loads the tag options"
  - "Empty status / tag selections are sent to the URL as undefined, never as an empty array"
  - "The always-mounted live region of the Stack filter is a role=status div without extra markup when there is no error"
requirements-completed: [APP-06, APP-08, APP-14]
coverage:
  - id: D1
    description: "Estado ToggleGroup (7 statuses in enum order, aria-pressed, add/remove) and Modalidad / Seniority / Ordenar por native selects send the right values through onQueryChange"
    requirement: APP-06
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#status, work mode, seniority and sort controls"
        status: pass
    human_judgment: false
  - id: D2
    description: "«Filtros y orden» disclosure below lg: aria-expanded, aria-controls, count of active dimensions plus a non-default sort, starts open when something is active"
    requirement: APP-08
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#«Filtros y orden» disclosure"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stack filter from GET /api/tags: stack only in served order, toggle with aria-pressed, AND helper, first 10 plus Mostrar todas, URL tags always shown"
    requirement: APP-14
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#stack tag filter"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#mapStackTagsFromApiToVm"
        status: pass
    human_judgment: false
  - id: D4
    description: "Stack loading (4 skeleton chips), error with working «Reintentar» (one extra GET) while other filters keep working, and empty line"
    requirement: APP-14
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#stack tag filter"
        status: pass
      - kind: unit
        ref: "apps/web/src/common/components/common-components.test.tsx#RequestStatus"
        status: pass
    human_judgment: false
  - id: D5
    description: "Button, Toggle and ToggleGroup carry the DS look: semibold label and a solid 2px ring in the ring colour in light and dark"
    verification:
      - kind: other
        ref: "grep acceptance criteria A5-A8 (no font-medium, no dark:, no ring-[3px], focus-visible:ring-2 present)"
        status: pass
    human_judgment: true
    rationale: "Classes were verified by grep; no test renders the focus ring, so the visual result in both themes needs a human look"
  - id: D6
    description: "Real-browser round trip: pick a status, a stack tag and «Fecha de envío», reload and see the same URL, controls and results; Back leaves the list"
    verification: []
    human_judgment: true
    rationale: "The plan's human-check needs npm run dev and a real browser; the URL behaviour is covered by the 02-05 router tests but the combined flow was not driven by hand here"
duration: 22min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 06: Filter controls and stack tag picker Summary

**The list filter panel now offers multi-status toggles, work mode, seniority and sort selects, a mobile «Filtros y orden» disclosure and a stack tag picker fed by GET /api/tags with loading, error and empty states, and the shared button and toggle primitives follow the DS (semibold, solid 2px ring).**

## Performance

- **Duration:** 22 min
- **Started:** 2026-10-31T08:33:00Z
- **Completed:** 2026-10-31T08:55:00Z
- **Tasks:** 2
- **Files modified:** 19 (5 created, 14 modified)

## Accomplishments

- «Estado» is a Radix `ToggleGroup type="multiple"` of the 7 statuses in enum order; «Modalidad», «Seniority» and «Ordenar por» are labelled native selects whose "all" option maps to `undefined`. Every change goes through `onQueryChange`, so the URL (replace navigation from plan 02-05) and the list follow it. An emptied status or tag selection becomes `undefined`, not `[]`.
- Below `lg` the extra controls sit behind a «Filtros y orden (n)» button with `aria-expanded` and `aria-controls="filters-extra"`; `n` counts active status, tags, work mode, seniority groups plus one for a non-default sort, and the area starts open when `n > 0`. From `lg` it is always visible.
- Stack filter: `getTags` parsed with `tagSummarySchema`, `mapStackTagsFromApiToVm` keeps `stack` in served order, `useStackTags` follows the keyed-result pattern with abort. `TagFilter` shows 4 skeleton chips while loading, `RequestStatus` error with «Reintentar» inside an always-mounted `role="status"`, the muted «Aún no hay etiquetas de stack.» line, the first 10 options with «Mostrar todas ({n})» / «Mostrar menos», and the AND helper from two selected tags.
- Tags selected in the URL are always rendered and removable, also while the options load or fail and when they are beyond the first 10 (prohibition in the plan frontmatter).
- `Button`, `Toggle`, `ToggleGroup`: `font-semibold`, `focus-visible:ring-2 focus-visible:ring-ring`, all `dark:` classes removed, generated `px-3` of the group items replaced by `px-2`.

## Task Commits

1. **Task 1: Status toggles, work mode, seniority and sort selects, mobile disclosure** - `c8e3249` (feat)
2. **Task 2: Stack tag filter fed by GET /api/tags** - `49271bf` (feat)

**Plan metadata:** the docs commit that adds this file.

## TDD Gate Compliance

The pre-commit hook runs the full suite, so a failing RED-only commit is impossible; as in earlier plans each task is one commit holding tests and implementation. No separate `test(02-06)` commit exists (flagged on purpose).

- **Task 1:** the implementation was written first and the tests after it, so there was no assertion RED before the code. The first test run did fail on 3 tests, which found two real mismatches: Radix gives the multiple group `role="toolbar"` (not `group`) and the new «Enviada» toggle collided with a status badge in an older query by text. Both were fixed in the tests, GREEN is 53 tests in `src/pods/application-list` and `src/layouts`. This is a weaker RED than plans 02-03 to 02-05; recorded here instead of claimed.
- **Task 2:** implementation first as well. After wiring the container, 12 existing tests failed for the right reason (tags request answered 404, extra `role="status"`, call counts including `/api/tags`), which proved the new request is on the page; those tests were adapted (see Deviations). The new Stack and RequestStatus tests passed on the first run apart from one test that needed an applications route. `check tdd-red-evidence` was not run (project reporter is not TAP).

## Files Created/Modified

- `common/components/ui/native-select.tsx` - select in the field family with decorative chevron
- `common/components/request-status.tsx` - loading/success/error markup with optional retry, no live region
- `common/components/ui/{button,toggle,toggle-group}.tsx` - DS weight and focus ring, no `dark:` classes
- `pods/application-list/components/{status-filter,select-filters,tag-filter}.tsx` - new controls
- `pods/application-list/components/filter-panel.tsx` - disclosure, `filters-extra` area, TagFilter between Estado and the selects
- `pods/application-list/api/api.ts`, `.vm.ts`, `.mapper.ts`, `.hooks.ts` - `getTags`, `StackTagOptionVm`/`StackTagsVm`, `mapStackTagsFromApiToVm`, `useStackTags`
- `pods/application-list/application-list.{container,component}.tsx` - pass `stackTags` and `onRetryStackTags` down
- `test/mock-fetch.ts`, `application-list.test.tsx`, `router.test.tsx`, `common-components.test.tsx` - tests and harness

## Decisions Made

- No dependency added; `package.json` and `package-lock.json` are unchanged (native select and the Radix ToggleGroup from the installed `radix-ui`).
- `mockFetch` defaults `GET /api/tags` to `[]`. The list pod always requests tags now, and without a default every test that routes only `/api/applications` would see a 404 tag error with a second «Reintentar» button.
- Status filter emits statuses in the order the user pressed them (Radix order), and that order is kept in the URL.
- The Stack live region is `role="status" aria-live="polite"`, mounted in every state and empty until an error appears, as the UI-SPEC asks for inline feedback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing tests broke once the pod loads GET /api/tags**
- **Found during:** Task 2
- **Issue:** 12 tests failed: tags answered 404 (second «Reintentar»), `getByRole("status")` and the counter selector `[aria-live="polite"]` matched the new Stack region, and request counts included `/api/tags`.
- **Fix:** `mockFetch` answers `GET /api/tags` with `[]` unless routed (`test/mock-fetch.ts`, not in the plan's file list); status queries scoped to the «Resultados» region; the counter selector is `p[aria-live="polite"]`; call counts are per endpoint (`countCalls`, and a filtered count in `router.test.tsx`, also outside the plan's file list).
- **Files modified:** `apps/web/src/test/mock-fetch.ts`, `apps/web/src/pods/application-list/application-list.test.tsx`, `apps/web/src/core/router/router.test.tsx`
- **Verification:** `npm run test` (contracts 55, api 89, web 149)
- **Committed in:** `49271bf`

**2. [Rule 1 - Bug] Test assumed the Estado group had role `group`**
- **Found during:** Task 1
- **Issue:** Radix renders a roving-focus ToggleGroup as `role="toolbar"`; the assertion could not find it. The older card test also matched the new «Enviada» toggle.
- **Fix:** tests use `toolbar` with name «Estado» (still labelled by `aria-label`, arrow-key navigation comes with it) and the card test scopes its query to the article.
- **Files modified:** `apps/web/src/pods/application-list/application-list.test.tsx`
- **Committed in:** `c8e3249`

**3. [Rule 2 - Missing critical] Selected tags and statuses never hide**
- **Found during:** Task 2 (plan prohibition)
- **Issue:** a naive "options only" chip list would hide URL tags while `GET /api/tags` loads or fails, so the user could not remove them.
- **Fix:** `TagFilter` always renders the URL-selected labels (extras after the shown options). Tests cover loading, missing-from-options and beyond-the-first-10 cases.
- **Files modified:** `apps/web/src/pods/application-list/components/tag-filter.tsx`
- **Committed in:** `49271bf`

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical). **Impact on plan:** no scope change; two test-harness files outside the plan's list were touched to keep the suite green.

## Issues Encountered

- The sandbox rejects compound shell commands that mention git or cd, so edits were applied with small scripts and plain commands. The `gsd-plan-head-before` ledger file under the git dir could not be written for that reason; `plan_head_before` is the dispatch base recorded by the orchestrator (`41463db`), and `commits: 2` was counted from the two task commits.
- The plan's `<human-check>` (real browser reload with `npm run dev`) was not run; it is carried to the end-of-phase UAT (coverage D6).
- `toggle-group.tsx` needed only the `px-3` to `px-2` change; the rest of the file already met C-3 and C-4.

## Known Stubs

None.

## Threat Flags

None. T-02-14 and T-02-15 are mitigated: API and URL labels render only as React text inside `TagChip` (an `<img onerror>` label is covered by the existing TagChip test), URL labels already pass `listSearchSchema` bounds, and no install happened (T-02-SC).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-12 (list e2e) can drive the full filter panel; Stack options appear once `GET /api/tags` answers, and `getByRole("toolbar", { name: "Estado" })` is the Estado group.
- `NativeSelect` and `RequestStatus` are ready for the form plans (02-08 to 02-11).
- A human should open the list in both themes to confirm the focus ring and semibold labels on the shell buttons (coverage D5, D6).

## Self-Check: PASSED

- Created files exist on disk (native-select, request-status, status-filter, select-filters, tag-filter) and commits `c8e3249`, `49271bf` are ancestors of HEAD.
- Acceptance criteria of both tasks pass (grep checks A1-A8, B1-B5).
- `npm run typecheck`, `npm run test` (contracts 55, api 89, web 149) and `npm run lint` pass.

---
*Phase: 02-candidaturas*
*Completed: 2026-10-31*
