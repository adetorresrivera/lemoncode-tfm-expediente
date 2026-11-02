---
phase: 04-rondas-de-entrevista
plan: 01
subsystem: api-and-detail-ui
tags: [hono, mongodb, aggregation-pipeline, react, tanstack-form, radix-dialog]

requires:
  - phase: 02-candidaturas-crud
    provides: applications API (status pipeline update, requireJson, parseObjectId) and the detail pod with its busy guard
  - phase: 01-fundaciones
    provides: "@tfm/contracts interview schemas (interviewInputSchema, interviewSchema)"
provides:
  - POST /api/applications/:id/interviews answering 201 with the whole updated Application
  - repository.addInterview, one atomic pipeline findOneAndUpdate (max + 1, rule 3, updatedAt)
  - INTERVIEW_STATUS_RULE in the service (rule 3 as data)
  - Dialog primitive (ui/dialog.tsx) on DS tokens with trigger-less focus return
  - InterviewsSection with the add dialog, InterviewActions seam, shared busy guard
affects: [04-02, 04-03, 04-04]

plan_head_before: d60aca728e6af7849369abe888b1c9b478f766ef
plan_head_after: 890e3510680f9258ce6040f4a73e99a8ce38a90c

actuals:
  tokens: 19000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Pipeline update with $literal on every client value, rule parameters passed in by the service"
    - "Trigger-less controlled Radix Dialog: stored opener + onCloseAutoFocus preventDefault + manual focus"
    - "Form created inside the dialog content so every opening starts fresh"
    - "Shared busy ref + busy state for every mutation of the detail; mutation promises reject after releasing busy"

key-files:
  created:
    - apps/api/src/applications/applications.interviews.test.ts
    - apps/web/src/common/components/ui/dialog.tsx
    - apps/web/src/pods/application-detail/components/interviews-section.tsx
  modified:
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.routes.ts
    - apps/web/src/common/lib/enum-labels.ts
    - apps/web/src/pods/application-detail/api/api.ts
    - apps/web/src/pods/application-detail/application-detail.vm.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.ts
    - apps/web/src/pods/application-detail/application-detail.hooks.ts
    - apps/web/src/pods/application-detail/application-detail.container.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx

key-decisions:
  - "Rule 3 reading: the service owns INTERVIEW_STATUS_RULE = { from: enviada, to: en_entrevistas } and passes it to repository.addInterview, whose pipeline evaluates it in the same findOneAndUpdate; the repository holds no status literal"
  - "Create uses a pipeline update (not $push) so max + 1 and the enviada test read the stored document inside one atomic write (D-05 intent kept)"
  - "onCloseAutoFocus calls preventDefault and focuses the opener stored from event.currentTarget on click, because Radix restores focus only to a Trigger"
  - "max + 1 is capped at Number.MAX_SAFE_INTEGER on the API and in the client prefill (a repeated number, D-07), so an automatic number never leaves the contract"
  - "scheduledAt is stored as new Date(value).toISOString() (same instant, millisecond precision)"
  - "InterviewDialog stays non-exported inside interviews-section.tsx for this plan; 04-02 moves it to components/interview-dialog.tsx"

patterns-established:
  - "Pod form helpers (Field, controlProps, firstFieldError) copied locally, never imported from another pod"
  - "Round feedback has its own keyed slot and region; the header status slot is not used for the automatic status move"

requirements-completed: []
requirements-partial:
  - "INT-01: API create and the dialog with Tipo and Ronda are done; date, mode, outcome and notes controls come in 04-02"
  - "APP-13: updatedAt is set on round creation; round edit and delete come in 04-03"
  - "INT-02: next-round prefill (max + 1, capped) and emptied-field handling done; ordering and the full row in 04-02"
  - "INT-04: rule 3 on create done and tested; the status select's own aria-disabled during a round save lands in 04-04"

