---
phase: 02-candidaturas
plan: 09
subsystem: api-ui
tags: [hono, mongodb, react, radix-alert-dialog, optimistic-update, tanstack-router, vitest]
requires:
  - phase: 02-candidaturas
    provides: "02-07 GET /api/applications/:id and parseObjectId; 02-08 application-detail pod, ApplicationDetailScene and link render-prop seam; 02-01 statusChangeSchema; 02-03 NativeSelect, RequestStatus, StatusBadge"
provides:
  - "PATCH /api/applications/:id/status: one atomic pipeline findOneAndUpdate (history entry, appliedAt, updatedAt together); idempotent 200 for the current status; 400 for extra keys or unknown status; 404 for unknown or malformed ids"
  - "DELETE /api/applications/:id: 204, then 404; only the applications collection is touched"
  - "Repository changeStatus(id, status, now) and deleteById(id); service changeStatus(id, status) and remove(id)"
  - "Detail pod: patchApplicationStatus, deleteApplication, withOptimisticStatus, useApplicationDetail(id, { onDeleted }) with changeStatus, pendingStatus, statusFeedback, remove, deleteState; StatusChange and DeleteDialog components; container prop onDeleted"
  - "common/components/ui/alert-dialog.tsx (Radix AlertDialog on DS tokens, with an onOverlayClick seam)"
  - "core/router: HistoryState augmentation { focusHeading, notice } and useArrivalNotice() { notice, focusHeadingRef }, wired into the list scene"
affects: [02-10 create form (reuses useArrivalNotice for «Candidatura creada.»), 02-12 edit (adds «Editar» before the delete trigger in the header actions), Phase 4 interviews, Phase 5 documents (adds the documents sentence to the dialog)]
requirements-partial: ["APP-13: updatedAt bumps on every real status change here; the interview-changes clause is owned by Phase 4 (INT-01, INT-03, INT-04), whose mutations must go through the applications service"]
actuals:
  tokens: 19000
  tasks: 2
  commits: 2
  plan_head_before: 2cc0fb39b1c2b9a716a531ee71d372bb50f23a43
  plan_head_after: 6aa389dec883516cbec738e6aad50c1edbee41c6
tech-stack:
  added: []
  patterns:
    - "Atomic multi-field update as one pipeline findOneAndUpdate guarded by status $ne; null means not found OR no change, resolved by a follow-up findById (404 vs idempotent 200)"
    - "Hand-rolled serialized optimistic update: busy ref, snapshot from the closure, keyed mutation state, rollback on failure, 5 s success timer; never aborted on unmount, never refetched"
    - "One-shot arrival state: scene navigates with history state { focusHeading, notice }; useArrivalNotice reads it once, focuses the heading callback ref, publishes the notice from a timeout and replaces the history entry to clear it"
    - "Pod reports outcomes through callbacks (onDeleted); the scene decides the navigation"
key-files:
  created:
    - apps/api/src/applications/applications.status.test.ts
    - apps/api/src/applications/applications.delete.test.ts
    - apps/web/src/common/components/ui/alert-dialog.tsx
    - apps/web/src/pods/application-detail/components/status-change.tsx
    - apps/web/src/pods/application-detail/components/delete-dialog.tsx
    - apps/web/src/core/router/use-arrival-notice.ts
  modified:
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.routes.ts
    - apps/web/src/pods/application-detail/api/api.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.ts
    - apps/web/src/pods/application-detail/application-detail.vm.ts
    - apps/web/src/pods/application-detail/application-detail.hooks.ts
    - apps/web/src/pods/application-detail/application-detail.container.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx
    - apps/web/src/scenes/application-detail.scene.tsx
    - apps/web/src/scenes/application-list.scene.tsx
    - apps/web/src/core/router/router.ts
    - apps/web/src/core/router/router.test.tsx
