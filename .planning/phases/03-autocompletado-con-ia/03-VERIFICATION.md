---
phase: 03-autocompletado-con-ia
verified: 2026-11-01T15:00:00Z
status: gaps_found
score: 5/6 must-haves verified
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
  - "apps/api/src/offers/extract.pipeline.test.ts"
  - "apps/api/src/offers/extract.routes.ts"
  - "apps/api/src/offers/extract.service.ts"
  - "apps/web/src/pods/application-edit/application-edit.hooks.ts"
  - "apps/web/src/pods/application-edit/application-edit.mapper.ts"
  - "apps/web/src/pods/application-edit/components/offer-panel.tsx"
  - "apps/web/src/pods/application-edit/components/tag-group-input.tsx"
covered_digest: "v4:sha256:76052486b2f29766f74d59a2fac3cf585f9e049c873a519149ad1d9f7ddee130"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5 (1 with override)
  gaps_closed:
    - "WR-01: lenient raw parse, normalize, strict parse. ROADMAP SC1 truncation clause is now observable in the real pipeline; the earlier override is no longer needed and was removed."
    - "WR-02: onError logs a fixed string for SyntaxError (no body fragment)."
    - "Human item 1 (re-analysis in the browser): passed at UAT test 1."
    - "Human item 2 (real model, D-25 prompt): answered without 504/502 at UAT test 2; tag-group quality failed (G-03-2)."
  gaps_remaining:
    - "G-03-2 (major): programming languages land in tag group «language»"
    - "G-03-2b (minor): same «Ej.: React» placeholder on all three tag groups"
    - "G-03-3 (minor, pending user confirmation): «Pegar oferta» panel does not fold after a successful analysis"
  regressions: []
gaps:
  - truth: "AI tag proposals put each tag in the right group: programming languages and technologies (C, Python, Java) in «stack», only spoken languages with level (e.g. Inglés B2) in «language»"
    status: failed
    reason: "User-observed at UAT (2026-11-01, real NVIDIA offer, gemma4:e2b): C and Python came back in group «language». The debug session reproduced it 2/2 with a 'Programming languages: C and Python' offer and 2/2 with the onsite-junior fixture (Java). Root cause: the group value the model must emit is the English word «language» (contracts tagGroupSchema, shown to the model in the Ollama format grammar and the prompt), and normalizeExtraction copies `group: tag.group` unchecked (extract.service.ts:95). The plan's own fixture expectation (03-03: onsite-junior Java in stack) is not met by the real model. Roadmap SC1/SC4 do not name group correctness literally, so this is derived from the goal («reviewable draft») and the phase's own prompt/fixture contract; the draft is reviewable but misgrouped tags make the user fix them by hand."
    artifacts:
      - path: "apps/api/src/offers/extract.service.ts"
        issue: "prompt group lines give no rule against programming languages; normalizeExtraction copies the group unchecked (line 95)"
      - path: "packages/contracts/src/enums.ts"
        issue: "group value 'language' misleads the model (do not rename: stored data, DOMAIN.md, web filters)"
      - path: "docs/AI-EXTRACTION.md"
        issue: "prompt block and Normalización section need the new rule (spec approval needed)"
    missing:
      - "Deterministic guard in normalizeExtraction: keep group «language» only when the label names a spoken language from a closed list, otherwise «stack»"
      - "Optional: show the model «idioma» through the responseSchema option and map back (6/6 correct in probes; needs D-01/D-25 approval)"
      - "Pipeline/fixture test that fails first with C/Python/Java in «language»"
    debug_session: ".planning/debug/ai-tags-programming-languages-in-language-group.md"
  - truth: "Each tag group input shows a placeholder example relevant to that group (Stack «Ej.: React», Se valora «Ej.: Docker», Idiomas «Ej.: Inglés B2»)"
    status: failed
    reason: "Not a roadmap success criterion; UI quality item reported at UAT. tag-group-input.tsx:100 hardcodes placeholder=\"Ej.: React\" with no prop, so all three groups show it. Present since phase 2 (02-UI-SPEC copy), surfaced when AI tags made the groups matter."
    artifacts:
      - path: "apps/web/src/pods/application-edit/components/tag-group-input.tsx"
        issue: "hardcoded placeholder, no prop"
      - path: "apps/web/src/pods/application-edit/components/tags-section.tsx"
        issue: "cannot pass a per-group placeholder"
      - path: "apps/web/src/pods/application-edit/application-edit.test.tsx"
        issue: "line ~778 asserts the shared placeholder"
    missing:
      - "Required placeholder prop on TagGroupInput; per-group copy from TagsSection; update test and 02-UI-SPEC copy"
    debug_session: ".planning/debug/tag-group-placeholder-always-react.md"
  - truth: "After a successful analysis the «Pegar oferta» panel folds on its own so the filled form is in view"
    status: partial
    reason: "New behaviour requested at UAT that reverses D-12 («the panel stays open after success») and 03-UI-SPEC; the current code does what ROADMAP SC4 and D-12 specify (uncontrolled defaultOpen, success path never closes it). Not a defect against the written contract; recorded as an open UAT gap pending the user's confirmation of the reversal."
    artifacts:
      - path: "apps/web/src/pods/application-edit/components/offer-panel.tsx"
        issue: "uncontrolled Collapsible defaultOpen"
      - path: "apps/web/src/pods/application-edit/application-edit.hooks.ts"
        issue: "success branch is where the close belongs; error and cancel must not close"
      - path: "apps/web/src/pods/application-edit/application-edit.container.tsx"
        issue: "hardcoded defaultOpen true/false (lines 65, 123)"
    missing:
      - "Controlled open state owned by useOfferExtraction, collapse on success, focus handling, status region outside CollapsibleContent"
      - "Amend D-12 and 03-UI-SPEC; update the tests that lock the stays-open contract (~12) and add new ones"
    debug_session: ".planning/debug/offer-panel-collapse-after-analysis.md"