coverage:
  - id: D1
    description: "POST /api/applications/:id/interviews creates a round atomically with server id, max + 1, defaults and updatedAt"
    requirement: INT-01
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#creates round 1, moves an enviada application to en_entrevistas and sets updatedAt"
        status: pass
      - kind: integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#round numbers"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rule 3 fires only from enviada (appends exactly one en_entrevistas history entry, also under concurrent POSTs)"
    requirement: INT-04
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#rule 3 only fires from enviada"
        status: pass
      - kind: integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#stores rounds 1 and 2 and one history entry for two concurrent POSTs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Input boundaries and injection safety (notes limit, bad rounds, scheduledAt forms, 404s, $-prefixed notes, mass assignment)"
    requirement: INT-01
    verification:
      - kind: integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#input boundaries"
        status: pass
      - kind: integration
        ref: "apps/api/src/applications/applications.interviews.test.ts#what the client cannot control"
        status: pass
    human_judgment: false
  - id: D4
    description: "Add dialog from the detail: Tipo and Ronda prefilled, one POST, response replaces rounds, badge, history and announces the status move"
    requirement: INT-02
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#interview rounds adds a round through the dialog"
        status: pass
    human_judgment: false
  - id: D5
    description: "Dialog behaviour under validation, pending save, failed save, focus return and one-mutation-at-a-time"
    requirement: INT-02
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#interview rounds"
        status: pass
    human_judgment: false
  - id: D6
    description: "Keyboard-only flow and visual rendering of the dialog and the section in the running app"
    verification: []
    human_judgment: true
    rationale: "Plan Task 2 carries a human-check (keyboard walk-through, API stopped mid-save); jsdom does not apply Tailwind, so focus rings, layout and the 360 px rendering are not asserted by tests"

duration: 12min
completed: 2026-11-02
status: complete
---

# Phase 4 Plan 01: Add a round from the detail (tracer) Summary

**Atomic `POST /api/applications/:id/interviews` (one pipeline `findOneAndUpdate` applying max + 1, rule 3 and `updatedAt`) wired end to end to a trigger-less Radix add dialog in the detail, with the response replacing rounds, badge and history in one render.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-11-02T19:13:00Z
- **Completed:** 2026-11-02T19:25:00Z
- **Tasks:** 2
- **Files modified:** 14 (3 created, 11 modified)

## Accomplishments

- API: `POST /:id/interviews` answers 201 with the whole `Application`. The repository appends the round with `$concatArrays`, numbers it `max + 1` (capped at `Number.MAX_SAFE_INTEGER`) and applies rule 3 and `updatedAt` in the same `findOneAndUpdate`; every client value is inside `$literal`. Two concurrent POSTs on an `enviada` application store rounds 1 and 2 and exactly one `en_entrevistas` history entry.
- Web: `InterviewsSection` between Etiquetas and Notas with an always-mounted polite region, the empty state, the list as `Ronda N · Tipo`, and the «Añadir ronda» dialog (Tipo required, Ronda prefilled and optional). `ui/dialog.tsx` is the new Radix Dialog primitive on DS tokens.
- Hook: `useApplicationDetail` gained `interviewActions { busy, feedback, add }`, a shared busy state next to `busyRef`, a separate keyed feedback slot and one 5 s timer for both slots; `useInterviewForm` and `InterviewFormApi` are exported for the dialog.
- 28 real-Mongo API tests and 14 new web tests cover the plan's behaviours; the full workspace suite (api 299, web 421, contracts 55), `npm run typecheck` and `npm run lint` pass.

## Task Commits

1. **Task 1: Tracer, add a round from the detail with rule 3 through the API** - `2567045` (feat)
2. **Task 2: Adding a round holds at the limits, on failures and while another change is saving** - `890e351` (test)

**Plan metadata:** committed separately after this file (docs).

## Files Created/Modified

- `apps/api/src/applications/applications.repository.ts` - `InterviewStatusRule`, `NewInterview`, atomic `addInterview`
- `apps/api/src/applications/applications.service.ts` - `INTERVIEW_STATUS_RULE`, `addInterview` (id from `new ObjectId().toString()`, element built field by field)
- `apps/api/src/applications/applications.routes.ts` - `POST /:id/interviews`
- `apps/api/src/applications/applications.interviews.test.ts` - real-Mongo tests of the endpoint
- `apps/web/src/common/components/ui/dialog.tsx` - `Dialog`, `DialogContent` (X last), `DialogTitle`, `DialogDescription`, `DialogFooter`
- `apps/web/src/common/lib/enum-labels.ts` - interview type, mode and outcome labels
- `apps/web/src/pods/application-detail/{api/api.ts, application-detail.vm.ts, .mapper.ts, .hooks.ts, .container.tsx, .component.tsx}` - `createInterview`, VM and form types, mappers and validation, hook seam, wiring
- `apps/web/src/pods/application-detail/components/interviews-section.tsx` - section and (non-exported) `InterviewDialog`
- `apps/web/src/pods/application-detail/application-detail.test.tsx` - four Phase 2 tests adjusted plus `describe("interview rounds")`

