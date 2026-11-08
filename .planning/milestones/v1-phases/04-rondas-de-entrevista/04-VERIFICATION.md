---
phase: 04-rondas-de-entrevista
verified: 2026-11-03T21:00:00Z
status: passed
score: 4/4 roadmap success criteria verified (plus 5/5 requirements satisfied in code)
covered_files:
  - .planning/phases/04-rondas-de-entrevista/04-01-PLAN.md
  - .planning/phases/04-rondas-de-entrevista/04-01-SUMMARY.md
  - .planning/phases/04-rondas-de-entrevista/04-02-PLAN.md
  - .planning/phases/04-rondas-de-entrevista/04-02-SUMMARY.md
  - .planning/phases/04-rondas-de-entrevista/04-03-PLAN.md
  - .planning/phases/04-rondas-de-entrevista/04-03-SUMMARY.md
  - .planning/phases/04-rondas-de-entrevista/04-04-PLAN.md
  - .planning/phases/04-rondas-de-entrevista/04-04-SUMMARY.md
  - apps/api/src/applications/applications.repository.ts
  - apps/api/src/applications/applications.routes.ts
  - apps/api/src/applications/applications.service.ts
  - apps/web/src/common/lib/format.ts
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
  - apps/web/src/pods/application-detail/application-detail.mapper.ts
  - apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-item.tsx
  - apps/web/src/pods/application-detail/components/interviews-section.tsx
  - apps/web/src/pods/application-detail/components/status-change.tsx
  - docs/ARCHITECTURE.md
  - scripts/compose-smoke.sh
covered_digest: "v4:sha256:78d53b755a46ed41f1152ddc1e92dcb2acd65f819ef4f6466b2998c4f14aa8d3"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/4
  gaps_closed: []
  gaps_remaining: []
  regressions: []
advisory:
  - finding: "Review WR-01 (04-REVIEW.md): `busyRef`/`busyKey` hold a single application key while status, round feedback and success timers are keyed per application; a same-instance id change A -> B -> A while A's PATCH is still pending can drop A's lock"
    category: other
    reason: "Confirmed by reading hooks.ts (startBusy overwrites busyRef unconditionally). Reachable only if the pod stays mounted across an id change and the user returns to the first application before its request settles; in the app the list route unmounts the pod. No red test or other deterministic evidence. Recorded in 04-REVIEW-DISPOSITION.md"
    evidence_status: "code reading only, no red test"
  - finding: "Review WR-02 (04-REVIEW.md): the unmount assertion in the per-application timer test only checks `clearTimeout` was called at least once"
    category: other
    reason: "Test-strength gap; the production code (cleanup clears every timer in the Map, mountedRef blocks late arming) was read and is correct, and a separate test 'arms no success timer when a change settles after unmount' passes"
    evidence_status: "code reading only, no red test"
---

# Phase 4: Rondas de entrevista Verification Report

**Phase Goal:** As a job seeker, I want to log the interview rounds of an application, so that its process history and status stay in sync without extra bookkeeping.
**Verified:** 2026-11-03
**Status:** passed
**Re-verification:** Yes. The previous report went stale because review-fix commit 2ea14e0 changed `application-detail.hooks.ts` and `application-detail.interviews.test.tsx` (status and round feedback and success timers keyed per application). The backend, mapper and component files have not changed since the previous pass (last commits 57aa1db and earlier), so they were regression-checked for existence and wiring; the two changed files were re-read.

The phase goal is achieved in the codebase. Every roadmap success criterion and every requirement (INT-01..INT-05) is backed by real, wired, data-flowing code and by passing tests. Review fix 2ea14e0 is present and does what it claims. The five human-verification items of the previous report are all `pass` in `04-UAT.md` (status complete, 6/6, including test 6 for 2ea14e0), so nothing remains for a human. No gaps. Two advisory review findings stay open (below).

## Goal Achievement

