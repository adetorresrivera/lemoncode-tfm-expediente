---
phase: 04-rondas-de-entrevista
verified: 2026-11-03T07:00:00Z
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
  - apps/web/src/pods/application-detail/application-detail.mapper.ts
  - apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-item.tsx
  - apps/web/src/pods/application-detail/components/interviews-section.tsx
  - apps/web/src/pods/application-detail/components/status-change.tsx
  - docs/ARCHITECTURE.md
  - scripts/compose-smoke.sh
covered_digest: "v4:sha256:6047e5b3669e808bbb9df4c422ef3d94c8afc568b7f1fa5d370cf6b5b0a60db9"
behavior_unverified: 0
overrides_applied: 0
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
  - test: "Judgment-tier prohibitions (unmodified status unless exactly enviada; no optimistic render; no notes/body in logs; no renumbering on delete; no delete without confirmation; one mutation at a time)"
    expected: "Reviewer confirms the non-authoritative verdicts below"
    why_human: "Judgment-tier prohibitions are LLM-judged only; flagged unverified-prohibition for human review, not a silent pass"
---

# Phase 4: Rondas de entrevista Verification Report

**Phase Goal:** As a job seeker, I want to log the interview rounds of an application, so that its process history and status stay in sync without extra bookkeeping.
**Verified:** 2026-11-03
**Status:** human_needed
**Re-verification:** No, initial verification

The phase goal is achieved in the codebase. Every roadmap success criterion and every requirement (INT-01..INT-05) is backed by real, wired, data-flowing code and by passing tests that I re-ran myself. No gap blocks the goal. The status is `human_needed` only because the plans themselves declare two `backstop` (non-inferable) truths and the judgment-tier prohibitions that need a human look; none of them is a failure.

## Goal Achievement

### Observable Truths (ROADMAP contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | From the detail, the user adds a round in a dialog with type, date, mode, outcome and notes; round number auto-assigned (max + 1) and editable | VERIFIED | `interviews-section.tsx` hosts the single `InterviewDialog` opened by «Añadir ronda»; `newInterviewFormValues(nextInterviewRound(...))` prefills max + 1 capped at `MAX_SAFE_INTEGER` (`mapper.ts:132-141`); hook `addInterview` -> `createInterview` POST -> `replaceResult` with the mapped response. Server `addInterview` (`repository.ts:243`) computes `$max(interviews.round)+1` in one pipeline update when `round` is absent, or `$literal` of the sent one. Interviews API test file: 46/46 pass |
| 2 | The user can edit and delete an existing round from the detail | VERIFIED | `InterviewItem` has Pencil/Trash2 buttons -> edit dialog (mode `edit`, «Ronda» required) -> `updateRound` -> `PUT`; delete goes through `InterviewDeleteDialog` confirmation -> `removeRound` -> `DELETE`. Server: `updateInterview` uses `arrayFilters` on element id, `removeInterview` uses `$pull`, with distinct 404s (`Candidatura no encontrada` / `Ronda no encontrada`) in `service.ts:89-93` |
| 3 | The detail lists rounds ordered by round number, each showing type, date, mode and outcome | VERIFIED | `mapApplicationFromApiToDetailVm` sorts with `compareInterviews` (round, then scheduledAt instant with null last, then id) (`mapper.ts:119, 257-259`); `InterviewItem` renders title «Ronda N · Tipo», `<time>`/«Sin fecha», mode label and neutral outcome badge with icon |
| 4 | Adding a round while `enviada` moves the application to `en_entrevistas` with a history entry; other statuses untouched; any round change updates `updatedAt` | VERIFIED | `addInterview` pipeline `$cond` on `$eq: ["$status", "enviada"]` sets status and appends one `{status, at: now}` history entry in the same atomic `findOneAndUpdate`; `updatedAt: now` is set in create, update and delete (`repository.ts:243-337`). Rule constant `INTERVIEW_STATUS_RULE {from: enviada, to: en_entrevistas}` lives in the service. Covered by the real-Mongo tests, including from every other status and concurrent POSTs |

**Score:** 4/4 roadmap truths verified; 0 behavior-unverified.

### PLAN must-haves (merged)

All truth groups of 04-01..04-04 were checked against the code and the test suites; notable ones:

