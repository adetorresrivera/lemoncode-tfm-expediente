---
phase: 05-documentos-en-s3
verified: 2026-11-06T09:10:00Z
status: passed
score: 8/13 must-haves verified
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
  - ".planning/phases/05-documentos-en-s3/05-11-PLAN.md"
  - ".planning/phases/05-documentos-en-s3/05-11-SUMMARY.md"
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
covered_digest: "v4:sha256:77f3fbe7227575cc53bf45f59ab6b14f4203bdd8feb7067e0873cceadd106c24"
behavior_unverified: 5
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/13
  gaps_closed:
    - "G-05-4 (05-10 file button look): superseded by the design change of G-05-4b; UAT recorded G-05-4 as resolved on 2026-11-06"
  gaps_remaining:
    - "G-05-4b (UAT test 4): boxless file input with h-11 outline file button, implemented by 05-11, human re-test not yet recorded"
  regressions: []
behavior_unverified_items:
  - truth: "The «Archivo» file input has no box (no border, fill or side padding); «Seleccionar archivo» sits directly on the dialog background with the file name as plain 16 px text beside it"
    test: "npm run dev, open /documents, click «Subir documento»; repeat from «Subir nuevo» in the CV picker of the application form. Check at 360 px and 1280 px, Claro and Oscuro"
    expected: "No white bordered square around the control; button and «Ningún archivo seleccionado» sit on the dialog background"
    why_human: "jsdom paints nothing and computes no ::file-selector-button styles; the test pins the Tailwind class list only, and tailwind-merge output confirms the box classes are dropped, not how the browser renders the native control"
  - truth: "The native button matches «Descartar subida»: 44 px high, 16 px side padding, 1 px border-border, bg-background, rounded-md, shadow-xs, Label-role text, accent hover with pointer cursor"
    test: "Same pass; place the file button next to «Descartar subida» and compare height, border and hover"
    expected: "Same height and outline look as the other dialog buttons; hover turns the fill to accent"
    why_human: "Pseudo-element size and look cannot be measured in jsdom; cross-engine rendering (Chromium, Firefox, Safari) differs"
  - truth: "The control stays at least 44 px high, never clips its content, does not scroll horizontally at 360 px (long name ends in native ellipsis) and shows the project focus ring on Tab"
    test: "360 px, keyboard only: Tab to the file control, choose a file with a long name"
    expected: "No horizontal scroll, ring visible around the control, focus returns to «Subir nuevo» after the dialog closes"
    why_human: "Layout, clipping and focus-ring visibility are computed layout results; classes h-auto, min-h-11, w-full, min-w-0 and focus-visible:ring-2 are present (tailwind-merge output checked) but not rendered"
  - truth: "When «Archivo» is invalid (client check or server 413/415) the error shows on the button border (aria-invalid:file:border-destructive)"
    test: "Choose a .txt file and a file over 5 MB; inspect the button border"
    expected: "Button border turns destructive colour; error line below unchanged"
    why_human: "Styling of a pseudo-element under aria-invalid is not observable in jsdom"
  - truth: "All of the above are accepted only after the recorded human check (05-UAT.md test 4 re-test) passes"
    test: "Run /gsd-verify-work 05 and record test 4"
    expected: "05-UAT.md test 4 flips from issue to pass; gap G-05-4b closes"
    why_human: "Required by plan 05-11 must_haves; G-05-4b is a design request and only the requester can judge it. 05-UAT.md test 4 is still result: issue and G-05-4b status: failed"
human_verification:
  - test: "05-UAT.md test 4 re-test for G-05-4b: upload dialog «Archivo» control at 360 px and 1280 px, Claro and Oscuro, generic mode (/documents) and picker mode (application form «Subir nuevo»), keyboard only"
    expected: "File button sits outside any white box, is as big and looks like «Descartar subida», name text beside it, no horizontal scroll, focus ring visible, invalid state visible on the button border, focus returns to «Subir nuevo» after close"
    why_human: "Native ::file-selector-button rendering is visual and cross-engine; passing automated tests do not close G-05-4b (plan 05-11 must_haves truth 8)"
---