---

# Phase 3: Autocompletado con IA Verification Report

**Phase Goal:** As a job seeker, I want to paste an offer and get a reviewable draft of the application form, so that I fill an application in seconds without losing anything I already typed.
**Verified:** 2026-11-01
**Status:** gaps_found
**Re-verification:** Yes. Regenerates the earlier `human_needed` report after review fixes WR-01 / WR-02 and the 2026-11-01 UAT.

## Reasoning for the status

All five ROADMAP success criteria hold in the code, and the review fixes land (details below). The status is nevertheless `gaps_found`, not `passed`, for one reason that counts against the goal and two that are recorded for completeness.

- **G-03-2 counts.** The phase's core value is a draft where the AI proposes the tags. The user, on a real offer, got C and Python in the «language» group. That is reproducible (2/2 and 2/2 in the debug session), has a precise root cause in code that this phase owns (`normalizeExtraction` does not check the group; the prompt gives no rule), and contradicts the phase's own fixture expectation (Java in «stack»). It is a derived must-have (the ROADMAP wording does not say "correct group"), so I record it as a FAILED derived truth, not a roadmap-SC failure. Severity major.
- **G-03-2b does not break any roadmap SC.** It is a copy/UI quality defect inherited from phase 2's UI-SPEC. Recorded as a gap because the UAT recorded it as a user-observed failure and the fix is cheap and belongs with G-03-2 (the per-group example for «language» is «Ej.: Inglés B2», which reinforces what the group means).
- **G-03-3 is not a defect against the written contract.** The code matches D-12 and ROADMAP SC4. It is a requested behaviour change that needs the user's confirmation and a spec amendment first. Recorded as `partial`.

