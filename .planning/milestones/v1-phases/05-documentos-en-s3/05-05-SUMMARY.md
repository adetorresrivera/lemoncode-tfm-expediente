---
phase: 05-documentos-en-s3
plan: 05
subsystem: web
tags: [react, tanstack-form, native-select, picker, render-prop-slot]

requires:
  - phase: 05-documentos-en-s3
    provides: "05-03 cvDocumentId and coverLetterDocumentId in the form values, the save mapping and the server 400 field errors; 05-04 the document-upload pod in generic mode"
provides:
  - "getDocuments(type, signal) against GET /api/documents?type=, documentLabel, mapDocumentsToOptionsVm, useDocumentOptions"
  - "DocumentPicker: native select with Sin CV / Sin carta first, loading, error, empty and missing-option states"
  - "DocumentUploadContainer picker mode (type, selectedId, onSelected, error?) next to the generic mode"
  - "RenderDocumentPicker slot, DocumentsSection after Seguimiento, scene wiring"
affects: [05-06 Subir nuevo inside the picker, 05-08 library list, 05-09 UAT]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 90e527621a8560794a0853ee3e711decc70f0571
plan_head_after: 06042ef6449f9125b2b30f47e0b4815f8fdcc195

tech-stack:
  added: []
  patterns:
    - "Picker select keeps the form value through loading and error: a single option whose value is the current selectedId, changes ignored unless the list is ok"
    - "Container union by discriminant: type undefined = generic mode, type set = picker mode, each branch its own component so hooks stay unconditional"
    - "Render-prop slot with the field error passed through so the slot owner can mark its own control"

key-files:
  created:
    - apps/web/src/pods/document-upload/components/document-picker.tsx
    - apps/web/src/pods/application-edit/components/documents-section.tsx
  modified:
    - apps/web/src/pods/document-upload/api/api.ts
    - apps/web/src/pods/document-upload/document-upload.vm.ts
    - apps/web/src/pods/document-upload/document-upload.mapper.ts
    - apps/web/src/pods/document-upload/document-upload.hooks.ts
    - apps/web/src/pods/document-upload/document-upload.container.tsx
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/application-edit.component.tsx
    - apps/web/src/pods/application-edit/application-edit.test.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
    - apps/web/src/scenes/application-edit.scene.tsx

key-decisions:
  - "No dependency added."
  - "The slot is extended with error (D-14 arguments unchanged): the field's first error reaches the picker so it can put aria-invalid and aria-describedby on its own select; the existing focus-first-invalid helper (document-wide [aria-invalid=true] query) then finds it. Without it a server 400 on a link would be invisible."
  - "renderDocumentPicker is a required prop of the container and the component, like renderCancelLink: a scene that forgets it is a type error. Pod tests pass a plain-select test double, never the real pod; the ai tests pass a no-op returning a fragment."
  - "Loading and error keep the value: the select renders one option whose value is selectedId with the state text and the onChange handler ignores events unless the list is ok, so React never resets the field and a stored link cannot be dropped by a list that is not there. A linked id missing from a loaded list gets an extra option Documento vinculado."
  - "DOC-03 unclassified probe reviewed manually: its relevant edges are covered by the missing-option, failed-list and unlink (Sin CV) tests here and by 05-03 (wrong type, unknown id). Nothing else assumed."
  - "Picker mode renders DocumentPicker straight from the container; the generic mode keeps DocumentUploadComponent. 05-06 adds Subir nuevo and the shared dialog to the picker, and the GET /api/documents default in mock-fetch plus the router end-to-end test."

patterns-established:
  - "Pod seams for cross-pod composition: the scene fills a typed render-prop slot, the consuming pod never imports the other pod"

requirements-completed: []
requirements-partial:
  - id: DOC-03
    done: "In the application form the user picks an existing CV and an existing cover letter (or none) in the Documentos section; the save stores exactly those ids and an edit keeps them"
    pending: "Subir nuevo from the picker and the router end-to-end test (05-06); document detail and download (05-07, 05-08)"

