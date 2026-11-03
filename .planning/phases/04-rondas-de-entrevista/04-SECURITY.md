---
phase: "04"
slug: "rondas-de-entrevista"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-03"
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → POST /api/applications/:id/interviews | Untrusted id, JSON body and notes text enter the API and are written to Mongo | Application id, round fields, free notes (≤ 5,000 chars) |
| browser → PUT/DELETE /api/applications/:id/interviews/:interviewId | Untrusted ids and body change or remove stored rounds | Application id, round id, round fields |
| API → MongoDB aggregation pipeline and update operators | Client strings are placed inside an update pipeline (a leading `$` would be evaluated); the round id is used in the filter, `arrayFilters` and `$pull` | Round values, round id |
| API response → detail view and round list | The response replaces the whole view model (rounds, status, history); stored notes and dates are rendered back | Stored rounds, status, history |
| user input → dialog form → API body | The browser turns a local datetime-local value and free notes into the request | Local date and time, notes |
| detail controls ↔ in-flight mutations | Two user actions could race and write views out of order | View model state |
| compose smoke → compose Mongo volume | The smoke writes real records into the volume used for the demo | One test application and round |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Tampering | repository addInterview pipeline | high | mitigate | Every client value of the new element inside `$literal`, operators and keys fixed in code — `apps/api/src/applications/applications.repository.ts:246,263,274-291`; notes `$title` stored verbatim — `applications.interviews.test.ts:409` | closed |
| T-04-02 | Tampering | POST body → stored round (mass assignment) | medium | mitigate | `interviewInputSchema` has no id or status keys and `z.object` strips unknown keys — `packages/contracts/src/interview.schema.ts:8-24`; element built field by field with `new ObjectId().toString()` — `applications.service.ts:167-182`; test — `applications.interviews.test.ts:423` | closed |
| T-04-03 | Tampering | POST /:id/interviews input | medium | mitigate | `routes.use("*", requireJson)` and `parseObjectId` on `:id` — `applications.routes.ts:17,49`; schema limits (notes trim + max 5,000, `z.int().min(1)`, `z.iso.datetime()`) — `interview.schema.ts:8-15`; boundary tests — `applications.interviews.test.ts:294-374` | closed |
| T-04-04 | Tampering | concurrent creates and rule 3 | medium | mitigate | One pipeline `findOneAndUpdate` per create, rule read from the stored status (`$eq: ["$status", …]`) — `applications.repository.ts:263-264`; two concurrent POSTs give rounds 1 and 2 and one history entry — `applications.interviews.test.ts:444` | closed |
| T-04-05 | Information disclosure | API logs | medium | mitigate | No `console.` in routes, service or repository (grep, 2026-11-03); `app.onError` logs `err.message` only, fixed string for SyntaxError — `apps/api/src/app.ts:107-112` | closed |
| T-04-06 | Tampering | stored XSS through notes or labels | medium | mitigate | No `dangerouslySetInnerHTML` or `innerHTML` in `apps/web/src/pods/application-detail` (grep, 2026-11-03); values rendered as React text nodes | closed |
| T-04-07 | Denial of service | request body size on /api/applications routes | low | accept | See Accepted Risks (AR-04-01) | closed |
| T-04-08 | Tampering | datetime-local → scheduledAt conversion | low | mitigate | `localInputToIso` returns null for empty or unparsable input — `apps/web/src/common/lib/format.ts:44-71`; the mapper reports it under the field — `application-detail.interviews.test.tsx:114`; server `z.iso.datetime()` | closed |
| T-04-09 | Tampering | notes rendered in the collapsible (stored XSS) | medium | mitigate | Notes are a text node in `whitespace-pre-wrap` — `components/interview-item.tsx:108`; markup in notes shown as text — `application-detail.interviews.test.tsx:351` | closed |
| T-04-10 | Tampering | `:interviewId` path parameter | medium | mitigate | Plain string compared by equality in the filter, `arrayFilters` and `$pull`, never an operator or a key — `applications.repository.ts:309-336`, `applications.routes.ts:56-70` | closed |
| T-04-11 | Tampering | PUT body → element id (mass assignment) | medium | mitigate | Per-key `$set` of type, scheduledAt, mode, notes, outcome and (when sent) round; the id key is never written — `applications.repository.ts:311-324`; test — `applications.interviews.test.ts:584` | closed |
| T-04-12 | Tampering | resurrecting a deleted round | medium | mitigate | Filter requires `"interviews.id"`, no upsert option — `applications.repository.ts:311,330`; DELETE → PUT 404 and concurrent PUT/DELETE tests — `applications.interviews.test.ts:789,805` | closed |
| T-04-13 | Tampering | accidental deletion | low | mitigate | `AlertDialog` confirmation focusing «Conservar ronda» — `components/interview-delete-dialog.tsx:46`; one DELETE in flight — `application-detail.interviews.test.tsx:1160,1248` | closed |
| T-04-14 | Information disclosure | distinct 404 messages for application and round | low | accept | See Accepted Risks (AR-04-02) | closed |
| T-04-15 | Tampering | concurrent status and round mutations in the detail | low | mitigate | Busy guard keyed to the application (`busyRef`, `isBusy()`; scoped by review fix WR-02 `501d46f`) — `application-detail.hooks.ts:86-151`; `aria-disabled={pending \|\| locked}` on the select — `components/status-change.tsx:44`; tests — `application-detail.interviews.test.tsx:1374-1469,1510` | closed |
| T-04-16 | Tampering | smoke records in the compose database | low | mitigate | The smoke deletes the round, then the application it created — `scripts/compose-smoke.sh:177-186`; a failure mid-run can leave one record (no cleanup trap: Phase 2 finding WR-02, still open) | closed |
| T-04-SC | Tampering | npm installs | high | mitigate | No package installed in Phase 4: `package-lock.json` and every `package.json` last changed in `62a5b42` (Phase 3, 2026-11-01), before the first Phase 4 commit `cafcf5f` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-07 | No request-body limit on the /api/applications routes is the pre-existing open finding WR-01 in `02-REVIEW-DISPOSITION.md`. Expediente is a single-user local app, and round notes are capped at 5,000 characters by the schema | Plan 04-01 threat model | 2026-11-02 |
| AR-04-02 | T-04-14 | «Candidatura no encontrada» and «Ronda no encontrada» only tell the UI which resource is missing; the app is single-user, without accounts (`ownerId` null), so there is no other user's data to probe | Plan 04-03 threat model | 2026-11-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-03 | 17 | 17 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep-depth; auditor skipped per short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-03
