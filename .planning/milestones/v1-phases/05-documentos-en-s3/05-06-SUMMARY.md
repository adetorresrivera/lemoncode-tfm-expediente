---
phase: 05-documentos-en-s3
plan: 06
subsystem: web
tags: [react, radix-dialog, picker, tanstack-form, router-tests]

requires:
  - phase: 05-documentos-en-s3
    provides: "05-04 upload dialog in generic mode; 05-05 document pickers and the render-prop slot in the application form"
provides:
  - "components/upload-dialog.tsx: the one UploadDialog for generic and picker modes (fixedType)"
  - "«Subir nuevo» in each picker: opens the dialog with the type fixed, adds the uploaded document first, selects it, announces «Documento subido.»"
  - "useDocumentOptions().add and UploadedDocumentVm.label"
  - "mock-fetch default GET /api/documents -> []"
  - "Router end-to-end tests: attach a CV from the form; discarding the form keeps the upload"
affects: [05-07 detail, 05-08 library, 05-09 UAT]

actuals:
  tokens: 36000
  tasks: 2
  commits: 2
plan_head_before: 32eaa767e6997e4ba4d0358a359560436b39350c
plan_head_after: 40969ab75a76a0e71a9942daa0dcae424797f1b7

tech-stack:
  added: []
  patterns:
    - "One dialog component, two owners: the generic opener and the picker container each hold their own open/uploading/outcome state and pass the same handlers"
    - "Trigger-less Radix dialog: opener stored on click, focused again in onCloseAutoFocus"

key-files:
  created:
    - apps/web/src/pods/document-upload/components/upload-dialog.tsx
  modified:
    - apps/web/src/pods/document-upload/document-upload.component.tsx
    - apps/web/src/pods/document-upload/components/document-picker.tsx
    - apps/web/src/pods/document-upload/document-upload.container.tsx
    - apps/web/src/pods/document-upload/document-upload.hooks.ts
    - apps/web/src/pods/document-upload/document-upload.mapper.ts
    - apps/web/src/pods/document-upload/document-upload.vm.ts
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - apps/web/src/test/mock-fetch.ts
    - apps/web/src/core/router/router.test.tsx

key-decisions:
  - "No dependency added."
  - "The dialog and form moved unchanged to components/upload-dialog.tsx; the only new input is fixedType (title «Subir CV» / «Subir carta de presentación», no Tipo control, values start from that type). Generic mode keeps title «Subir documento» and Tipo."
  - "The uploaded document goes first in the options (the API lists newest first) with the label built from the upload response through documentLabel; the list is not fetched again. add() only writes into an ok result: with a loading or failed list there is nothing to add to, and onSelected(id) still sets the form value."
  - "«Subir nuevo» is aria-disabled with an early return in the click while the list loads, and available when the list failed."
  - "The inner onSubmit keeps preventDefault() and stopPropagation(); both isolation tests were checked to fail with stopPropagation removed."

requirements-completed: [DOC-03]
requirements-partial: []

coverage:
  - id: D1
    description: "«Subir nuevo» opens the one upload dialog with a type-specific title, no Tipo, focus on Archivo; a successful upload closes it, adds the document first, selects it, announces «Documento subido.» and returns focus to «Subir nuevo»"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#DocumentUploadContainer «Subir nuevo» in picker mode"
        status: pass
    human_judgment: false
  - id: D2
    description: "The dialog never submits the application form (click and Enter) and sends exactly one POST /api/documents"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#never submits the application form from the upload dialog (click)"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#never submits the application form from the upload dialog (Enter)"
        status: pass
    human_judgment: false
  - id: D3
    description: "At /applications/new the user uploads «CV Frontend.pdf» v3 from «Subir nuevo», sees it selected and saves; the POST /api/applications body has cvDocumentId d1 and coverLetterDocumentId null"
    requirement: DOC-03
    verification:
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#documents in the application form"
        status: pass
    human_judgment: false
  - id: D4
    description: "Discarding the form sends no DELETE and the next form lists the document uploaded from the discarded one"
    requirement: DOC-03
    verification:
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#keeps a document uploaded from the form after «Descartar cambios»"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real file chooser, real portal and real API together; stacking of the dialog over the form at 360 px"
    requirement: DOC-03
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout and no real file chooser; covered by the human-check of the plan and 05-09 UAT."