key-decisions:
  - "No dependency added: AlertDialog comes from the installed radix-ui package; package.json and package-lock.json are unchanged. The HistoryState augmentation targets @tanstack/history (a transitive dependency of @tanstack/react-router that already declares the interface), so nothing new is imported at runtime"
  - "Same-status PATCH is an idempotent 200 with the unchanged application (no history entry, updatedAt kept), not an error"
  - "The route parses the id before the body, so a malformed id answers 404 even with an invalid body"
  - "Radix AlertDialog ignores outside interaction by design, so the overlay-click close required by UI-SPEC is added through onOverlayClick on AlertDialogContent, driven by the controlled open state of DeleteDialog (which also ignores every close request while deleting)"
  - "Optimistic update is hand-rolled instead of React useOptimistic (RESEARCH Q3: it let two PATCHes run concurrently)"
  - "After a successful DELETE the hook keeps deletingRef set and the state at deleting until the scene navigates away, so a late second click cannot send a second DELETE"
patterns-established:
  - "Pods keep mutation feedback as { kind, message } in an always-mounted role=status slot; the select uses aria-busy and aria-disabled, never disabled"
  - "Scenes pass navigation intent (replace plus history state) to the router; destination scenes consume it with useArrivalNotice"
requirements-completed: [APP-10, APP-11, APP-13, APP-03]
coverage:
  - id: D1
    description: "PATCH /api/applications/:id/status appends exactly one history entry per real change, sets appliedAt only on the first move to enviada while empty (equal to the entry instant), bumps updatedAt, is idempotent for the current status, and survives three concurrent identical PATCHes"
    requirement: "APP-10"
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.status.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH validation and addressing: strict body (extra keys, unknown status, non-JSON content type) answers 400; unknown or malformed id answers 404 and creates nothing"
    requirement: "APP-13"
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.status.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "DELETE /api/applications/:id answers 204 and removes only that application; a documents row is untouched; a second DELETE and PATCH/GET after the delete answer 404 and never recreate the document"
    requirement: "APP-03"
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.delete.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cambiar estado selector: optimistic badge, select and history, one serialized PATCH, server response replaces the view, polite success and error messages, rollback to the snapshot on failure, no PATCH for the current status, aria-busy and aria-disabled while pending"
    requirement: "APP-10"
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#status change"
        status: pass
    human_judgment: false
  - id: D5
    description: "Delete dialog: title and description with the long-text classes, initial focus on Conservar candidatura, Esc, overlay and cancel close it and return focus to Eliminar, pending state ignores closing, failure keeps the dialog open with the polite error"
    requirement: "APP-03"
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#delete dialog"
        status: pass
    human_judgment: false
  - id: D6
    description: "Delete flow end to end: confirming navigates to /applications with replace, focuses the list h1, shows «Candidatura eliminada.» once and clears the history state; a fresh load shows no notice and moves no focus"
    requirement: "APP-03"
    verification:
      - kind: automated_ui
        ref: "apps/web/src/core/router/router.test.tsx#application detail navigation"
        status: pass
    human_judgment: false
  - id: D7
    description: "Keyboard and visual pass of the status selector and delete dialog at 360 px in the dark theme (arrow-key change, rollback with the API stopped, Tab/Enter/Esc focus order in the dialog, landing on the list with focus on the heading)"
    verification: []
    human_judgment: true
    rationale: "Keyboard feel, focus ring visibility, 360 px layout and dark-theme contrast are visual judgments that jsdom cannot assess; harvested by the end-of-phase UAT"
duration: 38min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 09: Change status and delete from the detail Summary

**Atomic status changes (history entry, appliedAt, updatedAt in one pipeline update) with an optimistic, serialized, rollback-safe selector, plus DELETE behind an AlertDialog that lands on the list with a one-shot notice and heading focus**

## Performance

- **Duration:** 38 min
- **Tasks:** 2
- **Files modified:** 20 (6 created, 14 modified)

## Accomplishments

