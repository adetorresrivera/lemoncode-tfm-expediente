---
phase: 05-documentos-en-s3
plan: 08
subsystem: web
tags: [react, tanstack-router, radix-alert-dialog, toggle-group, document-library]

requires:
  - phase: 05-documentos-en-s3
    provides: "05-02 GET /api/documents?type=, DELETE /api/documents/:id (204, 409 DOCUMENT_IN_USE), GET /api/documents/:id/download"
  - phase: 05-documentos-en-s3
    provides: "05-04 /documents route with lenient ?type=, DocumentListScene header, DocumentUploadContainer generic mode"
  - phase: 05-documentos-en-s3
    provides: "05-07 formatFileSize in common/lib/format.ts"
provides:
  - "document-list pod: the /documents library (rows, type filter, states, download links, delete dialog)"
  - "DocumentListContainer({ type, onTypeChange, refreshToken, renderHeader }) with a renderHeader slot that hands the pod's counter to the scene header"
  - "DocumentListScene composes header, upload container, list, refresh signal and filter in the URL"
  - "«Documentos» is a link to /documents in the sidebar and in the mobile Sheet"
affects: [05-05 picker (separate worktree, untouched pods), 05-09 UAT]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 90e527621a8560794a0853ee3e711decc70f0571
plan_head_after: 04ece2d8b788e9ee2a8bef8a21e8cbab4a8746c7

tech-stack:
  added: []
  patterns:
    - "Keyed result `${type ?? ''}#${attempt}#${refreshToken}`: a refresh keeps the rows with aria-busy, no skeleton flash"
    - "renderHeader slot: the pod owns its counter (data) and the scene owns the header markup, so no pod-to-scene effect is needed"
    - "Delete is the response's truth: remove(id) awaits the 204, then drops the row from the current ok result (same key only); failures reject so the dialog shows its message"
    - "One controlled AlertDialog for the whole list; focus returns to the opener on cancel and to the results region after a successful delete (the row's button is gone)"

key-files:
  created:
    - apps/web/src/pods/document-list/api/api.ts
    - apps/web/src/pods/document-list/document-list.vm.ts
    - apps/web/src/pods/document-list/document-list.mapper.ts
    - apps/web/src/pods/document-list/document-list.hooks.ts
    - apps/web/src/pods/document-list/document-list.container.tsx
    - apps/web/src/pods/document-list/document-list.component.tsx
    - apps/web/src/pods/document-list/components/document-row.tsx
    - apps/web/src/pods/document-list/components/document-delete-dialog.tsx
    - apps/web/src/pods/document-list/index.ts
    - apps/web/src/pods/document-list/document-list.test.tsx
  modified:
    - apps/web/src/scenes/document-list.scene.tsx
    - apps/web/src/layouts/app-layout.tsx
    - apps/web/src/layouts/app-layout.test.tsx
    - apps/web/src/core/router/router.test.tsx

key-decisions:
  - "No dependency added; everything uses the installed radix-ui, lucide-react, @tanstack/react-router and contracts."
  - "renderHeader slot: the list count is pod data and a pod never pushes state to the scene from an effect, so the scene passes renderHeader({ counter }) and the pod renders it first with its own polite counter element. The scene header is therefore exactly D-27 (eyebrow, h1 + counter, upload container)."
  - "Refresh signal: the scene keeps a `refresh` number, bumps it in onUploaded and passes it as refreshToken; the hook puts it in its key."
  - "Filter switch on upload: with an active filter and an uploaded type that differs, the scene navigates to ?type=<uploaded> with replace; in Todos or with the same type only the refresh runs."
  - "Delete is the response's truth: remove(id) waits for the 204, never refetches, and is the only place that drops a row and announces «Documento eliminado.» (5 s timer cleaned on unmount). 409 and any other failure reject, the container maps them with deleteErrorMessage(code) and the dialog stays open."
  - "The type and usage badges live inside document-row.tsx (UI-SPEC lists them as suggestions) to keep the plan at 14 files."
  - "The counter sits next to the h1 in the left block of the header (flex-wrap), the upload container on the right from sm."

patterns-established:
  - "Sub-views of a pod that only one component uses (TypeFilter, ListSkeleton, ListError, EmptyState) live in the component file; only the row and the dialog get their own file"
  - "Radix modal content aria-hides the page, so tests that look at rows behind an open dialog use `hidden: true`"

requirements-completed: [DOC-06, DOC-05, DOC-01]

