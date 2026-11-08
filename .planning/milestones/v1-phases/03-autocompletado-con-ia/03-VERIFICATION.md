---
phase: 03-autocompletado-con-ia
verified: 2026-11-01T21:00:00Z
status: passed
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
  - "apps/api/src/offers/extract.service.test.ts"
  - "apps/api/src/offers/extract.service.ts"
  - "apps/web/src/common/components/request-status.tsx"
  - "apps/web/src/common/components/tag-chip.tsx"
  - "apps/web/src/pods/application-edit/application-edit.container.tsx"
  - "apps/web/src/pods/application-edit/application-edit.hooks.ts"
  - "apps/web/src/pods/application-edit/application-edit.mapper.ts"
  - "apps/web/src/pods/application-edit/application-edit.vm.ts"
  - "apps/web/src/pods/application-edit/components/field-props.ts"
  - "apps/web/src/pods/application-edit/components/form-field.tsx"
  - "apps/web/src/pods/application-edit/components/offer-panel.tsx"
  - "apps/web/src/pods/application-edit/components/tag-group-input.tsx"
  - "apps/web/src/pods/application-edit/components/tags-section.tsx"
  - "docs/AI-EXTRACTION.md"
  - "docs/DESIGN.md"
covered_digest: "v4:sha256:d225bd2b768c54dc1ae12e0c5f76a36a18f847030177b23069c9b4805031d6ed"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 8/8
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 3: Autocompletado con IA Verification Report

**Phase Goal:** As a job seeker, I want to paste an offer and get a reviewable draft of the application form, so that I fill an application in seconds without losing anything I already typed.
**Verified:** 2026-11-01
**Status:** passed
**Re-verification:** Yes. The previous report (passed after UAT 03-UAT.md, 1/1) went stale when quick task 261101-qh3 (commits 378300b, f90db3e, d9a5584) changed covered files. This report is regenerated against HEAD b5df419 and covers that quick task.

## Reasoning for the status

All five ROADMAP success criteria and the three gap-closure truths hold at HEAD. The quick task changed three things, each re-checked in the code: spoken languages now reach the model through a separate `idiomas` field (the spoken-language guard is kept as backstop), seven lucide icons moved to `strokeWidth={1.5}`, and the missing-field border is `border-brand-gold-ink`. None of them touches the web fold, focus or placeholder behaviour that UAT 03-UAT.md exercised, so those UAT results still stand. The only UAT item the new code could have invalidated is the real-model language grouping; it was re-checked with the real Ollama model (see Behavioral Spot-Checks), so no new human verification is requested. Open items are info-level review findings only.

## Goal Achievement

### Observable Truths (ROADMAP success criteria, contract)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `POST /api/offers/extract` accepts 50-20,000 chars and returns a normalized `OfferExtraction` (trim, empty to null, inverted salary swapped, tags deduped and truncated), never logging the offer text | VERIFIED | `normalizeExtraction` in `apps/api/src/offers/extract.service.ts`: `clean`, salary swap, `cutLabel` (40 units, surrogate-safe), `normalizeTags` (dedupe, blank drop, 20 cap), final strict `offerExtractionSchema.safeParse` (502 on failure). Only log line is `console.info("offers.extract", { length, durationMs })`. Pipeline and routes tests pass. `idiomas` never leaves the API (route test asserts no `idiomas` key in the JSON). |
| 2   | `LLM_PROVIDER` switches ollama/openai/mock with no code change, `/api/health` reports it through `ping()`, mock works offline | VERIFIED | `ollama.provider.ts:19` and `openai.provider.ts:21` honour `options?.responseSchema ?? schema`; `llm.client.ts:15` declares the option. Mock `try-extract` run at HEAD returns the draft offline (Inglés B2 in `language`). The quick task left `apps/api/src/llm` identical to the previous verification (per its SUMMARY and the diff stat: no llm files in `git diff 7e075cc..HEAD`). |
| 3   | Timeout answers 504 `LLM_TIMEOUT`; unparseable or schema-invalid output retried once then 502 `LLM_ERROR`; form shows non-blocking «Analizando la oferta…» or an error and stays editable | VERIFIED | `structured-call.ts` unchanged; pipeline test "answers 502 LLM_ERROR after one retry" green; `AnalysisStatus` in `offer-panel.tsx`/`request-status.tsx` renders loading/error (icon stroke change only). |
| 4   | Panel open on create, collapsed on edit; «Autocompletar con IA» fills only empty fields, merges tags without duplicates, persists nothing until save | VERIFIED | `initialOpen: true` on create and `false` on edit in the container; merge via `mergeExtractionIntoForm`; no write in the success path; ai tests green (web 407). Quick task changed only a `strokeWidth` prop in `offer-panel.tsx`. |
| 5   | «IA» mark disappears on edit, empty relevant fields highlighted «Complétalo tú», pasted text stored as `offerText` on save | VERIFIED | Mark lifecycle and `offerText` logic untouched; highlight class now `border-brand-gold-ink bg-ai-missing-bg` in `field-props.ts:45`, asserted by `form-field.test.tsx` and `application-edit.ai.test.tsx`; token `--color-brand-gold-ink` exists in the theme CSS (light `#7a5410`, dark `#d4b56a`). |

