---
phase: 06-pulido-de-demo
plan: 11
subsystem: ui
tags: [tanstack-router, react, a11y, responsive, vitest]
requires:
  - phase: 06-pulido-de-demo
    provides: shell (skip link, sidebar focus, touch targets) and dialog reset from 06-04 and 06-10
provides:
  - Spanish not-found and route-error screens wired as router defaults and as the root error component
  - view-state review test for list, detail, create form, edit form and /documents
  - 360 px risk-point guard and 768 / 1280 px fixed-width guard for screens S1-S11
affects: [06-17 UAT pass]
actuals:
  tokens: 12150
  tasks: 3
  commits: 4
plan_head_before: 6977e790ba2557ed57c326da5ca3fbe0797a8e72
plan_head_after: 1437a6f789b9365cda334d425492b4a0cef40fec
commits: 4
tech-stack:
  added: []
  patterns:
    - "Error and 404 screens live in common/components and are wired in core/router (pods never import them)"
    - "jsdom responsive guard: class-based rules per breakpoint (active prefix <= width) over the rendered DOM"
key-files:
  created:
    - apps/web/src/common/components/route-not-found.tsx
    - apps/web/src/common/components/route-error.tsx
    - apps/web/src/core/router/route-error.test.tsx
    - apps/web/src/test/view-states.test.tsx
    - apps/web/src/test/responsive.test.tsx
  modified:
    - apps/web/src/core/router/router.ts
    - apps/web/src/core/router/router.test.tsx
    - apps/web/src/routes/__root.tsx
    - .planning/phases/01-fundaciones-y-walking-skeleton/01-REVIEW-DISPOSITION.md
key-decisions:
  - "RootError wraps RouteError in a min-h-screen centred div, so the in-shell and standalone cards share markup and classes"
  - "The route error is forced in tests by mocking one scene module (vi.mock is per file, so it has its own test file)"
  - "/documents has no per-row lookup (one list request): the per-row degradation is tested on the detail aside, and an invalid row on /documents is tested to fail the whole list with the fixed card"
requirements-completed: [DEMO-03, DEMO-04]
status: complete
coverage:
  - id: D1
    description: "Unknown routes render the Spanish 404 inside the shell with focus on the h1, a title and a way back; TanStack's English default never shows"
    requirement: DEMO-04
    verification:
      - kind: unit
        ref: "apps/web/src/core/router/router.test.tsx#unknown routes"
        status: pass
    human_judgment: false
  - id: D2
    description: "A route render error renders the Spanish alert card (reset + invalidate, plain-anchor way out) without ever showing the thrown message; a root failure renders it standalone"
    requirement: DEMO-04
    verification:
      - kind: unit
        ref: "apps/web/src/core/router/route-error.test.tsx#route render error"
        status: pass
    human_judgment: false
  - id: D3
    description: "Loading, error and empty states of list, detail, create form, edit form and /documents are reviewed with a test per state; server messages never reach the page"
    requirement: DEMO-04
    verification:
      - kind: unit
        ref: "apps/web/src/test/view-states.test.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every screen S1-S11 has a 360 px risk-point guard and a 768 / 1280 px fixed-width guard"
    requirement: DEMO-03
    verification:
      - kind: unit
        ref: "apps/web/src/test/responsive.test.tsx"
        status: pass
    human_judgment: true
    rationale: "jsdom has no layout; real scrollWidth / clientWidth and painted focus are measured in the 06-17 human pass"
---

# Phase 6 Plan 11: Spanish error screens, view states and responsive guards Summary

Spanish not-found and route-error cards wired as router defaults and as the root error component (01 WR-07 fixed), plus a state review test per view and a class-based 360 / 768 / 1280 px guard for the S1-S11 matrix.

## Performance

- Tasks: 3 of 3
- Commits: 4 (plus this SUMMARY)
- Files: 14 changed

## Accomplishments

- `RouteNotFound` and `RouteError` / `RootError` in `common/components/`, with the copy of UI-SPEC §1 verbatim: eyebrow «Expediente», `h1` «No encontramos esta página» / «Algo ha fallado», the body lines, «Volver a Mis candidaturas» (TanStack `Link` on the 404, a plain `<a href="/applications">` on the error card) and «Volver a cargar la pantalla» (`reset()` then `router.invalidate()`). The `h1` takes focus on mount and `document.title` is «Página no encontrada · Expediente» / «Algo ha fallado · Expediente».
- Wired as `defaultNotFoundComponent` and `defaultErrorComponent` in `createAppRouter` and as `errorComponent: RootError` of the root route. Both render inside the shell's `<main>`; `RootError` renders the same card standalone.
- The thrown message is only passed to `console.error`; a test throws `new Error("detalle interno")` from a mocked scene and asserts the text appears nowhere in `document.body`.
- `01-REVIEW-DISPOSITION.md`: WR-07 is `fixed` (YAML and table), `open` 14 to 13.
- `view-states.test.tsx` (18 tests, 5 describes): list (pending, 500 with leak check, retry to 200, empty), detail (pending, 404, 500, empty rounds and documents, one document row failing), create form (labels, empty values, idle AI panel), edit form (pending, 500, prefilled), `/documents` (pending, 500, empty, refetch with `aria-busy`, invalid row).
- `responsive.test.tsx` (14 tests): `VIEWPORTS = [360, 768, 1280]`, one test per screen S1-S11 rendered with 120-character title and document name, 40-character version, 39-character tag and an unbroken 200-character URL, plus self-tests (a `md:w-[800px]` fixture fails at 768 and passes at 360 and 1280; a fixture that breaks each of the five risk points is flagged).

