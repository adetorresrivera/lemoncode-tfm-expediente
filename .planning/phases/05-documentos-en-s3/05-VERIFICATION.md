---
phase: 05-documentos-en-s3
verified: 2026-11-04T20:30:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/05-documentos-en-s3/05-01-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-01-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-02-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-02-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-03-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-03-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-04-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-04-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-05-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-05-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-06-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-06-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-07-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-07-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-08-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-08-SUMMARY.md"
  - ".planning/phases/05-documentos-en-s3/05-09-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-09-SUMMARY.md"
  - "apps/api/src/documents/documents.routes.ts"
  - "apps/api/src/documents/documents.service.ts"
  - "apps/api/src/documents/file-type.ts"
  - "apps/api/src/storage/s3.ts"
  - "apps/web/src/pods/application-detail/components/documents-section.tsx"
  - "apps/web/src/pods/application-edit/components/documents-section.tsx"
  - "apps/web/src/pods/document-upload/document-upload.hooks.ts"
  - "apps/web/src/scenes/application-edit.scene.tsx"
  - "packages/contracts/src/document.schema.ts"
covered_digest: "v4:sha256:0d97714daf354bcba670910b0a1068f4a7f6b2bcbf631d17ff360d7474332495"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Upload a real DOCX saved by Word and by LibreOffice, then a real PDF, from the real file chooser at /documents"
    expected: "Both DOCX files are accepted (signature check by ZIP central directory), appear in the list with name, version and size, and download byte-identical"
    why_human: "Real office-suite DOCX variants and the native file chooser cannot be produced in jsdom or the API tests (human_judgment flag in the SUMMARYs)"
  - test: "Upload a file larger than 5 MB in a real browser, and a .txt file"
    expected: "Spanish messages 'El archivo supera 5 MB.' and 'Solo se admiten archivos PDF o DOCX.' appear on the file field with no uncaught network error; a real browser must read the 413 JSON even if the server cuts the connection"
    why_human: "Real-browser 413 behaviour on an early-closed upload is not exercisable in tests"
  - test: "Open an application detail whose linked document no longer has its object (or answers 404) and click Descargar; also download a normal one"
    expected: "Normal download saves the file with its original name; the 404 case does not navigate away or leave a blank page in a way the user cannot recover from"
    why_human: "The `download` attribute behaviour against a 404 is browser-specific"
  - test: "Check /documents, the upload dialog and the application form documents section at 360 px width, keyboard only"
    expected: "No horizontal scroll, controls reachable by keyboard, focus returns to «Subir nuevo» after the dialog closes"
    why_human: "Layout and focus feel need a real viewport"
---

# Phase 5: Documentos en S3 Verification Report