coverage:
  - id: D1
    description: "The picker lists Sin CV (Sin carta) first and then the library documents of its type newest first as nombre · versión · fecha, and reports the choice"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#DocumentUploadContainer in picker mode"
        status: pass
    human_judgment: false
  - id: D2
    description: "Loading, failed list, empty list and linked-but-missing id never change the form value and show the planned copy, aria-busy/aria-disabled and a type=button Reintentar"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#keeps the select in place while loading and ignores changes"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#shows the failure, keeps the value and retries with a type=button button"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#never submits a surrounding form"
        status: pass
    human_judgment: false
  - id: D3
    description: "The application form shows Documentos after Seguimiento; the chosen ids are saved as cvDocumentId and coverLetterDocumentId, none sends null, an edit keeps the loaded ids, a server 400 on one link marks only that picker"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#ApplicationEditContainer Documentos section"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real scene composition: both pickers list the real library, keyboard choice, save and second save keep the ids; the select never widens the card at 360 px"
    requirement: DOC-03
    verification: []
    human_judgment: true
    rationale: "The pod tests use a test double for the slot and jsdom has no layout; the real scene and the 360 px overflow need a browser (05-09 UAT)."

duration: 14min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 05: Document pickers in the application form Summary

**The application form has a Documentos section with a CV and a cover-letter native select fed by GET /api/documents?type=, keeping the stored link through loading, errors and missing options, wired through a render-prop slot so the two pods stay independent.**

## Performance

- **Duration:** about 14 min
- **Started:** 2026-11-04T19:45Z (approx.)
- **Completed:** 2026-11-04T19:58Z (approx.)
- **Tasks:** 2
- **Files modified:** 14 (2 new)

## Accomplishments

- `document-upload` pod: `getDocuments`, `documentLabel`, `mapDocumentsToOptionsVm`, `useDocumentOptions` (keyed result with retry and abort) and `DocumentPicker`; the container now has a picker mode.
- `application-edit` pod: `RenderDocumentPicker` slot, `DocumentsSection` after Seguimiento, required prop through container and component; the scene fills the slot with `DocumentUploadContainer`.
- 20 new tests (10 picker, 2 mapper, 4 form section) plus the headings test updated; full suite 567 web tests, typecheck and lint green.

## Task Commits

1. **Task 1: document picker lists the library by type** - `101e8dd` (feat)
2. **Task 2: Documentos section in the application form** - `06042ef` (feat)

`commits: 2` is measured with `git rev-list --count 90e527621a8560794a0853ee3e711decc70f0571..HEAD` before this SUMMARY commit (the shared `.git` is not writable from the worktree, so no ledger file was kept).

## Files Created/Modified

- `apps/web/src/pods/document-upload/components/document-picker.tsx` - native select, hint, error line, retry; all states
- `apps/web/src/pods/document-upload/{api/api.ts,document-upload.vm.ts,document-upload.mapper.ts,document-upload.hooks.ts,document-upload.container.tsx}` - list fetch, view models, label, options hook, picker mode
- `apps/web/src/pods/application-edit/components/documents-section.tsx` - section that calls the slot twice
- `apps/web/src/pods/application-edit/{application-edit.vm.ts,application-edit.container.tsx,application-edit.component.tsx}` - slot type and prop
- `apps/web/src/scenes/application-edit.scene.tsx` - slot wiring
- tests: `document-upload.test.tsx`, `application-edit.test.tsx`, `application-edit.ai.test.tsx`

## Decisions Made

See `key-decisions` above. No dependency added.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

The repo pre-commit hook runs the whole suite, so a committed RED commit is impossible. Within each task the tests and implementation were committed together (`feat`), one commit per task. Honest note: for Task 1 I wrote the implementation files before the tests, so no RED run was observed for it; for Task 2 the new section tests exercise a section that did not exist (RED by construction) but I did not run them before adding it. The behaviors are covered by passing tests either way.

## Issues Encountered

- A typecheck error in the new tests (route handlers typed implicitly because the mock route record is `unknown`-valued): fixed by annotating `(url: URL)`.

## Known Stubs

None.

## Threat Flags

None. The threat register (T-05-23 silent unlink, T-05-24 option labels as React text, T-05-25 type=button) is mitigated and covered by tests; no new network surface beyond the planned `GET /api/documents?type=`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 05-06 can add Subir nuevo to `DocumentPicker` (the row `flex flex-col gap-2 sm:flex-row` already holds the select wrapper with `sm:flex-1` for the action) and the `GET /api/documents` default in `mock-fetch.ts`.
- Until 05-06, router tests at `/applications/new` see the picker error state because `GET /api/documents` answers the mock's 404; no router test asserts on it.
- Human check pending (05-09): real browser, keyboard choice, save and re-save keep the ids; no horizontal scroll at 360 px.

## Self-Check: PASSED

- Files exist: `document-picker.tsx`, `documents-section.tsx`.
- Commits `101e8dd` and `06042ef` are ancestors of HEAD.
- `npm run typecheck && npm run test && npm run lint` exit 0; all acceptance criteria of both tasks pass.

---
*Phase: 05-documentos-en-s3*
*Completed: 2026-11-04*
