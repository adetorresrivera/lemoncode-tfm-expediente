---
phase: "5"
slug: "documentos-en-s3"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-04"
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 — contracts (node); API (node, real Mongo `tfm_test`, real Silo bucket `tfm-assets-test` for the adapter and the tracer row, `fakeStorage()` elsewhere, `fileParallelism: false`); web (jsdom, Testing Library, user-event 14.6.8) |
| **Config file** | `packages/contracts/package.json` (vitest run), `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `npm run test -w @tfm/api -- src/documents` · `npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/core/router` |
| **Full suite command** | `npm run typecheck && npm run test && npm run lint` |
| **Estimated runtime** | ~70 seconds (full suite); targeted commands 5-20 seconds |

---

## Sampling Rate

- **After every task commit:** Run the targeted API or web command of the task's `<verify>`
- **After every plan wave:** Run `npm run typecheck && npm run test && npm run lint`
- **Before `/gsd-verify-work`:** Full suite, `npm run build` and `bash scripts/compose-smoke.sh --down` must be green (05-09)
- **Max feedback latency:** 70 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 05-01 | 1 | DOC-01, DOC-02 | T-05-01, T-05-02, T-05-08 | signature + extension decide the mime; slugged key under a server ObjectId; record built field by field; object lands in the test bucket only | integration (real Mongo + real Silo) + contract unit | `npm run test -w @tfm/contracts -- src/schemas.test.ts` · `npm run test -w @tfm/api -- src/documents/documents.upload.test.ts && npm run typecheck` | ❌ W0 (created in the task) | ⬜ pending |
| 05-01-T2 | 05-01 | 1 | DOC-01, DOC-02 | T-05-03, T-05-04, T-05-05, T-05-06, T-05-07 | 413 on both body-limit branches; malformed multipart → 400; no decompression; no logging; compensation keeps the insert error | unit (pure) + integration + real socket | `npm run test -w @tfm/api -- src/documents` · `npm run typecheck && npm run test && npm run lint` | ❌ W0 (`file-checks.test.ts` created in the task) | ⬜ pending |
| 05-02-T1 | 05-02 | 2 | DOC-04, DOC-06 | T-05-10, T-05-11, T-05-12, T-05-15, T-05-16 | Content-Disposition only from the helper; attachment + nosniff; same 404 for malformed and unknown ids; streamed body; enum filter | integration (real Mongo) | `npm run test -w @tfm/api -- src/documents/documents.test.ts` · `npm run test -w @tfm/api -- src/documents src/applications && npm run typecheck` | ❌ W0 (created in the task) | ⬜ pending |
| 05-02-T2 | 05-02 | 2 | DOC-05 | T-05-13, T-05-14 | 409 when linked; Mongo record deleted before the object | integration + real Silo contract | `npm run test -w @tfm/api -- src/documents src/storage` · `npm run typecheck && npm run test && npm run lint` | ❌ W0 (`storage.test.ts` created in the task) | ⬜ pending |
| 05-03-T1 | 05-03 | 3 | DOC-03 | T-05-17, T-05-18, T-05-19 | links validated by type before any write; only 24-hex ids queried; PUT writes links as sent | integration (real Mongo) | `npm run test -w @tfm/api -- src/applications src/documents` · `npm run typecheck` | ❌ W0 (`applications.documents.test.ts` created in the task) | ⬜ pending |
| 05-03-T2 | 05-03 | 3 | DOC-03 | T-05-19 | form always sends the loaded links | unit + component | `npm run test -w @tfm/web -- src/pods/application-edit src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ | ⬜ pending |
| 05-04-T1 | 05-04 | 2 | DOC-01, DOC-02 | T-05-20, T-05-22 | FormData without content-type; React text only | component + router (tracer) | `npm run test -w @tfm/web -- src/pods/document-upload src/core/router src/core/http && npm run typecheck` | ❌ W0 (`document-upload.test.tsx` created in the task) | ⬜ pending |
| 05-04-T2 | 05-04 | 2 | DOC-01, DOC-02 | T-05-20, T-05-21 | fixed copy per error code; never the server text | unit + component + router | `npm run test -w @tfm/web -- src/pods/document-upload src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ (after T1) | ⬜ pending |
| 05-05-T1 | 05-05 | 4 | DOC-03 | T-05-23, T-05-24 | loading/error keep the linked value; option labels as text | unit + component | `npm run test -w @tfm/web -- src/pods/document-upload` · `npm run typecheck` | ✅ | ⬜ pending |
| 05-05-T2 | 05-05 | 4 | DOC-03 | T-05-25 | picker buttons type="button"; slot keeps pods independent | component | `npm run test -w @tfm/web -- src/pods/application-edit src/pods/document-upload src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ | ⬜ pending |
| 05-06-T1 | 05-06 | 5 | DOC-03, DOC-02 | T-05-26 | inner submit stopped at the portal (click and Enter) | component | `npm run test -w @tfm/web -- src/pods/document-upload` · `npm run typecheck` | ✅ | ⬜ pending |
| 05-06-T2 | 05-06 | 5 | DOC-03 | T-05-27 | no DELETE after discarding the form | router (end to end, mocked API) | `npm run test -w @tfm/web -- src/core/router src/pods/application-edit src/pods/document-upload` · `npm run typecheck && npm run test && npm run lint` | ✅ | ⬜ pending |
| 05-07-T1 | 05-07 | 2 | DOC-04 | T-05-28, T-05-29, T-05-30 | encoded ids; text nodes; per-row degradation | unit + component | `npm run test -w @tfm/web -- src/common src/pods/application-detail` · `npm run typecheck` | ✅ (extend) | ⬜ pending |
| 05-07-T2 | 05-07 | 2 | DOC-04 | — | N/A (copy change, rule 5 promise) | component | `npm run test -w @tfm/web -- src/pods/application-detail` · `npm run typecheck && npm run test && npm run lint` | ✅ | ⬜ pending |
| 05-08-T1 | 05-08 | 3 | DOC-06 | T-05-31, T-05-33 | only the parsed type reaches the query; text nodes | unit + component | `npm run test -w @tfm/web -- src/pods/document-list` · `npm run typecheck` | ❌ W0 (`document-list.test.tsx` created in the task) | ⬜ pending |
| 05-08-T2 | 05-08 | 3 | DOC-05, DOC-06, DOC-01 | T-05-32 | row removed only after the 204; 409 shown in the dialog | component + layout + router | `npm run test -w @tfm/web -- src/pods/document-list src/layouts src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ (after T1) | ⬜ pending |
| 05-09-T1 | 05-09 | 6 | DOC-01, DOC-02, DOC-04, DOC-05, DOC-06 | T-05-34 | smoke deletes what it creates | compose smoke | `bash -n scripts/compose-smoke.sh && docker compose version && bash scripts/compose-smoke.sh --down` | ✅ | ⬜ pending |
| 05-09-T2 | 05-09 | 6 | DOC-01..DOC-06 | T-05-35 | N/A (docs) | phase gate | `npm run typecheck && npm run lint && npm run test && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 plan: each new test file is created by the first task that needs it, test first, in the same commit (TDD RED and GREEN together, as in Phases 2-4). Vitest, Testing Library and user-event are already installed.