### Observable Truths (ROADMAP contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | From the detail, the user adds a round in a dialog with type, date, mode, outcome and notes; round number auto-assigned (max + 1) and editable | VERIFIED | `InterviewDialog` opened from `InterviewsSection` («Añadir ronda»); round prefilled from `nextInterviewRound`; hook `addInterview` -> POST -> `replaceResult` with the mapped response. Server `addInterview` (`applications.repository.ts:243`) computes max + 1 in one pipeline update when `round` is absent. UAT 1 (native picker) passed |
| 2 | The user can edit and delete an existing round from the detail | VERIFIED | `InterviewItem` edit/delete -> edit dialog -> `updateRound` -> PUT (`updateInterview`, repository:309, arrayFilters) ; delete via `InterviewDeleteDialog` confirmation -> DELETE (`removeInterview`, repository:328, `$pull`). Routes at `applications.routes.ts:48,56,64`. UAT 3 and 4 passed |
| 3 | The detail lists rounds ordered by round number, each showing type, date, mode and outcome | VERIFIED | Mapper sorts with `compareInterviews`; `InterviewItem` renders round, type, `<time>`, mode and outcome badge. Unchanged by the review fixes; its sort test is part of the passing web suite |
| 4 | Adding a round while `enviada` moves the application to `en_entrevistas` with a history entry; other statuses untouched; any round change updates `updatedAt` | VERIFIED | Server pipeline `$cond` on the stored status being `enviada` sets the new status and appends one history entry in the same atomic `findOneAndUpdate`; `updatedAt: now` on create, update and delete. Covered by the real-Mongo API tests (317 passing per the regression gate) |

**Score:** 4/4 roadmap truths verified; 0 behavior-unverified.

### PLAN must-haves (merged)