## Decisions Made

- No dependency added; lockfile unchanged; `packages/contracts` unchanged.
- Explicit 14-file tracer scope, one file per layer of the single path (acknowledged in the plan).
- Rule 3 reading, pipeline-instead-of-`$push`, focus mechanism, `Number.MAX_SAFE_INTEGER` cap and `scheduledAt` normalization as listed in `key-decisions`.
- Four Phase 2 tests changed in `application-detail.test.tsx`: the strict VM test gains `interviews: []` and `newInterviewValues`; the «never renders interview rounds or linked documents» test became «never renders linked documents» (rounds now exist); the polite-region count went from 2 to 3 (header slot, notice, rounds region); the three direct `ApplicationDetailComponent` renders pass an idle `interviewActions`.
- `InterviewDialog` moves to `components/interview-dialog.tsx` in 04-02 when it gains date, mode, outcome and notes controls.

## Deviations from Plan

None - plan executed as written. The pipeline-instead-of-`$push` choice, the rule-3 location and the focus mechanism were stated in the plan's own assumptions and are recorded above for review.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** none.

## TDD Gate Compliance

Task 1 is a tracer (production code plus its happy-path tests in one `feat` commit, because the pre-commit hook runs the whole suite and the required `interviewActions` prop breaks the existing pod tests until they change in the same commit). Task 2 is `tdd="true"`, but every behaviour in its `<behavior>` list was already satisfied by the Task 1 implementation, so its tests were GREEN on their first run and no RED commit exists:

- RED: not demonstrable. The Task 2 tests (`test(04-01)` commit `890e351`) passed on first execution (api 28/28, web 66/66). Semantic assessment: this is an "unexpected green" caused by the tracer already covering the limits (`$literal`, cap, `$ifNull`, close guard, busy release order); no assertion was weakened to make it pass. Verified by reading each failing-mode in the implementation rather than by a failing run.
- GREEN: implementation commit `2567045` (`feat(04-01)`), which precedes the test commit.
- REFACTOR: none.

The order is therefore feat then test, the reverse of the usual gate; flagged here for the end-of-phase review.

## Issues Encountered

None. Tool sandbox refused chained heredoc and git commands in one call; resolved by splitting commands and using the Write and Edit tools.

## Known Stubs

None. Date, mode, outcome and notes are not rendered or editable yet by design: `mode: "online"` and `outcome: "pendiente"` travel as form defaults and 04-02 adds the controls (documented in the plan).

## Threat Flags

None beyond the plan's threat model. T-04-01 (all client values in `$literal`, test stores `$title` verbatim), T-04-02 (field-by-field element, server id, mass-assignment test), T-04-03 (`requireJson`, `parseObjectId`, schema limits, boundary tests), T-04-04 (single pipeline, concurrency test), T-04-05 (no `console.` in routes, service or repository), T-04-06 (no raw HTML injection in the pod) are all mitigated and tested or grep-guarded.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-02 can add Fecha y hora, Modalidad, Resultado and Notas controls to the dialog (moving it to `components/interview-dialog.tsx`) and the full round row and ordering without changing the model: `InterviewFormValues` and the mappers already carry every field.
- 04-03 extends `InterviewActions` with edit and delete using `$set` with `arrayFilters` and `$pull`; the busy guard, feedback slot and `useInterviewForm` are reusable as they are.
- Open item for 04-04: the status select's `aria-disabled` during a round save (the busy state is already exposed as `interviewActions.busy`; the select still reads `pendingStatus`).
- Not run: the plan's `human-check` (keyboard walk-through in `npm run dev`); tracked as D6 with `human_judgment: true`.

---
*Phase: 04-rondas-de-entrevista*
*Completed: 2026-11-02*

## Self-Check: PASSED

- Created files exist: `applications.interviews.test.ts`, `ui/dialog.tsx`, `components/interviews-section.tsx`.
- Commits `2567045` and `890e351` are ancestors of HEAD.
- Plan-level verification: `npm run typecheck`, `npm run test`, `npm run lint` all exit 0; every acceptance criterion grep of both tasks passes.
