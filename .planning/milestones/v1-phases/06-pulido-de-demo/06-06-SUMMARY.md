---
phase: 06-pulido-de-demo
plan: 06
subsystem: web-shell-and-list
tags: [a11y, focus, skip-link, shell, list-refetch, design-system]
requires:
  - phase: 06-pulido-de-demo
    provides: 06-05 (wave 1)
provides:
  - skip link «Saltar al contenido» and main#main-content
  - sidebar-ring focus on every bg-sidebar control, 44 px shell targets
  - 28 px / 400 wordmark and stacked theme toggle
  - SheetContent closeButtonClassName
  - list refetch rule (no empty-state flash)
affects: [06-11, 06-12, 06-17]
tech-stack:
  added: []
  patterns: ["skip link focuses a ref'd main with preventDefault (no hash in URL)"]
key-files:
  created: []
  modified:
    - apps/web/src/layouts/app-layout.tsx
    - apps/web/src/layouts/app-layout.test.tsx
    - apps/web/src/common/components/theme-toggle.tsx
    - apps/web/src/common/components/ui/sheet.tsx
    - apps/web/src/core/theme/theme.test.ts
    - docs/DESIGN.md
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
    - .planning/phases/02-candidaturas/02-REVIEW-DISPOSITION.md
key-decisions:
  - "SheetContent gets an optional closeButtonClassName merged with cn(); primitive default unchanged"
  - "Counter is null while the skeleton shows; previous count stays when previous cards stay"
requirements-completed: [DEMO-03, DEMO-04, DEMO-05]
status: complete
commits: 4
plan_head_before: a3fa42e51e8661e0ef430482763bdf89cad71a59
plan_head_after: abc604d80a090c07d10f881cb8b5b633cc0d2997
actuals:
  tokens: 9000
  tasks: 2
  commits: 4
coverage:
  - deliverable: "Skip link first in tab order, focuses main, URL unchanged"
    verification:
      - {kind: test, ref: "apps/web/src/layouts/app-layout.test.tsx#puts the skip link first", status: pass}
    human_judgment: false
  - deliverable: "sidebar-ring focus, 44 px targets, 28 px wordmark, stacked theme toggle"
    verification:
      - {kind: test, ref: "apps/web/src/layouts/app-layout.test.tsx and apps/web/src/core/theme/theme.test.ts", status: pass}
    human_judgment: true
    rationale: "Visual contrast and 360 px fit are verified in the 06-17 manual pass"
  - deliverable: "List keeps cards / shows skeleton on refetch, never a false empty state"
    verification:
      - {kind: test, ref: "apps/web/src/pods/application-list/application-list.test.tsx#stale-while-refresh", status: pass}
    human_judgment: false
---

# Phase 6 Plan 06: Shell focus, skip link and list refetch Summary

Keyboard-honest shell (skip link, gold `sidebar-ring` on the navy sidebar, 44 px targets, on-scale 28 px wordmark, stacked theme toggle) plus a list rule that never flashes «no results» while a filter reloads (02 WR-04 fixed).

## Accomplishments

- Skip link «Saltar al contenido» is the first child of the layout; Enter calls `preventDefault()` and focuses `<main id="main-content" tabIndex={-1} className="lg:pl-64 outline-none">`; the URL hash stays empty.
- `NAV_ITEM_CLASS` is now `flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring` (was `gap-3 px-3 py-2 font-medium`, no focus style). «Abrir menú» is `size-11` with the sidebar ring. Wordmark shared constant `font-serif text-[28px] leading-[1.2] font-normal` in sidebar, Sheet title and mobile bar (was `text-2xl` / `text-2xl` / `text-xl`).
- `ThemeToggle` `ITEM_CLASS` = `h-auto min-h-11 flex-1 flex-col gap-1 px-1 py-1 focus-visible:ring-sidebar-ring` (was `flex-1 gap-1 px-1.5 text-xs`).
- `SheetContent` accepts `closeButtonClassName`; the shell passes `focus:ring-sidebar-ring`.
- `docs/DESIGN.md`: Shell section (28 px wordmark, stacked toggle, 44 px menu button and nav links, Esc/focus return, skip link, `sidebar-ring`) and Accesibilidad section (ring per surface, skip link first focusable).
- List: `showSkeleton = firstLoad || (refreshing && applications.length === 0)`; counter is `null` while the skeleton shows or on error. Previous cards stay with `aria-busy="true"` and the previous counter.
- `02-REVIEW-DISPOSITION.md` WR-04 -> `fixed` (note «Fixed in 06-06»).

## Task Commits

1. Task 1 RED: `7847a62` test(06-06) shell tests
2. Task 1 GREEN: `3f68381` feat(06-06) skip link, sidebar ring, 44 px shell
3. Task 2 RED: `5d36abe` test(06-06) list refetch tests
4. Task 2 GREEN: `abc604d` fix(06-06) list keeps cards during refetch

## Deviations from Plan

None - plan executed exactly as written. (Tests scope the wordmark lookup to the `aside` and the trigger's `header` because the list scene also renders an «Expediente» eyebrow paragraph.)

## Issues Encountered

- `apps/api` `seed.run.test.ts` failed once in a full `npm run test` (`expected 2 to be 1`) and passed on rerun in isolation. It uses the shared Mongo instance that parallel wave agents also write to; unrelated to this web-only plan. Not fixed (out of scope).

## Known Stubs

None.

## Threat Flags

None. No new network, auth or data surface (T-06-31/32 accepted as planned; no packages installed, no new dependencies).

## Verification

- `npm run test -w @tfm/web -- src/layouts src/core/theme src/common src/pods/application-list` green.
- `npm run typecheck && npm run test && npm run lint` exit 0 (after isolating the shared-DB seed flake above).
- Acceptance greps: skip link and `id="main-content"` present; `ring-sidebar-ring` count 3 in `app-layout.tsx`; no `gap-3|font-medium|text-2xl|text-xl` there; no `px-1.5|text-xs` in `theme-toggle.tsx`; DESIGN.md contains «Saltar al contenido» and `sidebar-ring`; WR-04 `disposition: fixed`.

## Self-Check: PASSED

All modified files exist; commits 7847a62, 3f68381, 5d36abe, abc604d are ancestors of HEAD.
