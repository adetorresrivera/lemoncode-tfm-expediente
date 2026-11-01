---
phase: 03-autocompletado-con-ia
verified: 2026-11-01T18:30:00Z
status: human_needed
score: 8/8 must-haves verified
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
  - ".planning/phases/03-autocompletado-con-ia/03-10-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-10-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-11-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-11-SUMMARY.md"
  - ".planning/phases/03-autocompletado-con-ia/03-12-PLAN.md"
  - ".planning/phases/03-autocompletado-con-ia/03-12-SUMMARY.md"
  - "apps/api/src/app.ts"
  - "apps/api/src/llm/llm.client.ts"
  - "apps/api/src/llm/ollama.provider.ts"
  - "apps/api/src/llm/openai.provider.ts"
  - "apps/api/src/llm/structured-call.ts"
  - "apps/api/src/offers/extract.pipeline.test.ts"
  - "apps/api/src/offers/extract.routes.ts"
  - "apps/api/src/offers/extract.service.ts"
  - "apps/web/src/pods/application-edit/application-edit.container.tsx"
  - "apps/web/src/pods/application-edit/application-edit.hooks.ts"
  - "apps/web/src/pods/application-edit/application-edit.mapper.ts"
  - "apps/web/src/pods/application-edit/application-edit.vm.ts"
  - "apps/web/src/pods/application-edit/components/offer-panel.tsx"
  - "apps/web/src/pods/application-edit/components/tag-group-input.tsx"
  - "apps/web/src/pods/application-edit/components/tags-section.tsx"
covered_digest: "v4:sha256:f02f7aef9b235ece6f597c3eb0bab779c603b6e38c404060b59935f973395f9d"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6 must-haves verified
  gaps_closed:
    - "G-03-2 (major): programming languages in tag group «language» (plan 03-10)"
    - "G-03-2b (minor): same «Ej.: React» placeholder on all three tag groups (plan 03-11)"
    - "G-03-3 (minor): «Pegar oferta» panel does not fold after a successful analysis (plan 03-12)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Re-run UAT tests 2 and 3 in the browser (real model, then mock). Test 2: analyse the NVIDIA Senior SW & System Architect offer with Ollama gemma4:e2b. Test 3: analyse with LLM_PROVIDER=mock on the create screen and on an edit screen."
    expected: "C, Python, Linux, Docker, Kubernetes and the rest of the stack land in «Stack tecnológico»; only spoken languages with level are in «Idiomas». The three tag inputs show Ej.: React, Ej.: Docker and Ej.: Inglés B2. After a successful analysis that filled something the «Pegar oferta» panel folds, the summary stays announced below it, focus is not lost (it goes to the trigger only if it was lost), and clicking the trigger reopens it with the pasted text."
    why_human: "The three gaps were observed by the user with a real model and a real browser. The code and jsdom/pipeline tests prove each fix, but the real gemma4:e2b answer, Radix collapse animation, focus and the 'is this what I asked for' judgement on the new fold behaviour (G-03-3 is a user-requested behaviour change that reversed D-12) need the user's confirmation."
---

# Phase 3: Autocompletado con IA Verification Report

**Phase Goal:** As a job seeker, I want to paste an offer and get a reviewable draft of the application form, so that I fill an application in seconds without losing anything I already typed.
**Verified:** 2026-11-01
**Status:** human_needed
**Re-verification:** Yes. Regenerates the `gaps_found` report after gap-closure plans 03-10, 03-11 and 03-12.

## Reasoning for the status

All five ROADMAP success criteria and the three UAT gaps (G-03-2, G-03-2b, G-03-3) are closed in the code, wired, and covered by tests that pass at HEAD. Nothing is FAILED, so the status is not `gaps_found`. It is `human_needed` only because the UAT that found the gaps used a real model and a real browser, and the closure of G-03-2 (real-model output) and G-03-3 (new user-requested behaviour) should be confirmed by the same person in the same way. One warning (WR-01) is carried from the code review and does not block.

## Goal Achievement