duration: 12min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 06: Upload from the application form Summary

**Each document picker in the application form now has «Subir nuevo», which opens the one shared upload dialog with the type fixed; the new CV or cover letter is added at the top of the options, selected and announced, and the form is never submitted by the dialog.**

## Accomplishments

- `UploadDialog` extracted to `components/upload-dialog.tsx` (moved, not rewritten) with `fixedType` for picker mode; `DocumentUploadComponent` imports it.
- `DocumentPicker` gains the outline «Subir nuevo» button (`type="button"`, `Upload` icon) and an always-mounted polite line for «Documento subido.».
- Picker container owns the dialog state, the 5 s success timer and focus return; on 201 it calls `options.add`, `onSelected(id)` and closes.
- `mock-fetch` answers `GET /api/documents` with `[]` by default; two router end-to-end tests (attach CV and save, discard keeps upload).
- 11 new pod tests, 2 router tests; web suite green, typecheck and lint green.

## Task Commits

1. **Task 1: Upload a new CV or cover letter from the picker** - `0c87183` (feat)
2. **Task 2: Attach a CV end to end through the router** - `40969ab` (test)

`commits: 2` is measured with `git rev-list --count 32eaa767e6997e4ba4d0358a359560436b39350c..HEAD` before this SUMMARY commit (the shared `.git` is not writable from the worktree, so no ledger file was kept).

## Decisions Made

See `key-decisions`. No dependency added.

## Deviations from Plan

**1. [Interface naming] Dialog props kept as in 05-04**
- The plan lists `onSubmitValues` and `onCancelUpload`; the moved code already used `handlers: UploadFormHandlers` and `onCancel`, and the plan says the move is unchanged. Kept the existing names so the move stays a move. `DocumentPicker.onUploadNew` receives the clicked button (`(opener: HTMLElement) => void`) instead of `() => void`, so the container can store the opener for focus return.

**2. [Test fixture] The router list handler adds `usedBy: 0`**
- `GET /api/documents` is parsed with `documentListItemSchema`; a stored `Document` without `usedBy` made the second form's picker fail. Fixture only, no product change.

Task 2 needed no product code changes, as the plan expected.

## TDD Gate Compliance

The repo pre-commit hook runs the whole suite, so a committed RED commit is impossible. Tests and implementation were committed together per task. For the isolation tests I observed RED by removing `stopPropagation()` locally: both tests failed, then passed once restored. For the other new tests I wrote the implementation first, so no RED run was observed for them; the router tests reached GREEN after one fixture fix (see Deviations).

## Known Stubs

None.

## Threat Flags

None. T-05-26 (dialog submit reaching the application form) is mitigated and covered by the click and Enter tests; T-05-27 (silent removal on discard) is covered by the router test asserting no DELETE. No new network surface.

## Issues Encountered

None beyond the fixture fix above.

## User Setup Required

None.

## Next Phase Readiness

- Human check pending (plan Task 2 and 05-09 UAT): real PDF through the real file chooser, 360 px layout of the picker row (select plus «Subir nuevo» stacks below `sm`).

## Self-Check: PASSED

- `upload-dialog.tsx` exists; commits `0c87183` and `40969ab` are ancestors of HEAD.
- Acceptance greps pass (2 isolation tests, one export in `index.ts`, `UploadForm` gone from the component).
- `npm run typecheck`, `npm run lint`, web tests green (hook ran the full suite on both commits).

---
*Phase: 05-documentos-en-s3*
*Completed: 2026-11-04*