**Phase Goal:** As a job seeker, I want to upload my CV and cover letters and attach one of each to an application, so that I always know which documents I sent to each company.
**Verified:** 2026-11-04T20:30:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload PDF/DOCX up to 5 MB with type, name and version; file lands in `tfm-assets`; document appears in a list filterable by type | VERIFIED | `documents.routes.ts` POST `/` (bodyLimit, multipart parse, `documentInputSchema`), `documents.service.upload` runs `detectDocument` then `storage.put` (PutObjectCommand to bucket) then Mongo insert with S3 cleanup on failure. `main.ts` wires `createDocumentStorage(s3, config.S3_BUCKET)`; `.env.example` has `S3_BUCKET=tfm-assets`. `GET /api/documents?type=` via `documentQuerySchema` and `repository.list(type)`. Web: `/documents` route, `document-list` pod, `document-upload` pod using `FormData` through the shared http client. API tests (documents, upload, file-checks, storage contract vs real Silo) pass: 88 + 2 tests re-run here. |
| 2 | Oversize → 413 `FILE_TOO_LARGE`; other types → 415 `UNSUPPORTED_FILE_TYPE`; UI shows Spanish message for each | VERIFIED (real-browser 413 is human item) | Routes: `bodyLimit` onError and `file.size > DOCUMENT_MAX_BYTES` throw `ApiError(413,"FILE_TOO_LARGE","El archivo supera 5 MB.")`; service throws `415 UNSUPPORTED_FILE_TYPE` when `detectDocument` returns null (PDF magic `%PDF-`, DOCX ZIP central directory containing `word/document.xml`, extension must agree). Web mapper maps `FILE_TOO_LARGE` and `UNSUPPORTED_FILE_TYPE` to the file field messages; client pre-check by extension. Boundary tests (5,242,880 / 5,242,881 bytes, chunked and Content-Length paths) exist in `documents.upload.test.ts` and pass. |
| 3 | In the application form the user can link one CV and one cover letter, picking an existing document or uploading a new one without leaving the form | VERIFIED | `application-edit/components/documents-section.tsx` renders two `form.Field`s (`cvDocumentId`, `coverLetterDocumentId`) through the `renderDocumentPicker` slot; `application-edit.scene.tsx` fills it with `DocumentUploadContainer` (no pod-to-pod import: grep found none outside the scene). Picker has existing-document select and «Subir nuevo» opening the upload dialog. Mapper sends `cvDocumentId`/`coverLetterDocumentId` (empty → null). API `validateDocumentLinks` checks existence and type per field on create and update. 412 web tests across the 4 pods re-run and pass. |
| 4 | Application detail shows linked documents; user can download each | VERIFIED (browser download is human item) | `application-detail/components/documents-section.tsx` renders CV and carta rows with name, size and `<a href=/api/documents/{id}/download download>`. API `GET /:id/download` streams from S3 with `Content-Type`, `Content-Length` and `contentDisposition()` (ASCII fallback + RFC 5987); missing object → 404 `NOT_FOUND`. |
| 5 | Deleting a document linked to any application is rejected with 409 `DOCUMENT_IN_USE` | VERIFIED | `service.remove` checks `repository.isInUse` (`$or` on `cvDocumentId` / `coverLetterDocumentId`) before delete and throws `409 DOCUMENT_IN_USE`; record deleted before the object. `usedBy` count in list via aggregate; web `document-list` maps `DOCUMENT_IN_USE` to a specific message and shows usage label. Race caveat in WR-02 below. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified; real-browser items listed separately).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/documents/{routes,service,repository,mapper,file-type,file-name}.ts` | VERIFIED | Substantive (1.1k lines incl. tests), mounted in `app.ts` at `/api/documents` when both Mongo and storage exist |
| `apps/api/src/storage/s3.ts` `createDocumentStorage` | VERIFIED | Put/Get/Delete against the configured bucket, NoSuchKey → null, idempotent delete |
| `packages/contracts/src/document.schema.ts` | VERIFIED | `documentSchema`, `documentListItemSchema` (`usedBy`), `documentInputSchema`, `documentQuerySchema`, exported from index |
| `apps/web/src/pods/document-upload`, `document-list` | VERIFIED | Full pod layout (api, vm, mapper, hooks, container, component, index) |
| `apps/web/src/pods/application-edit/components/documents-section.tsx`, `application-detail/components/documents-section.tsx` | VERIFIED | Wired through slot and detail VM |
| `apps/web/src/routes/documents/`, sidebar link in `layouts/app-layout.tsx` | VERIFIED | Route generated in `routeTree.gen.ts`; link to `/documents` |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| web upload hook → `POST /api/documents` | api routes | WIRED | `FormData` through `request()`, no content-type header |
| routes → service → storage + repository | s3 + Mongo | WIRED | Compensating `storage.delete` on insert failure |
| `main.ts` → `createDocumentStorage(s3, S3_BUCKET)` | `app.ts` deps.storage | WIRED | |
| applications service → documents repository `findTypes` | link validation | WIRED | via injected lookup, `app.ts` lines 78-84 |
| edit scene → `DocumentUploadContainer` | edit pod slot | WIRED | Pods stay independent |
| detail VM `downloadHref` → `GET /:id/download` | streamed S3 body | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| document list rows | `usedBy`, name, size | Mongo find + applications aggregate | Yes | FLOWING |
| picker options | documents by type | `GET /api/documents?type=` | Yes | FLOWING |
| detail document rows | linked document | `GET /api/documents/:id` by application link id | Yes | FLOWING |
| download | object bytes | S3 GetObject stream | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| API documents suite + link validation (real Mongo) | `npx vitest run src/documents src/applications/applications.documents.test.ts` | 4 files, 88 tests pass | PASS |
| Silo storage contract (real bucket) | `npx vitest run src/storage` | 2 tests pass | PASS |
| Web pods (upload, list, detail, edit) | `npx vitest run src/pods/document-upload ...` | 8 files, 412 tests pass | PASS |
| Whole build/typecheck/lint/test and compose smoke | Orchestrator-measured | exit 0; contracts 57, api 407, web 614; `SMOKE OK` incl. documents round trip | Reported by orchestrator, not re-run |

### Probe Execution

SKIPPED: no `probe-*.sh` declared; the compose smoke script (`scripts/compose-smoke.sh`) contains a documents round trip but was not re-run by this verifier (needs docker compose). Orchestrator reports `SMOKE OK`.

### Requirements Coverage

All six IDs declared across plans (01: DOC-01/02; 02: DOC-04/05/06; 03: DOC-03; 04: DOC-01/02; 05: DOC-03; 06: DOC-03/02; 07: DOC-04; 08: DOC-06/05/01; 09: all) exist in REQUIREMENTS.md. No orphaned Phase 5 requirement.

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| DOC-01 upload PDF/DOCX ≤ 5 MB with type, name, version into `tfm-assets` | 05-01, 04, 08, 09 | SATISFIED | Truth 1 |
| DOC-02 413 / 415 with friendly UI message | 05-01, 04, 06, 09 | SATISFIED | Truth 2 |
| DOC-03 link one CV + one cover letter, existing or new from the form | 05-03, 05, 06, 09 | SATISFIED | Truth 3 |
| DOC-04 download linked documents from the detail | 05-02, 07, 09 | SATISFIED | Truth 4 |
| DOC-05 delete rejected 409 `DOCUMENT_IN_USE` | 05-02, 08, 09 | SATISFIED | Truth 5 |
| DOC-06 list documents, optional type filter | 05-02, 08, 09 | SATISFIED | Truth 1 |

Bookkeeping: `.planning/REQUIREMENTS.md` still shows DOC-01..06 as `[ ]` / `Pending` (lines 62-67, 157-162). Update to complete when closing the phase.

### Anti-Patterns Found

No TODO / FIXME / XXX / TBD in phase source files; no stubs or hollow props found. Open review findings (05-REVIEW-DISPOSITION.md, all `open`, 0 critical):

| Finding | Severity | Impact |
|---------|----------|--------|
| WR-01 multipart POST has no origin/CSRF check (`documents.routes.ts`) | Warning | A cross-site form post can write up to 5 MB into the library; response unreadable, DELETE needs preflight. Not a phase success criterion; single-user local app |
| WR-02 check-then-act race between link validation and delete (`documents.service.ts`, `applications.service.ts`) | Warning | Narrow window (two tabs / double submit) can leave an application with a dangling link; criterion 5 holds for the sequential case verified by tests |
| WR-03 deleting an already-deleted document leaves a ghost row (`document-list` hook/mapper) | Warning | UI recovery requires reload; does not affect the criteria |
| IN-01..IN-06 | Info | Bidi characters in file names, uppercase hex ids, smoke leftovers on failure, duplication |

None of these falsifies a must-have; recommend dispositioning WR-01 and WR-03 (small fixes) before demo.

### Human Verification Required

1. **Real DOCX and file chooser.** Upload a Word-saved and a LibreOffice-saved DOCX plus a PDF via the real chooser. Expected: accepted, listed, downloadable byte-identical. Why human: only synthetic ZIPs are covered by tests.
2. **Real-browser 413 / 415 messaging.** Upload a file over 5 MB and a .txt. Expected: the Spanish messages appear on the file field. Why human: browser handling of an early-terminated upload.
3. **Download attribute against a 404 and a normal download.** Why human: browser-specific.
4. **360 px layout and keyboard-only pass** of `/documents`, the upload dialog and the form's Documentos section. Why human: visual and focus behaviour.

### Gaps Summary

No blocking gaps. All five roadmap success criteria and all six requirement IDs are backed by substantive, wired, data-flowing code, and the targeted suites re-run green. The status is `human_needed` solely because the SUMMARYs flag real-browser checks that cannot be proven programmatically. Three open review warnings (WR-01..03) are non-blocking.

---

_Verified: 2026-11-04T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
