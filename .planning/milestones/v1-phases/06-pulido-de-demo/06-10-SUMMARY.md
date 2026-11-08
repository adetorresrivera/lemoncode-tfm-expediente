---
phase: 06-pulido-de-demo
plan: 10
subsystem: ui
tags: [react, alert-dialog, delete, a11y, regression-tests]
requires:
  - phase: 06-09
    provides: dialogs that explain why they will not close
provides:
  - resetDeleteError in the application-detail hook result
  - DeleteDialog onOpen prop
  - regression tests for the application, round and document delete dialogs
affects: [06-pulido-de-demo]
tech-stack:
  added: []
  patterns:
    - "reset-on-open: the dialog notifies the owner of the error state through an optional onOpen callback"
key-files:
  created: []
  modified:
    - apps/web/src/pods/application-detail/application-detail.hooks.ts
    - apps/web/src/pods/application-detail/application-detail.container.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/components/delete-dialog.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx
    - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
    - apps/web/src/pods/document-list/document-list.test.tsx
    - .planning/phases/02-candidaturas/02-REVIEW-DISPOSITION.md
key-decisions:
  - "resetDeleteError clears the state only when it is an error, so reopening never hides a delete still running"
requirements-completed: [DEMO-04, DEMO-05]
status: complete
commits: 2
plan_head_before: 9c5b5969e2c916263590e76e6ee05a6b3a10f439
plan_head_after: 36b9042942fc765f9fc2292149a6d6820b55988b
actuals:
  tokens: 3000
  tasks: 1
  commits: 2
coverage:
  - deliverable: "Application delete dialog reopens clean after a failed delete, focus on «Conservar candidatura»"
    verification:
      - kind: test
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#reopens clean after a failed DELETE"
        status: pass
    human_judgment: false
  - deliverable: "Round and document delete dialogs keep the clean-reopen guarantee under regression tests"
    verification:
      - kind: test
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#reopens the round dialog without the previous error"
        status: pass
      - kind: test
        ref: "apps/web/src/pods/document-list/document-list.test.tsx#reopens the document dialog without the previous message"
        status: pass
    human_judgment: false
  - deliverable: "02 WR-03 disposition flipped to fixed"
    verification:
      - kind: command
        ref: "grep -A3 'id: WR-03' 02-REVIEW-DISPOSITION.md | grep 'disposition: fixed'"
        status: pass
    human_judgment: false
---

# Phase 6 Plan 10: Delete dialogs reopen clean Summary

**Application delete dialog now clears a failed attempt's error on every open via `resetDeleteError` + `DeleteDialog onOpen`; round and document dialogs pinned by regression tests; 02 WR-03 flipped to `fixed`.**

## Accomplishments

- RED: application test reproduced the stale error («No se pudo eliminar la candidatura…» visible after cancel and reopen).
- GREEN: `resetDeleteError()` in `useApplicationDetail` (clears only `error`), passed container -> component (`onDeleteOpen`) -> `DeleteDialog` (`onOpen`, invoked before `setOpen(true)`). Focus on «Conservar candidatura» is asserted on reopen.
- Round dialog (`interviews-section`) and document dialog (`document-list.container`) already reset; two regression tests lock that.
- `02-REVIEW-DISPOSITION.md` WR-03 -> `fixed` (note «Fixed in 06-10»).

## Task Commits

1. RED tests: `5da1f06` test(06-10)
2. GREEN implementation + disposition: `36b9042` feat(06-10)

## Verification

`npm run typecheck`, `npm run test` (web 729 passed, exit 0), `npm run lint` all clean.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-06-18 mitigated (reset-on-open + regression tests); no packages installed (T-06-SC).

## Self-Check: PASSED
