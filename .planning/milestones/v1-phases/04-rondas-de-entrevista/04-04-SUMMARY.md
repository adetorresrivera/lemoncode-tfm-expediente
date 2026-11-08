---
phase: 04-rondas-de-entrevista
plan: 04
subsystem: interview-rounds-integration
tags: [react, aria-disabled, compose-smoke, docs]

requires:
  - phase: 04-rondas-de-entrevista
    provides: "04-01..04-03: shared busy guard in the hook, InterviewActions, POST/PUT/DELETE round endpoints, dialogs and row actions"
provides:
  - "StatusChange prop locked: the status select is aria-disabled while any round mutation is in flight"
  - "Compose smoke round trip of the round endpoints (POST 201, PUT 200, DELETE 200) against the built image"
  - "docs/ARCHITECTURE.md round endpoint answers and the round 404 messages"
affects: [phase-05, phase-06]

plan_head_before: 52131f8f7157f8ff5c462c4225b6e32ddbc992e5
plan_head_after: 84791a8a9d074994f668d94f26b0d17e1b4c608e

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A control that is not what is being saved is aria-disabled without aria-busy (locked vs pending)"
    - "Smoke extracts an embedded id by cutting the body after the array key before grepping, so the parent id is never picked"

key-files:
  created: []
  modified:
    - apps/web/src/pods/application-detail/components/status-change.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
    - scripts/compose-smoke.sh
    - docs/ARCHITECTURE.md

key-decisions:
  - "The select keeps aria-busy for its own PATCH only; during a round mutation it is aria-disabled with aria-busy false (UI-SPEC busy state)"
  - "Tests fire the select change with fireEvent while a round dialog is open: the select sits behind the modal (aria-hidden, pointer-events off), so the pointer cannot reach it and the test proves the hook guard drops the request"

requirements-completed: [INT-01, INT-03, INT-04]

coverage:
  - id: D1
    description: "While a round is added, edited or deleted «Cambiar estado» is aria-disabled (aria-busy false) and a change sends no PATCH; while a status PATCH is pending «Añadir ronda», edit and delete are aria-disabled and open nothing; everything is available again afterwards"
    requirement: INT-01
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#one change at a time across the detail"
        status: pass
    human_judgment: false
  - id: D2
    description: "The built image answers the round round trip: POST 201 with en_entrevistas and round 1, PUT 200 with the new outcome, DELETE 200 with empty interviews, then the application is deleted"
    requirement: INT-04
    verification:
      - kind: integration
        ref: "bash scripts/compose-smoke.sh --down (== interview rounds round trip ==, ends with SMOKE OK)"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs/ARCHITECTURE.md states the answers of the three round endpoints and the round 404 messages"
    requirement: INT-03
    verification: []
    human_judgment: true
    rationale: "Documentation wording; checked by grep of the acceptance criteria and by review"
  - id: D4
    description: "Keyboard-only flow, native datetime picker per browser, dark theme and the dialog at 360 px with the soft keyboard (footer reachable, no sideways scroll)"
    verification: []
    human_judgment: true
    rationale: "jsdom does not exercise Tailwind layout, native pickers or the soft keyboard; the plan's human-check was not run in this session and is left for the end-of-phase UAT (DEMO-03 in Phase 6)"

duration: 25min
completed: 2026-11-02
status: complete
---

# Phase 4 Plan 04: Phase gate for interview rounds Summary

**The status select now waits while a round saves (`locked` fed by the shared busy state), the compose smoke proves POST/PUT/DELETE of rounds in the built image with rule 3 applied, and the architecture doc states what each round endpoint answers; no dependency added.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2
- **Files modified:** 5
- **Commits:** 2 task commits (`1b3ef33`, `84791a8`)

## Accomplishments

- `StatusChange` takes a required `locked` prop: `aria-busy={pending}` is unchanged and `aria-disabled={pending || locked}`, never `disabled`, so focus is not dropped. `ApplicationDetailComponent` passes `locked={interviewActions.busy}`; no other prop changed, so direct renders in `application-detail.test.tsx` needed no edit.
- Four new tests in `application-detail.interviews.test.tsx`: the select is aria-disabled with aria-busy false during a deferred POST, PUT and DELETE of a round, a change sends no PATCH, and it is enabled again afterwards; while a status PATCH is pending «Añadir ronda», «Editar ronda 1» and «Eliminar ronda 1» are aria-disabled and open no dialog, then become available and «Añadir ronda» opens the dialog.
- `scripts/compose-smoke.sh`: new «interview rounds round trip» block between the PATCH to enviada and the tags call: POST (201, `"status":"en_entrevistas"`, `"round":1`), round id taken from the text after `"interviews":[` and checked to be non-empty and different from the application id, PUT (200, `"outcome":"superada"`), DELETE (200, `"interviews":[]`). The existing application DELETE stays last.
- `docs/ARCHITECTURE.md`: the three round rows now say POST 201, PUT 200 and DELETE 200 with the whole application (DELETE without renumbering), and the codes line adds the 404 `NOT_FOUND` messages «Candidatura no encontrada» and «Ronda no encontrada» for the round routes.
- No dependency added; lockfile and `packages/contracts` unchanged.

