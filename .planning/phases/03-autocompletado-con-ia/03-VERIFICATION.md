---
phase: 03-autocompletado-con-ia
verified: 2026-11-01T14:00:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/03-autocompletado-con-ia/03-01-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-01-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-02-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-02-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-03-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-03-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-04-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-04-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-05-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-05-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-06-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-06-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-07-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-07-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-08-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-08-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-09-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md"
  - "apps/api/src/app.ts"
  - "apps/api/src/llm/structured-call.ts"
  - "apps/api/src/offers/extract.routes.ts"
  - "apps/api/src/offers/extract.service.ts"
  - "apps/web/src/pods/application-edit/application-edit.hooks.ts"
  - "apps/web/src/pods/application-edit/application-edit.mapper.ts"
  - "apps/web/src/pods/application-edit/components/offer-panel.tsx"
covered_digest: "v4:sha256:b757dc83377c31a613f65e91c39b8b9c874389a6d8ca9df9252e7fad6c8669c6"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "ROADMAP SC1: tags truncated (over-long labels cut to 40, surplus tags cut to 20) on real model output"
    reason: "Observable only with fake test clients: real over-long model output fails offerExtractionSchema inside callStructured and answers 502 LLM_ERROR after one retry (RESEARCH Pitfall 8, Open Question 6). Recorded in 03-03 and 03-09 SUMMARY as accepted."
    accepted_by: "Alberto de Torres (as recorded in 03-03-SUMMARY and the orchestrator brief)"
    accepted_at: "2026-10-31T00:00:00Z"
human_verification:
  - test: "Re-analysis fix, in the browser (quick 261101-gpz). Open Nueva candidatura, paste offer A (50+ chars) and press «Autocompletar con IA»; without editing anything, replace the text with a different offer B and analyse again. Then repeat, editing one field (e.g. company) and adding one manual tag between the two analyses."
    expected: "Second analysis replaces every field and AI chip still marked «IA» (and clears the ones offer B does not fill), the «IA» marks and the «Complétalo tú» highlights are recomputed, the edited field and the manual tag are untouched, and nothing is saved until «Guardar»."
    why_human: "The user has not yet done the UI check of this fix. The logic is covered by 44 merge tests and the Testing Library suite, but real focus/render behaviour and the visual marks are only observable in the browser."
  - test: "Real-model sanity after the D-25 prompt (gemma4:e2b via Ollama): analyse the three fixtures once through the UI or `LLM_PROVIDER=ollama npm run try-extract -w @tfm/api`."
    expected: "No 504 on a quiet machine, tag labels are real technology names (not group names), and no 502 from an over-long label or a currency symbol."
    why_human: "Non-deterministic CPU model. 03-09 SUMMARY records 3 of 6 timeouts with the original prompt and a rerun with the D-25 prompt (21 s / 10 s / 11 s, 11/12, 9/10, 10/13 correct) as manual evidence only; a second measurement before the defence was advised."
  - test: "Demo path with LLM_PROVIDER=mock and `docker compose up --build`: paste an offer, autocomplete, review the IA marks, save, reopen in edit mode."
    expected: "Draft fills in about 0.3 s, panel collapsed in edit mode with offerText prefilled, marks absent on load."
    why_human: "End-to-end visual/UX check of the plan-B path; compose smoke only proves the 400 VALIDATION_ERROR route is mounted."
warnings:
  - id: WR-01
    severity: warning
    summary: "normalizeExtraction's label cut / tag cap is unreachable for real model output (strict schema rejects it first); also currency such as «€» or a 2-letter code gives 502. Accepted for the SC1 truncation clause (override above); the broader consequence (one off-spec field fails the whole analysis on a small model) is not accepted anywhere and stays open in 03-REVIEW-DISPOSITION.md."
  - id: WR-02
    severity: warning
    summary: "apps/api/src/app.ts:106 console.error(err.message) logs a ~20 character fragment of the request body for a JSON SyntaxError (reproduced on this Node: `Unexpected token 'B', \"{\"text\": Buscamos d\"... is not valid JSON`). Not the full offer text (AI-04 / SC1 wording literally held) but contradicts the code comment and the project constraint."
---

# Phase 3: Autocompletado con IA Verification Report

