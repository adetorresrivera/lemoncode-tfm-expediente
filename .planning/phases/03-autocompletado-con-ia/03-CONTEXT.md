# Phase 3: Autocompletado con IA - Context

**Gathered:** 2026-10-31
**Status:** Ready for planning

<domain>
## Phase Boundary

The user pastes a job offer (50–20,000 characters) into the application form, presses «Autocompletar con IA», and gets a reviewable draft. The API calls a swappable `LlmClient` (`ollama` | `openai` | `mock`, chosen by `LLM_PROVIDER`), validates and normalizes an `OfferExtraction`, and persists nothing. The web pod `application-edit` merges the draft into the form without overwriting user values, marks AI-filled fields with «IA», highlights relevant missing fields with «Complétalo tú», and stores the pasted text as `offerText` when the user saves. Requirements AI-01…AI-09.

**Spec is literal:** `docs/AI-EXTRACTION.md` (contract, providers, system prompt, normalization, errors, tests, fixtures) must be followed to the letter. The decisions below only resolve what that document leaves open. If anything here seems to contradict it, the document wins: stop and ask.

Out of scope: reusing the user's existing tags in the prompt (documented as a "future iteration" in AI-EXTRACTION.md), persisting AI marks, seed loading of fixtures (Phase 6), and the document section of the form (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Locked by the user's brief (restated for the planner)
- **D-01:** `LlmClient` with providers `ollama`, `openai`, `mock` selected by `LLM_PROVIDER`. Native `fetch` only, no provider SDKs. Ollama: `POST {LLM_BASE_URL}/api/chat`, `stream:false`, `options.temperature:0`, `format` = `z.toJSONSchema(offerExtractionSchema)`. OpenAI-compatible: `POST {LLM_BASE_URL}/chat/completions` with `Authorization: Bearer` and `response_format: { type: "json_schema", json_schema: { name, schema } }`. Mock: fixed realistic `OfferExtraction` after 300 ms (already exists). **Amended 2026-11-01 (user, UAT G-03-2; plan 03-10):** the JSON Schema shown to the model (Ollama `format`, OpenAI `response_format`) is the provider-facing `modelOfferExtractionSchema` in `apps/api/src/offers/extract.service.ts`, i.e. the contract schema with the tag group enum ["stack","nice_to_have","idioma"]; the lenient raw parse maps «idioma» back to «language»; the strict `offerExtractionSchema` parse, `tagGroupSchema`, stored data, docs/DOMAIN.md and the web filters keep «language».
- **D-02:** `POST /api/offers/extract` validates `{ text }` with `offerExtractRequestSchema` (50–20,000). Timeout → 504 `LLM_TIMEOUT`. Unparseable or schema-invalid output → one retry → 502 `LLM_ERROR`. The offer text is never logged; only its length and the duration are.
- **D-03:** `/api/health` reports `llm` through `LlmClient.ping()` (the wiring already exists from Phase 1; verify it uses the real client built from config).
- **D-04:** Web `application-edit/api/api.ts` gains `extractOffer(text, signal)`. The mapper `mergeExtractionIntoForm(current, extraction)` returns `{ values, aiFields, missingFields }`. It fills only empty fields (`""`), unions tags without duplicates (case-insensitive), and sets `offerText`. «Missing» means relevant fields still empty after the merge: title, company, workMode, seniority.
- **D-05:** «Pegar oferta» panel per `docs/DESIGN.md`: open in create mode, collapsed in edit mode. Primary button «Autocompletar con IA» with the `Sparkles` icon. Progress text «Analizando la oferta…» in an `aria-live` region. A cancel button aborts the request with an `AbortController`. A friendly error never blocks the form.
- **D-06:** «IA» badge next to the label of each field in `aiFields`. Missing fields get `border-brand-gold`, `bg-ai-missing-bg` and the help text «Complétalo tú».
- **D-07:** 3 fixtures in `apps/api/src/offers/__fixtures__/`, as described in AI-EXTRACTION.md: remote senior with a salary range; on-site junior with no salary; an offer in English with «nice to have».
- **D-08:** Manual test of the 3 fixtures against Ollama `gemma4:e2b`, recording quality and time for each in the SUMMARY. `gemma4:e2b` **is installed** in the devcontainer's Ollama (verified 2026-10-31: 4.6B, Q4_K_M). It reports the `thinking` capability, so the Ollama request must send `think: false` (AI-EXTRACTION.md: «desactivar el modo thinking»).

