---
phase: 04-rondas-de-entrevista
fixed_at: 2026-11-03T18:55:00Z
review_path: .planning/phases/04-rondas-de-entrevista/04-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-11-03
**Source review:** .planning/phases/04-rondas-de-entrevista/04-REVIEW.md (incremental re-review)
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (WR-01; IN-01 and IN-02 are Info and out of scope)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: Concurrent mutations on two applications now share single-slot feedback state and one timer ref

**Files modified:** `apps/web/src/pods/application-detail/application-detail.hooks.ts`, `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx`
**Commit:** 2ea14e0
**Applied fix:** The reviewer offered two options (a guard on the single slot, or keying the state by application). I chose keying, because the guard has a hole for `interviewFeedback`. A finished slot of one application would make the guard drop the next application's message.
- `mutation` is now `mutations: Record<string, Mutation>`, and `interviewFeedback` is now `interviewFeedbacks: Record<string, string>`. Both are keyed by `applicationId#attempt`, like `busyKey` and `replaceResult`. Each request writes only its own entry, so a late settle of `a1` cannot touch what `a2` shows.
- `successTimerRef` is now `successTimersRef: Map<key, timer>`. `scheduleSuccessClear` clears any previous timer of the same key before arming a new one, so no timer is orphaned. A timer clears only the success message of its own key (`dropSuccess(key)`).
- `clearSuccess` now acts on the current key only. The unmount cleanup clears every timer in the map.
- The `Mutation.key` and `InterviewFeedback` interfaces became redundant and were removed or simplified.

**Tests added (both fail on the pre-fix hook, verified by stashing the hook):**
- "keeps the feedback of the application on screen when another one settles late": the `a1` PATCH settles while `a2` is saving. `a2` keeps `pendingStatus` and "Guardando…", then shows success after its own settle.
- "keeps one success timer per application so an earlier one never clears a later message": `a1` and `a2` settle in turn, which arms two separate 5 s timers. Firing the `a1` timer leaves the `a2` message in place, and unmount calls `clearTimeout`.

Status: fixed. The change touches state logic, so a human glance at the per-key semantics is worthwhile, although the new tests cover the traced scenario. One behavior difference to know about: a success message for an application now lives until its own timer or its next mutation, rather than being cleared when a mutation starts on a different application.

## Verification

Ran in the main checkout on `phase/04-rondas-de-entrevista`, with no worktree.
- `npm run typecheck && npm run test`: passed. contracts 55, api 317, web 498 tests. The web count includes the 2 new tests.
- `npx eslint apps/web/src/pods/application-detail` and `prettier --check`: clean. The pre-commit hook (lint-staged and typecheck) also passed.
- Both new tests were confirmed failing without the fix (2 failed, 65 passed in the interviews test file), then passing with it.
- Note: the intermediate `application-detail.hooks.ts` had a `no-unused-vars` lint error (`_removed`), fixed before commit.

`.planning/STATE.md` and `.planning/state.json` were not staged.

---

_Fixed: 2026-11-03_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