**Phase Goal:** As a job seeker, I want to paste an offer and get a reviewable draft of the application form, so that I fill an application in seconds without losing anything I already typed.
**Verified:** 2026-11-01
**Status:** human_needed
**Re-verification:** No, initial verification

The goal is achieved in the code. No must-have fails. The status is `human_needed` because the user has not yet checked the re-analysis fix (quick 261101-gpz) in the browser, and the real-model quality after the D-25 prompt rests on manual evidence only.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `POST /api/offers/extract` accepts 50-20,000 chars and returns a normalized `OfferExtraction` (trim, empty to null, swapped salary, tags deduplicated and truncated) without logging the full offer text | PASSED (override) for the "truncated" clause; VERIFIED for the rest | `offerExtractRequestSchema` = `trim().min(OFFER_TEXT_MIN=50).max(OFFER_TEXT_MAX=20000)`, parsed in `extract.routes.ts:36`; 256 KiB body limit returns 400 VALIDATION_ERROR. `normalizeExtraction` (`extract.service.ts:51-85`) trims, empties to null, swaps inverted salary, uppercases currency, runs `normalizeTags` (dedupe), cuts labels to 40 and re-validates. Only log line: `{length, durationMs}` (`extract.service.ts:97-102`, test "logs exactly one line"). Truncation is reachable only with fake clients (accepted deviation, see WR-01). WR-02 leaks about 20 chars on malformed JSON only; never the full text. |
| 2 | `LLM_PROVIDER` ollama / openai / mock switches the model without code change, `/api/health` reports it via `ping()`, mock works offline | VERIFIED | `createLlmClient` switches on `LLM_PROVIDER` (`llm.client.ts:32-39`); real `ollama.provider.ts` (`/api/chat`, `think:false`, `num_ctx 8192`, `format` JSON schema, `/api/version` ping) and `openai.provider.ts` (`json_schema strict`, `/models` ping); `mock.provider.ts` fixed schema-valid draft, 300 ms, no network. `app.ts:62-72` health calls `deps.pingLlm` wired to `llm.ping()` in `main.ts:33`. `.env.example` has `LLM_PROVIDER`, `LLM_TIMEOUT_MS`. `llm.client.test.ts` covers the switch. |
| 3 | Timeout gives 504 `LLM_TIMEOUT`; unparseable / schema-invalid output retried once then 502 `LLM_ERROR`; form shows non-blocking «Analizando la oferta…» or a clear error and stays editable | VERIFIED | `structured-call.ts`: one `AbortSignal.timeout` budget shared by both attempts, `MAX_ATTEMPTS=2`, 504 decided by the timeout signal only, client abort maps to 502, fixed messages. 12 named tests in `structured-call.test.ts` (retry once, exactly 2 sends, 504 not retried, abort never 504, no model output in messages). Web: `offer-panel.tsx:88` «Analizando la oferta…», `ERROR_MESSAGES` by reason, «Cancelar análisis», `errorReasonOf` maps LLM_TIMEOUT / LLM_ERROR / VALIDATION_ERROR; cancel and analysing-state tests in `application-edit.ai.test.tsx`. |
| 4 | «Pegar oferta» open on create, collapsed on edit; «Autocompletar con IA» fills only empty fields, merges tags without duplicates, persists nothing until save | VERIFIED | `application-edit.container.tsx:65` `defaultOpen: true` (create) and `:123` `defaultOpen: false` (edit). `mergeExtractionIntoForm` (`application-edit.mapper.ts`) is pure: a field is free only if blank or still marked «IA»; user-typed or edited values never overwritten; salary inversion guard; currency rule; tags: user chips first, `normalizeTags` union, dropped AI chips replaced. Hook writes with `dontRunListeners` and reads form values and marks at response time (D-20). The extract route has no DB dependency (`app.ts` mounts it with the LLM client only); persistence happens only in the form's `onSubmitAsync`. 44 merge tests plus 66 component tests pass. |
| 5 | «IA» mark on AI-filled fields disappearing on edit; «Complétalo tú» on empty relevant fields; pasted text stored as `offerText` on save | VERIFIED | `ai-mark.tsx`, `form-field.tsx:52` «Complétalo tú», `useAiMarks` ref-backed session marks (`onUserChange` drops the field mark and the missing mark only when filled, `keepPresentTags` for chips). `RELEVANT_FIELDS` drives `missingFields`. `offerText` in contracts (`application.schema.ts:40`), service (`applications.service.ts:53,92`), repository (`:175`) and `mapFormValuesToApiInput` (`offerText: textOrNull(values.offerText)`); written only by a successful analysis and prefilled in edit mode (03-07). |

