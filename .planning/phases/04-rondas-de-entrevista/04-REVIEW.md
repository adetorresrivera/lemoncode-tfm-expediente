---
phase: 04-rondas-de-entrevista
reviewed: 2026-11-03T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-11-03
**Depth:** standard (incremental re-review of c5d1f84..HEAD, fix commit 2ea14e0 for the previous WR-01)
**Files Reviewed:** 2
**Status:** issues_found

## Summary

The fix closes the previous WR-01. `mutations`, `interviewFeedbacks` and the success timers are now keyed by application key, and each write goes through a functional updater that touches only its own key. I traced each point the fixer asked about.

- **A timer clears only its own key.** Verified. The timer callback closes over its `key`. `scheduleSuccessClear` clears the previous timer for that key before arming a new one. The callback's `delete(key)` therefore always removes the timer that is firing, never another key's.
- **Unmount.** Verified. The cleanup clears every timer in the Map, and `mountedRef` stops a late settlement from arming a new one. `timers` is captured as the same Map object the ref holds, so the cleanup sees every timer.
- **StrictMode double-mount.** Safe. The simulated cleanup clears and empties the Map and sets `mountedRef` to false. The re-run sets `mountedRef` back to true. The `new Map()` passed to `useRef` on each render is discarded after the first, which is wasteful but harmless. The state updaters are pure.
- **Stale-key leaks.** Neither `mutations` nor `interviewFeedbacks` is ever pruned (see IN-03). The size is bounded by the applications visited in one mount, so it is not a real leak.
- **`busy` lock.** It was not converted to per-key. It is still one `busyRef` value, and this now conflicts with the per-key design (see WR-01).

No critical issues. The previous IN-01 and IN-02 still hold and are carried forward as IN-01 and IN-02.

## Warnings

### WR-01: Busy lock is single-slot while the rest of the state is per-key, so an in-flight mutation can lose its lock

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:85,144-152`
**Issue:** `busyRef` holds one key, and `startBusy` overwrites it unconditionally. `endBusy` clears it only when it still equals its own key. Trace with the hook kept mounted across an id change, which is the scenario this fix targets:
1. A starts a PATCH. `busyRef = A`, `busyKey = A`.
2. The id changes to B. B starts a mutation. `busyRef = B`, `busyKey = B`. A's lock is overwritten.
3. B settles. `endBusy` sets `busyRef = null` and `busyKey = null`.
4. The id changes back to A while A's PATCH is still pending. `busy` is false, `isBusy()` is false, and the buttons are not `aria-disabled`.

A second mutation can then start on A while the first is in flight. The first one's snapshot rollback (`replaceResult(snapshot)` in the `catch`) or its late answer can overwrite the second one's result. This is the concurrency the lock exists to prevent. The new tests never go back to A, so none covers it.

Reachability is low. In the app, going A to list to B unmounts the pod and resets all refs. It needs a same-instance id change followed by a return. But the fix makes per-key semantics an explicit contract, and the lock is the one piece left outside it.

**Fix:** Track the locks per key, like the other state:
```ts
const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(new Set());
const busyRef = useRef(new Set<string>());
const busy = busyKeys.has(key);
const isBusy = () => busyRef.current.has(key);
const startBusy = () => {
  busyRef.current.add(key);
  setBusyKeys(new Set(busyRef.current));
};
const endBusy = () => {
  busyRef.current.delete(key);
  setBusyKeys(new Set(busyRef.current));
};
```
This also removes the "release only my own lock" conditional logic. Add a test: A in flight, B mutation started and settled, back to A, then assert `busy === true` and that a second `changeStatus` makes no request.

### WR-02: The unmount-cancels-timers assertion cannot detect an orphaned timer

**File:** `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx:1654-1661`
**Issue:** The test is named "keeps one success timer per application so an earlier one never clears a later message", and the comment says "none is left orphaned". After `unmount()` it only checks that `clearTimeout` was called at least once (`>= 1`).
- The spy sees every `clearTimeout` in the process (React scheduler, testing-library, and others), not only the hook's.
- It passes if only one of the two success timers is cleared.
- It passes if the cleanup clears an unrelated handle.

The regression the fix guards against (a timer left running after unmount that writes state) would not fail this test.

**Fix:** Capture the handles returned by the spied `setTimeout` for the two 5000 ms calls (`timers.mock.results`). Then assert that `clears` was called with both after `unmount()`:
```ts
const handles = timers.mock.results
  .filter((_, i) => timers.mock.calls[i]?.[1] === 5000)
  .map((r) => r.value);
unmount();
for (const handle of handles) expect(clears).toHaveBeenCalledWith(handle);
```
Alternatively use `vi.useFakeTimers()` and assert `vi.getTimerCount() === 0` after unmount.

## Info

### IN-01: `endBusy` own-lock guard is still not covered (carried forward)

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:149-152`
**Issue:** The new "keeps the feedback of the application on screen when another one settles late" test does cover a1 settling while a2 is saving. But it asserts only `pendingStatus` and `statusFeedback`. It never asserts `interviewActions.busy === true` for a2 after a1 settles, nor that a second a2 mutation is rejected. Removing the `busyRef.current === key` and `previous === key` guards would not fail any test.
**Fix:** After the a1 settlement, add `expect(result.current.interviewActions.busy).toBe(true)`. Also assert that a second `changeStatus` or `interviewActions.add` on a2 makes no request. Merge this with the test from WR-01.

### IN-02: `deletingRef` and `onDeleted` are not scoped per application (carried forward)

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:86,357-368`
**Issue:** The pod delete flow is still single-slot, unlike the rest of the state.
- `deletingRef` is one boolean. A pending DELETE for A blocks a DELETE for B (`deletingRef.current` stays true), so B's delete silently does nothing.
- `onDeleted()` is called unconditionally when A's DELETE resolves, even if B is on screen. That navigates away from B.
- `setDeletion` is keyed, so `deleteState` is correct for the screen.

Only the same-instance id change makes this reachable, as in WR-01.
**Fix:** Guard it by key (`if (keyRef.current !== key) return;` before `onDeleted()`), and use a per-key set for the in-flight flag as in WR-01.

### IN-03: Per-key feedback is never pruned, so old status messages reappear when the user returns

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:74,82,132,154-156`
**Issue:** Only success messages expire (`dropSuccess`). `error` and `loading` entries stay in `mutations[key]` indefinitely. Before the fix, another application's mutation overwrote the single slot. Now, if the user sees "No se pudo cambiar el estado" on A, goes to B and comes back to A, the old error shows again with no action behind it. The state also grows by one entry per application visited, which is harmless for a single user. The same applies to `interviewFeedbacks`.
**Fix:** Clear the slot for the new key when the application on screen changes (an effect on `key` that removes `mutations[key]` entries whose `pendingStatus === null`). Or drop error feedback on the next `changeStatus` or on key change. Not blocking.

---

_Reviewed: 2026-11-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