### Panel in edit mode and re-analysis
- **D-09:** In edit mode the textarea starts **prefilled with the stored `offerText`** (empty if null). The user can re-analyze without pasting again.
- **D-10:** `offerText` is set **only when an analysis succeeds** (the mapper sets it to the analyzed text). Typing in the textarea without analyzing does not change the `offerText` that gets saved. The form VM therefore needs an `offerText` field that is separate from the textarea's draft state, and Phase 2's hand-over applies: add `offerText` to `toEditableFields` and stop sending `offerText: null` from the mapper.
- **D-11:** Analysis can run **any number of times**. Each run merges against the form values at that moment: only still-empty fields are filled, so values the AI filled earlier and the user did not touch are kept. **Marks accumulate**: new `aiFields` are added to the existing ones, and `missingFields` is recalculated after every merge. **Amended 2026-11-01 (user, 03-09 UI review; quick 261101-gpz):** fields and chips still marked «IA» count as empty, so a later analysis replaces them or clears them when the new offer lacks them, and the marks are recomputed from the new result instead of being added to the earlier ones. User-typed or edited values and user tags are still never touched.
- **D-12:** After a successful analysis the panel **stays open**. It announces a short summary in its `aria-live` region (e.g. «Hemos rellenado N campos. Revísalos.»), and focus does not move.

### Mark lifecycle
- **D-13:** The «IA» badge on a field disappears on the **first user change** to that field (any onChange), even if the value ends up the same. A field does not get the badge back until a later analysis fills it again, which only happens if it is empty again.
- **D-14:** Tags added by the AI carry a **per-chip mark**: a `Sparkles` icon of 12–14 px (strokeWidth 1.5) before the label, plus visually hidden text «(propuesta por IA)» for screen readers. This is a new optional variant/prop of `common/components/tag-chip.tsx`; existing variants stay unchanged. Tag-group labels get no «IA» badge.
- **D-15:** A chip's AI mark lasts the whole session, until save or until the chip is removed. A chip removed and then re-added by hand has no mark. The mapper reports AI-added tags as a separate set of tag keys (using `tagKey` from `@tfm/contracts`), returned next to `aiFields`, e.g. `{ values, aiFields, aiTags, missingFields }`. This only adds a property to the D-04 signature and changes none of the others.
- **D-16:** «Complétalo tú» (gold border, missing background) is removed once the field is **no longer empty**. If the user clears it again, the highlight does not come back until the next analysis.
- **D-17:** All marks (`aiFields`, `aiTags`, `missingFields`) are **session state** in the form container or hooks. They are never persisted and never shown on load. They clear after a successful save and survive a failed save. — **Reversibility:** costly — persisting them later would change the application contract in `@tfm/contracts` and the API.

### Errors, progress and cancel
- **D-18:** One message per error code, all in the panel's `aria-live` region, with the button available to try again, and the form always editable:
  - `LLM_TIMEOUT` → «La IA ha tardado demasiado. Inténtalo otra vez o rellena el formulario a mano.»
  - `LLM_ERROR` → «No hemos podido leer la oferta. Inténtalo otra vez o rellena el formulario a mano.»
  - Network or unknown → «No hay conexión con el servidor. Inténtalo otra vez.»
  - `VALIDATION_ERROR` → the length message (see D-19).
  - Cancelled by the user → a neutral note (e.g. «Análisis cancelado.»), not an error.
  Wording follows the DS voice (tuteo, short, no exclamations). The planner/UI-SPEC may polish the copy but must keep one message per case.
- **D-19:** Client-side length handling: helper counter «N / 20.000», `maxLength={20000}` on the textarea, and the button disabled while the trimmed text is shorter than 50 characters, with the help text «Pega al menos 50 caracteres». The 50 and 20,000 limits come from `offerExtractRequestSchema` (or constants exported next to it in contracts) and are not hard-coded again in the web.
- **D-20:** While an analysis is running the form stays fully editable and the textarea is `readOnly`. The merge reads the **current** form values when the response arrives, so anything typed while waiting is respected.
- **D-21:** `LLM_TIMEOUT_MS` (90 s by default) is a **total budget** for the request, covering the first attempt and the retry: a single `AbortSignal.timeout(LLM_TIMEOUT_MS)`, and the retry uses what is left. A timeout is never retried; it answers 504 at once. Only unparseable or schema-invalid output triggers the retry.