- `PATCH /api/applications/:id/status` is a single `findOneAndUpdate` with a pipeline `$set` guarded by `status: { $ne }`: status, a `$concatArrays` history entry, `appliedAt` (kept unless null or missing, only on a move to `enviada`) and `updatedAt` change together, so three concurrent PATCHes leave exactly two history entries and a list read never sees a status without its entry (the backstop truth handed over by 02-04 rests on this single-document atomicity). A null result is resolved by `findById`: absent is 404, present is the unchanged application (idempotent 200).
- The detail has «Cambiar estado»: instant badge, select and history update, one PATCH in flight, response replaces the view, polite «Estado cambiado a {estado}.» for 5 s, rollback and «No se pudo cambiar el estado. Inténtalo de nuevo.» on failure, with focus staying on the select (`aria-busy` and `aria-disabled`, never `disabled`).
- `DELETE /api/applications/:id` answers 204 on the applications collection only (no code path references the documents collection); a repeated DELETE, and PATCH or GET afterwards, answer 404 and nothing is recreated.
- «Eliminar» opens a Radix AlertDialog with initial focus on «Conservar candidatura»; Esc, overlay and cancel return focus to «Eliminar»; while the DELETE is pending the label reads «Eliminando…», both buttons are `aria-disabled` and close requests are ignored; a failure keeps the dialog open with a polite error and focus on the confirm button.
- On success the detail scene navigates to `/applications` with `replace: true` and history state `{ focusHeading, notice }`; the list scene's `useArrivalNotice` focuses the h1, announces «Candidatura eliminada.» from a post-mount timeout and replaces the history entry so a reload repeats nothing. Plan 02-10 reuses the hook for the create flow.

## Task Commits

1. **Task 1: Change status from the detail** - `5a38358` (feat; RED and GREEN committed together, see TDD Gate Compliance)
2. **Task 2: Delete behind a confirmation dialog** - `6aa389d` (feat; same)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `apps/api/src/applications/applications.repository.ts` - `changeStatus` (pipeline update, no upsert) and `deleteById` (`deleteOne` on applications only)
- `apps/api/src/applications/applications.service.ts` - `changeStatus` (one `now()`, idempotent fallback) and `remove`
- `apps/api/src/applications/applications.routes.ts` - `PATCH /:id/status` (id parsed first, strict `statusChangeSchema`) and `DELETE /:id` (`c.body(null, 204)`)
- `apps/api/src/applications/applications.status.test.ts`, `applications.delete.test.ts` - real-Mongo integration tests (injected clock, documents-row preservation)
- `apps/web/src/common/components/ui/alert-dialog.tsx` - AlertDialog wrappers: overlay `bg-sidebar/70`, content `max-h-[calc(100dvh-2rem)] overflow-y-auto`, `motion-reduce` variants, footer `flex-col-reverse sm:flex-row`
- `apps/web/src/pods/application-detail/components/status-change.tsx`, `delete-dialog.tsx` - the selector with its feedback slot and the confirmation dialog
- `apps/web/src/pods/application-detail/application-detail.{mapper,vm,hooks,container,component}` and `api/api.ts` - `withOptimisticStatus`, `StatusFeedback`/`DeleteState`, mutation state, `patchApplicationStatus`/`deleteApplication`, header actions row
- `apps/web/src/core/router/router.ts`, `use-arrival-notice.ts` - `HistoryState` augmentation and the one-shot arrival hook
- `apps/web/src/scenes/application-detail.scene.tsx`, `application-list.scene.tsx` - delete navigation and the notice line with heading focus
- `application-detail.test.tsx`, `router.test.tsx` - 6 status, 7 dialog, 1 mapper and 2 router tests added; existing assertions narrowed to the badge span now that the select repeats the status labels

## Decisions Made

See `key-decisions` in the frontmatter. Notable: no dependency added; the overlay-click close is a wrapper seam because Radix AlertDialog prevents outside interaction; the PATCH route parses the id before the body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing assertions matched the new select options**
- **Found during:** Task 1 (web tests)
- **Issue:** `getByText("Enviada")` / `getByText("Guardada")` inside the header now matched both the badge and the new select options
- **Fix:** scoped those assertions to `selector: "span"` (the badge) in `application-detail.test.tsx` and `router.test.tsx`
- **Files modified:** application-detail.test.tsx, router.test.tsx
- **Verification:** full web suite green
- **Committed in:** 5a38358