| Truth | Status | Evidence |
|-------|--------|----------|
| Atomic create (concurrent POSTs get rounds 1 and 2, one history entry) | VERIFIED | Single pipeline `$set` reads input doc only; test file passes |
| Client values never evaluated (`$literal`, field-by-field build, body `id/status/...` ignored) | VERIFIED | `repository.ts` `$literal` on every client value; `service.ts:172-183` builds field by field |
| `scheduledAt` stored as ISO UTC ms; offset/naive rejected | VERIFIED | `new Date(...).toISOString()` in service; contract regex test in `schemas.test.ts` |
| Edit requires «Ronda» (D-28), delete does not renumber, 404s distinguished | VERIFIED | `validateInterviewForm(values, mode)`; `$pull` only; `interviewMissing` |
| One mutation at a time across status and rounds; response written only for same key (D-16) | VERIFIED | Shared `busyRef` guard in `changeStatus`/`addInterview`/`updateRound`/`removeRound`; `replaceResult` only applies when `previous.key === next.key`; `StatusChange locked={interviewActions.busy}` (`component.tsx:129`) and rows/Añadir ronda `aria-disabled={busy}` |
| Focus handling after dialogs close; polite status region with feedback messages | VERIFIED | `onCloseAutoFocus` handlers in section; always-mounted `role="status" aria-live="polite"`; messages «Ronda añadida.», «… Estado cambiado a En entrevistas.», «Ronda actualizada.», «Ronda eliminada.» in the hook |
| Compose smoke round trip (POST/PUT/DELETE then deletes the application) | VERIFIED (static) | `scripts/compose-smoke.sh:161-180` asserts 201 / 200 / 200 and `"interviews":[]`; SUMMARY reports a real `--down` run ending SMOKE OK (not re-run by me: needs Docker) |
| `docs/ARCHITECTURE.md` documents the three endpoints | VERIFIED | Rows at lines 83-85 (POST 201, PUT 200, DELETE 200, whole application) |
| typecheck, lint, test pass | VERIFIED | Re-run by me: typecheck clean, `eslint . --max-warnings=0` clean, tests contracts 55 / api 317 / web 491 all pass |
| Native datetime-local picker and 360 px dialog scroll (backstop) | UNCERTAIN -> human | See Human Verification Required |

### Prohibitions (judgment tier, non-authoritative LLM verdict, flagged for human review)

| Prohibition | LLM verdict | Evidence |
|-------------|-------------|----------|
| No status change unless stored status is exactly `enviada` (-> `en_entrevistas`) | Not violated | Pipeline `$eq` on `$status`; update/delete never touch status (`$set` lists no status) |
| No round/status/history shown before server confirms | Not violated | Hook only calls `replaceResult` with the API response; no optimistic state |
| Notes / request body never logged or shown in errors | Not violated | Only `err.message` logged in `app.ts:108`; JSON SyntaxError replaced with a fixed string; interview code has no logging |
| `scheduledAt` shown without shifting the picked time | Not violated for UI-created values (minute precision); see WR-01 | `localInputToIso`/`isoToLocalInput` round-trip |
| No renumbering on delete; no delete without confirmation | Not violated | `$pull` only; delete button opens `InterviewDeleteDialog` first |
| Smoke leaves no data; earlier response never overwrites newer view | Not violated | Smoke deletes the application; keyed `replaceResult` + single in-flight guard |