coverage:
  - id: W1
    description: "/documents lists every document in API order with type badge (CV or Carta), version, date, size and «En uso en N candidaturas» only when used, plus a polite counter «Sin documentos / 1 documento / N documentos» in the header slot"
    requirement: DOC-06
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-list/document-list.test.tsx#document list (lists every document, shows type version date size and use, document list mapper)"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#/documents library renders the header with the eyebrow, the heading, the counter and the upload button"
        status: pass
    human_judgment: false
  - id: W2
    description: "The Todos / CV / Carta filter lives in the URL: choosing a type navigates with replace and requests ?type=, Todos removes it, the pressed item never empties the group, and a reload keeps it"
    requirement: DOC-06
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-list/document-list.test.tsx#reports the chosen type, Todos as undefined and ignores the pressed item"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#/documents library puts the chosen type in the URL replacing the entry and requests it; keeps the filter of the URL after a reload"
        status: pass
    human_judgment: false
  - id: W3
    description: "First load, refresh (rows kept, aria-busy), 500 and network errors with fixed copy and «Reintentar» focusing the results, and both empty states with «Ver todos los documentos»"
    requirement: DOC-06
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-list/document-list.test.tsx#document list (skeleton, refresh, alert, retry, network, empty, empty by filter)"
        status: pass
    human_judgment: false
  - id: W4
    description: "Each row has a download anchor to /api/documents/<id>/download with the download attribute and an always-enabled «Eliminar <name>» button, including for documents in use"
    requirement: DOC-06
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-list/document-list.test.tsx#links every row to its download and keeps «Eliminar» enabled even when in use"
        status: pass
    human_judgment: false
  - id: W5
    description: "Delete: confirmation with name and version and focus on «Conservar documento»; one DELETE while «Eliminando…» with both buttons aria-disabled and close ignored; 409 shows the D-29 sentence with the row kept; other failures show the generic sentence; 204 removes the row without a new GET, updates the counter, announces «Documento eliminado.» for 5 s and focuses the results region; cancel returns focus to the row's button"
    requirement: DOC-05
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-list/document-list.test.tsx#delete from the library"
        status: pass
    human_judgment: false
  - id: W6
    description: "Uploading from the header reloads the list; with an active filter and another uploaded type the filter switches with replace so the new row shows; «Documento subido.» is announced"
    requirement: DOC-01
    verification:
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#/documents library (switches the filter to the uploaded type, reloads once in Todos, reloads without changing the filter)"
        status: pass
    human_judgment: false
  - id: W7
    description: "«Documentos» is a link to /documents with the «Mis candidaturas» classes in the sidebar and the Sheet, without «Próximamente»; «Tablero» keeps it; activating it in the Sheet closes the menu"
    requirement: DOC-06
    verification:
      - kind: integration
        ref: "apps/web/src/layouts/app-layout.test.tsx#links Documentos to /documents without «Próximamente»; closes the sheet after following the Documentos link; marks Tablero as disabled without a link"
        status: pass
    human_judgment: false
  - id: W8
    description: "Backstop: a 120-character name and a 40-character version wrap without horizontal scroll at 360 px and 1024 px on /documents"
    requirement: DOC-06
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout; the pod test asserts min-w-0 and break-words, the visual check belongs to the 05-09 UAT 360 px pass."
  - id: W9
    description: "Backstop: the «Documentos» nav item fits the mobile Sheet at 360 px like «Mis candidaturas»"
    requirement: DOC-06
    verification: []
    human_judgment: true
    rationale: "Same label length and classes as «Mis candidaturas»; measuring needs a real viewport (05-09 UAT)."
  - id: W10
    description: "Backstop: the download attribute of the row link keeps the SPA in place when the endpoint answers 404 (RESEARCH assumption A2)"
    requirement: DOC-06
    verification: []
    human_judgment: true
    rationale: "Browser behaviour of a failing download cannot run in jsdom; confirmed once in a real browser in the 05-09 UAT, and the attribute can be removed without changing D-24."

duration: 40min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 08: Document library list Summary

**The /documents page lists every stored document with type, version, date, size and «En uso en N candidaturas», filters it by type in the URL, downloads through a plain anchor, deletes through one controlled dialog that shows the rule-4 refusal in place, refreshes after uploads and is reachable from the sidebar and the mobile menu.**

## Performance

- **Duration:** about 40 min (start time not captured)
- **Tasks:** 2 (both TDD)
- **Files:** 14 (10 created, 4 modified), the explicit scope of the plan
- **Commits:** 2 task commits, measured with `git rev-list --count 90e527621a8560794a0853ee3e711decc70f0571..HEAD` (the sandbox blocks writing the ledger file in the shared `.git`), before this SUMMARY commit
- **Tests:** web 586 (was 530 plus the other wave work in this base), api, contracts unchanged; typecheck, lint and prettier clean

## Accomplishments