## Task Commits

1. **Task 1: The status select waits while a round is saving** - `1b3ef33` (feat)
2. **Task 2: Prove the round endpoints under docker compose and pass the phase gate** - `84791a8` (test; smoke script and docs)

**Plan metadata:** committed separately after this file (docs).

## Gate results

| Check | Result |
|-------|--------|
| `npm run typecheck` | pass (contracts, api, web) |
| `npm run lint` | pass (`--max-warnings=0`) |
| `npm run test` | pass: contracts 55, api 317, web 491 (14 files) |
| `npm run build` | pass (contracts, api, web) |
| `bash -n scripts/compose-smoke.sh` | pass |
| `bash scripts/compose-smoke.sh --down` | pass: all sections including «interview rounds round trip», ends with `SMOKE OK`; containers removed, volumes kept |
| Task 1 and Task 2 acceptance greps | pass |

## Deviations from Plan

None - plan executed exactly as written.

Minor choices inside the plan's latitude: the smoke's DELETE assertion uses `grep -qF '"interviews":[]'` (fixed string) so the literal appears in the script as the acceptance criterion expects; the round id is matched as 24 hex characters (round ids are stringified ObjectIds in the repository).

## Issues Encountered

- The sandbox refused heredoc-appended files and chained git commands in one call; resolved by using Edit and separate commands.
- The per-plan commit ledger file under the worktree git dir could not be written (writes to the shared `.git` path are blocked for this agent); `plan_head_before` is the known base `52131f8` and `commits` is measured as `git rev-list --count 52131f8..HEAD` = 2 before this SUMMARY commit.
- The smoke leaves nothing behind on success (round deleted, then the application). A failure mid-run could leave one record in the compose volume; the missing failure trap is the open finding WR-02, accepted by the plan.

## TDD Gate Compliance

Task 1 is `tdd="true"`. RED: the four tests were appended first and run; 3 of 60 failed on the planned assertion (`aria-disabled` expected `"true"`, received `"false"` on the status select during POST, PUT and DELETE of a round). The fourth test (round controls during a status PATCH) already passed because 04-03 wired that direction; it is a regression guard and a non-target of RED. Semantic assessment: the failures are on the target assertion for the intended reason, not on syntax, import or fixture faults. GREEN: adding `locked` made all 60 pass (175 in the pod and router run). The pre-commit hook runs `tsc` over the workspace, and the test passes `locked` only through the component, so RED and GREEN were committed together as one `feat(04-04)` commit (Phase 2/3/04-02/04-03 convention); no separate `test(04-04)` commit for the RED step. Flagged for the end-of-phase review. The `test(04-04)` commit that exists is Task 2's smoke script (a non-TDD task), not a RED gate.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-04-15 (concurrent status and round mutations) is mitigated by the shared busy guard of 04-01, keyed `replaceResult`, and now `aria-disabled` on the select, covered by the new tests. T-04-16 (smoke records in the compose database): the smoke deletes the round and then the application it created. T-04-SC: no package installed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 is complete in code, tests, build and the compose smoke. Left for the end-of-phase UAT (human-check, not run here): with `docker compose up --build` and http://localhost:8080, keyboard only: create an application, move it to Enviada, add a round (focus back on «Añadir ronda», badge and history show En entrevistas, one announcement), edit it with a date picked in the native picker, delete it (focus on «Añadir ronda»); while a round saves, «Cambiar estado» cannot be changed; repeat the dialog at 360 px in dark theme with a mobile emulator's soft keyboard (the dialog scrolls inside itself, «Guardar ronda» stays reachable).
- Requirements INT-01, INT-03 and INT-04 are declared by this plan; REQUIREMENTS.md was not touched (orchestrator owns shared-file writes and the shared-ID gate).

---
*Phase: 04-rondas-de-entrevista*
*Completed: 2026-11-02*

## Self-Check: PASSED

- Modified files exist: `status-change.tsx`, `application-detail.component.tsx`, `application-detail.interviews.test.tsx`, `scripts/compose-smoke.sh`, `docs/ARCHITECTURE.md`.
- Commits `1b3ef33` and `84791a8` are ancestors of HEAD.
- `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` exit 0; `bash scripts/compose-smoke.sh --down` ends with `SMOKE OK`.
