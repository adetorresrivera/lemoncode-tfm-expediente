---
phase: 05-documentos-en-s3
plan: 04
subsystem: web
tags: [react, tanstack-form, tanstack-router, formdata, multipart, radix-dialog, upload]

requires:
  - phase: 05-documentos-en-s3
    provides: "05-01 POST /api/documents multipart upload, documentSchema.fileName, 413/415 error codes"
provides:
  - "http-client sends a FormData body as is (no content-type), JSON path unchanged"
  - "DOCUMENT_TYPE_LABELS (cv -> CV, carta -> Carta)"
  - "document-upload pod in generic mode: DocumentUploadContainer with the Subir documento button, its polite line and the upload dialog"
  - "/documents route (lenient ?type= search) and DocumentListScene header"
affects: [05-05 picker mode, 05-06 dialog move to components/upload-dialog.tsx, 05-08 library list, 05-09 UAT]

actuals:
  tokens: 14800
  tasks: 2
  commits: 2
plan_head_before: 31d1d455adccecd21776b53b595400a800f1c86e
plan_head_after: 47acb5e

tech-stack:
  added: []
  patterns:
    - "FormData branch in request(): body instanceof FormData is sent untouched so the browser writes the multipart boundary"
    - "Upload runs inside validators.onSubmitAsync (copy of useApplicationForm) so 413, 415 and 400 come back as field errors; async validator never runs when the sync client validation fails"
    - "Uploading state lives in the container (onStart/onSettled), the dialog derives the disabled submit, the loading line and the focus move from it"
    - "Loading line derived from the request in flight; only the last failure or cancellation is stored"

key-files:
  created:
    - apps/web/src/pods/document-upload/api/api.ts
    - apps/web/src/pods/document-upload/document-upload.vm.ts
    - apps/web/src/pods/document-upload/document-upload.mapper.ts
    - apps/web/src/pods/document-upload/document-upload.hooks.ts
    - apps/web/src/pods/document-upload/document-upload.container.tsx
    - apps/web/src/pods/document-upload/document-upload.component.tsx
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - apps/web/src/scenes/document-list.scene.tsx
    - apps/web/src/routes/documents/index.tsx
  modified:
    - apps/web/src/core/http/http-client.ts
    - apps/web/src/common/lib/enum-labels.ts
    - apps/web/src/pods/document-upload/index.ts
    - apps/web/src/routeTree.gen.ts
    - apps/web/src/core/router/router.test.tsx

key-decisions:
  - "Container props, generic mode: DocumentUploadContainer({ initialType?: DocumentType (default cv), onUploaded?({ id, type }) }). Picker mode (05-05) adds type, selectedId, onSelected, error? to the same component."
  - "Uploading state: the submit is disabled and reads Subiendo...; focus moves to the secondary button (now Cancelar subida) the moment the upload starts, driven by the container's uploading flag, not by form isSubmitting (a sync validation failure would flip isSubmitting and drop focus)."
  - "Error code to copy map (fixed, never the server text): 413 FILE_TOO_LARGE -> El archivo supera 5 MB. and 415 UNSUPPORTED_FILE_TYPE -> Solo se admiten archivos PDF o DOCX. (both under Archivo, focus on the file input); 400 with fieldErrors naming file/name/version -> Revisa este campo. under that field; NETWORK_ERROR -> the network sentence; anything else (including a 400 without usable details) -> No se pudo subir el documento. Inténtalo de nuevo. in the dialog live region."
  - "FormData branch is asserted through the fetch mock (init.body instanceof FormData, no content-type header) in the pod test and the router test; the http-client JSON tests keep covering the other branch."
  - "The dialog stays in document-upload.component.tsx (non-exported UploadDialog and UploadForm); 05-06 moves it to components/upload-dialog.tsx when the picker needs it."
  - "useUploadForm takes the upload function and an onSettled callback as extra options (UploadFormHandlers = upload, onUploaded, onStart, onCancelled, onFailed, onSettled) so the container, not the form, owns the request lifecycle and cancel."

patterns-established:
  - "Footer is flex-col on mobile with the primary first (on top) and the DOM order primary then secondary, as the Phase 4 dialogs"
  - "Name prefill ref: a name still equal to the last automatic prefill is replaced by the next file, a typed name never is"

requirements-completed: []
requirements-partial:
  - id: DOC-01
    done: "Upload of a PDF or DOCX with type, name and version from /documents through the dialog and FormData (UI)"
    pending: "Library list in 05-08, picker in the application form in 05-05 and 05-06"
  - id: DOC-02
    done: "Client validation (type, size, empty fields) and friendly Spanish messages for the server 413 and 415"
    pending: "Real browser 413 and real Word DOCX in the 05-09 UAT"