### Gap-closure truths (G-03-2, G-03-2b, G-03-3) and quick-task truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| G-03-2 | Programming languages (C, Python, Java) reach «stack»; only spoken languages with level stay in «language» | VERIFIED | Two layers now. Primary: required model-facing `idiomas` array (`modelOfferExtractionSchema`), entries become trusted `language` tags placed before model tags (`extract.service.ts` `languageTags`, then `normalizeTags([...languageTags, ...modelTags])`). Backstop: `resolveTagGroup` + `isSpokenLanguageLabel` still demote non-spoken labels from `tags` («language» or «idioma») to «stack». Tests: new describe "normalizeExtraction idiomas field (WR-01)" (trusted outside the word list, ordering, backstop, dedupe, absent/null, no `idiomas` key, raw parse) and pipeline test "files the spoken languages the model lists in idiomas under language". All green. |
| G-03-2b | Each tag group input shows its own example placeholder | VERIFIED | `tag-group-input.tsx` takes a required `placeholder`; `tags-section.tsx` sets «Ej.: React», «Ej.: Docker», «Ej.: Inglés B2». Unchanged by the quick task; tests green. |
| G-03-3 | After a successful analysis that filled something the panel folds on its own | VERIFIED | `useOfferExtraction` owns `open`; fold only in the success branch; `OfferPanel` controlled `Collapsible` with focus rule. Unchanged by the quick task except the Sparkles `strokeWidth`; tests green. |
| QH3-a | Spoken languages with a level outside the closed word list (Coreano B1, Hindi) end in «language» | VERIFIED | `idiomas` entries skip `SPOKEN_LANGUAGE_WORDS`. Service test and pipeline test cover it; prompt rule `- idiomas: ...` is the last line of `EXTRACTION_SYSTEM_PROMPT` and matches `docs/AI-EXTRACTION.md` (route test compares prompt and doc verbatim; passes). |
| QH3-b | The phase-03 lucide icons render at `strokeWidth={1.5}` | VERIFIED | `strokeWidth={1.5}` present on every lucide icon of the phase surface: `tag-chip.tsx` (Sparkles, Check, X), `request-status.tsx` (Check, CircleAlert, LoaderCircle), `form-field.tsx` (CircleAlert), `offer-panel.tsx` (ChevronDown, Sparkles); `tag-group-input.tsx` uses no icon. Icons in Phase 2 pods (ArrowLeft, Pencil, RotateCcw, ...) are not part of this phase and stay at default (IN-01, info). |