- [ ] `apps/api/src/test/documents.ts` — `fakeStorage`, `useTestStorage` (bucket `tfm-assets-test`), `pdfBytes`, `zipBytes` (stored and streamed ZIPs), `docxBytes`, `uploadForm`, `readStream` (05-01 T1)
- [ ] `apps/api/src/documents/documents.upload.test.ts` (05-01 T1), `apps/api/src/documents/file-checks.test.ts` (05-01 T2)
- [ ] `apps/api/src/documents/documents.test.ts` (05-02 T1), `apps/api/src/storage/storage.test.ts` (05-02 T2)
- [ ] `apps/api/src/applications/applications.documents.test.ts` and the rewrite of the Phase 2 links test in `applications.update.test.ts` (05-03 T1)
- [ ] `apps/web/src/pods/document-upload/document-upload.test.tsx` (05-04 T1), `apps/web/src/pods/document-list/document-list.test.tsx` (05-08 T1)
- [ ] `GET /api/documents` default in `apps/web/src/test/mock-fetch.ts` (05-06 T2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A .docx saved by Microsoft Word and by LibreOffice is accepted | DOC-01 | No real producer file in the repo; the detector reads the central directory (RESEARCH Assumption A1) | Upload one of each from `/documents`; both answer 201 |
| The `download` attribute keeps the SPA when the endpoint answers 404 | DOC-04 | Browser behaviour (RESEARCH Assumption A2) | Delete an object in the Silo console, press «Descargar» in the detail and in `/documents`; the tab stays on the page |
| A real browser sees the 413 as «El archivo supera 5 MB.» | DOC-02 | Socket behaviour of a real browser (RESEARCH Pitfall 4) | Bypass the client check (devtools) and upload a 6 MB PDF |
| Long names and labels at 360 px (native select, rows, nav Sheet) | DOC-03, DOC-06 | jsdom cannot evaluate layout (UI-SPEC backstop rows) | Devtools at 360 px on the form, `/documents` and a detail with 120-character names |
| A document uploaded before an aborted request finished stays in the library | DOC-01 | Server-side timing of a real abort (RESEARCH Pitfall 8) | Cancel a slow upload right after sending; reload `/documents` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (18/18 tasks, each with `<fails_when>`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no `MISSING` sentinel is used; test files are created by their first task)
- [x] No watch-mode flags (`vitest run` everywhere)
- [ ] Feedback latency < 70s (to confirm during execution)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (planned 2026-11-04; set to validated by `/gsd-validate-phase 5`)
