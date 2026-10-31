---
phase: 02-candidaturas
plan: 02
subsystem: web
tags: [react, vitest, skeleton, a11y, layout]
requires:
  - phase: 02-candidaturas
    provides: keyed-result useApplicationList hook, mockFetch, application-list pod (plan 02-01)
provides:
  - Skeleton primitive (reduced-motion aware)
  - ListSkeleton, ListError, ResultCount in pods/application-list/components
  - Results region (section aria-label="Resultados") with focus on retry and aria-busy on refresh
  - Scene h1 at DS display size and document.title
  - Content column (UI-SPEC C-1, C-2) inherited by every later screen
affects: [02-03, 02-05, 02-06, 02-08]
tech-stack:
  added: []
  patterns:
    - fixed error copy chosen by HttpErrorCode, never the server message
    - always-mounted aria-live counter, empty during first load
key-files:
  created:
    - apps/web/src/common/components/ui/skeleton.tsx
    - apps/web/src/pods/application-list/components/list-skeleton.tsx
    - apps/web/src/pods/application-list/components/list-error.tsx
    - apps/web/src/pods/application-list/components/result-count.tsx
  modified:
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.container.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
    - apps/web/src/scenes/application-list.scene.tsx
    - apps/web/src/layouts/app-layout.tsx
    - apps/web/src/layouts/app-layout.test.tsx
key-decisions:
  - "No dependency added; lockfile unchanged"
  - "aria-busy lives on the Resultados section (not the ul), as UI-SPEC describes the region"
  - "Hook left unchanged: the tracer's keyed-result hook already keeps the last ok items while a retry is pending (refreshing), so no edit was needed"
requirements-completed: [APP-05]
duration: 15 min
completed: 2026-10-31
status: complete
commits: 1
plan_head_before: 22d93b423c276972145cf2a6b17e2ae6f7ca9a45
plan_head_after: b848efc5301358625abd713042a108cd35c51c03
actuals:
  tokens: 9000
  tasks: 1
  commits: 1
---

# Phase 2 Plan 02: List states, counter and layout carry-over Summary

**The applications list now shows distinct loading (status region + 3 hidden skeleton cards), error-with-retry (fixed copy by error code, focus returns to the results region), empty and populated states with a polite counter, inside the corrected content column (`lg:pl-64`, `max-w-5xl`) and with the DS display heading.**

## Accomplishments

- `Skeleton` primitive: `animate-pulse ... motion-reduce:animate-none`, `aria-hidden`, `data-slot="skeleton"`.
- `ListSkeleton`: `role="status"` with sr-only «Cargando candidaturas…» and 3 card-shaped placeholders.
- `ListError`: `role="alert"` card; body chosen by NETWORK_ERROR / INVALID_RESPONSE / other; the server message is never rendered (T-02-30); outline «Reintentar».
- `ResultCount`: always-mounted `aria-live="polite"` line: «Sin candidaturas» / «1 candidatura» / «N candidaturas», empty on first load and on error, keeps the previous value while refreshing.
- Component: counter first, then the `section aria-label="Resultados" tabIndex={-1}` holding exactly one of skeleton, error, empty state or list; `aria-busy` while refreshing; retry calls the prop then focuses the section.
- Scene: h1 `text-[28px] font-semibold leading-[1.2]` with `tabIndex={-1}`; `document.title` = «Mis candidaturas · Expediente».
- Layout carry-over C-1/C-2: `main` is `lg:pl-64` and the Outlet sits in `mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8`. Every later screen inherits this.

## Task Commits

1. Task 1: `b848efc` feat(02-02): list loading, error, empty and counter states with layout carry-over

## Verification

- `npm run typecheck`, `npm run lint` and `npm run test` pass (contracts 40, api 55, web 55). The pre-commit hook ran the same checks.
- `npm run test -w @tfm/web -- src/pods/application-list src/core/router src/layouts`: 3 files, 29 tests pass, including `application-list.test.tsx`.
- All six task acceptance-criteria greps pass.
- No dependency added.

## TDD Gate Compliance

The task is `tdd="true"` but the pre-commit hook runs the whole test suite, so a failing RED commit cannot be created without bypassing hooks (forbidden). RED was run locally before any implementation: 11 of the 26 tests in the two touched test files failed on the planned assertions (skeleton, alert copy, counter text, aria-busy region, h1 classes, document.title, layout classes; the focus and counter tests failed because the elements did not exist). GREEN then made all pass. Both were committed together as a single `feat(02-02)` commit; there is no separate `test(02-02)` commit.

## Deviations from Plan

- [Rule 3 - Blocking, minor] Added a layout assertion to `apps/web/src/layouts/app-layout.test.tsx` (not listed in the plan files) to cover the content-column truth; no behavior change.
- The plan listed `application-list.hooks.ts` as modified; no change was needed (see key decisions).

## Known Stubs

The populated list items are still the tracer's minimal `li` (title and company); plan 02-03 replaces them with cards. The empty state has no call to action until `/applications/new` exists (plan 02-10), as the plan assumed.

## Self-Check: PASSED

- Created files exist on disk; commit `b848efc` is an ancestor of HEAD.