| Truth | Status | Evidence |
|-------|--------|----------|
| Atomic create, client values never evaluated, ISO UTC `scheduledAt`, delete does not renumber, distinct 404s | VERIFIED | Backend files unchanged since the previous pass; API suite green; `04-SECURITY.md` threats_open 0 |
| One mutation at a time, response written only for the same key (D-16) | VERIFIED | `isBusy/startBusy/endBusy` in `hooks.ts:122-130` shared by `changeStatus`, `addInterview`, `updateRound`, `removeRound`; `replaceResult` applies only when `previous.key === next.key`; `StatusChange locked={interviewActions.busy}` (`component.tsx:129`) |
| Status and round feedback and success timers per application (fix 2ea14e0) | VERIFIED | `mutations` is `Record<key, Mutation>`, `interviewFeedbacks` is `Record<key, string>`, `successTimersRef` is a `Map<key, timer>`; `scheduleSuccessClear` clears the previous timer of the same key before arming; `dropSuccess(target)` touches only its key; unmount cleanup clears every timer in the Map and `mountedRef` blocks late arming. Tests at `interviews.test.tsx:1510` (no cross-application lock), `:1553` (feedback survives another application's late settle), `:1602` (one timer per application), `:1668` (no timer after unmount). Full file run by me: 67 passed. UAT 6 passed |
| Stored date kept when the control is untouched (fix 57aa1db) | VERIFIED | Present in `hooks.ts`/`mapper.ts`, tests pass, UAT 4 passed |
| Focus after dialogs, polite status region | VERIFIED | UAT 3 passed |
| Compose smoke round trip | VERIFIED (static) | `scripts/compose-smoke.sh` still asserts POST/PUT/DELETE; the previous verification report recorded `SMOKE OK` before 2ea14e0, which touches only web files; not re-run by me (needs Docker) |
| `docs/ARCHITECTURE.md` documents the three endpoints | VERIFIED | Present |
| typecheck and tests | VERIFIED | Regression gate reported by the caller: `npm run typecheck && npm run test` clean (contracts 55, api 317, web 498). I re-ran the interviews test file: 67 passed |
| Native datetime-local picker; 360 px dialog scroll (backstop truths) | VERIFIED by human | UAT 1 and 2 passed in real browsers |

### Prohibitions (judgment tier)

| Prohibition | Verdict | Evidence |
|-------------|---------|----------|
| No status change unless stored status is exactly `enviada` | Not violated | Pipeline `$eq` on stored status; update/delete set no status |
| No round/status/history shown before the server confirms | Not violated | Rounds call `replaceResult` only with the API response |
| Notes / request body never logged | Not violated | No logging in interview code; `04-SECURITY.md` closed |
| No renumbering on delete; no delete without confirmation | Not violated | `$pull` only; confirmation dialog |
| One mutation at a time; an earlier response never overwrites a newer view | Not violated for round and status data (keyed `replaceResult`, per-key feedback and timers). Residual: single-slot busy lock across a same-instance A -> B -> A id change (advisory) | `hooks.ts` |

A human confirmed the judgment-tier prohibitions in UAT 5 (pass), so they are no longer flagged as unresolved.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/applications/applications.{repository,service,routes}.ts` | VERIFIED | Substantive, wired, real Mongo queries |
| `interviews-section.tsx`, `interview-dialog.tsx`, `interview-item.tsx`, `interview-delete-dialog.tsx` | VERIFIED | `InterviewsSection` rendered at `application-detail.component.tsx:146` |
| `status-change.tsx` (`locked`) | VERIFIED | Wired at `component.tsx:129` |
| `application-detail.hooks.ts` / `.mapper.ts` / `common/lib/format.ts` | VERIFIED | Substantive and used |
| `application-detail.interviews.test.tsx` | VERIFIED | 67 tests pass |
| `scripts/compose-smoke.sh`, `docs/ARCHITECTURE.md` | VERIFIED | Present with round-trip assertions / endpoint rows |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| service -> repository (`addInterview`/`updateInterview`/`removeInterview`) | WIRED | |
| routes -> service (POST/PUT/DELETE `/:id/interviews`) | WIRED | `routes.ts:48,56,64` |
| hook -> api client -> mapper -> `replaceResult` | WIRED | |
| component -> `InterviewsSection` (`interviewActions`) and `StatusChange` (`locked`) | WIRED | `component.tsx:129,146` |
| smoke -> `/interviews` endpoints | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Status |
|----------|------|--------|--------|
| Rounds list, status badge, history | `vm` mapped from the Mongo-backed API response | real server response | FLOWING |
| Add dialog prefill / edit stored date | stored rounds in the current VM | real | FLOWING |
| Per-application feedback and timers | `interviewFeedbacks[key]`, `mutations[key]`, `successTimersRef.get(key)` | hook state written on settle | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Interviews pod tests, including the 2ea14e0 tests | `npx vitest run src/pods/application-detail/application-detail.interviews.test.tsx` (apps/web) | 67 passed | PASS |
| Whole workspace | `npm run typecheck && npm run test` (reported by caller) | clean; 55 / 317 / 498 | PASS |

### Probe Execution

No `probe-*.sh` declared by the phase plans. Skipped.

### Requirements Coverage

All five IDs appear in PLAN frontmatter and match the five REQUIREMENTS.md entries mapped to Phase 4. No orphaned requirement.

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| INT-01 | 04-01, 04-02, 04-04 | SATISFIED | Dialog with all fields -> POST |
| INT-02 | 04-01, 04-03 | SATISFIED | Server max + 1 plus prefill plus editable «Ronda» |
| INT-03 | 04-03, 04-04 | SATISFIED | PUT arrayFilters / DELETE `$pull` plus UI with confirmation |
| INT-04 | 04-01, 04-04 | SATISFIED | Atomic pipeline rule |
| INT-05 | 04-02 | SATISFIED | `compareInterviews` plus `InterviewItem` |

Note: `.planning/REQUIREMENTS.md` still shows INT-01..INT-05 as `[ ]` (lines 54-58) and `Pending` in the traceability table (lines 152-156), and ROADMAP line 18 shows Phase 4 as `[ ]`. The code satisfies them; the orchestrator should tick them at phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | grep for `TBD/FIXME/XXX/TODO` over the modified source files returned nothing | - | None |
| `application-detail.hooks.ts` | 85, 122-130 | Review WR-01: single-slot busy lock (`busyRef`/`busyKey`) outside the per-key design | Advisory | Only with a same-instance id change A -> B -> A during A's pending request; the real router unmounts the pod between applications. Candidate for Phase 6 polish |
| `application-detail.interviews.test.tsx` | 1654-1661 | Review WR-02: weak `clearTimeout >= 1` assertion | Advisory | Test-strength only; production cleanup read and correct |
| `application-detail.hooks.ts` | ~90, 342-353 | Review IN-02: `deletingRef`/`onDeleted` not scoped to the application | Info | Unlikely (modal delete dialog) |
| various | - | Review IN-01, IN-03 | Info | Recorded open in `04-REVIEW-DISPOSITION.md` |

The earlier advisory (single-slot `mutation`, `interviewFeedback` and `successTimerRef`) is closed by 2ea14e0; only the busy lock remains single-slot.

### Human Verification Required

None. All items from the previous report passed in `04-UAT.md` (6/6, complete).

### Gaps Summary

No gaps. The backend is an atomic, injection-safe implementation of create, edit and delete with the `enviada` -> `en_entrevistas` rule applied in the same write. The web pod is wired from dialog to hook to API client to view-model replacement, serialised to one mutation at a time, with status feedback, round feedback and success timers now keyed per application. Typecheck and suites are green, and the human checks are done. Two advisory review findings (busy lock single slot, weak timer assertion) and the stale REQUIREMENTS/ROADMAP checkboxes are the only open items; none blocks the goal.

---

_Verified: 2026-11-03_
_Verifier: Claude (gsd-verifier)_
