---
phase: 04-rondas-de-entrevista
verified: 2026-11-03T12:00:00Z
status: human_needed
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
covered_digest: "v4:sha256:99d7b04cdf7779929f4a4b3bc2ee8c3efd8f9406da908eed2fd9b7fcccc1dfa7"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/4
  gaps_closed: []
  gaps_remaining: []
  regressions: []
advisory:
  - finding: "Review WR-01 (04-REVIEW.md): after the WR-02 fix the busy lock is per application but `mutation`, `interviewFeedback` and `successTimerRef` are single-slot, so a late settle of application A can overwrite B's feedback and orphan a success timer"
    category: other
    reason: "Confirmed by reading hooks.ts (the PATCH .then/.catch call setMutation({key, ...}) unconditionally and scheduleSuccessClear never clears an existing timer). No failing test or other deterministic evidence; effect is a lost or early-cleared status message, only when two applications have mutations in flight at once. Recorded open in 04-REVIEW-DISPOSITION.md"
    evidence_status: "code reading only, no red test"
human_verification:
  - test: "Pick a date and time with the native datetime-local picker in Chrome, Firefox and Safari, save the round, and compare the list label with the picked value"
    expected: "The round shows the same local date and time that was picked (04-02 backstop truth)"
    why_human: "Native browser picker behavior cannot be exercised in jsdom; unit tests only cover localInputToIso / isoToLocalInput"
  - test: "At 360 px with the soft keyboard open, open Añadir ronda / Editar ronda"
    expected: "The dialog scrolls inside itself, footer buttons stay reachable, nothing scrolls sideways (04-04 backstop truth)"
    why_human: "Layout and soft-keyboard behavior need a real viewport"
  - test: "Keyboard-only run of add -> edit -> delete (Tab, Enter, Esc, arrows on the toggle groups) in light and dark theme"
    expected: "Focus returns to the opener after each dialog closes (to Añadir ronda after a delete); visible focus ring; contrast AA in both themes"
    why_human: "Real focus order and visual contrast are not observable through jsdom"
  - test: "Edit only the outcome of a round whose stored scheduledAt has seconds or is the second pass of the autumn DST overlap (API or seed created), then reload the detail"
    expected: "The round keeps its exact date and time (review fix 57aa1db, WR-01 of the first review)"
    why_human: "Review-fix status says date and DST logic needs human verification; covered by unit and UI tests but not by a real browser timezone"
  - test: "Judgment-tier prohibitions (status unmodified unless exactly enviada; no optimistic render of rounds; no notes/body in logs; no renumbering on delete; no delete without confirmation; one mutation at a time)"
    expected: "Reviewer confirms the non-authoritative verdicts below"
    why_human: "Judgment-tier prohibitions are LLM-judged only; flagged unverified-prohibition for human review, not a silent pass"
---

# Phase 4: Rondas de entrevista Verification Report

**Phase Goal:** As a job seeker, I want to log the interview rounds of an application, so that its process history and status stay in sync without extra bookkeeping.
**Verified:** 2026-11-03
**Status:** human_needed
**Re-verification:** Yes. The previous report went stale after review fixes 57aa1db (WR-01, stored `scheduledAt` kept on edit) and 501d46f (WR-02, busy lock scoped to the application and to mount) changed `application-detail.hooks.ts` and `application-detail.mapper.ts`. All truths were re-checked against the current code; the two fixed files and their tests were re-read in full.

The phase goal is achieved in the codebase. Every roadmap success criterion and every requirement (INT-01..INT-05) is backed by real, wired, data-flowing code and by passing tests that I re-ran in this pass. The review fixes did not regress any truth. The status is `human_needed` because the plans declare `backstop` (non-inferable) truths, the judgment-tier prohibitions need a human look, and `04-UAT.md` still has 4 pending items. There are no gaps.

## Goal Achievement