- No dependency added.
- `document-list` pod with the course's full file set: `api/api.ts` (`getDocumentList`, `deleteDocument`), vm, mapper (`usageLabel`, `countLabel`, `deleteErrorMessage`, `mapDocumentListFromApiToVm`), keyed-result hook with `remove` and `feedback`, container, component, `DocumentRow`, `DocumentDeleteDialog`, `index.ts` exporting only the container. View-model types are declared field by field, never derived from a contracts type.
- Counter through the `renderHeader` slot, so the header is exactly eyebrow, h1 with counter and the upload container (D-27).
- Refresh signal and filter switch on upload live in the scene; the filter, the refresh and the delete never touch another pod.
- Delete: the dialog copies `interview-delete-dialog.tsx`; `Eliminar` stays enabled for documents in use so rule 4 can be shown live; the row, the counter and «Documento eliminado.» change only after the 204.
- Shell: «Documentos» is a `Link` with the same class string as «Mis candidaturas»; `Próximamente` remains only on «Tablero».

## Task Commits

1. **Task 1: List with type filter and download links** - `fb7fcfe` (feat)
2. **Task 2: Delete, navigation link and refresh after uploads** - `04ece2d` (feat)

## TDD Gate Compliance

The pre-commit hook runs the whole suite and `tsc`, so a deliberately failing test cannot be committed; RED and GREEN were committed together per task (`feat(05-08)`, no separate `test(05-08)` commit). The RED runs were done locally before any implementation:

- **Task 1 RED:** `document-list.test.tsx` written first; the run failed with `Tests no tests` because the container and mapper modules did not exist (import resolution failure). This is a load failure, not an assertion failure, so by the strict `tdd-red-evidence` rules it is INVALID_RED (`fixture_or_load_failure`); the GREEN was authorised by the plan's explicit behaviour list, not by that evidence. After the implementation 17 of 18 passed; the one failure was a test bug (nested `aria-hidden` skeleton children counted), fixed in the test.
- **Task 2 RED:** the delete block, with the pod already existing, ran 8 failed / 18 passed; each failure was `findByRole("alertdialog", { name: "¿Eliminar este documento?" })` timing out (the dialog did not exist yet), i.e. the target assertion failed for the planned reason. After the implementation 3 tests failed because Radix aria-hides the rows behind an open dialog (test bug, fixed with `hidden: true`); 26 of 26 then passed.
- No REFACTOR commit.

## Decisions Made

See `key-decisions`. `remove` and `feedback` were stubs in Task 1 (the plan allows it) and were completed in Task 2; the Task 1 container passed a no-op `onDelete` and no dialog until then.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test queried headings behind an open modal**
- **Found during:** Task 2
- **Issue:** `getByRole("heading", { name: "CV Frontend" })` failed while the alert dialog was open because Radix marks the rest of the page `aria-hidden`.
- **Fix:** the three assertions that look at the kept row behind the dialog use `hidden: true`.
- **Files modified:** apps/web/src/pods/document-list/document-list.test.tsx
- **Commit:** 04ece2d

**2. [Rule 1 - Bug] Nav class comparison failed on the active link**
- **Found during:** Task 2
- **Issue:** comparing the full `className` of «Documentos» with «Mis candidaturas» failed because the router adds an active class to the current route link.
- **Fix:** the test asserts the shared tokens with `toHaveClass` and that `cursor-not-allowed` is gone.
- **Files modified:** apps/web/src/layouts/app-layout.test.tsx
- **Commit:** 04ece2d

**Total deviations:** 2 auto-fixed (both test-only). **Impact:** none on behaviour.

### Scope notes

- UI-SPEC §5 also asks to update `docs/DESIGN.md` (Shell and «Documentos» screen). The plan's `files_modified` does not include it, so it was left out; it fits the phase docs pass before the 05-09 UAT.
- Added one router test beyond the plan (upload with the same type as the active filter reloads without touching the URL) and one pod test (no leftover error when opening the dialog on another document).

## Auth Gates

None.

## Known Stubs

None. The only no-op (`onDelete`, `deleteDialog={null}` in the Task 1 container) was replaced in Task 2.

## Threat Flags

None. `?type=` reaches the API only through `URLSearchParams` with the parsed value (T-05-31); the row is removed only after the 204 (T-05-32, asserted by test); names render as React text nodes only (T-05-33); no package was installed (T-05-SC).

## Issues Encountered

None.

## Next Phase Readiness

Ready for the 05-09 UAT. Human check pending for this plan: with `npm run dev`, link a CV to an application, open «Documentos» from the sidebar and from the menu at 360 px, confirm the linked CV shows «En uso en 1 candidatura» and its deletion is refused in the dialog with the D-29 sentence; delete an unlinked document; upload a Carta while the filter is CV; look for sideways scroll at 360 px and the `download` attribute against a 404 (backstop rows W8 to W10).

## Self-Check: PASSED

- Created files exist: the ten pod files (api, vm, mapper, hooks, container, component, row, dialog, index, test) and the modified scene, layout, layout test and router test.
- Commits `fb7fcfe` and `04ece2d` are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (web 586 passed) and `npm run lint` exit 0; all acceptance greps of both tasks pass.
