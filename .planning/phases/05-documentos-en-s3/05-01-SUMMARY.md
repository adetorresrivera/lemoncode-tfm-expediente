---
phase: 05-documentos-en-s3
plan: 01
subsystem: api
tags: [hono, multipart, s3, silo, mongodb, zod, zip, upload]

requires:
  - phase: 01-fundaciones
    provides: contracts package, S3 client and bucket helpers, Mongo test database, ApiError and the global error handler
provides:
  - POST /api/documents multipart upload (PDF and DOCX up to 5 MiB) answering a Document with fileName
  - DocumentStorage adapter over Silo (put, get, delete) and the test helpers around it
  - Pure helpers for signature detection, file name sanitizing, S3 key slug and Content-Disposition
  - Contract fields fileName and documentListItemSchema (usedBy)
affects: [05-02 read/download/delete, 05-03 link validation, 05-04 web upload, 05-08 library list, phase 6 seed]

actuals:
  tokens: 12000
  tasks: 2
  commits: 2
plan_head_before: 00d5efa9c852397b03f39dfa9ecfbe125023b0eb
plan_head_after: be460f2959cab37628344a476391bd852fe0c594

tech-stack:
  added: []
  patterns:
    - "Narrow storage interface injected into the service; tests use an in-memory fake, one row uses the real Silo test bucket"
    - "S3 first, Mongo second, delete the object when the insert fails and never let the delete error replace the insert error"
    - "Magic bytes plus extension must agree; stored mimeType comes from the detection, never from the browser"
    - "DOCX detected through the ZIP central directory (no decompression, works for streamed ZIPs)"

key-files:
  created:
    - apps/api/src/documents/file-type.ts
    - apps/api/src/documents/file-name.ts
    - apps/api/src/documents/documents.mapper.ts
    - apps/api/src/documents/documents.repository.ts
    - apps/api/src/documents/documents.service.ts
    - apps/api/src/documents/documents.routes.ts
    - apps/api/src/documents/documents.upload.test.ts
    - apps/api/src/documents/file-checks.test.ts
    - apps/api/src/test/documents.ts
  modified:
    - packages/contracts/src/document.schema.ts
    - packages/contracts/src/schemas.test.ts
    - apps/api/src/storage/s3.ts
    - apps/api/src/app.ts
    - apps/api/src/main.ts

key-decisions:
  - "fileName is required in documentSchema (1-255), no tolerance for older data: no document exists anywhere (D-05, RESEARCH Open Question 1). The download keeps the original name with accents."
  - "documentListItemSchema = documentSchema.extend({ usedBy }) lives in contracts (D-08); web view models never derive from it."
  - "Validation order: malformed body 400, then text fields and file presence together in one 400 with z.flattenError-shaped details, then size 413, then empty sanitized name 400 and signature 415."
  - "DOCX is read through the central directory: a streamed DOCX is accepted, ZIP64 sentinels and any structural inconsistency answer 415."
  - "Real Silo only in the tracer row, in the dedicated bucket tfm-assets-test; every other row uses fakeStorage()."
  - "CSRF on the multipart POST is an accepted low risk (T-05-09): single-user local app, worst case a junk file of at most 5 MB the user deletes; hono/csrf not adopted."

patterns-established:
  - "Multipart router without the JSON-only content-type middleware, with bodyLimit throwing ApiError(413) from onError"
  - "No logging in the documents module: file names, bytes and keys never reach the console (test with a console spy)"

requirements-completed: []
requirements-partial:
  - id: DOC-01
    done: "Upload of PDF/DOCX with type, name and version stored in S3 and Mongo (API)"
    pending: "List and type filter API in 05-02, library UI in 05-08"
  - id: DOC-02
    done: "413 FILE_TOO_LARGE and 415 UNSUPPORTED_FILE_TYPE answers in the project error shape (API)"
    pending: "Friendly UI messages in 05-04"

coverage:
  - id: D1
    description: "POST /api/documents stores a PDF in the Silo test bucket under documents/<id>/<slug>.pdf and its metadata in Mongo, answering a Document with fileName"
    requirement: DOC-01
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.upload.test.ts#stores a PDF in the bucket under the slugged key and its metadata in Mongo"
        status: pass
    human_judgment: false
  - id: D2
    description: "Oversize, wrong-type, empty, malformed or incomplete uploads answer 413, 415 or 400 in the project error shape and store nothing"
    requirement: DOC-02
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.upload.test.ts (describe blocks: unsupported files, size, validation)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A DOCX written by a real producer (Word, LibreOffice) is accepted by the central-directory check"
    requirement: DOC-02
    verification: []
    human_judgment: true
    rationale: "Only synthetic ZIPs (normal and streamed) are built in tests; a real Word file is checked once in the manual UAT of 05-09 (Assumption A1)."
  - id: D4
    description: "Stored object key, file name and content never reach the logs; failed insert leaves no object"
    requirement: DOC-01
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.upload.test.ts#never writes the file name, the S3 key or the file content to the console"
        status: pass
      - kind: unit
        ref: "apps/api/src/documents/documents.upload.test.ts#DocumentsService.upload compensation"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 01: Document upload tracer Summary

**Multipart `POST /api/documents` that stores a PDF or DOCX (up to 5 MiB) in Silo under a slugged key and its metadata in Mongo, with signature-based type detection through the ZIP central directory, a two-branch body cap and an insert-failure compensation.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-04T19:05:00Z (approx.)
- **Completed:** 2026-11-04T19:19:39Z
- **Tasks:** 2 (Task 1 tracer, Task 2 limits)
- **Files:** 14 (9 created, 5 modified)