coverage:
  - id: W1
    description: "From /documents the user opens Subir documento, picks a PDF (Nombre prefilled), adds a version and uploads it as one multipart POST; the dialog closes, focus returns to the opener and the page says Documento subido."
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#uploads a PDF as multipart, closes the dialog and announces it"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#/documents renders the page header, sets the title and uploads a PDF from the dialog"
        status: pass
    human_judgment: false
  - id: W2
    description: "Client validation (no file, wrong extension, over 5 MB, empty name and version) sends nothing and focuses the first invalid control"
    requirement: DOC-02
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#client validation"
        status: pass
    human_judgment: false
  - id: W3
    description: "Server 413, 415, 400, network and other failures stay in the dialog with fixed copy and every value kept"
    requirement: DOC-02
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#server and network failures"
        status: pass
    human_judgment: false
  - id: W4
    description: "While uploading: disabled submit, focus on Cancelar subida, second submit sends nothing, X/Escape/outside pointer ignored, Cancelar subida aborts and keeps the values"
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#while uploading"
        status: pass
    human_judgment: false
  - id: W5
    description: "Prefill never overwrites a typed name, is cut to 120, each opening starts empty, focus returns to the opener after Descartar subida, the X and Escape, the success line clears after 5 s, ?type=carta preselects Carta and ?type=zzz degrades to CV"
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx (name prefill, type, focus, success line)"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#/documents (type=carta, type=zzz)"
        status: pass
    human_judgment: false
  - id: W6
    description: "At 360 px the dialog is 328 px wide with internal scroll and the native file control never widens it; the footer stacks with the primary on top"
    requirement: DOC-01
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout; checked in the manual 360 px pass of the 05-09 UAT."
  - id: W7
    description: "Backstop: a request aborted after the server stored the document leaves it in the library (Pitfall 8) and a real browser uploading over 5 MB with the client check bypassed gets the 413 message, not a network error (Pitfall 4)"
    requirement: DOC-02
    verification: []
    human_judgment: true
    rationale: "Real browser behaviour (socket reset on early 413, real file chooser) cannot run in jsdom; both are backstop rows for the 05-09 UAT."

duration: 40min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 04: Web upload tracer Summary

**The /documents page, the document-upload pod (button, dialog, TanStack form, hook with AbortController) and a FormData branch in the shared http-client upload a PDF or DOCX to POST /api/documents, with client validation, fixed Spanish copy per server error, cancel, and focus managed through every state.**

## Performance

- **Duration:** about 40 min (start time not captured; estimate from the commit timestamps)
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD)
- **Files:** 14 (9 created, 5 modified), the explicit tracer scope of the plan
- **Commits:** 2 task commits, measured with `git rev-list --count 31d1d455..HEAD` (the sandbox blocks writing the ledger file in the shared `.git`), before this SUMMARY commit
- **Tests:** web 530 (was 498), api 374, contracts 20; typecheck, lint and prettier clean

## Accomplishments

- No dependency added; the dialog uses the installed `radix-ui` and `@tanstack/react-form`.
- `request()` sends a `FormData` body untouched and without headers (the browser writes the boundary); a plain object body still goes as JSON.
- `DocumentUploadContainer` generic mode with `initialType` and `onUploaded({ id, type })`; `DocumentListScene` passes `search.type` and a no-op handler that 05-08 extends (left as a comment).
- The route `/documents/` validates `?type=` leniently (`.catch(undefined)`), so `?type=zzz` opens the page with CV preselected; the route tree was regenerated by `vite build`.
- Dialog: Tipo toggle (empty Radix value ignored), Archivo (native control, `accept=".pdf,.docx"`, `w-full min-w-0`), Nombre and Versión row, always-mounted polite lines (dialog and page), `preventDefault` and `stopPropagation` on the inner form, opener focus restored through `onCloseAutoFocus`.
- Task 2 tests cover 29 rows: mapper units, client validation, 413/415/400/network/500, uploading state, cancel, close guards, prefill rules, reopen-empty, type, focus return and the 5 s success timer, plus the two `/documents?type=` router rows.

## Task Commits

1. **Task 1: Tracer, upload a PDF from /documents through the dialog, FormData and the API** - `89cc45e` (feat)
2. **Task 2: Validation, server errors, cancel and focus** - `47acb5e` (feat)

## Decisions Made

See `key-decisions`. Where the FormData branch is asserted: the pod test and the router test check `init.body instanceof FormData`, the four parts and the missing content-type header. The dialog moves to `components/upload-dialog.tsx` in 05-06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FormData file appended without an explicit file name**
- **Found during:** Task 1
- **Issue:** The plan says `append("file", input.file, input.file.name)`. With the third argument the spec creates a new `File`, so the plan's own truth «get("file") is the chosen File» (same object) cannot hold.
- **Fix:** `append("file", input.file)`: a `File` already carries its name, and the test asserts `body.get("file")` is the very file chosen.
- **Files modified:** apps/web/src/pods/document-upload/api/api.ts
- **Commit:** 89cc45e

