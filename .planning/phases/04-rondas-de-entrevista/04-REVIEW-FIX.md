---
phase: 04-rondas-de-entrevista
fixed_at: 2026-11-03T08:30:00Z
review_path: .planning/phases/04-rondas-de-entrevista/04-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-11-03
**Source review:** .planning/phases/04-rondas-de-entrevista/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (fix_scope `critical_warning`: 0 critical, 2 warning; the 4 Info findings IN-01 to IN-04 are out of scope)
- Fixed: 2
- Skipped: 0

**Verification:** `npm run typecheck && npm run test` ran in the main checkout (no isolated worktree, as the caller asked), on branch `phase/04-rondas-entrevista`. Typecheck is clean in all three workspaces. Tests: contracts 55, api 317, web 496, all passing. The pre-commit hook (lint-staged and typecheck) ran on both commits.

## Fixed Issues

### WR-01: Editing a round silently rewrites a stored `scheduledAt` that the form cannot represent

**Files modified:** `apps/web/src/pods/application-detail/application-detail.mapper.ts`, `apps/web/src/pods/application-detail/application-detail.hooks.ts`, `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx`
**Commit:** 57aa1db
**Status:** fixed: requires human verification (date and DST logic)
**Applied fix:** `mapInterviewFormToApiInput` takes an optional `LoadedScheduledAt` (`{ local, iso }`). While the date control still holds the loaded local value, the stored ISO is sent back untouched. A changed or cleared control behaves as before. The `updateRound` action in the hook looks the round up in the current view model and passes `editValues.scheduledAt` and `scheduledAt` as that pair. This needed no view-model change. Three tests were added:
- A UI test that edits only the outcome of a round stored as `2026-10-25T01:30:15.250Z` (Madrid overlap, with seconds) and asserts the PUT body carries the stored value.
- A UI test that changing the date control sends the new instant.
- A mapper unit test of the keep, change and clear cases.

### WR-02: Busy flag and success timer are not scoped to the application or to unmount

**Files modified:** `apps/web/src/pods/application-detail/application-detail.hooks.ts`, `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx`
**Commit:** 501d46f
**Status:** fixed: requires human verification (concurrency and lifecycle logic)
**Applied fix:**
- `busy` state is now `busyKey`, and `busy` is derived as `busyKey === key`. `busyRef` stores the key it was started for, and the guards use `isBusy()` (`busyRef.current === key`).
- `endBusy` releases only its own lock.
- A `mountedRef` is set to false in the unmount cleanup, and `scheduleSuccessClear` returns early when unmounted, so no 5 s timer is armed after unmount.

Two hook tests were added, and both fail without the fix:
- A status change in flight on `a1` does not lock `a2`; a round add on `a2` sends its POST.
- A change that settles after unmount arms no 5000 ms timer.

## Skipped Issues

None. IN-01 to IN-04 were not attempted because they are outside `critical_warning` scope.

---

_Fixed: 2026-11-03_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