# Phase 5: Documentos en S3 Verification Report

**Phase Goal:** As a job seeker, I want to upload my CV and cover letters and attach one of each to an application, so that I always know which documents I sent to each company.
**Verified:** 2026-11-06T09:10:00Z
**Status:** human_needed
**Re-verification:** Yes. Regenerated after gap-closure plan 05-11 (G-05-4b) was merged (14bbb98, 9a78449, merge 32a1be3). The only source change since the previous report (72cd86f..HEAD) is `upload-dialog.tsx` (one line) and its test; no API, contracts or other web file moved, so truths 1-5 got a regression check, not a full re-derivation.

## Goal Achievement

### Observable Truths

Roadmap success criteria 1-5 (the contract) plus the eight must-have truths of gap-closure plan 05-11 (G-05-4b).

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Upload PDF/DOCX up to 5 MB with type, name and version; file lands in `tfm-assets`; list filterable by type | VERIFIED | Unchanged since the prior report: `documents.service.ts` detects type, `storage.put`, Mongo insert, compensating delete. API documents suites pass (88 tests). UAT test 1 (real DOCX Word/LibreOffice and PDF): pass. |
| 2 | 413 `FILE_TOO_LARGE` and 415 `UNSUPPORTED_FILE_TYPE`, each with a Spanish message in the UI | VERIFIED | `documents.routes.ts` / `documents.service.ts` raise the codes; web mapper and client pre-check in `document-upload`; web suites pass. UAT test 2 (real browser >5 MB and .txt): pass. |
| 3 | Form links one CV and one cover letter, existing or uploaded new without leaving the form | VERIFIED | `application-edit.scene.tsx` renders `DocumentUploadContainer` in the picker slot (no pod-to-pod import); `validateDocumentLinks` on create and update; application-edit and document-upload suites pass. |
| 4 | Detail shows linked documents and each can be downloaded | VERIFIED | `application-detail/components/documents-section.tsx` renders the download link; API `GET /:id/download` streams from S3. UAT test 3 (normal and 404 download): pass. |
| 5 | Deleting a document linked to any application is rejected with 409 `DOCUMENT_IN_USE` | VERIFIED | `documents.service.ts` `isInUse` then 409; covered by `documents.test.ts` (passes). |
| 6 | 05-11: «Archivo» input has no box (no border, fill, side padding); button sits on the dialog background with plain 16 px file-name text beside it | PRESENT_BEHAVIOR_UNVERIFIED | `upload-dialog.tsx:211` has `h-auto min-h-11 ... border-0 bg-transparent px-0`. `twMerge(Input base, className)` run here drops `h-11 border bg-card px-4`, keeps `text-base`, `rounded-md`, focus ring. Whether it visually reads as outside a box needs a real browser. |
| 7 | 05-11: native button matches «Descartar subida» (h-11, px-4, border-border, bg-background, rounded-md, shadow-xs, text-sm semibold, accent hover, pointer) | PRESENT_BEHAVIOR_UNVERIFIED | Class list at line 211 is exactly the one the plan specifies (`file:h-11 file:px-4 file:border-border file:bg-background file:shadow-xs file:text-sm file:font-semibold hover:file:bg-accent`); test at `document-upload.test.tsx:571-644` pins it and passes. Pseudo-element rendering not observable in jsdom. |
| 8 | 05-11: control keeps min 44 px, `w-full min-w-0` (no horizontal scroll at 360 px) and the focus ring | PRESENT_BEHAVIOR_UNVERIFIED | Classes present and surviving merge (`min-h-11 w-full min-w-0 focus-visible:ring-2 focus-visible:ring-ring`). Clipping, overflow and ring visibility are layout results. |
| 9 | 05-11: invalid state shown on the button border (`aria-invalid:file:border-destructive`) | PRESENT_BEHAVIOR_UNVERIFIED | Class present (line 211) and asserted by test (line 606); the base `aria-invalid:border-destructive` is now invisible under `border-0`, so this variant is the only visible cue. Not observable in jsdom. |
| 10 | 05-11: native control stays visible and operable; `type="file"`, `accept=".pdf,.docx"`, client checks, prefill, focus-on-error and focus return unchanged | VERIFIED | `upload-dialog.tsx:209-210`; `git diff 72cd86f HEAD` on the file is a single className line, so all handlers are untouched; 52-test pod file passes, including the focus and client-check tests. |
| 11 | 05-11: fix is local; `input.tsx` and `button.tsx` byte-identical to 72cd86f; no dependency added | VERIFIED | `git diff --quiet 72cd86f --` on `input.tsx`, `button.tsx`, `package.json`, `package-lock.json`, `apps/web/package.json`: all identical. No hex or palette colours in the className. |
| 12 | 05-11: 05-UI-SPEC.md changes in one line only (the «Archivo» row) with a G-05-4b note | VERIFIED | `git diff --stat 72cd86f HEAD` on 05-UI-SPEC.md: 1 insertion, 1 deletion (line 299); note «Do not hide the native control behind a custom button» still present. |
| 13 | 05-11: all truths accepted only after the recorded human check (UAT test 4) passes at 360/1280 px, both modes, both themes | PRESENT_BEHAVIOR_UNVERIFIED | `05-UAT.md` test 4 still `result: issue`, G-05-4b `status: failed`. Plan states automated tests cannot close it. Not a code failure. |

