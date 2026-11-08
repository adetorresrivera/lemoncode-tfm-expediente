---
phase: "05"
slug: "documentos-en-s3"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-06"
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → POST /api/documents | Untrusted multipart body: file bytes, browser file name, part content types, text fields | User files (CV, cover letter), up to 5 MB |
| API → Silo (S3) | Object key and content type written by the API | Server-built key, detected mime |
| API → MongoDB documents | Metadata record built field by field | Document metadata |
| browser → GET/DELETE /api/documents… | Untrusted path id and `?type=` query | Ids, enum filter |
| API → browser (download) | Stored bytes and stored file name in a response | User files, file name in header |
| browser → POST/PUT /api/applications | Untrusted document link ids | ObjectId strings |
| applications service → documents collection | Read-only cross-collection lookup | Document types |
| user file system → browser | Any picked file; client checks are advisory | User files |
| API error / list → UI | Error codes, document names and versions rendered | User text |
| upload dialog (portal) → application form | Synthetic events crossing the Radix portal | UI events |
| smoke script → compose volumes | Smoke writes real records and objects | Test data |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Spoofing | file type (renamed HTML/script) | high | mitigate | `detectDocument` in `apps/api/src/documents/file-type.ts`; signature + extension must agree, DOCX via EOCD/central directory; mime from detection | closed |
| T-05-02 | Tampering | S3 object key | high | mitigate | `buildS3Key` (`file-name.ts:39`) slugs to `[a-z0-9._-]`, collapses `..`; ObjectId segment; tests in `file-checks.test.ts` | closed |
| T-05-03 | Denial of service | request body size | high | mitigate | `bodyLimit` in `documents.routes.ts:29`; exact size check after | closed |
| T-05-04 | Denial of service | malformed multipart | medium | mitigate | `parseBody` wrapped and rethrown as 400 (`documents.routes.ts:38`) | closed |
| T-05-05 | Denial of service | DOCX decompression bomb | medium | mitigate | Detector reads central-directory headers only, never decompresses (`file-type.ts`) | closed |
| T-05-06 | Information disclosure | API logs | medium | mitigate | No `console.*` in `apps/api/src/documents` or `storage`; `app.onError` logs only `err.message` | closed |
| T-05-07 | Tampering | orphan S3 object after failed insert | medium | mitigate | `storage.delete(s3Key).catch(() => undefined)` then rethrow (`documents.service.ts:88`) | closed |
| T-05-08 | Tampering | mass assignment via extra parts | medium | mitigate | Only `file`, `type`, `name`, `version` read (`documents.routes.ts:44-48`); record built in service | closed |
| T-05-09 | Spoofing | cross-site multipart POST | low | accept | See Accepted Risks AR-05-01 | closed |
| T-05-10 | Tampering | Content-Disposition header injection | high | mitigate | `contentDisposition` (`file-name.ts:74`): ASCII fallback + RFC 5987 `filename*`; control chars stripped | closed |
| T-05-11 | Spoofing | inline rendering of downloads (stored XSS) | high | mitigate | `attachment` disposition, detected mime only, global `secureHeaders` (nosniff) in `app.ts:65` | closed |
| T-05-12 | Information disclosure | id oracle on :id routes | low | mitigate | `parseObjectId(raw, "Documento no encontrado")` on all :id routes | closed |
| T-05-13 | Tampering | deleting a linked document | medium | mitigate | `isInUse` → 409 `DOCUMENT_IN_USE`; tests in `documents.test.ts:299` | closed |
| T-05-14 | Tampering | link/delete race | low | accept | See Accepted Risks AR-05-02 | closed |
| T-05-15 | Denial of service | download buffering in memory | low | mitigate | `transformToWebStream()` in `storage/s3.ts:105`; no `transformToByteArray` | closed |
| T-05-16 | Tampering | query injection via `?type=` | medium | mitigate | `documentQuerySchema.parse(queryInput(...))` (`documents.routes.ts:79`) | closed |
| T-05-17 | Tampering | links to unknown / wrong-type documents | medium | mitigate | `validateDocumentLinks` before create and update (`applications.service.ts:147,188`) | closed |
| T-05-18 | Tampering | NoSQL injection via link id | medium | mitigate | `findTypes` with 24-hex ids converted to ObjectId in `$in`; tests in `applications.documents.test.ts` | closed |
| T-05-19 | Tampering | silent loss of links on PUT | medium | mitigate | `toEditableFields` + `updateEditable` write the links | closed |
| T-05-20 | Tampering | client-side validation bypass | medium | mitigate | Server gate T-05-01..04 is authoritative | closed |
| T-05-21 | Information disclosure | server error text in dialog | low | mitigate | `mapUploadErrorToFeedback` fixed copy per code (`document-upload.mapper.ts:118`) | closed |
| T-05-22 | Tampering | stored XSS via names in upload pod | medium | mitigate | React text nodes only; no `dangerouslySetInnerHTML` in `apps/web/src` | closed |
| T-05-23 | Tampering | silent unlink via failed/partial list | medium | mitigate | Picker keeps `selectedId` in loading/error states; tests | closed |
| T-05-24 | Tampering | stored XSS via option labels | medium | mitigate | Options are React text nodes | closed |
| T-05-25 | Tampering | picker control submitting the form | medium | mitigate | All picker buttons `type="button"` (`document-picker.tsx:126`) | closed |
| T-05-26 | Tampering | dialog submit saving the application | medium | mitigate | `preventDefault` + `stopPropagation` (`upload-dialog.tsx:149`); click/Enter tests | closed |
| T-05-27 | Repudiation | document removed on discard | low | mitigate | No client rollback; router test asserts no DELETE (`router.test.tsx:1149`) | closed |
| T-05-28 | Tampering | path built from link id | low | mitigate | `encodeURIComponent` in detail api and `downloadHref` | closed |
| T-05-29 | Tampering | stored XSS in detail aside | medium | mitigate | React text nodes only | closed |
| T-05-30 | Denial of service | one failing document request | low | mitigate | `Promise.allSettled` (`application-detail.hooks.ts:162`) with per-row error | closed |
| T-05-31 | Tampering | search param injection | low | mitigate | Parsed `type` sent via `URLSearchParams` (`document-list/api/api.ts`) | closed |
| T-05-32 | Tampering | row removed before server confirms | medium | mitigate | `remove` waits for 204 (`document-list.hooks.ts`) | closed |
| T-05-33 | Tampering | stored XSS in rows/dialog | medium | mitigate | React text nodes only | closed |
| T-05-34 | Tampering | smoke data left in demo volumes | low | mitigate | Smoke deletes its document and asserts 404 (`scripts/compose-smoke.sh:272`) | closed |
| T-05-35 | Information disclosure | docs exposing secrets | low | accept | See Accepted Risks AR-05-03 | closed |
| T-05-36 | Tampering | file input className (05-10) | low | accept | See Accepted Risks AR-05-04 | closed |
| T-05-37 | Tampering | file input className (05-11) | low | accept | See Accepted Risks AR-05-05 | closed |
| T-05-SC | Tampering | npm installs | high | mitigate | No diff in `package.json` / `package-lock.json` across the phase (since 466508a) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-09 | Single-user local app; worst case is a junk file of at most 5 MB the user deletes from `/documents`; DELETE needs a preflight; `hono/csrf` not adopted (RESEARCH Open Question 2) | 05-01-PLAN | 2026-11-06 |
| AR-05-02 | T-05-14 | Single-user local app; a stale link surfaces as a 400 on the next save (05-03) | 05-02-PLAN | 2026-11-06 |
| AR-05-03 | T-05-35 | Docs describe key patterns only; credentials stay in `.env` / `.env.example` | 05-09-PLAN | 2026-11-06 |
| AR-05-04 | T-05-36 | Static class literals only; validation and the native control unchanged | 05-10-PLAN | 2026-11-06 |
| AR-05-05 | T-05-37 | Static class literals only; validation and the native control unchanged | 05-11-PLAN | 2026-11-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-06 | 38 | 38 | 0 | /gsd-secure-phase (L1 grep verification, auditor skipped by short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-06