### Observable Truths (ROADMAP success criteria, contract)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `POST /api/offers/extract` accepts 50-20,000 chars and returns a normalized `OfferExtraction` (trim, empty to null, inverted salary swapped, tags deduped and truncated), never logging the offer text | VERIFIED | `normalizeExtraction` in `apps/api/src/offers/extract.service.ts` (clean, swap, `cutLabel`, `normalizeTags`, final strict `offerExtractionSchema.safeParse`). Only log line is `console.info("offers.extract", { length, durationMs })`. Pipeline and routes tests pass (api 55). |
| 2   | `LLM_PROVIDER` switches ollama/openai/mock with no code change, `/api/health` reports it through `ping()`, mock works offline | VERIFIED | Providers present (`ollama.provider.ts`, `openai.provider.ts`, mock provider); `createLlmClient` selection and `pingLlm` wired in `app.ts` (unchanged since the previous verification, regression tests green). |
| 3   | Timeout answers 504 `LLM_TIMEOUT`; unparseable or schema-invalid output is retried once then 502 `LLM_ERROR`; form shows non-blocking «Analizando la oferta…» or an error and stays editable | VERIFIED | `structured-call.ts` (one budget, one retry); pipeline test "answers 502 LLM_ERROR after one retry" asserts 2 fetch calls; `AnalysisStatus` in `offer-panel.tsx` renders loading/error; web test "keeps the panel open and does not move focus when the analysis fails". |
| 4   | Panel open on create, collapsed on edit; «Autocompletar con IA» fills only empty fields, merges tags without duplicates, persists nothing until save | VERIFIED | Container passes `initialOpen: true` (create, line 62) and `false` (edit, line 129); merge via `mergeExtractionIntoForm` with `dontRunListeners`; no network write in the success path; ai tests "opens the offer panel on create ...", "starts collapsed in edit mode ...". |
| 5   | «IA» mark disappears on edit, empty relevant fields highlighted «Complétalo tú», pasted text stored as `offerText` on save | VERIFIED | `onMerged`/marks lifecycle, `offerText` written to the form only on a successful analysis (hooks.ts), covered by the 03-05, 03-06 and 03-07 test suites (all green). |

### Gap-closure truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| G-03-2 | Programming languages and technologies (C, Python, Java) reach the response in «stack»; only spoken languages with level stay in «language» | VERIFIED | `resolveTagGroup` + `isSpokenLanguageLabel` (NFD, accent strip, whole-word match against `SPOKEN_LANGUAGE_WORDS`) are applied inside `normalizeExtraction` before `normalizeTags`, so dedupe runs after the move. Model-facing alias: `modelOfferExtractionSchema` (`idioma`) is passed as `responseSchema` and consumed by `ollama.provider.ts:19` (`format`) and `openai.provider.ts:21`; the raw parse maps `idioma` back. Pipeline test "moves programming languages the model put in the language group to stack" (service and HTTP route) and "shows the model the provider-facing schema, without the word language" pass. The guard is deterministic, so it holds regardless of which group the real model picks. |
| G-03-2b | Each tag group input shows its own example placeholder | VERIFIED | `tag-group-input.tsx:13` required `placeholder: string`, forwarded at line 103; `tags-section.tsx:42/50/59` set «Ej.: React», «Ej.: Docker», «Ej.: Inglés B2». Test asserts each. 02-UI-SPEC.md line 271 and D-27 amended. |
| G-03-3 | After a successful analysis the panel folds on its own | VERIFIED | `useOfferExtraction` owns `open` (`initialOpen`), calls `setOpen(false)` only when `merge.aiFields.length > 0 \|\| merge.aiTags.length > 0` in the success branch (hooks.ts:383-385); error, cancel, aborted and nothing-new paths never touch it. `OfferPanel` is a controlled `Collapsible`; focus effect on open true to false moves focus to the trigger only if the active element is null/body/disconnected/inside the content; status region is outside `CollapsibleContent`. Tests: create fold, edit fold, focus lost, draft kept on reopen, status kept after fold, failure keeps open and focus. D-12, 03-UI-SPEC, DESIGN.md and AI-05 text amended. |

