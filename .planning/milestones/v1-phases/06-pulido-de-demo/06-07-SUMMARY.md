---
phase: 06-pulido-de-demo
plan: 07
subsystem: web-ui
tags: [design-tokens, contrast, accessibility, ui-review]
requires: [06-06]
provides:
  - shared error icon without destructive tint
  - on-scale spacing and type in shared components and upload dialog
  - Phase 6 Amendments A1, A2, A10 written back to earlier contracts
affects: [06-08]
tech-stack:
  added: []
  patterns: ["error icons inherit text-foreground; destructive red only as bg-destructive or invalid-field border"]
key-files:
  modified:
    - apps/web/src/common/components/request-status.tsx
    - apps/web/src/common/components/status-badge.tsx
    - apps/web/src/common/components/ai-mark.tsx
    - apps/web/src/common/components/common-components.test.tsx
    - apps/web/src/pods/document-upload/components/upload-dialog.tsx
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - .planning/phases/05-documentos-en-s3/05-UI-SPEC.md
    - .planning/phases/02-candidaturas/02-UI-SPEC.md
    - docs/DESIGN.md
decisions:
  - "Pure class changes; no markup, copy or behaviour changes"
metrics:
  completed: 2026-11-06
status: complete
actuals:
  tokens: 2500
  tasks: 2
  commits: 2
plan_head_before: c2fc2c98c6b40e4137093cef72c77cc04b85ac59
plan_head_after: f8f9ef4bbac0f5e342b709c19e157084e8251689
commits: 2
---

# Phase 6 Plan 07: Shared components and upload dialog on the scales Summary

The shared `RequestStatus` error icon and the upload dialog error icon no longer use the destructive text tint (2.83:1 on `card` in dark), and off-scale spacing and weight are gone from the shared components and the dialog; the earlier contracts and DESIGN.md say so.

## Tasks

| Task | Commit | Result |
| ---- | ------ | ------ |
| 1. Shared components | 208b4c2 | `request-status.tsx` icons `mt-1`, error icon inherits `text-foreground`; `status-badge.tsx` `py-1`; `ai-mark.tsx` `px-2 font-semibold`; class assertions updated |
| 2. Upload dialog and contracts | f8f9ef4 | `upload-dialog.tsx` error icon `mt-1` without tint, `file:mr-4`; test updated; A1/A2/A10 written to 05-UI-SPEC, 02-UI-SPEC, DESIGN.md |

## Before/after counts

| Check | Before | After |
| ----- | ------ | ----- |
| `text-destructive` in request-status.tsx | 1 | 0 |
| `mt-0.5` in request-status.tsx | 3 | 0 |
| `px-1.5` / `font-bold` in ai-mark.tsx | 1 line | 0 |
| `py-0.5` in status-badge.tsx | 1 | 0 |
| `file:mr-3` in apps/web/src tsx (component + test) | 2 | 0 |
| `text-destructive` in upload-dialog.tsx | 1 | 0 |
| «Phase 6 Amendment A1» in 05-UI-SPEC / 02-UI-SPEC | 0 / 0 | present in both |
| «inherited exemption» in 05-UI-SPEC | 1 | 0 |
| DESIGN.md old badge/AI-mark classes | present | replaced; «heredan `text-foreground`» added |

## Verification

`npm run typecheck`, `npm run test` (api 464, web 718, contracts 59 passing) and `npm run lint` exit 0.

## Deviations from Plan

None - plan executed exactly as written. No dependencies added. No stubs. No new threat surface.

## Self-Check: PASSED

Commits 208b4c2 and f8f9ef4 are ancestors of HEAD; all modified files present.
