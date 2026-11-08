---
phase: 04-rondas-de-entrevista
plan: 03
subsystem: interview-rounds-edit-delete
tags: [hono, mongodb, arrayFilters, pull, react, tanstack-form, radix-alert-dialog]

requires:
  - phase: 04-rondas-de-entrevista
    provides: "04-01 POST /interviews, InterviewVm/InterviewFormValues, useInterviewForm; 04-02 InterviewDialog, InterviewItem, isoToLocalInput"
provides:
  - "PUT and DELETE /api/applications/:id/interviews/:interviewId, both 200 with the whole Application"
  - "Repository updateInterview (arrayFilters per-key $set) and removeInterview ($pull)"
  - "Edit mode of the round dialog with «Ronda» required (D-28) and the Pencil/Trash2 row actions"
  - "InterviewDeleteDialog and the section's delete flow with focus handling"
affects: [04-04]

plan_head_before: d0bac7faaee639c831126efa1c1dc5aa3ef7127d
plan_head_after: bf6d82d3a015fe56914bc96d42f16509195871c0

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Per-key $set through arrayFilters on the element id; the id key is never written and the round key is omitted when none is sent"
    - "findOneAndUpdate filtered on interviews.id with no insert-on-miss: a deleted round can never come back"
    - "Null from the repository -> service get(id) (application 404) else «Ronda no encontrada»"
    - "Controlled trigger-less dialogs keep the opener in a ref and restore focus in onCloseAutoFocus; the dialog keeps its last round in state so text does not blank during Radix unmount"

key-files:
  created:
    - apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx
  modified:
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.routes.ts
    - apps/api/src/applications/applications.interviews.test.ts
    - apps/web/src/pods/application-detail/api/api.ts
    - apps/web/src/pods/application-detail/application-detail.vm.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.ts
    - apps/web/src/pods/application-detail/application-detail.hooks.ts
    - apps/web/src/pods/application-detail/components/interviews-section.tsx
    - apps/web/src/pods/application-detail/components/interview-item.tsx
    - apps/web/src/pods/application-detail/components/interview-dialog.tsx
    - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx

key-decisions:
  - "D-28: in edit mode «Ronda» is required (marker, aria-required, no hint) and the client never computes a number; a PUT body without round (other clients) keeps the stored round by leaving the key out of the $set"
  - "Two distinct 404s on PUT and DELETE: unknown or malformed application id -> «Candidatura no encontrada»; unknown or malformed :interviewId on an existing application -> «Ronda no encontrada» (the round id is a plain string, never parsed as an ObjectId)"
  - "DELETE of a round answers 200 with the whole Application (D-06), unlike the 204 of DELETE /:id"
  - "Focus: after a saved edit and after cancelling a delete it returns to the row's own button; after a completed delete it moves to «Añadir ronda» (falls back there too when the opener is gone)"
  - "The edit dialog keeps its mode and round in section state after closing (only open flips) so the title does not change during the Radix unmount"

patterns-established:
  - "Shared repository helper not needed: updateInterview and removeInterview share one filter shape ({ _id, 'interviews.id': interviewId })"

requirements-completed: [INT-03, INT-02, APP-13]

coverage:
  - id: D1
    description: "PUT edits one round (same id, other rounds, status and history untouched, null clears, body id ignored, stored round kept when none sent) and DELETE pulls one round (others keep their numbers, next added is 4), both setting updatedAt and answering 200 with the Application"
    requirement: INT-03
    verification:
      - kind: automated_integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#PUT /api/applications/:id/interviews/:interviewId"
        status: pass
      - kind: automated_integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#DELETE /api/applications/:id/interviews/:interviewId"
        status: pass
    human_judgment: false
  - id: D2
    description: "Distinct 404s, 400 without writing for round 0, unknown type or missing mode, idempotent PUT, second DELETE 404, DELETE then PUT 404, concurrent PUT and DELETE end deleted"
    requirement: INT-03
    verification:
      - kind: automated_integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#PUT and DELETE error and concurrency cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "The user edits a round from its Pencil button: stored values loaded in local time, «Ronda» required with no hint, PUT, view replaced, «Ronda actualizada.», focus back on the row's edit button; failures keep the dialog open"
    requirement: INT-03
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#edit a round"
        status: pass
    human_judgment: false
  - id: D4
    description: "The user deletes a round only after confirming: focus on «Conservar ronda», one DELETE, «Eliminando…», in-dialog error with retry, row removed, «Ronda eliminada.», focus on «Añadir ronda»; actions aria-disabled during any mutation"
    requirement: INT-03
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#delete a round"
        status: pass
    human_judgment: false
  - id: D5
    description: "Keyboard-only flow, native datetime picker value, dark theme and 360 px layout of the row actions and both dialogs"
    verification: []
    human_judgment: true
    rationale: "jsdom does not exercise Tailwind layout or native pickers; the plan's human-check was not run in this session"

duration: 55min
completed: 2026-11-02
status: complete
---

# Phase 4 Plan 03: Edit and delete interview rounds Summary