**2. [Rule 2 - Missing critical] Overlay click had no close path**
- **Found during:** Task 2 (AlertDialog)
- **Issue:** UI-SPEC and the plan truth require the overlay to close the dialog, but Radix AlertDialog calls `preventDefault` on outside pointer events, so the stock primitive never closes on overlay click
- **Fix:** `AlertDialogContent` takes `onOverlayClick`, wired to the same guarded close handler that ignores requests while a DELETE is pending
- **Files modified:** alert-dialog.tsx, delete-dialog.tsx
- **Verification:** "closes when the overlay is clicked" and the pending-state test pass
- **Committed in:** 6aa389d

**3. [Rule 1 - Bug] Test-data and prettier side effects**
- `prettier --write src` also reformatted the generated `routeTree.gen.ts` and `styles.css`; both were restored with `git checkout -- <file>` before committing, so neither is in the plan diff.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical) plus 1 housekeeping note
**Impact on plan:** None on scope; the plan's file list and interfaces were followed as written.

## TDD Gate Compliance

The pre-commit hook runs the whole suite, so a failing RED-only commit is impossible; RED was run locally and RED plus GREEN were committed together (the `test(...)` gate commit does not exist for either task; flagged here as the environment note anticipated).

- **Task 1 API RED:** `applications.status.test.ts` run before any implementation: 10 failed, 2 passed (the two that already held: unknown id gives 404 through the router fallback, text/plain gives 400 through `requireJson`). The failures were assertion failures on the planned behavior (`expected 404 to be 200/400` because the route did not exist), not load or syntax errors. semanticAssessment: valid RED, the target tests executed and failed on the planned assertions.
- **Task 1 web RED:** the new mapper and status-change tests were run before the implementation: 7 failed, 35 passed. `withOptimisticStatus` was an undefined import (assertion TypeError inside the target test only) and the selector tests failed on `findByRole("combobox", { name: "Cambiar estado" })`. semanticAssessment: valid RED; the file still loaded and the other 35 tests ran.
- **Task 2 API RED:** `applications.delete.test.ts` before the implementation: 5 failed, 1 passed (malformed ids already answered 404). Failures were `expected 404 to be 204` style assertions. semanticAssessment: valid RED.
- **Task 2 web:** the dialog and router tests were written after the components, so no separate RED run exists for them; they pass and assert the focus, pending and error behaviors from the plan. Recorded as a gap in discipline rather than claimed as RED.

## Issues Encountered

None blocking. `getByText` ambiguity from the repeated status labels (above) was the only friction.

## Known Stubs

None.

## Threat Flags

None. All new surface (PATCH and DELETE) is in the plan's threat model (T-02-19 to T-02-22): the atomic pipeline and concurrency test, snapshot rollback and busy ref, `deleteOne` on applications only with a documents-row test and a guard grep, strict body schema and `requireJson`.

## Partial requirements

APP-13 is **partial**: updatedAt now bumps on every real status change (this plan), on creation (02-01) and on PUT (02-12); the clause about interview changes is owned by Phase 4 (INT-01, INT-03, INT-04). Hand-over for Phase 4: every interview mutation must go through the applications service so `updatedAt` and the `enviada` to `en_entrevistas` rule stay in one place. APP-10, APP-11 and APP-03 (delete part) are complete.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 02-10 can call `useArrivalNotice()` in the detail scene for the create notice; `HistoryState` already carries `notice` and `focusHeading`.
- 02-12 adds «Editar» before `DeleteDialog` in the header actions grid (`grid grid-cols-2 gap-2 lg:flex`).
- The human-check of Task 2 (keyboard flow, rollback with the API stopped, 360 px dark theme) is left for the end-of-phase UAT.

## Self-Check: PASSED

- Created files exist: applications.status.test.ts, applications.delete.test.ts, alert-dialog.tsx, status-change.tsx, delete-dialog.tsx, use-arrival-notice.ts (all FOUND).
- Commits `5a38358` and `6aa389d` are ancestors of HEAD.
- `npm run typecheck`, `npm run lint` and `npm run test` pass (contracts 55, api 123, web 203).
- Acceptance greps pass: `$concatArrays`, `returnDocument: "after"`, `statusChangeSchema`, `withOptimisticStatus`, `deleteOne`, `c.body(null, 204)`, `from "radix-ui"`, `bg-sidebar/70`, `interface HistoryState`; no `upsert` and no `collection("documents")` in application code.