### Fixtures and manual test
- **D-22:** Fixture format: one raw `.txt` per offer (easy to paste in the demo and to read from the Phase 6 seed), plus a `.ts` module that exports, per fixture, the **key expected fields** (a partial expectation, not an exact `OfferExtraction`).
- **D-23:** The fixtures are used in **automated tests** with a fake `LlmClient`: the fixture text goes in, the fake LLM output is canned (including dirty values such as untrimmed strings, an inverted salary range and duplicate tags), and the tests check normalization, the limits and the route behavior. The tests never call Ollama; CI uses `LLM_PROVIDER=mock`.
- **D-24:** The manual test runs through a **dev-only script** (e.g. `apps/api/scripts/try-extract.ts`, run with the existing `tsx`, not part of `npm run test` or CI). It posts each fixture to `POST /api/offers/extract` against real Ollama and times each call. The SUMMARY records a table: fixture | time | correct fields / total vs. the `.ts` expectation | notes. One run through the UI afterwards confirms the end-to-end flow.
- **D-25:** If `gemma4:e2b` falls short on quality or time (e.g. > 60 s on CPU), **record it in the SUMMARY, propose an alternative model and ask the user** before changing `LLM_MODEL`. Do not change the model, and do not rewrite the literal system prompt, without approval. **Amended 2026-11-01 (user, UAT G-03-2; plan 03-10):** the user approved changing the language item of the prompt's tags rules to `  - idioma: idiomas con nivel si aparece ("Inglés B2").`, edited in `EXTRACTION_SYSTEM_PROMPT` and docs/AI-EXTRACTION.md together; the approved fingerprint of the «Prompt de sistema» block is now 48ec58d3ef14b9c7dda4e461bca258916ed57ac3941a84d9e821ae6f2dd7f5c9 (replaces 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a); no other prompt wording changes; `LLM_MODEL` stays gemma4:e2b.

### Gap closure decisions (UAT 2026-11-01)
- **D-26:** `normalizeExtraction` keeps tag group «language» only when the label, lower-cased, without accents and compared word by word, names a spoken language from the closed list `SPOKEN_LANGUAGE_WORDS`; otherwise the tag moves to «stack»; deduplication runs after the move; «stack» and «nice_to_have» are not touched; spec line in docs/AI-EXTRACTION.md §Normalización (user decision 2026-11-01, UAT G-03-2, plan 03-10). Later gap plans append to this subsection.

### Claude's Discretion
- Propagating a client cancel to the server: combine the request's abort signal (`c.req.raw.signal`) with the timeout signal (`AbortSignal.any`) so a cancelled request also stops the LLM call, if Hono's Node adapter exposes it reliably. Otherwise the server just finishes and the web ignores the result.
- File layout inside `apps/api/src/offers/` (`extract.service.ts` as the spec names it, plus `offers.routes.ts`, tests), and how the service receives the `LlmClient` (injected through `AppDeps`, like `pingLlm`).
- Order of merged tags: existing tags first, then the new ones in model order.
- Exact names of the VM additions (`offerText`, the textarea draft state) and how the container keeps the mark sets (`useState` with `Set`s, or form meta).
- Whether the panel uses a shadcn `Collapsible` or a native `<details>`, as long as it is keyboard-operable and labelled.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI feature (literal spec)
- `docs/AI-EXTRACTION.md` — flow, contract, `LlmClient` interface, provider request shapes, system prompt (verbatim), normalization rules, error codes, required tests, fixture descriptions. **Follow to the letter.**

### UI
- `docs/DESIGN.md` §Componentes clave — «Marca IA» classes, «Campo que la IA no encontró», «Botón de IA», tag chip variants, voice; §Pantallas (form) — «Pegar oferta» panel placement and states.

### Product, domain, architecture
- `docs/PRODUCT.md` — scope and the demo flow.
- `docs/DOMAIN.md` — enums (workMode, seniority, contractType) and tag groups.
- `docs/ARCHITECTURE.md` — API table (`POST /api/offers/extract`), env vars `LLM_*`, folder structure, error format.
- `.planning/REQUIREMENTS.md` — AI-01…AI-09.
- `.planning/ROADMAP.md` §Phase 3 — success criteria; §Cross-Phase Notes (health `llm` FND-03 → AI-02; fixtures reused by the Phase 6 seed).
- `CLAUDE.md` — pod architecture, DS tokens only, no `any`, no new deps without justification, `<verify>` with `npm run typecheck && npm run test`.