### Observable Truths (ROADMAP contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | From the detail, the user adds a round in a dialog with type, date, mode, outcome and notes; round number auto-assigned (max + 1) and editable | VERIFIED | `InterviewsSection` hosts the `InterviewDialog` opened by «Añadir ronda»; `newInterviewFormValues(nextInterviewRound(...))` prefills max + 1 capped at `MAX_SAFE_INTEGER` (`mapper.ts`); hook `addInterview` -> `createInterview` POST -> `replaceResult` with the mapped response. Server `addInterview` (`repository.ts:~243`) computes `$max(interviews.round)+1` inside one pipeline update when `round` is absent, or `$literal` of the sent one |
| 2 | The user can edit and delete an existing round from the detail | VERIFIED | `InterviewItem` edit/delete buttons -> edit dialog («Ronda» required) -> `updateRound` -> PUT; delete via `InterviewDeleteDialog` confirmation -> `removeRound` -> DELETE. Server `updateInterview` uses `arrayFilters` on the element id, `removeInterview` uses `$pull`, with distinct 404s. After the WR-01 fix the hook looks the stored round up and passes `{local, iso}` so an untouched date control sends the stored ISO back (`hooks.ts` updateRound, `mapper.ts` `mapInterviewFormToApiInput`); a changed or cleared control behaves as before |
| 3 | The detail lists rounds ordered by round number, each showing type, date, mode and outcome | VERIFIED | `mapApplicationFromApiToDetailVm` sorts with `compareInterviews` (round, then scheduledAt instant with null last, then id); `InterviewItem` renders «Ronda N · Tipo», `<time>`/«Sin fecha», mode label and outcome badge. Unchanged by the review fixes |
| 4 | Adding a round while `enviada` moves the application to `en_entrevistas` with a history entry; other statuses untouched; any round change updates `updatedAt` | VERIFIED | `addInterview` pipeline `$cond` on `$eq: ["$status", {$literal: "enviada"}]` sets status and appends one `{status, at: now}` history entry in the same atomic `findOneAndUpdate`; `updatedAt: now` in create, update and delete (`repository.ts`). Covered by real-Mongo tests |

**Score:** 4/4 roadmap truths verified; 0 behavior-unverified.

### PLAN must-haves (merged)

| Truth | Status | Evidence |
|-------|--------|----------|
| Atomic create (concurrent POSTs get rounds 1 and 2, one history entry) | VERIFIED | Single pipeline `$set` reading only the input document; `applications.interviews.test.ts` passes in the full API run |
| Client values never evaluated (`$literal`, field-by-field build) | VERIFIED | `$literal` on every client value in `repository.ts`; service builds the element field by field; T-04-02 closed in `04-SECURITY.md` |
| `scheduledAt` stored as ISO UTC; offset/naive rejected | VERIFIED | Service normalises through `toISOString()`; contracts regex tests pass |
| Edit requires «Ronda» (D-28), delete does not renumber, 404s distinguished | VERIFIED | `validateInterviewForm(values, mode)`; `updateRound` rejects an empty round; `$pull` only |
| One mutation at a time, response written only for the same key (D-16) | VERIFIED | `busyRef` now holds the application key; `isBusy()`/`startBusy()`/`endBusy()` shared by `changeStatus`, `addInterview`, `updateRound`, `removeRound`; `endBusy` releases only its own lock; `replaceResult` applies only when `previous.key === next.key`; `StatusChange locked={interviewActions.busy}` (`component.tsx:129`). WR-02 hook tests (no cross-application lock, no timer after unmount) pass |
| Stored date kept when the control is untouched (fix 57aa1db) | VERIFIED | Mapper unit test plus two UI tests (keep, change); run in this pass together with the WR-02 tests: 6 selected tests passed |
| Focus handling after dialogs close; polite status region with feedback messages | VERIFIED | `onCloseAutoFocus` handlers in the section; always-mounted `role="status" aria-live="polite"`; messages «Ronda añadida.», «… Estado cambiado a En entrevistas.», «Ronda actualizada.», «Ronda eliminada.» |
| Compose smoke round trip (POST/PUT/DELETE then deletes the application) | VERIFIED (static, plus report) | `scripts/compose-smoke.sh:~158-180` asserts 201 / 200 / 200, `en_entrevistas`, `"round":1`, outcome `superada`, `"interviews":[]`. The caller reports the compose smoke ended `SMOKE OK` today; not re-run by me (needs Docker) |
| `docs/ARCHITECTURE.md` documents the three endpoints | VERIFIED | Rows at lines 83-85 |
| typecheck, lint, tests | VERIFIED | Re-run by me: typecheck clean in all workspaces, `eslint . --max-warnings=0` clean, tests contracts 55 / api 317 / web 496, all passing |
| Native datetime-local picker and 360 px dialog scroll (backstop) | UNCERTAIN -> human | See Human Verification Required |

