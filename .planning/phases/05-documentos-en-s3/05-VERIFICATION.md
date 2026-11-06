---
phase: 05-documentos-en-s3
verified: 2026-11-06T08:30:00Z
status: human_needed
score: 9/13 must-haves verified
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
  - ".planning/phases/05-documentos-en-s3/05-10-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-10-SUMMARY.md"
  - "apps/api/src/documents/documents.routes.ts"
  - "apps/api/src/documents/documents.service.ts"
  - "apps/api/src/documents/file-type.ts"
  - "apps/api/src/storage/s3.ts"
  - "apps/web/src/pods/application-detail/components/documents-section.tsx"
  - "apps/web/src/pods/application-edit/components/documents-section.tsx"
  - "apps/web/src/pods/document-upload/components/upload-dialog.tsx"
  - "apps/web/src/pods/document-upload/document-upload.test.tsx"
  - "apps/web/src/scenes/application-edit.scene.tsx"
  - "packages/contracts/src/document.schema.ts"
covered_digest: "v4:sha256:7949ca7025ee9a7f5c9ab3ffd5093dbfaf73951e2b0d3c28bc437cd50998a782"
behavior_unverified: 4
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - "UAT tests 1-3 (real DOCX/PDF chooser, real-browser 413/415, download incl. 404) recorded as pass in 05-UAT.md"
  gaps_remaining:
    - "G-05-4 (UAT test 4): file-input button look and alignment, fix merged in 05-10, human re-test not yet recorded"
  regressions: []
behavior_unverified_items:
  - truth: "The native «Seleccionar archivo» control reads as the app's own small outline button (Button outline/sm look, Label-role label, accent hover, pointer cursor)"
    test: "npm run dev, open /documents, click «Subir documento»; inspect «Archivo» at 360 px and 1280 px, Claro and Oscuro, in generic mode and in picker mode («Subir nuevo» from the CV picker of the application form)"
    expected: "Button shows 1 px border, background fill, rounded corners and inner padding, a smaller sibling of «Descartar subida»; hover turns the fill to the accent colour with a pointer cursor"
    why_human: "jsdom computes no ::file-selector-button styles; the test only pins the Tailwind class list (code review WR-01 confirms it is a class contract, not a rendered result)"
  - truth: "That button sits vertically centred beside the file-name text on one line inside the 44 px «Archivo» control"
    test: "Same pass as above, before and after choosing a PDF; check «Ningún archivo seleccionado» and a long file name at 360 px"
    expected: "Button and text on one line, equal space above and below, no horizontal scroll, project focus ring around the whole control on Tab"
    why_human: "Cross-engine rendering of the native file control (Chromium, Firefox, Safari) cannot be asserted in jsdom"
  - truth: "The layout arithmetic holds with no overflow: 44 px = 1 + 5 + 32 + 5 + 1"
    test: "Devtools: input box 44 px high, 5 px vertical padding, ::file-selector-button 32 px high with 14 px semibold label"
    expected: "Measured values match the arithmetic"
    why_human: "Computed layout is not available in jsdom; class names py-1.25, file:h-8, h-11 are present but unmeasured"
  - truth: "Both visual truths accepted only after the recorded human check (05-UAT.md test 4 re-test) passes"
    test: "Run /gsd-verify-work 05 and record test 4 result"
    expected: "05-UAT.md test 4 flips from issue to pass; gap G-05-4 closes"
    why_human: "Required by plan 05-10 itself; workflow.human_verify_mode = end-of-phase, so the executor did not stop and the check has not happened yet"
human_verification:
  - test: "05-UAT.md test 4 re-test for G-05-4: upload dialog «Archivo» control at 360 px and 1280 px, Claro and Oscuro, both dialog modes, keyboard only"
    expected: "Native file button looks like a small outline button, is vertically centred beside the 16 px file name on one line in the 44 px control, no horizontal scroll, focus ring visible, focus returns to «Subir nuevo» after the dialog closes"
    why_human: "Visual alignment and button look need a real browser; passing automated tests do not close G-05-4 (plan 05-10 must_haves truth 3)"
---

# Phase 5: Documentos en S3 Verification Report

**Phase Goal:** As a job seeker, I want to upload my CV and cover letters and attach one of each to an application, so that I always know which documents I sent to each company.
**Verified:** 2026-11-06T08:30:00Z
**Status:** human_needed
**Re-verification:** Yes. The previous report (2026-11-04) predates gap-closure plan 05-10 and the UAT of 2026-11-06; this report is regenerated over the current code.