**Score:** 8/13 truths verified (5 present, behavior-unverified: all visual, for 05-11). No truth FAILED.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/documents/*`, `apps/api/src/storage/s3.ts` | VERIFIED | Unchanged since the prior verification; suites pass |
| `packages/contracts/src/document.schema.ts` | VERIFIED | Single source for web and API |
| `apps/web/src/pods/document-upload`, `document-list` | VERIFIED | Full pod layout |
| `application-edit` / `application-detail` `documents-section.tsx` | VERIFIED | Wired |
| 05-11 `upload-dialog.tsx` (contains `aria-invalid:file:border-destructive`) | VERIFIED (exists, substantive, wired); visual result pending | Line 211 |
| 05-11 `document-upload.test.tsx` (contains `file:h-11`) | VERIFIED | Lines 571-644; passes |
| 05-11 `05-UI-SPEC.md` (contains `G-05-4b`) | VERIFIED | Line 299 |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `upload-dialog.tsx` file Input → shared `Input` | className merged via `cn` | WIRED | tailwind-merge run on the real strings: `h-11`, `border`, `bg-card`, `px-4` dropped; `border-0 bg-transparent px-0 h-auto` win. Residual `border-input` is harmless under `border-0` |
| `upload-dialog.tsx` → `button.tsx` outline / h-11 | mirrored `file:` utilities | WIRED | `file:h-11 file:px-4 file:border-border ...` present; `button.tsx` untouched |
| web upload hook → `POST /api/documents` → service → Silo + Mongo | | WIRED | Unchanged |
| scene → `DocumentUploadContainer` picker slot | | WIRED | Unchanged |
| detail `downloadHref` → `GET /:id/download` | | WIRED | Unchanged |

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
| Web pods document-upload, document-list, application-detail, application-edit | `npx vitest run src/pods/document-upload src/pods/document-list src/pods/application-detail src/pods/application-edit` (apps/web) | 8 files, 413 tests pass | PASS |
| API documents and link validation | `npx vitest run src/documents src/applications/applications.documents.test.ts` (apps/api) | 4 files, 88 tests pass | PASS |
| Typecheck, all workspaces | `npm run typecheck` | exit 0 | PASS |
| Class merge of the file input | `twMerge(Input base, upload-dialog className)` | box classes dropped, ring and text size kept | PASS |
| Full suite, build, compose smoke | not re-run here | Orchestrator reports post-merge `npm run build` and `npm test` pass at 32a1be3; 05-11-SUMMARY reports typecheck, test (57/407/615) and lint exit 0 | Reported, not re-run |

### Probe Execution

SKIPPED: no `probe-*.sh` declared for this phase. `scripts/compose-smoke.sh` needs docker compose and was not re-run.

### Requirements Coverage

Requirement IDs declared across plans: 05-01 DOC-01/02; 05-02 DOC-04/05/06; 05-03 DOC-03; 05-04 DOC-01/02; 05-05 DOC-03; 05-06 DOC-03/02; 05-07 DOC-04; 05-08 DOC-06/05/01; 05-09 all six; 05-10 DOC-01/03; 05-11 DOC-01/03. All six exist in REQUIREMENTS.md (lines 62-67); no orphaned Phase 5 requirement.

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| DOC-01 upload PDF/DOCX ≤ 5 MB with type, name, version into `tfm-assets` | 05-01, 04, 08, 09, 10, 11 | SATISFIED | Truth 1; 05-11 changes only dialog styling |
| DOC-02 413 / 415 with friendly message | 05-01, 04, 06, 09 | SATISFIED | Truth 2 |
| DOC-03 link one CV + one cover letter, existing or new | 05-03, 05, 06, 09, 10, 11 | SATISFIED | Truth 3 |
| DOC-04 download linked documents | 05-02, 07, 09 | SATISFIED | Truth 4 |
| DOC-05 delete rejected 409 `DOCUMENT_IN_USE` | 05-02, 08, 09 | SATISFIED | Truth 5 |
| DOC-06 list documents, optional type filter | 05-02, 08, 09 | SATISFIED | Truth 1 |

Bookkeeping: REQUIREMENTS.md still shows DOC-01..06 as `[ ]` / `Pending` (lines 62-67, 157-162), and ROADMAP.md line 190 still says "gap closure 05-11 pending". Update when the phase is closed.

### Anti-Patterns Found

No `TODO`, `FIXME`, `XXX` or `TBD` in `upload-dialog.tsx`; no stubs or hollow props. Nine findings in `05-REVIEW-DISPOSITION.md`, all `open`, none critical or blocking:

| Finding | Severity | Impact |
|---------|----------|--------|
| WR-01 success-line timer test has a 100 ms margin on a real-time-advancing fake clock | Warning | Possible flake; no effect on the goal |
| WR-02 "outside pointer never closes it" guard untested while idle | Warning | Test gap only |
| WR-03 close «X» is enabled but silent while uploading | Warning | Accessibility polish; no success criterion affected |
| IN-01 class-pinning test couples to the shared Input; this is why truths 6-9 stay behavior-unverified | Info | Maintainability |
| IN-02..IN-06 helper name, duplicated `Field`/`controlProps`, mapper and container duplication, stale rows on filter change | Info | None blocking |

### Human Verification Required

#### 1. G-05-4b re-test of 05-UAT.md test 4

**Test:** Run `npm run dev`, open http://localhost:5173/documents, click «Subir documento». Check «Archivo» at 360 px and 1280 px, in «Claro» and «Oscuro», in generic mode and via «Subir nuevo» in the application form CV picker. Keyboard only for focus order and focus return. Also pick a .txt and a >5 MB file to see the invalid state.
**Expected:** The file button sits outside any white box, is 44 px high and looks like «Descartar subida» (border, fill, rounded corners, accent hover with pointer), with the file name as plain text beside it; no horizontal scroll at 360 px; focus ring visible; the button border turns destructive when invalid; focus returns to «Subir nuevo» after close.
**Why human:** Native `::file-selector-button` rendering is visual and cross-engine; G-05-4b is a design request that only the requester can accept. If vertical misalignment appears, plan 05-11 names fallback F1 (`file:align-middle`).

### Gaps Summary

No blocking gaps. All five roadmap success criteria and all six DOC requirements are backed by substantive, wired, data-flowing code; targeted web (413) and API (88) suites and `npm run typecheck` pass on the current branch, and UAT tests 1-3 were passed by the user in a real browser. Plan 05-11 is implemented exactly as specified: the file-input className matches the planned list character for character, the shared `Input`, `Button` and all package files are byte-identical to 72cd86f, and the UI-SPEC change is one line. Its truths are visual, and 05-UAT.md test 4 is still `issue`, so G-05-4b stays open until the human re-test passes. Status is therefore `human_needed`, not `passed`.

---

_Verified: 2026-11-06T09:10:00Z_
_Verifier: Claude (gsd-verifier)_