### Prohibitions (judgment tier, non-authoritative LLM verdict, flagged for human review)

| Prohibition | LLM verdict | Evidence |
|-------------|-------------|----------|
| No status change unless stored status is exactly `enviada` (-> `en_entrevistas`) | Not violated | Pipeline `$eq` on `$status`; update/delete `$set` lists no status |
| No round/status/history shown before server confirms | Not violated | `addInterview`/`updateRound`/`removeRound` only call `replaceResult` with the API response. The status change itself is optimistic by earlier design (Phase 2), not part of this prohibition |
| Notes / request body never logged or shown in errors | Not violated | Interview code has no logging; field messages are fixed Spanish copy; `04-SECURITY.md` threats_open 0 |
| `scheduledAt` shown without shifting the picked time | Not violated | Round trip `localInputToIso`/`isoToLocalInput`; unrepresentable stored instants are now sent back untouched while the control is unchanged |
| No renumbering on delete; no delete without confirmation | Not violated | `$pull` only; delete button opens `InterviewDeleteDialog` first |
| One mutation at a time; an earlier response never overwrites a newer view | Not violated for the round/status data (keyed `replaceResult`, per-key lock). Feedback slots are a separate, advisory concern (see below) | `hooks.ts` |

These are flagged `unverified-prohibition: human review recommended`; they are not a silent pass.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/applications/applications.repository.ts` (add/update/removeInterview) | VERIFIED | Substantive, wired from service, real Mongo queries |
| `applications.service.ts` / `applications.routes.ts` | VERIFIED | POST/PUT/DELETE `/:id/interviews[/:interviewId]` registered (`routes.ts:48,56,64`), input validated with contracts |
| `applications.interviews.test.ts` | VERIFIED | Part of the 317 passing API tests (real Mongo) |
| `interviews-section.tsx`, `interview-dialog.tsx`, `interview-item.tsx`, `interview-delete-dialog.tsx` | VERIFIED | `<InterviewsSection>` rendered in `application-detail.component.tsx:146` with `actions={interviewActions}` |
| `common/lib/format.ts` | VERIFIED | Used by the mapper |
| `status-change.tsx` (locked prop) | VERIFIED | `aria-disabled={pending \|\| locked}` |
| `application-detail.hooks.ts` / `.mapper.ts` (review-fixed) | VERIFIED | Substantive; fix logic read in full |
| `scripts/compose-smoke.sh` round trip | VERIFIED | Present and asserted |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| service -> repository | `addInterview(... INTERVIEW_STATUS_RULE, now)` | WIRED | rule constant lives in the service |
| repository -> Mongo | `findOneAndUpdate` pipeline / arrayFilters / $pull | WIRED | |
| hook -> api.ts | `createInterview`, `updateInterview`, `deleteInterview` | WIRED | `hooks.ts` |
| hook -> mapper (fix) | `mapInterviewFormToApiInput(values, {local, iso})` from the stored round | WIRED | `hooks.ts` updateRound |
| component -> InterviewsSection | rendered with `interviewActions` | WIRED | `component.tsx:146-149` |
| component -> StatusChange | `locked={interviewActions.busy}` | WIRED | `component.tsx:129` |
| dialog -> mapper validation | `validateInterviewForm(value, mode)` | WIRED | add vs edit round rule |
| smoke -> `/interviews` endpoints | POST/PUT/DELETE | WIRED | `compose-smoke.sh` |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| InterviewsSection list | `vm.interviews` | `mapApplicationFromApiToDetailVm(response)` from the Mongo-backed API response | Yes | FLOWING |
| Status badge / history after create | `vm.status`, `history` | same server response | Yes | FLOWING |
| Add dialog prefill | `nextInterviewRound(application.interviews)` | stored rounds | Yes | FLOWING |
| Edit dialog values / stored date | `stored.editValues`, `stored.scheduledAt` | stored round in the current VM | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Review-fix tests (stored date kept, per-application lock, no timer after unmount) | `vitest run application-detail.interviews.test.tsx -t "stored\|untouched\|another application\|unmount"` (apps/web) | 6 passed, 59 skipped | PASS |
| Whole suite | `npm run test` | contracts 55, api 317, web 496 passed | PASS |
| Types | `npm run typecheck` | clean | PASS |
| Lint | `npm run lint` | clean, 0 warnings | PASS |

### Probe Execution

No `probe-*.sh` declared by the phase plans. Skipped. The compose smoke needs Docker and was not re-run by me.

### Requirements Coverage

All five IDs appear in PLAN frontmatter and match the five REQUIREMENTS.md entries mapped to Phase 4. No orphaned requirement.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| INT-01 | 04-01, 04-02, 04-04 | Add a round with type, date, mode, outcome, notes from a dialog | SATISFIED | Dialog with all fields -> POST; tests pass |
| INT-02 | 04-01, 04-03 | Round number auto max + 1, editable | SATISFIED | Server pipeline + prefill + editable «Ronda» |
| INT-03 | 04-03, 04-04 | Edit and delete a round | SATISFIED | PUT arrayFilters / DELETE $pull + UI with confirmation |
| INT-04 | 04-01, 04-04 | Add while `enviada` moves to `en_entrevistas` with history entry | SATISFIED | Atomic pipeline rule |
| INT-05 | 04-02 | Rounds ordered by round number with type, date, mode, outcome | SATISFIED | `compareInterviews` + `InterviewItem` |

Note: `.planning/REQUIREMENTS.md` still shows INT-01..INT-05 as `[ ]` (lines 54-58) and `Pending` in the traceability table (lines 152-156), and ROADMAP line 18 shows Phase 4 as `[ ]`. The code satisfies them; the orchestrator should tick them at phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | grep for `TBD/FIXME/XXX/TODO` over the modified source files returned nothing | - | None |
| `application-detail.hooks.ts` | 198-227, 80-92 | Review WR-01 (open): single-slot `mutation`, `interviewFeedback`, `successTimerRef` shared across applications; late settle of A can overwrite B's feedback or orphan a timer | Advisory | New in the WR-02 fix, no deterministic evidence (no red test); only with two applications mutating at once; does not touch any success criterion or stored data |
| `application-detail.hooks.ts` | 90, 342-353 | Review IN-02: `deletingRef` / `onDeleted` not scoped to the application | Info | Unlikely (modal delete dialog), not a regression |
| `application-detail.interviews.test.tsx` | 1509-1550 | Review IN-01: `endBusy` own-lock guard not truly exercised | Info | Test-strength gap only |
| various | - | IN-03, IN-04 (duplicated literals; PUT `round` semantics) | Info | Recorded open in `04-REVIEW-DISPOSITION.md` |

### Human Verification Required

`04-UAT.md` already holds items 1-4 below as pending; item 5 is new from the review-fix report.

1. **Native datetime-local picker (Chrome, Firefox, Safari).** Test: pick a date/time, save, read the list label. Expected: same local date and time as picked. Why human: native picker not exercisable in jsdom.
2. **360 px dialog with soft keyboard.** Test: open add/edit at 360 px with the keyboard open. Expected: dialog scrolls inside itself, footer reachable, no horizontal scroll. Why human: real viewport.
3. **Keyboard-only flow and dark theme.** Test: add, edit and delete using only the keyboard in both themes. Expected: focus returns to the opener (to «Añadir ronda» after a delete), visible focus, AA contrast. Why human: focus order and contrast need a real browser.
4. **Judgment-tier prohibitions** listed above: confirm the non-authoritative verdicts.
5. **Stored date kept on edit.** Test: edit only the outcome of a round whose stored date has seconds or is the second pass of the autumn DST overlap, reload. Expected: date unchanged. Why human: the fix report requests human verification of date and DST logic in a real timezone.

### Gaps Summary

No gaps. The backend is an atomic, injection-safe implementation of create, edit and delete with rule 3 applied in the same write; the web pod is wired from dialog to hook to API client to view-model replacement, serialised to one mutation at a time per application. The two review fixes (57aa1db, 501d46f) are present, wired and covered by passing tests, and no earlier truth regressed. Typecheck, lint and the full suites are green. Remaining items are human confirmation of browser/viewport behaviors, one open advisory (review WR-01, feedback state shared across applications, a good fit for Phase 6 polish), and the stale REQUIREMENTS/ROADMAP checkboxes.

---

_Verified: 2026-11-03_
_Verifier: Claude (gsd-verifier)_
