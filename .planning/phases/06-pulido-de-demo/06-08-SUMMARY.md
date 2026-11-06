---
phase: 06-pulido-de-demo
plan: 08
subsystem: web-ui
tags: [design-tokens, accessibility, contrast, tailwind, pods]
requires:
  - phase: 06-07
    provides: shared components and upload dialog on the new tokens (analog pattern)
provides:
  - pod error icons in foreground colour beside their text
  - delete trigger icon inheriting currentColor
  - on-scale spacing (mt-1, gap-4) across all pods
affects: [06-12]
tech-stack:
  added: []
  patterns: [error icon inherits foreground, no destructive text tint outside /ui/]
key-files:
  created: []
  modified:
    - apps/web/src/pods/application-list/components/list-error.tsx
    - apps/web/src/pods/application-detail/components/detail-states.tsx
    - apps/web/src/pods/application-detail/components/interview-dialog.tsx
    - apps/web/src/pods/application-detail/components/delete-dialog.tsx
    - apps/web/src/pods/application-edit/components/edit-states.tsx
    - apps/web/src/pods/application-edit/components/form-field.tsx
    - apps/web/src/pods/document-upload/components/document-picker.tsx
    - apps/web/src/pods/document-list/document-list.component.tsx
key-decisions:
  - "Class-only sweep; no markup, copy or behaviour changes"
requirements-completed: [DEMO-04, DEMO-03]
duration: 5 min
completed: 2026-11-06
status: complete
commits: 1
plan_head_before: 6093829ced4bcb2f1b1dd085da2d462457c8b542
plan_head_after: a796566be540ec6479c96a0ee6127fb9e3d7beaa
actuals:
  tokens: 1500
  tasks: 1
  commits: 1
coverage:
  - deliverable: "No destructive text tint on pod icons; mt-1 offsets"
    human_judgment: false
    verification:
      - kind: command
        ref: "grep sweep over apps/web/src (text-destructive, mt-0.5) prints 0"
        status: pass
  - deliverable: "Detail and edit skeleton cards on gap-4"
    human_judgment: false
    verification:
      - kind: command
        ref: "grep -rnE 'gap-3|px-3|py-3|px-1\\.5|font-bold|font-medium|text-xs' prints 0"
        status: pass
  - deliverable: "Typecheck, tests and lint stay green"
    human_judgment: false
    verification:
      - kind: command
        ref: "npm run typecheck && npm run test && npm run lint"
        status: pass
---

# Phase 6 Plan 08: Pod token sweep Summary

Every pod error `CircleAlert` and the application delete trigger `Trash2` now inherit the foreground colour, and the detail and edit skeleton cards sit on the `gap-4` spacing scale, so the whole app satisfies UI-SPEC A1 and A2.

## Accomplishments

- Removed `text-destructive` from the 9 error `CircleAlert` icons in `list-error.tsx`, `detail-states.tsx` (2), `interview-dialog.tsx`, `edit-states.tsx` (2), `form-field.tsx`, `document-picker.tsx` and `document-list.component.tsx`; their offset moved from `mt-0.5` to `mt-1`. Every icon still sits next to its message text, so errors are not conveyed by colour alone.
- Removed the tint from the `Trash2` in `delete-dialog.tsx` (inherits `currentColor` inside the outline «Eliminar» trigger).
- Detail and edit skeleton cards use `gap-4` instead of `gap-3`.

## Sweep grep results (apps/web/src, `*.tsx`, excluding `/ui/` and tests)

| Sweep | Before | After |
|-------|--------|-------|
| `text-destructive` | 10 | 0 |
| `mt-0.5` | 9 | 0 |
| `gap-3\|px-3\|py-3\|px-1\.5\|font-bold\|font-medium\|text-xs` | 2 | 0 |

## Verification

- `npm run typecheck`, `npm run test` (api 464 passed, web 718 passed) and `npm run lint` all exit 0.
- No pod test asserted the removed classes, so no test edit was needed.
- Prettier (via lint-staged) collapsed the now-shorter `CircleAlert` props onto fewer lines; formatting only.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Class-only changes; no new surface. No package installed (T-06-SC); `npm ci` only restored the gitignored `node_modules` in the worktree.

## Self-Check: PASSED

- All 8 modified files exist and are in commit a796566.
- Commit a796566 is an ancestor of HEAD.
