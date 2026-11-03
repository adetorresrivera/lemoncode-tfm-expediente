---
phase: quick-261029-sa5
plan: 01
status: complete
subsystem: web-shell
tags: [layout, mobile, vite, uat-gap]
requirements: [FND-05]
key-files:
  modified:
    - apps/web/src/layouts/app-layout.tsx
    - apps/web/src/layouts/app-layout.test.tsx
    - apps/web/vite.config.ts
commits: 3
plan_head_before: 61b451df7a812db3365909d2dbe73a9dbd3fb76f
plan_head_after: 626364c81aad21f6ebb6f26cf4d649a33dbe05fc
actuals:
  tasks: 2
  commits: 3
---

# Quick 261029-sa5: mobile menu button on the left + Vite on all interfaces

Closes UAT gap G-01-2: below 1024 px the «Abrir menú» button is now the first element of the mobile header, left of the «Expediente» wordmark and on the side the Sheet opens from. Vite now binds all interfaces (`server.host: true`) so VS Code port forwarding over IPv4 reaches the dev server.

## Commits

- `40a0207` test(quick-261029-sa5): assert mobile menu button sits left of wordmark (RED: only the new order test failed, `firstElementChild` was the wordmark `<p>`)
- `1c631ce` fix(quick-261029-sa5): place mobile menu button on the sheet side (GREEN: 8/8 tests)
- `626364c` fix(quick-261029-sa5): bind vite dev server to all interfaces

## Changes

- `app-layout.tsx`: `<Sheet>` block moved before the wordmark in the mobile `<header>`; `justify-between` replaced by `gap-2`. Sheet side (`left`), breakpoint, sidebar and trigger untouched.
- `app-layout.test.tsx`: new header-order test (button is header's first element child and precedes the wordmark); Esc test now also asserts focus returns to the trigger.
- `vite.config.ts`: `host: true` added to `server`. Port 5173 and `/api` proxy unchanged; allowed-hosts not set (DNS-rebinding check kept, T-261029-sa5-01).

No dependencies added. `npm run dev` now prints a "Network:" URL.

## Verification

- `app-layout.test.tsx`: 8/8 pass; `grep -c 'side="left"'` = 1; `grep -c firstElementChild` = 1.
- `grep -Ec '^\s+host: true,$' vite.config.ts` = 1; probe on throwaway port 5199 answered on `127.0.0.1` (curl exit 0); no Vite process left running.
- Root `npm run typecheck`, `npm run lint` and `npm run test` all pass (contracts 40, api 34, web 41 tests).

## Deviations from Plan

None in code. Environment note: the fresh worktree had no `node_modules`; I symlinked the main checkout's `node_modules` (root, `apps/web`, `packages/contracts`) into the worktree. These are gitignored and untracked. Vitest web runs took 60-130 s and the worker-start timeout occurred 3 times in a row on the first runs (cold cache); it succeeded once caches were warm, with no config change. The husky pre-commit hook also makes each commit take about 2 minutes here.

## Follow-ups (out of scope, UI-SPEC drifts)

- Mobile header is not `sticky top-0`.
- Menu button is `size="icon"` instead of `size-11`.
- Menu button lacks `focus-visible:ring-sidebar-ring`.

## Human checks pending

- Browser at 1023 px: button at left edge before «Expediente»; Sheet opens from the left; Esc closes and returns focus; at 1024 px header hidden and sidebar shown.
- Open forwarded port 5173 from the host browser; app loads on /applications.

## Self-Check: PASSED