## Goal Achievement

### Observable Truths

Roadmap success criteria 1-5 (the contract) plus the eight must-have truths of gap-closure plan 05-10 (G-05-4).

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Upload PDF/DOCX up to 5 MB with type, name and version; file lands in `tfm-assets`; list filterable by type | VERIFIED | `documents.service.ts` line 62-88: detect type, `storage.put`, Mongo insert, compensating `storage.delete` on failure. `.env.example` has `S3_BUCKET=tfm-assets`. `app.ts` mounts documents routes when repository and storage exist. `/documents` route and `document-list` / `document-upload` pods present. API suites re-run: 5 files, 90 tests pass. UAT test 1 (real DOCX Word/LibreOffice + PDF via real chooser): pass. |
| 2 | 413 `FILE_TOO_LARGE` and 415 `UNSUPPORTED_FILE_TYPE`, each with a Spanish message in the UI | VERIFIED | `documents.routes.ts:19` (`ApiError(413, "FILE_TOO_LARGE", "El archivo supera 5 MB.")`), `documents.service.ts:62` (415). Web mapper and client pre-check present in `document-upload`; upload suite passes. UAT test 2 (real browser >5 MB and .txt): pass. |
| 3 | Form links one CV and one cover letter, existing or uploaded new without leaving the form | VERIFIED | `application-edit.scene.tsx:74` fills `renderDocumentPicker` with `DocumentUploadContainer` (no pod-to-pod import: grep outside the scene found none). `applications.service.ts` `validateDocumentLinks` runs on create (147) and update (188). 413 web tests across the 4 pods pass. |
| 4 | Detail shows linked documents and each can be downloaded | VERIFIED | `application-detail/components/documents-section.tsx:39-41` renders `<a href={downloadHref} download>`; API `GET /:id/download` streams from S3 (`documents.service.ts:113`). UAT test 3 (normal download and 404 case): pass. |
| 5 | Deleting a document linked to any application is rejected with 409 `DOCUMENT_IN_USE` | VERIFIED | `documents.service.ts:123-126` `repository.isInUse` then `ApiError 409 DOCUMENT_IN_USE`; delete record before object (133). Covered by `documents.test.ts` (passes). Check-then-act race is open review finding (see Anti-Patterns). |
| 6 | 05-10: native file control reads as the DS outline/sm button (border, fill, radius, shadow, 32 px, `px-3`, Label-role label, accent hover, pointer) | PRESENT_BEHAVIOR_UNVERIFIED | `upload-dialog.tsx:211` carries `file:mr-3 file:inline-flex file:h-8 file:cursor-pointer file:items-center file:rounded-md file:border file:border-border file:bg-background file:px-3 file:text-sm file:font-semibold file:text-foreground file:shadow-xs file:transition-colors hover:file:bg-accent hover:file:text-accent-foreground`, mirroring `button.tsx` outline (`border bg-background shadow-xs hover:bg-accent ...`) and sm (`h-8 px-3 rounded-md`). Class contract pinned by test at `document-upload.test.tsx:583-604` (passes). The rendered look is not exercised; UAT test 4 was reported as issue and the re-test has not happened. |
| 7 | 05-10: button vertically centred beside the 16 px file name, one line, inside the 44 px control | PRESENT_BEHAVIOR_UNVERIFIED | `py-1.25` + `file:items-center` present on the file input; Body-role `text-base` inherited from `Input`. Alignment is a native-control layout result that jsdom cannot compute. Human re-test pending. |
| 8 | 05-10: acceptance only after the recorded human check (UAT test 4) passes at 360/1280 px, both modes, both themes | PRESENT_BEHAVIOR_UNVERIFIED | 05-UAT.md test 4 still `result: issue`, gap G-05-4 `status: failed`; 05-10-SUMMARY states "Human check: PENDING". Not passed; not a failure of the code. |
| 9 | 05-10: layout arithmetic 44 = 1 + 5 + 32 + 5 + 1 with no overflow | PRESENT_BEHAVIOR_UNVERIFIED | Inputs to the arithmetic are present and consistent: `h-11` (input.tsx:10), `border` 1 px, `py-1.25` (5 px), `file:h-8` (32 px). Measured result unverified (code review IN-01 notes the coupling is implicit). |
| 10 | 05-10: control keeps 44 px height, `w-full min-w-0`, and the shared Input focus ring | VERIFIED | `input.tsx:10` base: `h-11 w-full min-w-0 ... focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring`; the call-site className adds `w-full min-w-0` and no height override. |
| 11 | 05-10: fix local to the upload dialog; shared `Input` byte-identical to 2ff6f2a | VERIFIED | `git diff --quiet 2ff6f2a -- input.tsx button.tsx` exit 0. |
| 12 | 05-10: nothing else changes (`accept=".pdf,.docx"`, native control visible, no new dependency) | VERIFIED | `upload-dialog.tsx:209-210` `type="file"` and `accept=".pdf,.docx"`; `package.json`, `package-lock.json`, `apps/web/package.json` identical to 2ff6f2a; only DS tokens used in the className (no hex/palette colours). |
| 13 | 05-10: 05-UI-SPEC.md «Archivo» row amended in one line with the G-05-4 note | VERIFIED | `05-UI-SPEC.md:299` holds the final class list and the G-05-4 note; Typography section not changed. |