**PUT (per-key `$set` with `arrayFilters`) and DELETE (`$pull`) of one round, both answering 200 with the application, plus the detail UI: Pencil edit dialog with «Ronda» required and a Trash2 confirmation that restores focus; no dependency added.**

## Performance

- **Duration:** about 55 min
- **Tasks:** 3
- **Files modified:** 14 (1 created, 13 modified)
- **Commits:** 3 task commits (`a7da415`, `937e995`, `bf6d82d`)

## Accomplishments

- API: `updateInterview` writes `type`, `scheduledAt`, `mode`, `notes`, `outcome` (and `round` only when sent) through `arrayFilters`; `removeInterview` pulls the element by id. Both filter on `interviews.id` and have no insert-on-miss option, so a deleted round is never brought back. The service turns a null result into «Candidatura no encontrada» (via `get`) or «Ronda no encontrada». 17 new real-Mongo tests; the API suite is 317 tests green.
- Edit: each row has a `size-11` ghost Pencil button («Editar ronda N») in a `shrink-0` wrapper; it opens the existing dialog in `mode="edit"` with `InterviewVm.editValues` (date through `isoToLocalInput`, notes empty when null). «Ronda» is required in that mode (` *`, `aria-required`, no hint, empty -> «La ronda debe ser un número entero de 1 o más.», focus on the field, no request); the hook also rejects an empty round, so the client never numbers a round on edit.
- Delete: a Trash2 button («Eliminar ronda N», no destructive token) opens `InterviewDeleteDialog` («¿Eliminar la ronda N?» with the type in the description). While pending the confirm reads «Eliminando…», both buttons are `aria-disabled`, close requests are ignored; on failure the dialog stays open with the error and the confirm works again; on success the row goes, «Ronda eliminada.» is announced and focus moves to «Añadir ronda».
- Both row actions are `aria-disabled` and inert while any round or status mutation is in flight (D-16).
- No dependency added; lockfile and `packages/contracts` unchanged.

## Task Commits

1. **Task 1: Edit and delete a round through the API** - `a7da415` (feat)
2. **Task 2: Edit a round from its row, with «Ronda» required** - `937e995` (feat)
3. **Task 3: Delete a round after confirming** - `bf6d82d` (feat)

**Plan metadata:** committed separately after this file (docs).

## Deviations from Plan

None - plan executed exactly as written.

Minor implementation choices inside the plan's latitude (not deviations): the edit/delete buttons use `size="icon"` plus `size-11` so the default `px-4` does not squeeze the icon; `InterviewDeleteDialog` keeps the last round in state (set-state-during-render pattern) so its text does not blank while Radix unmounts the content.

## Issues Encountered

- The sandbox refused heredoc-based and chained git commands in one call; resolved by splitting commands and using Edit/Write for file changes.
- The `gsd_run` shim could not execute (`/usr/bin/env: bad interpreter: Permission denied`), so `requirements.ready-ids`/`mark-complete` was not run; REQUIREMENTS.md is left unchanged for the orchestrator (INT-03 is also declared by 04-04, so the shared-ID gate applies; INT-02 and APP-13 are fully delivered between 04-01 and this plan).
- The commit-count ledger file was not written (git-dir access forbidden in one call); `commits` is measured as `git rev-list --count d0bac7f..HEAD` = 3 before this SUMMARY commit.

## TDD Gate Compliance

All three tasks are `tdd="true"`. Task 1: tests were written and run first, 17 of 46 failed on the planned assertions (routes absent, 404 instead of 200) before any implementation, then all passed; Tasks 2 and 3: tests were written before the implementation, but the pre-commit hook runs `tsc` over the workspace and the new tests reference symbols not yet present (`update`, `remove`, `editValues`, `mode`), so a RED commit cannot be made and a separate RED test run was not captured for the web tasks; RED and GREEN were committed together as one `feat` commit per task (the Phase 2/3/04-02 convention). No separate `test(04-03)` commits exist; flagged for the end-of-phase review.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-04-10 (round id compared as a string in filter, `arrayFilters` and `$pull`), T-04-11 (per-key `$set`, body id ignored, tested), T-04-12 (no insert-on-miss; DELETE then PUT 404 and concurrent PUT/DELETE tested) and T-04-13 (confirmation dialog with initial focus on «Conservar ronda», one DELETE in flight) are mitigated and tested. T-04-SC: no package installed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-04 can rely on `InterviewActions { busy, feedback, add, update, remove }`, `InterviewFormMode`, `InterviewVm.editValues`, `InterviewItem` with `busy`/`onEdit`/`onDelete`, and the API endpoints above.
- Not run: the plan's `human-check` (keyboard-only edit and delete flow, dark theme, 360 px); tracked as D5 with `human_judgment: true`.

---
*Phase: 04-rondas-de-entrevista*
*Completed: 2026-11-02*

## Self-Check: PASSED

- Created file exists: `interview-delete-dialog.tsx`.
- Commits `a7da415`, `937e995` and `bf6d82d` are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (contracts 55, api 317, web 487) and `npm run lint` exit 0; every acceptance criterion grep of the three tasks passes.
