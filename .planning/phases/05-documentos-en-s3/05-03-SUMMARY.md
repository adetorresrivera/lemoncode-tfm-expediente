---
phase: 05-documentos-en-s3
plan: 03
subsystem: api
tags: [hono, mongodb, validation, document-links, form-values]

requires:
  - phase: 05-documentos-en-s3
    provides: "05-02 documents repository (list, findById, usageCounts, isInUse, deleteById), documents routes, test helpers fakeStorage/pdfBytes/uploadForm"
provides:
  - "documents repository findTypes(ids): Map<hex, DocumentType>"
  - "applications service validates cvDocumentId / coverLetterDocumentId on POST and PUT (exists, right type)"
  - "PUT writes the document links as sent (null or omitted clears them)"
  - "web ApplicationFormValues carries both document ids and sends them back on save"
affects: [05-05 picker in the form, 05-06, 05-09]

requirements-completed: []
requirements-partial:
  - id: DOC-03
    done: "API accepts and stores one CV and one cover letter link per application, validated by existence and type; the web form values carry the ids and never wipe them on save"
    pending: "Picker UI in the Documentos section (05-05, 05-06)"

actuals:
  tokens: 16000
  tasks: 2
  commits: 2
plan_head_before: b3f42395f7273b5aff93431064ad1538cdb12b8e
plan_head_after: f571f352a64e910a59bfd9b18a83e990dd859549

tech-stack:
  added: []
  patterns:
    - "Cross-collection read through an injected function (DocumentTypeLookup), not a service import"
    - "Per-field link errors in the z.flattenError shape thrown as ApiError(400, VALIDATION_ERROR, «Datos no válidos»)"

key-files:
  created:
    - apps/api/src/applications/applications.documents.test.ts
  modified:
    - apps/api/src/documents/documents.repository.ts
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/app.ts
    - apps/api/src/applications/applications.update.test.ts
    - apps/api/src/documents/documents.upload.test.ts
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.test.tsx

key-decisions:
  - "No dependency added."
  - "The applications service receives `findDocumentTypes: DocumentTypeLookup` (a function built in app.ts from the documents repository), so it can only read document types."
  - "Messages: «El documento no existe», «El documento no es un CV», «El documento no es una carta de presentación»; top message «Datos no válidos», details { formErrors: [], fieldErrors }."
  - "PUT order: parseObjectId (404) -> body schema (400) -> link validation (400) -> updateEditable (404 when unknown). Input is validated before existence."
  - "The Phase 2 test «keeps the document links...» is rewritten, not deleted, because D-13 inverts it: PUT now writes links as sent (null or omitted clears them). Its replacement uses real uploaded documents instead of the literal strings cv-1/carta-1, which the new validation rejects."
  - "The picker UI follows in 05-05: until then the form has no visible control for the links but already sends the loaded values back."

patterns-established:
  - "findTypes queries only 24-hex ids (converted to ObjectId inside $in); anything else is simply absent, so it is «does not exist», never a 500 or an injection vector"

duration: 12min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 03: Validated, editable document links Summary

**POST and PUT /api/applications now accept only links to existing documents of the right type (cv for cvDocumentId, carta for coverLetterDocumentId), PUT writes them as sent, and the edit form carries the loaded ids back so a save never wipes them.**

No dependency added.

## Accomplishments

- `documentsRepository.findTypes(ids)` returns `Map<hex, type>`; malformed and unknown ids are absent and an empty candidate list does no query.
- `createApplicationsService(repository, findDocumentTypes, now)` runs `validateDocumentLinks` at the start of `create` and `update`: one lookup, errors per field, both fields reported together; nothing is written when it throws.
- `EditableFields`, `toEditableFields` and the `$set` of `updateEditable` include both links; the stale «Phase 5 must add its fields here» comment is replaced.
- `app.ts` builds the documents repository once inside the `db` branch and reuses it for the lookup and the documents routes; validation works even without storage.
- Real-Mongo tests (`applications.documents.test.ts`): findTypes, POST links valid/null/wrong type/malformed+unknown, PUT replace/omit/null, wrong link leaves stored fields unchanged, 400 before 404 ordering, rule 4 end to end (usedBy 1 and 409, then 0 and 204 after clearing), rule 5 (documents survive an application delete with usedBy 0 and can be deleted).
- Web: `ApplicationFormValues` and `EMPTY_FORM_VALUES` gain `cvDocumentId` / `coverLetterDocumentId` ("" = none); `mapApplicationFromApiToFormValues` uses `?? ""`; `mapFormValuesToApiInput` sends the id or null for ""; `mapServerErrorToFields` already maps the new keys (tested). Edit mode saves a PUT with the loaded ids, create sends null for both.

## Task Commits

1. **Task 1: API link validation and editable links** - `ed08c29` (feat)
2. **Task 2: Form values carry the document links** - `f571f35` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hand-built DocumentsRepository stub lacked findTypes**
- **Found during:** Task 1 typecheck
- **Issue:** `documents.upload.test.ts` `repositoryWith` builds a `DocumentsRepository` and failed `tsc` once the interface gained `findTypes` (same situation as 05-02).
- **Fix:** Added `findTypes: unused` to the stub.
- **Files modified:** apps/api/src/documents/documents.upload.test.ts
- **Commit:** ed08c29

**Total deviations:** 1 auto-fixed (Rule 3, test typing). No impact on behavior or scope.

## TDD Gate Compliance

Plan is `type: execute`; both tasks carry `tdd="true"`. The pre-commit hook runs the whole suite, so a failing RED commit is impossible. Task 1: the new tests and the rewritten update test were written first and run against the unchanged code (8 failures observed) before the implementation turned them green. Task 2: tests and implementation were written in the same working pass and run green together; a separate failing run was not captured. RED and GREEN are committed together in each `feat(05-03)` commit; there is no `refactor` commit.

## Issues Encountered

- The shared `.git` is read-only inside the worktree, so the per-plan commit ledger could not be written. `commits: 2`, `plan_head_before` and `plan_head_after` were measured with `git rev-list --count b3f42395f7273b5aff93431064ad1538cdb12b8e..HEAD` (2, before the SUMMARY commit).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-05-17 unknown/wrong-type links, T-05-18 NoSQL injection through ids, T-05-19 silent link loss are mitigated and tested).

## Verification

`npm run typecheck`, `npm run test` (api 407 tests, web 534 tests) and `npm run lint` exit 0; every acceptance grep of both tasks passes.

## Next Phase Readiness

05-05 can add the picker and only needs to write `cvDocumentId` / `coverLetterDocumentId` into the form values; the server error mapping to the field already works. DOC-03 stays partial until the UI.

## Self-Check: PASSED

- Created file exists: apps/api/src/applications/applications.documents.test.ts.
- Commits `ed08c29` and `f571f35` are ancestors of HEAD.