**2. [Rule 1 - Bug] Footer direction contradicts the stated order**
- **Found during:** Task 1
- **Issue:** The plan asks for `flex-col-reverse` with the primary «on top» on mobile and the DOM order primary then secondary; with `flex-col-reverse` the first DOM child ends at the bottom.
- **Fix:** `flex flex-col gap-2 sm:flex-row sm:justify-end` (primary first, so on top; keyboard order primary then secondary), the same as the Phase 4 dialogs.
- **Files modified:** apps/web/src/pods/document-upload/document-upload.component.tsx
- **Commit:** 89cc45e

**3. [Rule 3 - Blocking] Acceptance grep for the route tree uses the wrong quotes**
- **Found during:** Task 1 acceptance criteria
- **Issue:** `grep -q '"/documents/"' routeTree.gen.ts` can never match: the generated file uses single quotes.
- **Fix:** Checked `'/documents/'` instead (present, along with the import and the route entries); no file change.
- **Commit:** n/a

**4. [Rule 2 - Missing critical] Extra options on `useUploadForm`**
- **Found during:** Task 1
- **Issue:** The planned options list has no way to receive the upload function nor to learn that a request ended (needed to re-enable the submit after a field error, a failure or a cancel).
- **Fix:** Added `upload` and `onSettled` (exported as `UploadFormHandlers`), additive over the planned interface.
- **Files modified:** apps/web/src/pods/document-upload/document-upload.hooks.ts
- **Commit:** 89cc45e

**5. [Rule 1 - Bug] Test raced the focus move of a failed submit**
- **Found during:** Task 2, full-suite run
- **Issue:** «clears an error as soon as the field is fixed» typed into Versión while the one-frame focus move to the first invalid control could still land, sometimes stealing focus mid-typing.
- **Fix:** The test waits for the focus on Archivo before typing.
- **Files modified:** apps/web/src/pods/document-upload/document-upload.test.tsx
- **Commit:** 47acb5e

**Total deviations:** 5 auto-fixed (2 Rule 1 in code, 1 Rule 2, 1 Rule 3 criterion, 1 Rule 1 test). **Impact:** none on behavior or scope.

## TDD Gate Compliance

The plan is `type: execute`, so the plan-level gate is not enforced; Task 2 carries `tdd="true"`. The pre-commit hook runs the whole suite, so a failing RED commit cannot exist. RED was verified locally instead: the Task 2 tests were written first against the Task 1 tracer, which deliberately carried only the file-required validation, the generic and network error mapping and the empty-name prefill. The run failed 13 tests on the planned assertions (not on syntax, discovery or fixtures): the mapper copy row (a 413 mapped to a message instead of fields), the client rows for extension, size, empty name and version and «clears an error as soon as the field is fixed», the 413, 415 and 400 rows under their fields, focus on «Cancelar subida», the automatic prefill replacement, the 120 character cut and the 5 s success line. The router rows for `?type=carta` and `?type=zzz` and the close-guard rows passed on first run because the tracer already carried that behavior (listed in the Task 1 action). Then GREEN made all 81 tests of the three files pass. Commits: one `feat(05-04)` per task (the Task 2 commit includes its tests); there is no separate `test(...)` or `refactor(...)` commit.

## Issues Encountered

- The per-plan commit ledger could not be written (shared `.git` is blocked from the worktree); `commits` and `plan_head_*` were measured with `git rev-list` against the base SHA, as instructed.
- `npm run build -w @tfm/web` is `vite build` (the router plugin regenerates the tree); `dist/` is git-ignored.
- The broken-windows ledger (`gsd_run windows append`) was not available in this sandbox; the stub below is recorded here only.

## Known Stubs

| File | Line | Description |
|------|------|-------------|
| apps/web/src/scenes/document-list.scene.tsx | ~31 | `onUploaded={() => {}}`: intentional, the library list does not exist yet; 05-08 replaces it with the list refresh. The upload itself works and announces «Documento subido.». |

## Threat Flags

None beyond the plan's threat model. T-05-20 (client checks are advisory, the API from 05-01 is the gate), T-05-21 (fixed copy per code; a test asserts the server text never renders), T-05-22 (no raw HTML injection in the pod, grep-guarded) and T-05-SC (no package installed) are all mitigated as planned.

## Next Phase Readiness

Ready for 05-05 (picker mode on the same container/component) and 05-06 (move the dialog to `components/upload-dialog.tsx`, test it inside the application form). UAT backstops for 05-09: real file chooser upload and Silo console check, a real DOCX, a real browser 413 with the client check bypassed, an aborted request that still stores the document (it appears on the next list load), the 360 px layout of the dialog.

## Self-Check: PASSED

- All 14 plan files exist on disk and are in the two task commits (`git diff --stat 31d1d455..HEAD`).
- Commits `89cc45e` and `47acb5e` are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (contracts 20, api 374, web 530) and `npm run lint` exit 0; Prettier check clean.
- Acceptance greps of both tasks pass (the route-tree one with the single-quoted form, see deviation 3).