**Score:** 5/5 truths verified (1 with an applied override for the truncation clause), 0 present-but-behavior-unverified.

### Quick-task changes treated as part of the deliverable

| Change | Status | Evidence |
|--------|--------|----------|
| 261101-gfe (D-25 prompt): two Pitfall 7 rule lines added | VERIFIED | `EXTRACTION_SYSTEM_PROMPT` contains `company: la empresa que publica la oferta.` and the `label es el nombre de la tecnología o idioma...` line; verbatim-prompt test in `extract.routes.test.ts` compares with `docs/AI-EXTRACTION.md` and passes in the full suite. |
| 261101-gpz (re-analysis replaces fields still marked «IA») | VERIFIED in code and unit/component tests; UI check pending (human item 1) | `mergeExtractionIntoForm(current, extraction, text, previous)` with `isFree = blank || marked`; reset to `EMPTY_FORM_VALUES` when the new extraction has no value; hook reads `getMarks()` at response time and writes the union of previous and new `aiFields`; tags drop `previous.aiTags`. Spec amended in `docs/AI-EXTRACTION.md`, `03-UI-SPEC.md`, `03-CONTEXT.md` D-11 and `REQUIREMENTS.md` AI-06 (line 47 reads as the new rule). |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/offers/extract.routes.ts` | POST /extract with validation, body limit, signal | VERIFIED | Wired in `app.ts` under `/api/offers` when `deps.llm` |
| `apps/api/src/offers/extract.service.ts` | prompt, normalization, length-only logging | VERIFIED | Wired from routes; tests |
| `apps/api/src/llm/{llm.client,ollama.provider,openai.provider,mock.provider,structured-call}.ts` | swappable provider, retry, timeout | VERIFIED | `main.ts` builds the client, `/api/health` uses `ping()` |
| `packages/contracts/src/offer-extraction.schema.ts` | schema, request schema, limits | VERIFIED | Imported by api and web |
| `apps/web/src/pods/application-edit/{mapper,hooks,vm,container,component}` and `components/offer-panel.tsx`, `form-field.tsx`, `tag-group-input.tsx` | panel, merge, marks | VERIFIED | Rendered by create/edit containers |
| `apps/web/src/common/components/ai-mark.tsx` | IA badge | VERIFIED | Used in form fields and chips |
| `apps/api/src/offers/__fixtures__/*`, `apps/api/src/scripts/try-extract.ts` | three fixtures, dev script | VERIFIED | Fixtures test passes |
| `scripts/compose-smoke.sh` | offers route probe | VERIFIED per 03-09 (not rerun: needs Docker) | |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| `offer-panel` onAnalyze -> `useOfferExtraction.analyze` -> `extractOffer` -> POST /api/offers/extract | WIRED |
| route -> `service.extract` -> `llm.extractStructured` (with `c.req.raw.signal`) -> `callStructured` | WIRED |
| response -> `mergeExtractionIntoForm(form.state.values, ..., getMarks())` -> `form.setFieldValue(dontRunListeners)` -> `onMerged` -> `useAiMarks.setFromMerge` | WIRED |
| field listener `onChange` -> `onUserChange` -> mark removal | WIRED |
| `main.ts` `llm.ping()` -> `/api/health` | WIRED |
| form save -> `mapFormValuesToApiInput.offerText` -> POST/PUT -> repository | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck, lint | `npm run typecheck`, `npm run lint` | exit 0, no warnings | PASS |
| Full test suite (run once) | `npm run test` | contracts 55, api 211, web 403 passed | PASS |
| Malformed-JSON log content (WR-02) | `node -e 'JSON.parse(...)'` | message quotes ~20 chars of the body | CONFIRMED defect (warning) |

### Probe Execution

Step 7c: SKIPPED. The phase declares no `probe-*.sh`; `scripts/compose-smoke.sh` needs Docker and was recorded as `SMOKE OK` in 03-09.

### Requirements Coverage

| Requirement | Description (short) | Status | Evidence |
|-------------|---------------------|--------|----------|
| AI-01 | POST /api/offers/extract, 50-20,000 chars | SATISFIED | request schema, route, route tests, compose smoke 400 probe |
| AI-02 | LlmClient swappable ollama/openai/mock, ping in health | SATISFIED | `llm.client.ts`, providers, `app.ts` health |
| AI-03 | 504 LLM_TIMEOUT; 502 LLM_ERROR after one retry | SATISFIED | `structured-call.ts` and its 12 tests |
| AI-04 | normalization and never logging the full offer text | SATISFIED with warnings | normalization present; the label-cut / tag-cap part is unreachable for real output (WR-01, override for the SC); log line is length and duration only; WR-02 leaks a fragment on malformed JSON |
| AI-05 | Pegar oferta panel, action, non-blocking state/error | SATISFIED | `offer-panel.tsx`, container `defaultOpen`, ai tests |
| AI-06 | Fill empty and still-«IA» fields, never user values, tag merge, no persistence | SATISFIED (code and tests); UI check of re-analysis pending | mapper merge, hooks |
| AI-07 | «IA» mark disappears on edit | SATISFIED | `useAiMarks`, `ai-mark.tsx` |
| AI-08 | «Complétalo tú» on empty relevant fields | SATISFIED | `form-field.tsx`, `missingFields` |
| AI-09 | pasted text stored as `offerText` on save | SATISFIED | contracts, service, repository, mapper |

All nine IDs appear in the plans (03-09 lists AI-01, AI-02, AI-04; the others in 03-01..03-08) and in REQUIREMENTS.md; no orphaned requirement. Note: REQUIREMENTS.md still shows the AI-01..AI-09 checkboxes and traceability rows as Pending; the orchestrator should flip them on phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/src/app.ts` | 106 | `console.error(err.message)` logs a body fragment for JSON SyntaxError | Warning (WR-02) | Contradicts "never log the offer text" for ~20 chars; only reachable with a malformed body, never from the app's own client |
| `apps/api/src/offers/extract.service.ts` / `structured-call.ts` | 36-45 / 50 | Normalization unreachable for over-long output; strict schema applied to raw model output | Warning (WR-01) | A small model's 41-char label, 21st tag or "€" currency gives 502 instead of a degraded draft. Accepted for SC1 truncation; broader effect is a demo-risk |
| debt markers (TBD/FIXME/XXX) | n/a | none found in phase files reviewed | n/a | n/a |

No stubs or hollow props found in the touched code; data flows from the provider through the merge into form state.

### Human Verification Required

1. **Re-analysis fix in the browser.** Analyse offer A, then a different offer B without editing; repeat editing one field and adding one manual tag between analyses. Expected: IA-marked fields and chips replaced or cleared, user edits and manual tag kept, marks recomputed, nothing persisted before «Guardar». Why human: the user has not done this UI check yet.
2. **Real-model sanity after the D-25 prompt** on a quiet machine (gemma4:e2b). Expected: no 504, real tag labels, no 502 from a long label or currency symbol. Why human: non-deterministic, CPU-bound.
3. **Mock plan-B demo path** via `docker compose up --build`. Expected: about 0.3 s draft, collapsed panel with prefilled offer in edit mode. Why human: end-to-end UX.

### Gaps Summary

No blocking gaps. Two warnings, left open in `03-REVIEW-DISPOSITION.md` (all seven findings still `open`):

- **WR-01** is the same root cause as the accepted SC1 deviation, so the truncation clause is carried as PASSED (override). The wider consequence is not covered by the acceptance: a single over-long label, a 21st tag, an empty label or a non-3-letter currency fails the whole analysis with 502 on a model that is already weak on tags. Recommended before the defence: validate model output with a lenient raw schema, normalize, then validate strictly (or delete `cutLabel` and the dead tests and docs line).
- **WR-02** is a verified, small leak (about 20 characters of the pasted offer on malformed JSON). Recommended one-line fix: do not log `err.message` for `SyntaxError`, plus a test.

Neither warning blocks the phase goal. Disposition of the review findings (fix, defer or skip) is still to be recorded by the user.

---

_Verified: 2026-11-01_
_Verifier: Claude (gsd-verifier)_
