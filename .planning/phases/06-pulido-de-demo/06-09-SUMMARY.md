---
phase: 06-pulido-de-demo
plan: 09
subsystem: ui
tags: [dialog, a11y, aria-disabled, live-region, radix]
requires:
  - phase: 06-08
    provides: token sweep on pods
provides:
  - "DialogContent closeDisabled prop (aria-disabled X, still focusable)"
  - "Close-blocked sentences in the upload and round dialogs"
affects: [06-10]
tech-stack:
  added: []
  patterns:
    - "Close-blocked flag cleared during render (no setState in effects)"
key-files:
  created: []
  modified:
    - apps/web/src/common/components/ui/dialog.tsx
    - apps/web/src/pods/document-upload/components/upload-dialog.tsx
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - apps/web/src/pods/application-detail/components/interview-dialog.tsx
    - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
    - .planning/phases/05-documentos-en-s3/05-REVIEW-DISPOSITION.md
    - .planning/phases/05-documentos-en-s3/05-UI-SPEC.md
key-decisions:
  - "Delete dialogs keep their silent Esc lock (AlertDialogs without X; button already reads Eliminando...). Recorded as known debt."
  - "«Descartar cambios» in the round dialog stays a silent no-op while saving (its handler lives in the form, outside the dialog's close-blocked state)."
requirements-completed: [DEMO-04]
status: complete
duration: 15min
completed: 2026-11-06
commits: 1
plan_head_before: 470839c83cdbb45174b24bd99ad7b87a2d73fb32
plan_head_after: 1bd44a0
actuals:
  tokens: 6500
  tasks: 1
  commits: 1
---

# Phase 6 Plan 09: Dialog close lock with spoken feedback Summary

While an upload or a round save is in flight, the dialog's «Cerrar» X is `aria-disabled` (still focusable) and any close attempt (X, Esc, outside pointer) keeps the dialog open and writes the reason into its always-mounted polite status line.

## Dialogs covered

- Upload dialog: «Cancela la subida para cerrar.» (replaces the loading line while shown; cleared when the upload ends).
- Round (interview) dialog: «Espera a que termine para cerrar.» in its status line.
- Shared `DialogContent` gained `closeDisabled` (default false): `aria-disabled` plus `aria-disabled:opacity-50`, never the `disabled` attribute; the close request still reaches each pod's `onOpenChange`.

## Known debt kept

- Delete dialogs (AlertDialogs, no X) keep their silent Esc lock.
- «Descartar cambios» in the round dialog is still a silent no-op while saving.

## Disposition

05 WR-03 flipped to `fixed` (YAML, table, open count 8); `05-UI-SPEC.md` §1 Uploading records Phase 6 Amendment A6.

## Deviations from Plan

None - plan executed as written. The plan is `type: execute` with a single task, so the tests and the implementation went into one commit (RED was observed locally: 6 failing tests before the implementation).

## Verification

`npm run typecheck`, `npm run test` and `npm run lint` exit 0. No dependencies added.

## Known Stubs

None.

## Self-Check: PASSED