## Task Commits

1. Task 1: `8d20f07` feat(06-11): Spanish not-found and route-error screens as router defaults
2. Task 2: `40a49c5` test(06-11): loading, error and empty states of every view are reviewed
3. Task 3: `cf2bf11` test(06-11): 360 px risk-point and 768/1280 px width guards; `1437a6f` fix(06-11): delete dialog descriptions can shrink around a 120-character name

## Decisions Made

- Copy used (UI-SPEC «New strings»): 404 body «La dirección no existe o ya no está disponible.»; error body «No se pudo mostrar esta pantalla. Inténtalo de nuevo o vuelve a Mis candidaturas.»
- How the route error is forced in tests: `route-error.test.tsx` mocks `@/scenes/document-list.scene` so `DocumentListScene` throws, then loads `/documents`; `RootError` is rendered directly inside `RouterContextProvider` (it needs `useRouter`). `console.error` is spied, silenced and asserted.
- The 768 / 1280 px guards read classes (a class is active when every variant in front of it is a breakpoint at or below the width). Limits: 328 at 360, 736 at 768, 960 at 1280. Scale utilities (`w-96`) count as fixed widths as well as `w-[Npx]`.
- Tag chips are exempt from the 24-character button rule because they carry `max-w-full` and truncate with a `title` (checked by the chip rule).

## Components fixed in place

| File | Change |
|------|--------|
| `apps/web/src/pods/application-detail/components/delete-dialog.tsx` | `AlertDialogDescription` gets `min-w-0`: it is a grid item of the dialog and holds the 120-character title (the guard failed on it) |
| `apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx` | same `min-w-0` on the description (same pattern, not reached by the S4 flow) |
| `apps/web/src/pods/document-list/components/document-delete-dialog.tsx` | same `min-w-0` on the description; it holds the document name, and S7 now opens this dialog too |

No view state needed a fix: every state of Task 2 matched the approved copy and roles from the first run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Delete dialog description could not shrink inside the dialog grid**
- **Found during:** Task 3 (S4 guard)
- **Issue:** `break-words` alone does not stop a grid item growing past a 328 px dialog; the item lacked `min-w-0`
- **Fix:** `min-w-0` on the three delete-dialog descriptions
- **Files modified:** the three files under «Components fixed in place»
- **Commit:** 1437a6f

### Process deviations

- **TDD RED commit for Task 1 could not land.** The pre-commit hook runs `npm run typecheck`, and the RED tests import `route-error.tsx`, which did not exist yet, so the commit was rejected (hooks were not bypassed). Tests and implementation went into the Task 1 commit; RED was run and observed failing before the implementation (2 failed test files). Task 3 does have a separate test commit (`cf2bf11`) followed by the fix (`1437a6f`).
- **`/documents` "one row fails to resolve".** The plan asks for per-row degradation on `/documents`, but the library is a single list request with no per-row lookup (Phase 5 per-row degradation is the detail documents aside). The aside is tested per row; for `/documents` the test asserts that an unreadable row fails the whole answer with the fixed card and no partial list. No code change.

**Total deviations:** 1 auto-fixed (Rule 1), 2 process notes. **Impact:** none on scope; one class change in three files.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-06-14 and T-06-34 are covered by tests (thrown message and server message absent from `document.body`); T-06-15 accepted (hard-coded `/applications` href); no package was installed.

## Next Phase Readiness

Ready for 06-17: the class guards say nothing about real layout, so the human pass still has to record `scrollWidth <= clientWidth` per screen, viewport and theme, plus painted focus.

## Self-Check: PASSED

- Created files exist (route-not-found.tsx, route-error.tsx, route-error.test.tsx, view-states.test.tsx, responsive.test.tsx).
- Commits 8d20f07, 40a49c5, cf2bf11, 1437a6f are ancestors of HEAD.
- `npm run typecheck && npm run test && npm run lint` exit 0 (web: 24 files, 765 tests; acceptance greps pass).