**Score:** 8/8 truths verified (0 present, behavior-unverified). Counting the five ROADMAP criteria plus G-03-2, G-03-2b, G-03-3; QH3-a/b are supplementary and also verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/api/src/offers/extract.service.ts` | prompt, raw and model-facing schemas, `idiomas`, group guard, normalize, service | VERIFIED | 236 lines, substantive, used by `extract.routes.ts`/`app.ts`. |
| `apps/api/src/llm/{llm.client,ollama.provider,openai.provider}.ts` | `responseSchema` honoured | VERIFIED | Lines cited above. |
| `apps/web/.../components/offer-panel.tsx`, `form-field.tsx`, `field-props.ts` | panel, missing-field highlight | VERIFIED | Wired from the container; gold-ink class applied through `field-props.ts`. |
| `apps/web/src/common/components/{request-status,tag-chip}.tsx` | stroke 1.5 icons | VERIFIED | Used by the panel and the tag inputs. |
| `docs/AI-EXTRACTION.md`, `docs/DESIGN.md` | spec amended with the code | VERIFIED | `idiomas` rule and merge order documented; DESIGN.md line 21 says `border-brand-gold-ink`. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `createExtractService` | providers | `responseSchema: modelOfferExtractionSchema` (includes `idiomas`) | WIRED | `extract.service.ts` call to `llm.extractStructured` to ollama `format` / openai `json_schema`. |
| model answer | contract | raw parse (accepts `idioma` and `idiomas`) to `languageTags`/`resolveTagGroup` to strict `offerExtractionSchema` | WIRED | Output has no `idiomas` key (service and route tests). |
| `useOfferExtraction` | `OfferPanel` | `open`/`onOpenChange` | WIRED | Unchanged. |
| `field-props.ts` | form controls | `className: border-brand-gold-ink bg-ai-missing-bg` when missing | WIRED | Token defined in CSS. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Form fields / tags | `merge.values`, `merge.aiTags` | `POST /api/offers/extract` to LlmClient (mock/ollama/openai) | Yes | FLOWING |
| Tags in «language» | `languageTags` | `raw.idiomas` from the model, merged before `tags` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck all workspaces | `npm run typecheck` | clean | PASS |
| Full test suite (run once) | `npm run test` | api 55 (4 files), contracts 271 (15 files), web 407 (13 files); 0 failed | PASS |
| Lint | `npm run lint` | `eslint . --max-warnings=0` clean | PASS |
| Mock plan B offline | `LLM_PROVIDER=mock npm run try-extract -w @tfm/api` | draft returned, «Inglés B2» in `language`, React/TypeScript/Vite in `stack` | PASS |
| Real model after the `idiomas` change | `LLM_PROVIDER=ollama npm run try-extract -w @tfm/api` (gemma4:e2b, reachable at ollama:11434) | remote-senior 11/12 (73.3 s, cold load), english-nice-to-have 10/13 (14.6 s); «Inglés B2» and «Inglés» in `language`; Java and the rest of the stack in `stack`; same misses (GraphQL, Kubernetes, location) as before the change, so no regression | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared by the phase).

### Requirements Coverage

Every ID in the phase is claimed by at least one PLAN `requirements:` field (03-01 to 03-12); REQUIREMENTS.md maps AI-01..AI-09 to Phase 3 and no other ID; no orphans.

| Requirement | Source Plans | Status | Evidence |
| ----------- | ------------ | ------ | -------- |
| AI-01 | 03-01, 03-03, 03-08, 03-09, 03-10 | SATISFIED | Route, length validation, normalized response. |
| AI-02 | 03-01, 03-02, 03-09, 03-10 | SATISFIED | Provider switch, `ping()` in health, mock offline (run above). |
| AI-03 | 03-02, 03-03 | SATISFIED | 504 / 502 with one retry (pipeline tests). |
| AI-04 | 03-03, 03-09, 03-10 | SATISFIED | Normalization including `idiomas` and group backstop; length/duration-only log. |
| AI-05 | 03-01, 03-08, 03-12 | SATISFIED | Panel open on create, collapsed on edit, folds after a successful analysis; non-blocking status/error. |
| AI-06 | 03-01, 03-04, 03-06, 03-11, 03-12 | SATISFIED | Fill-only-empty / IA-marked merge, tag merge, nothing persisted before save. |
| AI-07 | 03-05, 03-06 | SATISFIED | AiMark lifecycle (Sparkles at stroke 1.5). |
| AI-08 | 03-04, 03-05, 03-12 | SATISFIED | «Complétalo tú» highlight now gold-ink. |
| AI-09 | 03-07 | SATISFIED | `offerText` stored on save. |

The quick task also listed AI-02, AI-04, AI-05, AI-06, AI-08; all remain satisfied.

Bookkeeping: the AI-01..AI-09 checkboxes and traceability rows in `.planning/REQUIREMENTS.md` still read `[ ]` / `Pending`. This is a phase-complete state update, not a code gap.

### Anti-Patterns Found

No TBD/FIXME/XXX markers in the files this phase modified. No stubs, hollow props or empty handlers in the changed artifacts.

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `apps/api/src/offers/extract.service.ts` | ~174-195 | IN-02: `idiomas` entries are trusted, so a technology the model pads into `idiomas` becomes a `language` tag and wins the duplicate over its correct `stack` tag | Info | Deliberate design (documented). Observed with the real model: no padding in the runs above. Optional hardening in 03-REVIEW.md. |
| `apps/api/src/offers/extract.service.ts` | ~62 | IN-03: `MODEL_TAG_GROUPS` still offers `idioma` inside `tags` though the prompt no longer describes it | Info | Backstop covers it; model-facing contract slightly inconsistent. |
| Phase 2 pods (`application-detail`, `filter-panel`, ...) | - | IN-01: lucide icons outside this phase still at default stroke | Info | Out of phase scope; DESIGN.md rule applies repo-wide, to be handled in the polish phase. |
| review IN-04, IN-05 | - | Docs drift, repeated URL trim | Info | Open, non-blocking. |

WR-01 (spoken languages outside the closed list demoted to «stack») from the previous report is fixed by the `idiomas` field; WR-02 is fixed per 03-REVIEW-FIX.md.

### Human Verification Required

None. UAT 03-UAT.md (1/1 pass: stack/idiomas grouping with the real model, per-group placeholders, fold/focus/reopen on create and edit) still holds: the web behaviours it covers are unchanged apart from icon stroke width and a border colour token, and the real-model grouping was re-run at HEAD above and by the quick-task executor (see 261101-qh3-SUMMARY.md).

### Gaps Summary

No gaps. Typecheck, full test suite and lint pass at HEAD. Open items are four info-level review findings (IN-01, IN-02, IN-03, IN-04/IN-05).

---

_Verified: 2026-11-01T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