### Prior phase context
- `.planning/phases/02-candidaturas/02-CONTEXT.md` — D-09 (tag normalization lives in contracts), D-12 (pod structure, VM not derived from API model), D-16 (form VM uses empty strings).
- `.planning/STATE.md` — Phase 2 hand-over: «Phase 3 adds `offerText` to `toEditableFields`».

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/llm/llm.client.ts` — `LlmClient` interface and `createLlmClient(config)` already exist and match the spec; `LlmConfig` is a `Pick` of `Config`, and the base URL trailing slash is normalized.
- `apps/api/src/llm/{ollama,openai}.provider.ts` — `ping()` is implemented (2 s timeout); `extractStructured` is a placeholder that throws 502 and must be replaced.
- `apps/api/src/llm/mock.provider.ts` — `MOCK_OFFER_EXTRACTION` with a 300 ms delay, done.
- `apps/api/src/llm/llm.client.test.ts` — existing `fetch` stubbing patterns to extend for request-body tests.
- `packages/contracts/src/offer-extraction.schema.ts` — `offerExtractionSchema`, `offerExtractRequestSchema` (trim, 50–20,000) and their types.
- `packages/contracts/src/tag.normalize.ts` — `normalizeTagLabel`, `tagKey`, `normalizeTags`: reuse them for API tag dedupe and for the web merge (do not duplicate them).
- `apps/api/src/errors.ts` — `ApiError(status, code, message)`; `ErrorCode` from contracts (check that it includes `LLM_TIMEOUT` and `LLM_ERROR`).
- `apps/api/src/config.ts` — `LLM_TIMEOUT_MS` (default 90,000) and per-provider required vars.
- `apps/web/src/core/http/http-client.ts` — already accepts and forwards an `AbortSignal`.
- `apps/web/src/common/components/tag-chip.tsx` — extend it with the AI-mark variant (D-14).
- Theme tokens `--brand-gold`, `--ai-missing-bg` (light/dark) already defined and exposed as `border-brand-gold`, `bg-ai-missing-bg`.

### Established Patterns
- API: route → service → (repository/client), all input validated with contracts schemas, error body `{ error: { code, message, details? } }`, dependencies injected through `AppDeps` in `createApp`.
- Web pod `application-edit`: `api/api.ts`, vm, mapper, hooks, container, component, `components/` (job/conditions/tags/tracking sections, `form-field.tsx`, `field-props.ts`). TanStack Form; VM fields are strings with `""` for empty.
- TDD plans commit RED and GREEN together (the pre-commit hook runs the full suite).

### Integration Points
- `apps/api/src/app.ts` — mount `/api/offers` before `serveStatic`, and inject the `LlmClient` (health already uses `deps.pingLlm`; `main.ts` builds it).
- `application-edit.container.tsx` — both `ApplicationCreate` and `ApplicationEditForm` render the panel (open/collapsed by `mode`), and own the mark state.
- `components/form-field.tsx` — where the «IA» badge and the missing-field styling attach to the label and control.
- `application-edit.mapper.ts:128` — currently sends `offerText: null`; it must send the VM's `offerText`.

</code_context>

<specifics>
## Specific Ideas

- The user asked for the spec to be followed «al pie de la letra»; the system prompt in AI-EXTRACTION.md is verbatim.
- Model: `gemma4:e2b` locally (present). Cloud fallback per the spec: `gemini-2.5-flash-lite` through the OpenAI-compatible endpoint, or Groq. Switching only changes env vars.
- DESIGN.md asks for a single primary action per view, yet it also makes both «Autocompletar con IA» and «Guardar candidatura» primary. The UI-SPEC/planner should settle this, e.g. the AI button is primary inside its panel section and the save button is the form's primary action. Flagged here, not decided.

</specifics>

<deferred>
## Deferred Ideas

- Add the user's existing tags (`GET /api/tags`) to the prompt so their vocabulary is reused. The spec labels this a "future iteration".
- Persist AI marks across sessions (see D-17).
- Load the fixtures into the demo seed: Phase 6 (DEMO-01).

</deferred>

---

*Phase: 03-autocompletado-con-ia*
*Context gathered: 2026-10-31*