The score (5/6) counts the five ROADMAP truths plus the derived tag-group truth (6th, failed). G-03-2b and G-03-3 are not counted as must-haves because neither is a ROADMAP success criterion or a plan truth.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `POST /api/offers/extract` accepts 50-20,000 chars and returns a normalized `OfferExtraction` (trim, empty to null, swapped salary, tags deduplicated and truncated) without logging the full offer text | VERIFIED (no override needed) | `offerExtractRequestSchema` trim/min 50/max 20000, parsed in `extract.routes.ts`; 256 KiB body limit gives 400 VALIDATION_ERROR. After WR-01 `callStructured` validates with `rawOfferExtractionSchema` (lenient: no maxItems/maxLength, free-form currency, any-length label), then `normalizeExtraction` trims, empties to null, swaps inverted salary, drops non-`[A-Z]{3}` currency, cuts labels to 40 code units, dedupes and caps via `normalizeTags`, then re-parses strictly (`extract.service.ts:80-103`). `extract.pipeline.test.ts` ("truncates, caps and cleans over-long raw output instead of answering 502", run for both ollama and openai providers) asserts 20 tags, labels <= 40, no empty label, dedupe, salary swap, currency null. Re-ran `vitest run src/offers`: 4 files, 65 tests pass. Only log line is `{length, durationMs}`; WR-02 closed (`app.ts:108-112` logs a fixed string for any `SyntaxError`). The «truncated» clause is therefore observable on the real provider-to-service path, so the earlier override (fake-clients-only) is removed. |
| 2 | `LLM_PROVIDER` ollama / openai / mock switches the model without code change, `/api/health` reports it via `ping()`, mock works offline | VERIFIED | `createLlmClient` switch in `llm.client.ts`; real `ollama.provider.ts` and `openai.provider.ts`; `mock.provider.ts` offline; health wired to `llm.ping()`. The pipeline test additionally proves both providers still send the contract JSON Schema (D-01), not the lenient one. UAT 3: the mock plan B autofill works in the compose image. |
| 3 | Timeout gives 504 `LLM_TIMEOUT`; unparseable / schema-invalid output retried once then 502 `LLM_ERROR`; form shows non-blocking «Analizando la oferta…» or a clear error and stays editable | VERIFIED | `structured-call.ts` unchanged by the fixes: one `AbortSignal.timeout` shared by both attempts, `MAX_ATTEMPTS=2`, 504 decided by the timeout signal only, fixed messages. Pipeline test asserts 2 fetch calls for genuinely unusable output (`{ title: 42 }`) then 502. Web states in `offer-panel.tsx` and `application-edit.ai.test.tsx`. UAT 2: the real-model run with the D-25 prompt answered without 504 or 502. |
| 4 | «Pegar oferta» open on create, collapsed on edit; «Autocompletar con IA» fills only empty (or still-«IA») fields, merges tags without duplicates, persists nothing until save | VERIFIED | Container `defaultOpen: true` (create, line 65) / `false` (edit, line 123); `mergeExtractionIntoForm` pure and unit-tested; the extract route has no DB dependency. UAT 1 passed in the browser: second analysis replaces IA-marked fields and chips, user edits and manual tags kept, nothing persisted before «Guardar». Note: the post-success "stays open" behaviour is what D-12 specifies (see G-03-3). |
| 5 | «IA» mark on AI-filled fields disappearing on edit; «Complétalo tú» on empty relevant fields; pasted text stored as `offerText` on save | VERIFIED | `ai-mark.tsx`, `form-field.tsx` «Complétalo tú», `useAiMarks`; `offerText` in contracts, service, repository and `mapFormValuesToApiInput`. Unchanged since the earlier verification; full suite green (55 + 223 + 403 per the orchestrator's regression gate). |
| 6 | (derived from goal and phase contract) AI tag proposals land in the right group: C, Python, Java in «stack»; «language» only for spoken languages with level | FAILED | `normalizeExtraction` copies `group: tag.group` unchecked (`extract.service.ts:95`); the prompt gives no rule against programming languages under «language». UAT 2 and the debug session reproduce the failure with the real model. See G-03-2. |

**Score:** 5/6 truths verified, 0 present-but-behavior-unverified.

### Review fixes re-checked in code

| Fix | Status | Evidence |
|-----|--------|----------|
| WR-01 (104f733) lenient raw parse, normalize, strict parse | VERIFIED | `rawOfferExtractionSchema = offerExtractionSchema.extend({...})` derives from the contract, so new fields are inherited; enums stay strict; `responseSchema: offerExtractionSchema` is what the provider shows the model; pipeline tests cover both providers. |
| WR-02 (a149b27) no body fragment in logs | VERIFIED | `app.ts:108-112` fixed string for `SyntaxError`; route test checks all console methods. |
| Re-review (03-REVIEW.md) | 0 critical, 0 warning, 3 info | IN-01 (symbol currency dropped, not mapped, although the prompt says "€" -> EUR), IN-02 (second hard-coded 40 limit), IN-03 (neutral log label). Open in `03-REVIEW-DISPOSITION.md`; none blocks. |

### Deferred Items

Step 9b: none. Phases 4-7 (rondas, documentos S3, pulido de demo, documentación) do not cover AI tag grouping, tag-input placeholders or panel collapse. Phase 6 («Pulido de demo») is the only plausible home for UI polish, but nothing in its roadmap text names these items, so they are kept as real gaps.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/offers/extract.routes.ts`, `extract.service.ts` | route, prompt, lenient schema, normalization, length-only logging | VERIFIED | Wired in `app.ts`; service imports contracts schema and `normalizeTags` |
| `apps/api/src/llm/{llm.client,ollama.provider,openai.provider,mock.provider,structured-call}.ts` | swappable provider, retry, timeout | VERIFIED | Unchanged by the fixes except `responseSchema` option |
| `packages/contracts/src/offer-extraction.schema.ts` | schema, request schema, limits | VERIFIED | Imported by api and web |
| `apps/web/src/pods/application-edit/*` (mapper, hooks, vm, container, component, `offer-panel`, `form-field`, `tag-group-input`) | panel, merge, marks | VERIFIED for goal; two UI defects (G-03-2b, G-03-3) | Rendered by create/edit containers |
| `apps/web/src/common/components/ai-mark.tsx` | IA badge | VERIFIED | Used in fields and chips |
| `apps/api/src/offers/__fixtures__/*`, `apps/api/src/scripts/try-extract.ts` | three fixtures, dev script | VERIFIED | Fixtures expect Java in «stack»; the real model does not meet that (G-03-2) |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| `offer-panel` onAnalyze -> `useOfferExtraction.analyze` -> POST /api/offers/extract | WIRED |
| route -> `service.extract` -> `llm.extractStructured(prompt, text, rawOfferExtractionSchema, {responseSchema: offerExtractionSchema})` -> `callStructured` -> `normalizeExtraction` -> strict parse | WIRED |
| response -> `mergeExtractionIntoForm` -> form state -> `useAiMarks.setFromMerge` | WIRED |
| field listener -> `onUserChange` -> mark removal | WIRED |
| `main.ts` `llm.ping()` -> `/api/health` | WIRED |
| form save -> `offerText` -> POST/PUT -> repository | WIRED |
| model tag `group` -> `normalizeExtraction` -> draft chips | WIRED but unguarded (G-03-2) |

### Data-Flow Trace (Level 4)

Provider answer -> lenient parse -> `normalizeExtraction` -> merge -> form values -> `mapFormValuesToApiInput` -> API. Real data at every hop (no static fallbacks, no hollow props). The only data-quality issue is the unchecked tag group.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck | `npm run typecheck` | exit 0 | PASS |
| Offers tests incl. both-provider pipeline | `npx vitest run src/offers` in `apps/api` | 4 files, 65 tests passed | PASS |
| Full suite (orchestrator's regression gate, not rerun) | `npm run test` | 55 + 223 + 403 passed | PASS (reported) |
| Placeholder per group | `grep 'Ej.:' tag-group-input.tsx` | single hardcoded `Ej.: React` at line 100 | CONFIRMS G-03-2b |
| Panel collapse after success | `grep defaultOpen` | uncontrolled `defaultOpen`; no close on success | CONFIRMS G-03-3 is unimplemented |
| Group guard in normalizeExtraction | `grep group extract.service.ts` | group copied at line 95, no check | CONFIRMS G-03-2 |

### Probe Execution

Step 7c: SKIPPED. The phase declares no `probe-*.sh`; `scripts/compose-smoke.sh` needs Docker (recorded `SMOKE OK` in 03-09). UAT 3 exercised the compose image with the mock provider.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| AI-01 | 03-01, 03-03, 03-08, 03-09 | SATISFIED | request schema 50-20,000, route, tests, compose 400 probe |
| AI-02 | 03-01, 03-02, 03-09 | SATISFIED | provider switch, `ping()` in health |
| AI-03 | 03-02, 03-03 | SATISFIED | `structured-call.ts`, pipeline test (2 sends then 502) |
| AI-04 | 03-03, 03-09 | SATISFIED (now fully: WR-01 makes the truncate/cap observable; WR-02 closed) | `normalizeExtraction`, length-only log, fixed SyntaxError log |
| AI-05 | 03-01, 03-08 | SATISFIED | panel open/collapsed, analyse action, wait and error states |
| AI-06 | 03-01, 03-04, 03-06 | SATISFIED | merge rules, UAT 1 passed in browser |
| AI-07 | 03-05, 03-06 | SATISFIED | IA mark lifecycle |
| AI-08 | 03-04, 03-05 | SATISFIED | «Complétalo tú» |
| AI-09 | 03-07 | SATISFIED | `offerText` end to end |

All nine IDs appear in PLAN frontmatter and in REQUIREMENTS.md (lines 42-50, traceability rows 143-151); no ORPHANED requirement. The REQUIREMENTS.md checkboxes and traceability rows still read Pending; flip them on phase completion. No requirement text specifies tag-group correctness, so G-03-2 is recorded against the goal and the phase's prompt/fixture contract, not against a requirement ID (closest: AI-04 / AI-06 draft quality).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/src/offers/extract.service.ts` | 95 | model `group` copied without validation | Blocker for derived truth 6 (G-03-2) | Programming languages shown as «language» tags |
| `apps/web/src/pods/application-edit/components/tag-group-input.tsx` | 100 | hardcoded placeholder | Warning (G-03-2b) | Same example on all groups |
| `apps/api/src/offers/extract.service.ts` | 56-60 | symbol currency dropped, not mapped | Info (IN-01) | Salary survives without currency |
| `apps/api/src/offers/extract.service.ts` | 33 | duplicate 40 limit | Info (IN-02) | Drift risk |
| debt markers (TBD/FIXME/XXX) | n/a | none found | n/a | n/a |

### Human Verification Required

None blocking. The earlier items are resolved by UAT: re-analysis in the browser passed (test 1), the real-model run answered without 504/502 (test 2, quality aside), and the mock plan B autofill works in the compose image (test 3). One small residue from the old item 3 was not explicitly confirmed by the user: that in edit mode the panel is collapsed with `offerText` prefilled and no marks on load. It is covered by component tests (container `defaultOpen: false`, 03-07 prefill tests); a glance during the next browser session is enough.

### Gaps Summary

Three open gaps, all from UAT, with debug sessions and root causes recorded:

1. **G-03-2 (major, FAILED derived truth).** Group «language» is hijacked by programming languages. The cheapest robust fix is deterministic: in `normalizeExtraction`, keep «language» only for labels naming a spoken language from a closed list, otherwise reclassify as «stack»; add the matching rule line to the prompt and `docs/AI-EXTRACTION.md` (needs spec approval per the repo rules and D-25), plus a failing-first pipeline test with C/Python/Java. Optionally show the model «idioma» through `responseSchema` and map back (D-01/D-25 approval).
2. **G-03-2b (minor).** Per-group placeholder prop (`Ej.: React` / `Ej.: Docker` / `Ej.: Inglés B2`), test and 02-UI-SPEC copy update. Natural to bundle with G-03-2.
3. **G-03-3 (minor, requested change).** Collapse the panel after success. Needs the user's confirmation first because it reverses D-12 and the UI-SPEC; then controlled open state, focus handling, and about 12 test updates. If the user declines, close it as `wontfix` and the phase has no UI gap.

Suggested route: `/gsd-plan-phase 03 --gaps` for G-03-2 and G-03-2b now (small, API plus one prop), and decide G-03-3 before planning. After the fixes, a re-verification should flip truth 6 to VERIFIED and move the status to `passed`.

---

_Verified: 2026-11-01_
_Verifier: Claude (gsd-verifier)_