**Score:** 9/13 truths verified (4 present, behavior-unverified: all visual, for 05-10). No truth FAILED.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/documents/{routes,service,repository,mapper,file-type,file-name}.ts` | VERIFIED | Present, substantive, mounted in `app.ts` |
| `apps/api/src/storage/s3.ts` `createDocumentStorage` | VERIFIED | Storage contract test passes against real Silo |
| `packages/contracts/src/document.schema.ts` | VERIFIED | Single source for web and API |
| `apps/web/src/pods/document-upload`, `document-list` | VERIFIED | Full pod layout (api, vm, mapper, hooks, container, component, index) |
| `application-edit` and `application-detail` `documents-section.tsx` | VERIFIED | Slot / detail VM wired |
| `apps/web/src/routes/documents/index.tsx` | VERIFIED | Route present |
| 05-10 `upload-dialog.tsx` (contains `hover:file:bg-accent`) | VERIFIED (exists, substantive, wired); visual result pending | Line 211 |
| 05-10 `document-upload.test.tsx` (contains `hover:file:bg-accent`) | VERIFIED | Lines 583-604 |
| 05-10 `05-UI-SPEC.md` (contains `G-05-4`) | VERIFIED | Line 299 |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| web upload hook → `POST /api/documents` | api routes | WIRED | FormData through the shared http client |
| routes → service → storage + repository | Silo + Mongo | WIRED | compensating delete on insert failure |
| `application-edit.scene.tsx` → `DocumentUploadContainer` | edit pod slot | WIRED | line 74-75 |
| applications service → documents repository `findTypes` | link validation | WIRED | `app.ts` 78-84 |
| detail VM `downloadHref` → `GET /:id/download` | streamed S3 body | WIRED | |
| `upload-dialog.tsx` file Input → shared `Input` | className merged via `cn` | WIRED | base classes retained, `py-1.25` and `file:` utilities added |
| `upload-dialog.tsx` → `button.tsx` outline/sm | mirrored `file:` utilities | WIRED | `file:border-border` present; button.tsx read-only |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| document list rows | `usedBy`, name, size | Mongo find + applications aggregate | Yes | FLOWING |
| picker options | documents by type | `GET /api/documents?type=` | Yes | FLOWING |
| detail document rows | linked document | `GET /api/documents/:id` | Yes | FLOWING |
| download | object bytes | S3 GetObject stream | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Web pods: document-upload, document-list, application-detail, application-edit | `npx vitest run src/pods/document-upload src/pods/document-list src/pods/application-detail src/pods/application-edit` (apps/web) | 8 files, 413 tests pass | PASS |
| API documents, link validation, storage | `npx vitest run src/documents src/applications/applications.documents.test.ts src/storage` (apps/api) | 5 files, 90 tests pass | PASS |
| Typecheck, all workspaces | `npm run typecheck` | exit 0 | PASS |
| Full suite, lint, compose smoke | not re-run here | 05-10-SUMMARY reports typecheck, test (web 615) and lint exit 0; earlier `SMOKE OK` reported by orchestrator | Reported, not re-run |

### Probe Execution

SKIPPED: no `probe-*.sh` declared for this phase. `scripts/compose-smoke.sh` has a documents round trip but needs docker compose and was not re-run.

### Requirements Coverage

Requirement IDs declared across the plans: 05-01 DOC-01/02; 05-02 DOC-04/05/06; 05-03 DOC-03; 05-04 DOC-01/02; 05-05 DOC-03; 05-06 DOC-03/02; 05-07 DOC-04; 05-08 DOC-06/05/01; 05-09 all six; 05-10 DOC-01/DOC-03. All six exist in REQUIREMENTS.md (lines 62-67); no orphaned Phase 5 requirement.

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| DOC-01 upload PDF/DOCX ≤ 5 MB with type, name, version into `tfm-assets` | 05-01, 04, 08, 09, 10 | SATISFIED | Truth 1; 05-10 cosmetic dialog polish does not change functionality |
| DOC-02 413 / 415 with friendly message | 05-01, 04, 06, 09 | SATISFIED | Truth 2 |
| DOC-03 link one CV + one cover letter, existing or new | 05-03, 05, 06, 09, 10 | SATISFIED | Truth 3 |
| DOC-04 download linked documents | 05-02, 07, 09 | SATISFIED | Truth 4 |
| DOC-05 delete rejected 409 `DOCUMENT_IN_USE` | 05-02, 08, 09 | SATISFIED | Truth 5 |
| DOC-06 list documents, optional type filter | 05-02, 08, 09 | SATISFIED | Truth 1 |

Bookkeeping: REQUIREMENTS.md still shows DOC-01..06 as `[ ]` / `Pending` (lines 62-67, 157-162). Update when the phase is closed.

### Anti-Patterns Found

No `TODO`, `FIXME`, `XXX` or `TBD` in the phase source files; no stubs or hollow props. Nine review findings in `05-REVIEW-DISPOSITION.md` are all `open`, none critical:

| Finding | Severity | Impact |
|---------|----------|--------|
| WR-01 (05-10 review) styling test asserts class strings, not rendering | Warning | Explains why truths 6, 7, 9 stay behavior-unverified |
| WR-02 (05-10 review) timer test has a 100 ms margin on a real-time-advancing fake clock | Warning | Possible flake; no effect on the goal |
| WR-03 deleting an already-deleted document leaves a ghost row | Warning | UI recovery needs a reload; no success criterion affected |
| IN-01 centring depends on three coupled magic numbers | Info | Maintainability |
| IN-02 outline file button has low boundary contrast (mirrors DS outline Button) | Info | AA constraint is about text/controls; reviewer suggests `file:border-input` if wanted |
| IN-03..IN-06 smoke leftovers, mapper duplication, container duplication, filter-change stale rows | Info | None blocking |

Earlier-phase warnings (multipart POST without origin check, link/delete check-then-act race) are not in the current disposition file; they were reported in the previous verification and do not falsify a must-have for a single-user local app.

### Human Verification Required

#### 1. G-05-4 re-test of 05-UAT.md test 4

**Test:** Run `npm run dev`, open http://localhost:5173/documents, click «Subir documento». Check «Archivo» at 360 px and 1280 px, in «Claro» and «Oscuro», in generic mode and via «Subir nuevo» in the application form CV picker. Keyboard only for focus order and focus return.
**Expected:** The native button looks like a small outline button (border, fill, rounded corners, padding; accent fill and pointer on hover); it is vertically centred beside the file name on one line in the 44 px control; no horizontal scroll at 360 px; focus ring around the whole control; focus returns to «Subir nuevo» when the dialog closes.
**Why human:** Native `::file-selector-button` rendering and alignment need a real browser. If it fails, apply fallback F1-F3 from 05-10 Task 2 (all three given in the plan) one at a time.

### Gaps Summary

No blocking gaps. All five roadmap success criteria and all six DOC requirements are backed by substantive, wired, data-flowing code; the targeted web (413) and API (90) suites and `npm run typecheck` pass on the current branch, and UAT tests 1-3 were passed by the user in a real browser. Plan 05-10 is implemented exactly as specified (class list present at `upload-dialog.tsx:211`, test and UI-SPEC row updated, `input.tsx`/`button.tsx`/package files untouched), but its core truths are visual and the required human re-test of UAT test 4 has not happened, so G-05-4 remains open by the plan's own rule. The phase therefore resolves to `human_needed`, not `passed`.

---

_Verified: 2026-11-06T08:30:00Z_
_Verifier: Claude (gsd-verifier)_