These are flagged `unverified-prohibition: human review recommended`; they are not a silent pass.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/applications/applications.repository.ts` (addInterview / updateInterview / removeInterview) | VERIFIED | Substantive, wired from service, real Mongo queries |
| `apps/api/src/applications/applications.service.ts` / `.routes.ts` | VERIFIED | Three routes registered, input validated with `interviewInputSchema` from contracts |
| `apps/api/src/applications/applications.interviews.test.ts` | VERIFIED | 821 lines, 46 tests pass against real Mongo |
| `apps/web/src/common/components/ui/dialog.tsx` | VERIFIED | Used by both dialogs |
| `interviews-section.tsx`, `interview-dialog.tsx`, `interview-item.tsx`, `interview-outcome-badge.tsx`, `interview-delete-dialog.tsx` | VERIFIED | Rendered between Etiquetas and Notas via `<InterviewsSection>` in `application-detail.component.tsx:146` |
| `apps/web/src/common/lib/format.ts` (formatDateTime, localInputToIso, isoToLocalInput) | VERIFIED | Used by the mapper |
| `status-change.tsx` (locked prop) | VERIFIED | `aria-disabled={pending || locked}` |
| `scripts/compose-smoke.sh` round trip | VERIFIED | Lines 161-180 |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| service -> repository | `addInterview(... INTERVIEW_STATUS_RULE, now)` | WIRED | `service.ts:184-189` |
| repository -> Mongo | `findOneAndUpdate` pipeline / arrayFilters / $pull | WIRED | `repository.ts:243-337` |
| hook -> api.ts | `createInterview`, `updateInterview`, `deleteInterview` | WIRED | `hooks.ts:238, 280, 304` |
| component -> InterviewsSection | rendered with `interviewActions` | WIRED | `component.tsx:146-149` |
| component -> StatusChange | `locked={interviewActions.busy}` | WIRED | `component.tsx:129` |
| mapper -> format | `localInputToIso`, `formatDateTime`, `isoToLocalInput` | WIRED | `mapper.ts` |
| dialog -> mapper validation | `validateInterviewForm(value, mode)` | WIRED | add vs edit round rule |
| smoke -> `/interviews` endpoints | http_send POST/PUT/DELETE | WIRED | `compose-smoke.sh:161-179` |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| InterviewsSection list | `vm.interviews` | `mapApplicationFromApiToDetailVm(response)` from the Mongo-backed API response | Yes | FLOWING |
| Status badge / history after create | `vm.status`, `statusHistory` | same server response | Yes | FLOWING |
| Add dialog prefill | `vm.newInterviewValues` | `nextInterviewRound(application.interviews)` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Round endpoints against real Mongo | `vitest run src/applications/applications.interviews.test.ts` (apps/api) | 46 passed | PASS |
| Whole suite | `npm test` | contracts 55, api 317, web 491 passed | PASS |
| Types | `npm run typecheck` | clean | PASS |
| Lint | `npm run lint` | clean, 0 warnings | PASS |

### Probe Execution

No `probe-*.sh` declared by the phase plans. Step skipped. The compose smoke needs Docker and was not re-run; the SUMMARY reports it ended SMOKE OK.

### Requirements Coverage

All five IDs appear in PLAN frontmatter (04-01: INT-01, INT-02, INT-04; 04-02: INT-01, INT-05; 04-03: INT-03, INT-02; 04-04: INT-01, INT-03, INT-04) and match the five REQUIREMENTS.md entries mapped to Phase 4. No orphaned requirement.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| INT-01 | 04-01, 04-02, 04-04 | Add a round with type, date, mode, outcome, notes from a dialog | SATISFIED | Dialog with all fields -> POST; tests pass |
| INT-02 | 04-01, 04-03 | Round number auto max + 1, editable | SATISFIED | Server pipeline + prefill + editable «Ronda»; edit mode requires it |
| INT-03 | 04-03, 04-04 | Edit and delete a round | SATISFIED | PUT arrayFilters / DELETE $pull + UI with confirmation |
| INT-04 | 04-01, 04-04 | Add while `enviada` moves to `en_entrevistas` with history entry | SATISFIED | Atomic pipeline rule 3 |
| INT-05 | 04-02 | Rounds ordered by round number with type, date, mode, outcome | SATISFIED | `compareInterviews` + `InterviewItem` |

Note: `.planning/REQUIREMENTS.md` still shows INT-01..INT-05 as `[ ]` / `Pending` (lines 54-58, 152-156) because executors could not edit it in worktree mode. The code satisfies them; the orchestrator should tick the checkboxes and flip the traceability table to Complete (and the ROADMAP Phase 4 line to `[x]`).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | No `TODO/FIXME/XXX/TBD` markers in modified files | - | None |
| `application-detail.mapper.ts` / `format.ts` | 96-103 / 44-55 | WR-01: editing re-sends `scheduledAt` truncated to the minute; second occurrence of the autumn DST overlap or API-set seconds are rewritten | Warning | Only affects instants not creatable from the UI (API/seed-created values); does not break any success criterion |
| `application-detail.hooks.ts` | 85-89, 163-173 | WR-02: busy flag/timer not scoped to application key or unmount | Warning | Edge case when navigating between applications mid-request; locks controls until the old request settles |
| various | - | IN-01..IN-04 (non-numeric «Ronda» treated as empty, identical accessible names for repeated round numbers, duplication, PUT default semantics undocumented) | Info | Recorded open in `04-REVIEW-DISPOSITION.md` |

The two warnings are carried forward from `04-REVIEW.md` (0 critical); I confirmed WR-01 against the source. Neither contradicts a ROADMAP success criterion, so they are not blockers, but they should be scheduled (Phase 6 polish is the natural place).

### Human Verification Required

1. **Native datetime-local picker (Chrome, Firefox, Safari)**
   **Test:** Pick a date/time in the dialog, save, read the list label.
   **Expected:** Same local date and time as picked.
   **Why human:** Native picker not exercisable in jsdom (plan declares this a `backstop` truth).

2. **360 px dialog with soft keyboard**
   **Test:** Open add/edit dialog at 360 px width with the keyboard open.
   **Expected:** Dialog scrolls inside itself, footer reachable, no horizontal scroll.
   **Why human:** Real viewport/keyboard behavior (backstop truth; also covered again by DEMO-03 in Phase 6).

3. **Keyboard-only flow and dark theme**
   **Test:** Add, edit and delete a round using only the keyboard in light and dark theme.
   **Expected:** Focus returns to the opener (to «Añadir ronda» after delete), visible focus, AA contrast.
   **Why human:** Focus order and contrast need a real browser.

4. **Judgment-tier prohibitions** listed above: confirm the non-authoritative verdicts.

### Gaps Summary

No gaps. The backend is an atomic, injection-safe implementation of create, edit and delete with rule 3 applied in the same write; the web pod is fully wired from dialog to hook to API client to view-model replacement, serialized to one mutation at a time. I re-ran typecheck, lint and the full test suites (all green) and the 46 real-Mongo interview tests. Remaining work is human confirmation of browser/viewport behaviors, plus the two open review warnings and the stale REQUIREMENTS.md checkboxes.

---

_Verified: 2026-11-03_
_Verifier: Claude (gsd-verifier)_
