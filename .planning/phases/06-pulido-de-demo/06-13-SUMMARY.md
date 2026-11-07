---
phase: 06-pulido-de-demo
plan: 13
subsystem: testing
tags: [vitest, fake-timers, flake, testing-library, user-event]
requires:
  - phase: 06-12
    provides: axe-core devDependency and a11y test helpers
provides:
  - Deterministic success-line timer tests (fake clock moved only by the test)
  - apps/web/scripts/run-vitest.mjs one-shot worker-start retry wrapper
  - 05 WR-01 disposition fixed
affects: [06-17 clean checkout run, pre-push hook, root npm run test]
tech-stack:
  added: []
  patterns:
    - "useFakeClock/useRealClock/flushFakeClock in apps/web/src/test/fake-clock.ts"
    - "Test wrapper that retries only on a specific infrastructure failure signature"
key-files:
  created:
    - apps/web/scripts/run-vitest.mjs
    - apps/web/src/test/fake-clock.ts
  modified:
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx
    - apps/web/src/pods/document-list/document-list.test.tsx
    - apps/web/package.json
    - eslint.config.js
    - .planning/phases/05-documentos-en-s3/05-REVIEW-DISPOSITION.md
key-decisions:
  - "Fake clock without shouldAdvanceTime plus a temporary `jest` shim so Testing Library drains its own setTimeout(0) via vi.advanceTimersByTime"
  - "Assert at 4,000 ms (line still visible) then advance 1,500 ms (line gone): 1,000 ms margin each side of the 5 s deadline"
  - "Retry wrapper reruns once, only on non-zero exit AND 'Failed to start (forks|threads) worker' AND no 'Test Files' summary"
requirements-completed: [DEMO-06]
duration: 20 min
completed: 2026-11-06
status: complete
commits: 2
plan_head_before: b904ecbce43901ea39427e55208dc7765c6283cf
plan_head_after: 43b4d5cd0d097a74b5669eb32ab01688808963f7
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "Timer tests no longer depend on real time"
    verification:
      - kind: command
        ref: "5 consecutive runs of src/pods/document-upload src/pods/document-list src/pods/application-detail (7 files, 292 tests each)"
        status: pass
    human_judgment: false
  - deliverable: "run-vitest.mjs retries once on worker-start failure only"
    verification:
      - kind: command
        ref: "stub simulation: worker-start failure retried once and exits 0; failure with a Test Files summary not retried (exit 1, 1 run); node apps/web/scripts/run-vitest.mjs src/no-such-file.test.ts printed no 'retrying once'"
        status: pass
    human_judgment: false
---

# Phase 6 Plan 13: Deterministic timer tests and worker-start retry Summary

**Success-line timer tests now run on a fake clock only the test moves (no `shouldAdvanceTime`), and `npm run test -w @tfm/web` goes through a wrapper that retries Vitest once, visibly, only when the worker pool fails to start.**

## Accomplishments

- Removed all four `shouldAdvanceTime: true` uses (baseline 4, now 0). Changed tests:
  - `document-upload.test.tsx` «clears the success line 5 s after the upload»: fake clock for the whole flow; line asserted visible at 4,000 ms, gone after 1,500 ms more (was 4,900 / +200 ms, 100 ms margin).
  - `document-list.test.tsx` «clears «Documento eliminado.» after 5 s»: dialog opened on the real clock, fake clock only for the delete and the deadline; same 4,000 / +1,500 ms assertions.
  - `application-detail.test.tsx` «clears the success message after 5 seconds» and the Ronda feedback test: previously a single advance of 5,000 ms (no visible-before assertion); now visible at 4,000 ms, cleared after +1,500 ms.
- New `apps/web/src/test/fake-clock.ts`: `useFakeClock` (Vitest fake timers plus a `jest.advanceTimersByTime` shim so Testing Library's `user.*`/`waitFor` can drain their `setTimeout(0)`; without it `user.click` hangs on a frozen clock), `useRealClock`, `flushFakeClock`.
- `apps/web/scripts/run-vitest.mjs`: resolves the Vitest CLI via `vitest/package.json`, forwards all arguments, streams output, forwards SIGINT/SIGTERM. Retry rule: exactly one rerun when the exit code is non-zero, the ANSI-stripped output matches `/Failed to start (forks|threads) worker/` and does not match `/Test Files\s+\d/`; prints «run-vitest: the worker pool did not start (cold filesystem); retrying once.» A real failure, a failure with a results summary, or «No test files found» is never retried.
- `apps/web` `test` script is `node scripts/run-vitest.mjs`; `eslint.config.js` gives `apps/*/scripts/**/*.mjs` node globals.
- 05 WR-01 disposition is `fixed` (YAML and table, «fixed in 06-13»).

## Verification

- `for i in 1..5: npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail`: 5/5 runs, 7 files, 292 tests passed.
- `npm run typecheck && npm run test && npm run lint`: exit 0 (web 882, api 464, contracts 59 tests).
- Acceptance greps: `shouldAdvanceTime` count 0; `.skip/.only/.todo` count 0; WR-01 `disposition: fixed`.
- The retry branch itself is exercised only by a stub simulation (copy of the wrapper pointed at a stub CLI in the scratchpad), not by a repository test; the real cold-start failure cannot be provoked on demand.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fake clock needs a `jest` shim for Testing Library**
- **Found during:** Task 1
- **Issue:** Dropping `shouldAdvanceTime` made the first `user.click` hang: Testing Library only advances fake timers when a `jest` global exists, and Vitest provides none.
- **Fix:** `useFakeClock` installs `globalThis.jest = { advanceTimersByTime: vi.advanceTimersByTime }` and `useRealClock` removes it. Added as a small shared helper file (`apps/web/src/test/fake-clock.ts`) not listed in the plan's `files_modified`.
- **Files modified:** apps/web/src/test/fake-clock.ts
- **Commit:** b13ab84

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** one extra test-helper file, no scope change.

## Dependencies

No packages installed (T-06-SC). `npm ci` was run in the worktree only to populate `node_modules`; `package.json` dependencies and the lockfile are unchanged.

## Known Stubs

None.

## Threat Flags

None. T-06-20 mitigated: the wrapper retries at most once and only on the worker-start signature without a results summary.

## Task Commits

1. Task 1 (deterministic timer tests): b13ab84
2. Task 2 (worker-start retry wrapper): 43b4d5c

Ready for the next plan in the wave.