## Accomplishments

- The tracer path works end to end against the real Silo bucket `tfm-assets-test` and the real `tfm_test` Mongo: `app.request` with a multipart body answers 201 with a `Document` that parses with `documentSchema`, the object holds the exact uploaded bytes, and the Mongo record `_id` equals the returned id.
- Contracts: `documentSchema.fileName` (1-255) and `documentListItemSchema` with `usedBy`, with schema tests.
- `detectDocument` requires extension and signature to agree; DOCX is confirmed by `word/document.xml` in the central directory (streamed ZIPs accepted; PDF renamed to .docx, DOCX renamed to .pdf, plain ZIP, OOXML workbook, ZIP merely mentioning the entry, buffer without end record, 0xffff sentinel and out-of-range directory offset all rejected).
- Both `bodyLimit` branches answer 413 `FILE_TOO_LARGE` as JSON: the chunked path through `app.request` and the `Content-Length` path through a real `serve()` on port 0; the exact `file.size > 5 MiB` check follows (5,242,880 accepted, 5,242,881 rejected).
- `buildS3Key` can only produce `[a-z0-9._-]` after the id segment, never `..`, at most 100 characters with the forced extension; `contentDisposition` is ASCII only and builds a valid `Headers` value for curly quotes and CJK names (used by the download in 05-02).
- Compensation: a failed insert deletes the object and rejects with the insert error itself, even when the delete fails too; a failed put never reaches the repository.

## Task Commits

1. **Task 1: Tracer, upload a PDF into the Silo test bucket and Mongo** - `26e1ef2` (feat)
2. **Task 2: Limits of the upload path** - `be460f2` (test)

## Files Created/Modified

See `key-files` above. 14 files in total, the explicit tracer scope of the plan (one file per layer of the single path plus tests).

## Decisions Made

See `key-decisions`. The messages used: 413 "El archivo supera 5 MB.", 415 "Solo se admiten archivos PDF o DOCX.", missing file "Elige un archivo", malformed body "Formulario no válido". No dependency was added (`@aws-sdk/client-s3`, `hono` and `@hono/node-server` were already in the lockfile).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mount in app.ts kept on one line**
- **Found during:** Task 1 acceptance criteria
- **Issue:** Prettier splits `app.route("/api/documents", ...)` over several lines when the service is built inline, so the plan's grep criterion `app.route("/api/documents"` could not match.
- **Fix:** The service is built in a `documents` constant first, then `app.route("/api/documents", documentsRoutes(documents))`. Same behavior.
- **Files modified:** apps/api/src/app.ts
- **Commit:** 26e1ef2

**2. [Rule 3 - Blocking] Test lint and type errors in the Task 2 test file**
- **Found during:** Task 2 verify
- **Issue:** An unused import, an unused parameter and the DOM-only `HeadersInit` type (not available with the API tsconfig `lib`).
- **Fix:** Removed the unused names and typed the helper header as `Record<string, string>`.
- **Files modified:** apps/api/src/documents/documents.upload.test.ts
- **Commit:** be460f2

**Total deviations:** 2 auto-fixed (both Rule 3, test and format hygiene). **Impact:** none on behavior.

## TDD Gate Compliance

The plan is `type: execute` (not `type: tdd`), so the plan-level gate is not enforced. Task 2 carries `tdd="true"`, but the tracer in Task 1 already implemented the checks the Task 2 tests describe (the plan pre-assigned those touch points to the tracer), so the tests written in Task 2 passed on first run and no failing RED state could be committed (the pre-commit hook also rejects a failing commit). Instead of a RED commit the tests were mutation-checked locally: removing `.catch(() => undefined)` from the compensation failed "rejects with the insert error itself when the delete fails too"; disabling the surrogate guard in `sanitizeFileName` failed "never splits a surrogate pair at the cut". Both mutations were reverted before committing. Commits: one `feat(05-01)` (tracer, includes its test) and one `test(05-01)` (Task 2 tests); there is no `refactor` commit.

## Issues Encountered

- The per-plan commit ledger (`gsd-plan-head-before-05-01`) could not be written because the sandbox blocks compound git commands that touch the shared `.git` directory from the worktree. `commits` and `plan_head_*` were measured with `git rev-list --count 00d5efa9c852397b03f39dfa9ecfbe125023b0eb..HEAD` (2 at the time of writing, before the SUMMARY commit).
- A real Word or LibreOffice DOCX was not available; the detector is covered with synthetic normal and streamed ZIPs only (Assumption A1, to confirm in 05-09 UAT).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-05-09 (cross-site multipart POST, CORS simple request) is accepted as documented: `hono/csrf` is not adopted, the worst case is a junk file of at most 5 MB, and DELETE (05-02) needs a preflight.

## Next Phase Readiness

Ready for 05-02 (list, get, download with `contentDisposition`, delete) and 05-03 (link validation). `DocumentStorage`, `DocumentsRepository` and `DocumentsService` are the shapes those plans extend; `fakeStorage()`, `useTestStorage()`, `pdfBytes`, `docxBytes`, `zipBytes`, `uploadForm` and `readStream` are in `apps/api/src/test/documents.ts`. `contentDisposition` is created and unit-tested but unused until the download exists.

## Self-Check: PASSED

- All 14 plan files exist on disk (checked with `git status` and the commits' file lists).
- Commits `26e1ef2` and `be460f2` are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (contracts 20, api 374, web 498 tests) and `npm run lint` exit 0.
- Task acceptance greps pass for both tasks.
