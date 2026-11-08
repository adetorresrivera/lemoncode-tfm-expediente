---
phase: "02"
slug: "candidaturas"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-31"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → API (`/api/applications`, `/api/tags`) | Every write body, query string and path id is client-controlled | Application records (job data, notes, offer text); single local user, no secrets |
| API → MongoDB | Filters, updates and deletes built by the repository | Application documents; the `documents` collection must never be touched by this phase |
| URL → web router | Search params and route ids are user-editable | Filter state, application ids |
| npm registry → repo | The only new dependency of the phase (`@tanstack/react-form` 1.33.5) | Third-party code and its transitive packages |
| Compose smoke → deliverable volume | The smoke writes to the same Mongo volume the demo uses | One smoke application record |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | POST body (`applications.routes.ts`) | high | mitigate | `applicationInputSchema.parse` before the service (`routes.ts:31,37`); test `create-list.test.ts:131` | closed |
| T-02-02 | Elevation of privilege | `applications.service.ts` create | high | mitigate | Document built field by field; server sets statusHistory, interviews, ownerId, createdAt (`service.ts:79-111`); test `create-list.test.ts:168` | closed |
| T-02-03 | Tampering | `http/require-json.ts` | medium | mitigate | JSON content-type gate on POST/PUT/PATCH, mounted for all applications routes (`routes.ts:16`); tests in create-list, status, update | closed |
| T-02-04 | Information disclosure | `onError` and routes | medium | mitigate | Only `err.message` logged (`app.ts:97`); Zod messages carry no input values; no console in routes/service | closed |
| T-02-05 | Tampering | `apps/api/src/test/mongo.ts` | high | mitigate | Helper bound to `tfm_test` and refuses any other name; `fileParallelism: false`; test `create-list.test.ts:67` | closed |
| T-02-06 | Denial of service | Request body size | low | accept | See Accepted Risks Log (AR-02-01) | closed |
| T-02-07 | Tampering | `application-card.tsx`, `tag-chip.tsx` | medium | mitigate | User text rendered as React text nodes; tests `common-components.test.tsx:98`, `application-list.test.tsx:511` | closed |
| T-02-08 | Tampering | Tag key coherence | low | mitigate | Single `tagKey` in contracts used by service, filter and aggregation; NFC/Unicode tests in `tag.normalize.test.ts` and `query.test.ts:251` | closed |
| T-02-10 | Tampering | GET query | high | mitigate | Bounded enums/strings in `applicationQuerySchema`; filter built field by field (`applications.query.ts:12-36`); operator-shaped keys ignored (`query.test.ts:426`) | closed |
| T-02-11 | Denial of service | `q` regex | high | mitigate | `escapeRegex` (`query.ts:6-8,31`); `q` ≤ 100 chars; ReDoS probe `(a+)+$` under 2 s (`query.test.ts:292`) | closed |
| T-02-12 | Denial of service | Tags `$all` | medium | mitigate | Arrays ≤ 20, tag items ≤ 40; no empty `$in`/`$all` (`query.test.ts:184,413,419`) | closed |
| T-02-13 | Tampering | List `api.ts` and `listSearchSchema` | medium | mitigate | Per-field `.catch`, `pickListSearch`, query from known keys only; tests `search-params.test.ts:170`, `router.test.tsx:137` | closed |
| T-02-14 | Tampering | `tag-filter.tsx` (API labels) | low | mitigate | Response validated by `tagSummarySchema`; labels rendered as text in TagChip | closed |
| T-02-15 | Tampering | `tag-filter.tsx` (URL labels) | low | mitigate | URL tags validated by `listSearchSchema`, rendered as text, sent only via `buildApplicationsQuery` | closed |
| T-02-16 | Information disclosure | GET `/:id` | medium | mitigate | `parseObjectId` 24-hex check before `new ObjectId` on every `:id` route; malformed ids answer 404 JSON (`item.test.ts:85,166`) | closed |
| T-02-17 | Tampering | `offer-data-section.tsx` link | high | mitigate | Contract allows http/https only; `toSafeHttpUrl` re-check; `rel="noopener noreferrer"`; tests for `javascript:`, `data:`, legacy URL (`application-detail.test.tsx:61,410`) | closed |
| T-02-18 | Tampering | Notes and offer text | medium | mitigate | Text nodes with `whitespace-pre-wrap`; no `dangerouslySetInnerHTML` in `apps/web/src`; `<img onerror>` tests (`application-detail.test.tsx:455,467`) | closed |
| T-02-19 | Tampering | Repository `changeStatus` | medium | mitigate | Single pipeline `findOneAndUpdate` guarded by `status: {$ne}` with `$literal`; concurrency test `status.test.ts:218` | closed |
| T-02-20 | Tampering | Detail hook optimistic state | medium | mitigate | Busy ref serializes PATCHes; snapshot rollback with fixed message in a polite status region; tests `application-detail.test.tsx:788,819` | closed |
| T-02-21 | Tampering | DELETE `/:id` | high | mitigate | `deleteOne` on applications only; no other delete/drop in API code; test `delete.test.ts:101` (documents untouched) | closed |
| T-02-22 | Tampering | PATCH body | medium | mitigate | `z.strictObject` with the status enum plus requireJson; tests `status.test.ts:235,252` | closed |
| T-02-23 | Tampering | `@tanstack/react-form` 1.33.5 and transitives | high | mitigate | Human legitimacy approval 2026-10-31 before install; exact pin; lockfile committed; devtools-event-client 0.4.4; no install scripts in the 4 new packages | closed |
| T-02-24 | Tampering | Client-side validation | low | accept | See Accepted Risks Log (AR-02-02) | closed |
| T-02-25 | Information disclosure | Server 400 details in the form | low | mitigate | Only field names kept; fixed «Revisa este campo.»; test `application-edit.test.tsx:456` | closed |
| T-02-26 | Tampering | `tag-group-input.tsx` and form fields | low | mitigate | `maxLength={40}` on tag inputs, `normalizeTags` on client and server, same contracts schema both sides | closed |
| T-02-27 | Elevation of privilege | PUT `/:id` | high | mitigate | `toEditableFields` whitelist + explicit `$set`; forged-field tests `update.test.ts:164,188,212` | closed |
| T-02-28 | Tampering | Repository `updateEditable` | medium | mitigate | No `upsert` in API code; unknown/malformed id → 404 and nothing created (`update.test.ts:337`) | closed |
| T-02-29 | Tampering | Compose smoke on the deliverable volume | low | mitigate | Smoke deletes its record and asserts 404; `docker compose down` never with `-v` | closed |
| T-02-30 | Information disclosure | `list-error.tsx` | low | mitigate | Fixed copy by error code, server message never rendered; test in `application-list.test.tsx` | closed |
| T-02-SC | Tampering | npm installs | high | mitigate | Only manifest change in the phase is the gated 02-10 install; root, api and contracts manifests unchanged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-06 | Single local user; contracts cap offerText at 20 000 and notes at 5 000 characters; compose binds `127.0.0.1:8080`, so there is no public exposure. Accepted: no transport-level body-size limit, so an oversized body is read in full before Zod rejects it (also code review WR-01). | Plan 02-01 threat model (approved phase plan) | 2026-10-31 |
| AR-02-02 | T-02-24 | The API validates every body with the same contracts schema; client-side validation is feedback only. | Plan 02-10 threat model (approved phase plan) | 2026-10-31 |

*Accepted risks do not resurface in future audit runs.*

---

## Auditor Observations (non-blocking)

1. T-02-04: for malformed JSON, Node 22's `SyntaxError.message` includes ~10 characters of the body and `app.ts:97` logs it — consider logging a fixed string for `SyntaxError`.
2. T-02-03: `startsWith("application/json")` also admits types like `application/json-seq`; those need a CORS preflight, so the simple-request vector stays closed.
3. T-02-18: the "no `dangerouslySetInnerHTML`" guard is a one-off grep, not a lint rule (`react/no-danger` is not configured).
4. T-02-26: `maxLength` exists only on tag inputs; other fields rely on the schema bounds on both sides.
5. T-02-29: the smoke script has no cleanup `trap` (also code review WR-02).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-31 | 30 | 30 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-31
