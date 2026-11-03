---
phase: 04-rondas-de-entrevista
reviewed: 2026-11-03T11:05:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
  - apps/web/src/pods/application-detail/application-detail.mapper.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 4: Code Review Report (incremental re-review)

**Reviewed:** 2026-11-03
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This re-review covers the diff `028e7f4..HEAD` for the three files and the files as a whole. `tsc --noEmit` and ESLint on the pod are clean. The pod's tests pass (131).

**WR-01 (stored `scheduledAt` rewritten on edit): fixed correctly.** `mapInterviewFormToApiInput` returns the stored ISO only when `loaded.iso !== null` and the control still equals the loaded local value. A changed or cleared control behaves as before. `validateInterviewForm` still calls the mapper without `loaded`, which is fine: it only checks validity. If the round is not found in the VM, the code falls back to the old conversion. The three new tests cover keep, change and clear.

**WR-02 (busy lock and success timer scope): the stated cases are fixed, but the new design opens a gap.** The lock is now keyed, so a mutation on `a1` no longer blocks `a2`, and no timer is armed after unmount. The `mountedRef` is reset to `true` in the effect, so StrictMode double-mount is handled. However, the lock is now per application while the state it protects is still single-slot. That produces the warning below.

## Warnings

### WR-01: Concurrent mutations on two applications now share single-slot feedback state and one timer ref

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:80,87,92,170-182,198-227`
**Issue:** Before the fix the lock was global, so at most one mutation ran per hook instance. Now `a1` and `a2` can mutate at once (the new test exercises exactly this), but three things are still single-slot:
- `mutation` is one `Mutation | null`.
- `interviewFeedback` is one slot.
- `successTimerRef` is one timer.

Trace: a PATCH for `a1` is in flight, the user moves to `a2` and starts a PATCH there, so `setMutation({key: a2, "Guardando…"})`. Then the `a1` PATCH settles and runs `setMutation({key: a1, …success})` unconditionally. That overwrites the `a2` slot, so `currentMutation` becomes `null` for `a2`. The `a2` view loses `pendingStatus` and its "Guardando…" message until its own request settles. The `.catch` branch has the same overwrite. Worse, `scheduleSuccessClear` never clears an existing timer. The `a1` settle arms T1 and the later `a2` settle arms T2, so `successTimerRef` is overwritten and T1 is orphaned. T1 then clears the `a2` success message early, and the unmount cleanup cannot cancel it. The result is a flickering or short-lived status message and a stray timer. `replaceResult` is correctly guarded by key. These writes are not.
**Fix:** Make late settlements of another application inert, and never leak a timer.
```ts
const scheduleSuccessClear = () => {
  if (!mountedRef.current) return;
  if (successTimerRef.current !== null) clearTimeout(successTimerRef.current);
  successTimerRef.current = setTimeout(/* … */);
};

// in the PATCH handlers and the interview setInterviewFeedback calls: write only when the slot
// still belongs to this request's key
setMutation((previous) =>
  previous !== null && previous.key !== key
    ? previous
    : { key, pendingStatus: null, feedback: { /* … */ } },
);
```
Do the same for `setInterviewFeedback`. Alternatively, key `mutation` and `interviewFeedback` by application (a `Map` or record), as `busyKey` now is.

## Info

### IN-01: The "releases only its own lock" guard in `endBusy` has no test

**File:** `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx:1509-1550`
**Issue:** The test "does not lock another application…" finishes the `a2` POST (a 404 rejection, which runs `endBusy` for `a2`) before the `a1` PATCH settles. The final `expect(busy).toBe(false)` is therefore true even if `endBusy` were reverted to an unconditional `busyRef.current = null`. The case the fix was written for, a late `a1` settle while `a2` holds its own lock, is never run. The `added` mock is also never asserted (the POST count carries the check).
**Fix:** Start a deferred POST on `a2`, resolve the `a1` PATCH while the POST is pending, and assert `interviewActions.busy` is still `true` for `a2`. Then resolve the POST and assert `false`.

### IN-02: `deletingRef` and `onDeleted` are still not scoped to the application

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:90,342-353`
**Issue:** This is the same class of leak as the one fixed for `busy`, but in code the fix did not touch. `deletingRef` is a plain boolean. If a DELETE of `a1` is in flight and the hook is re-pointed to `a2`, a delete on `a2` is silently ignored. When the `a1` DELETE succeeds, `onDeleted()` fires and sends the user away from `a2`. The delete dialog is modal, so reaching this by id change is unlikely (for example browser back during the request). It is not a regression.
**Fix:** Store the key in the ref (`deletingRef: string | null`) and call `onDeleted()` only when `key` is still the current one, using a ref to the latest key.

---

_Reviewed: 2026-11-03T11:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