**Score:** 8/8 truths verified (0 present, behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/api/src/offers/extract.service.ts` | prompt, raw and model-facing schemas, group guard, normalize, service | VERIFIED | Substantive, wired from `extract.routes.ts`/`app.ts`. |
| `apps/api/src/llm/{llm.client,ollama.provider,openai.provider}.ts` | `responseSchema` option honoured by both real providers | VERIFIED | `options?.responseSchema ?? schema` in both. |
| `apps/web/.../components/offer-panel.tsx` | controlled collapsible, status, focus rule | VERIFIED | Wired from container via `OfferPanelModel`. |
| `apps/web/.../application-edit.hooks.ts` | `open` state, fold in success branch | VERIFIED | Container destructures `open`/`setOpen` for create and edit. |
| `apps/web/.../components/tag-group-input.tsx`, `tags-section.tsx` | per-group placeholder | VERIFIED | |
| `docs/AI-EXTRACTION.md`, `03-CONTEXT.md` (D-26, D-27, D-12), `02-UI-SPEC.md`, `03-UI-SPEC.md`, `docs/DESIGN.md` | spec amended with the code | VERIFIED | Prompt line «idioma» and the closed list appear in the doc and in code; the routes test compares prompt and doc. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `createExtractService` | providers | `responseSchema: modelOfferExtractionSchema` | WIRED | extract.service.ts:209 to ollama `format` / openai `json_schema`. |
| model answer | contract | raw parse (accepts `idioma`) to `resolveTagGroup` to strict `offerExtractionSchema` | WIRED | No `idioma` can leave the API (asserted in the route test). |
| `useOfferExtraction` | `OfferPanel` | `open`/`onOpenChange` in `OfferPanelModel` | WIRED | container lines 74-75 and 142-143. |
| `TagsSection` | `TagGroupInput` | `placeholder` prop | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Form fields / tags | `merge.values`, `merge.aiTags` | `extractOffer` (`POST /api/offers/extract`) to LlmClient (mock/ollama/openai) | Yes | FLOWING |
| Panel `open` | `useState(initialOpen)` + success branch | hook | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck all workspaces | `npm run typecheck` | clean | PASS |
| Full test suite (run once) | `npm run test` | api 55 (4 files), contracts 260 (15 files), web 407 (13 files); 0 failed | PASS |
| Lint | `npm run lint` | `eslint . --max-warnings=0` clean | PASS |
| G-03-2 behaviour | pipeline test "moves programming languages ..." (included in the run above) | C, Python, Java to stack; Inglés B2 stays language; through service and HTTP | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared by the phase).

### Requirements Coverage

Every ID in the phase is claimed by at least one PLAN `requirements:` field; there are no orphans.

| Requirement | Source Plans | Status | Evidence |
| ----------- | ------------ | ------ | -------- |
| AI-01 | 03-01, 03-03, 03-08, 03-09, 03-10 | SATISFIED | Route + length validation + normalized response. |
| AI-02 | 03-01, 03-02, 03-09, 03-10 | SATISFIED | Provider switch, `ping()` into health, mock offline. |
| AI-03 | 03-02, 03-03 | SATISFIED | 504 / 502 with one retry (pipeline tests). |
| AI-04 | 03-03, 03-09, 03-10 | SATISFIED | Normalization incl. group guard; length/duration-only log. |
| AI-05 | 03-01, 03-08, 03-12 | SATISFIED | Panel open on create, collapsed on edit, folds after a successful analysis; REQUIREMENTS.md text already says so. |
| AI-06 | 03-01, 03-04, 03-06, 03-11, 03-12 | SATISFIED | Fill-only-empty/IA-marked merge, tag merge, nothing persisted before save. |
| AI-07 | 03-05, 03-06 | SATISFIED | AiMark lifecycle. |
| AI-08 | 03-04, 03-05, 03-12 | SATISFIED | «Complétalo tú» and «Te falta completar» (kept after the fold). |
| AI-09 | 03-07 | SATISFIED | `offerText` stored on save. |

Bookkeeping: the AI-01..AI-09 checkboxes and traceability rows in `.planning/REQUIREMENTS.md` still read `[ ]` / `Pending`. This is a state update for the phase-complete step, not a code gap.

### Anti-Patterns Found

No TBD/FIXME/XXX markers in the files this phase modified. No stubs or hollow props found in the gap-closure artifacts.

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `apps/api/src/offers/extract.service.ts` | 71-129 | WR-01: spoken languages outside `SPOKEN_LANGUAGE_WORDS` (Korean, Hindi, Turkish, Greek, Danish, Finnish, English "bilingual", ...) are demoted to «stack» | Warning | Misgrouped chip the user must move by hand; list is the user-approved closed list of D-26, review disposition still open. Does not defeat the goal (draft stays reviewable). |
| review IN-01..IN-05 | - | Info items (unused exports, redundant focus condition, substring assertion, docs drift, repeated URL trim) | Info | Open, non-blocking. |

### Human Verification Required

### 1. Confirm the three UAT gaps in the browser

**Test:** With Ollama gemma4:e2b, analyse the real NVIDIA Senior SW & System Architect offer on the create screen. Then, with `LLM_PROVIDER=mock`, analyse on create and on edit. Look at the tag inputs and the panel.
**Expected:** C and Python (and Linux, Docker, Kubernetes, ...) appear in «Stack tecnológico», only spoken languages with level in «Idiomas»; the inputs show Ej.: React / Ej.: Docker / Ej.: Inglés B2; the «Pegar oferta» panel folds after the analysis, the summary line stays visible and announced, focus is not stranded, and the trigger reopens the panel with the pasted text.
**Why human:** Real-model output, real-browser collapse and focus, and the user's confirmation of the behaviour change that reversed D-12.

### Gaps Summary

No gaps. The three UAT gaps are closed at code, wiring and test level; the full suite, typecheck and lint pass at HEAD. Open items are one warning (WR-01, list coverage of the closed spoken-language list) and the human confirmation above.

---

_Verified: 2026-11-01T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
