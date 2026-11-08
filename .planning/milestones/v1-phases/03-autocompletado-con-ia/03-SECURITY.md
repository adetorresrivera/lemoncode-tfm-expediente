---
phase: "03"
slug: "autocompletado-con-ia"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-01"
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → POST /api/offers/extract | Untrusted offer text (up to 20,000 characters, possibly with prompt injection) enters the API | Pasted offer text (may contain personal data; never logged) |
| API → LLM endpoint | The offer text and, for openai, the API key leave the process | Offer text, API key |
| LLM answer → API | Untrusted JSON (possibly echoing the offer) comes back | Model output |
| API response → form / tag list | AI values and proposed tags are written into the form the user reviews and saves | Draft field values, tags |
| API process → logs | Anything logged leaves the user's control | `{ length, durationMs }` and fixed error messages only |
| browser → PUT /api/applications/:id | The body now writes offerText | offerText (≤ 20,000 chars) |
| stored offerText → detail page | Text pasted from the web is rendered back | Stored offer text |
| hook state → DOM | The draft offer text stays in memory after the panel folds | Draft offer text (session memory) |
| manual run output → SUMMARY in git | Model outputs are committed as evidence | Anonymized fixtures only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | POST /api/offers/extract input | medium | mitigate | `requireJson` + `offerExtractRequestSchema.parse` — `apps/api/src/offers/extract.routes.ts:13,30` | closed |
| T-03-02 | Information disclosure | offers route / app.onError logging | high | mitigate | No logging in the route; `app.onError` logs `err.message` only, fixed string for SyntaxError — `apps/api/src/app.ts:107-112` | closed |
| T-03-03 | Tampering | prompt injection inside the pasted offer | medium | mitigate | Output validated by `normalizeExtraction` + `offerExtractionSchema`; endpoint persists nothing, no tools; merge fills empty fields only | closed |
| T-03-04 | Information disclosure | openai provider errors | high | mitigate | Fixed ApiError messages; `llm.client.test.ts` asserts the key is absent from errors | closed |
| T-03-05 | Denial of service | slow or hung model | medium | mitigate | One `AbortSignal.timeout` per call combined via `AbortSignal.any` with the client signal — `apps/api/src/llm/structured-call.ts:28-30` | closed |
| T-03-06 | Information disclosure | JSON.parse errors carrying model output | medium | mitigate | `parseJson` drops the caught error — `apps/api/src/llm/structured-call.ts:6-13` | closed |
| T-03-07 | Information disclosure | extract service and app.onError logging | high | mitigate | Single `console.info("offers.extract", { length, durationMs })` — `apps/api/src/offers/extract.service.ts:214`; sentinel log tests | closed |
| T-03-08 | Denial of service | oversize request body | medium | mitigate | `bodyLimit` (256 KiB) before parsing — `apps/api/src/offers/extract.routes.ts:17`; schema cap 20,000 chars | closed |
| T-03-09 | Tampering | model output outside the contract | medium | mitigate | `normalizeExtraction` trims/dedupes/caps, final `offerExtractionSchema` parse; failure → 502 LLM_ERROR | closed |
| T-03-10 | Tampering | mergeExtractionIntoForm | medium | mitigate | `apps/web/src/pods/application-edit/application-edit.mapper.ts:163`; `application-edit.merge.test.ts` | closed |
| T-03-11 | Tampering | AI values mistaken for the user's own | low | mitigate | «IA» mark with «Rellenado por la IA» — `apps/web/src/common/components/ai-mark.tsx:14`; no `dangerouslySetInnerHTML` in `apps/web/src`; no storage use in the pod | closed |
| T-03-12 | Tampering | tag merge (flood or long labels) | low | mitigate | `normalizeTags` + `MAX_TAGS` — `apps/api/src/offers/extract.service.ts:64,175`; chip truncation | closed |
| T-03-13 | Tampering | PUT whitelist (offerText added) | medium | mitigate | Key-by-key whitelist and explicit `$set`; `applicationInputSchema` caps offerText; `applications.update.test.ts` | closed |
| T-03-14 | Tampering | stored offerText rendered in the detail | low | mitigate | Rendered as React text; `<img onerror>` tests in `application-detail.test.tsx:456` | closed |
| T-03-15 | Denial of service | repeated analysis requests from the panel | low | mitigate | One request at a time, client length gate, Cancel/unmount abort propagated to the model call | closed |
| T-03-16 | Information disclosure | 03-09-SUMMARY.md evidence | low | mitigate | Only anonymized fixtures run and recorded (03-09-SUMMARY) | closed |
| T-03-17 | Tampering | unapproved prompt or model change | medium | mitigate | Blocking-human checkpoint, verbatim-prompt test, sha256 fingerprint gate (03-09-SUMMARY) | closed |
| T-03-18 | Tampering | tag group chosen by the model | medium | mitigate | `SPOKEN_LANGUAGE_WORDS` guard — `apps/api/src/offers/extract.service.ts:71,116`; service and pipeline tests | closed |
| T-03-19 | Information disclosure | manual evidence (03-10-SUMMARY.md) | medium | mitigate | Anonymized fixtures and a fictional offer only; scratch body deleted; untracked-files gate (03-10-SUMMARY) | closed |
| T-03-20 | Tampering | unapproved prompt, schema or model change | medium | mitigate | Verbatim-prompt test, fingerprint gate, `git diff --quiet` invariance gate (03-10-SUMMARY) | closed |
| T-03-21 | Tampering | tag-group placeholder copy | low | accept | Static literals rendered as an attribute — see Accepted Risks | closed |
| T-03-22 | Tampering | AI values reviewed less once the panel folds | low | mitigate | Badges and chip marks stay on the form; status region outside the collapsible announces «Hemos rellenado…» — `application-edit.ai.test.tsx` | closed |
| T-03-23 | Information disclosure | draft offer text kept in hook state after the fold | low | accept | Session memory only — see Accepted Risks | closed |
| T-03-SC | Tampering | npm installs | high | mitigate | No dependency added in phase 03: the only `apps/api/package.json` change is the dev-only `try-extract` script (62a5b42); `dependencies` unchanged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-21 | Placeholders are static string literals in `TagsSection`, rendered by React as an attribute; no user or model data and no new input surface | Plan 03-11 threat model | 2026-11-01 |
| AR-03-02 | T-03-23 | Draft offer text lives only in session memory, is stored only when an analysis succeeded and the user saves (D-10), and is never logged or written to localStorage/sessionStorage | Plan 03-12 threat model | 2026-11-01 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-01 | 24 | 24 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep-depth; auditor skipped per short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-01
