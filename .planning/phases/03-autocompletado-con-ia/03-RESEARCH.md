# Phase 3: Autocompletado con IA - Research

**Researched:** 2026-10-31
**Domain:** LLM structured extraction behind a Hono endpoint (swappable `LlmClient`: Ollama / OpenAI-compatible / mock) + TanStack Form merge/marks UI in the `application-edit` pod
**Confidence:** HIGH for the code seams and the Ollama behaviour (read and run in this session); MEDIUM for the OpenAI-compatible/cloud path (no live key, one forum report of flaky schema adherence on Gemini's compat layer)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Spec is literal:** `docs/AI-EXTRACTION.md` (contract, providers, system prompt, normalization, errors, tests, fixtures) must be followed to the letter. The decisions below only resolve what that document leaves open. If anything here seems to contradict it, the document wins: stop and ask.

Out of scope: reusing the user's existing tags in the prompt (documented as a "future iteration" in AI-EXTRACTION.md), persisting AI marks, seed loading of fixtures (Phase 6), and the document section of the form (Phase 5).

**Locked by the user's brief (restated for the planner)**
- **D-01:** `LlmClient` with providers `ollama`, `openai`, `mock` selected by `LLM_PROVIDER`. Native `fetch` only, no provider SDKs. Ollama: `POST {LLM_BASE_URL}/api/chat`, `stream:false`, `options.temperature:0`, `format` = `z.toJSONSchema(offerExtractionSchema)`. OpenAI-compatible: `POST {LLM_BASE_URL}/chat/completions` with `Authorization: Bearer` and `response_format: { type: "json_schema", json_schema: { name, schema } }`. Mock: fixed realistic `OfferExtraction` after 300 ms (already exists).
- **D-02:** `POST /api/offers/extract` validates `{ text }` with `offerExtractRequestSchema` (50–20,000). Timeout → 504 `LLM_TIMEOUT`. Unparseable or schema-invalid output → one retry → 502 `LLM_ERROR`. The offer text is never logged; only its length and the duration are.
- **D-03:** `/api/health` reports `llm` through `LlmClient.ping()` (the wiring already exists from Phase 1; verify it uses the real client built from config).
- **D-04:** Web `application-edit/api/api.ts` gains `extractOffer(text, signal)`. The mapper `mergeExtractionIntoForm(current, extraction)` returns `{ values, aiFields, missingFields }`. It fills only empty fields (`""`), unions tags without duplicates (case-insensitive), and sets `offerText`. «Missing» means relevant fields still empty after the merge: title, company, workMode, seniority.
- **D-05:** «Pegar oferta» panel per `docs/DESIGN.md`: open in create mode, collapsed in edit mode. Primary button «Autocompletar con IA» with the `Sparkles` icon. Progress text «Analizando la oferta…» in an `aria-live` region. A cancel button aborts the request with an `AbortController`. A friendly error never blocks the form.
- **D-06:** «IA» badge next to the label of each field in `aiFields`. Missing fields get `border-brand-gold`, `bg-ai-missing-bg` and the help text «Complétalo tú».
- **D-07:** 3 fixtures in `apps/api/src/offers/__fixtures__/`, as described in AI-EXTRACTION.md: remote senior with a salary range; on-site junior with no salary; an offer in English with «nice to have».
- **D-08:** Manual test of the 3 fixtures against Ollama `gemma4:e2b`, recording quality and time for each in the SUMMARY. `gemma4:e2b` **is installed** in the devcontainer's Ollama (verified 2026-10-31: 4.6B, Q4_K_M). It reports the `thinking` capability, so the Ollama request must send `think: false` (AI-EXTRACTION.md: «desactivar el modo thinking»).

**Panel in edit mode and re-analysis**
- **D-09:** In edit mode the textarea starts **prefilled with the stored `offerText`** (empty if null). The user can re-analyze without pasting again.
- **D-10:** `offerText` is set **only when an analysis succeeds** (the mapper sets it to the analyzed text). Typing in the textarea without analyzing does not change the `offerText` that gets saved. The form VM therefore needs an `offerText` field that is separate from the textarea's draft state, and Phase 2's hand-over applies: add `offerText` to `toEditableFields` and stop sending `offerText: null` from the mapper.
- **D-11:** Analysis can run **any number of times**. Each run merges against the form values at that moment: only still-empty fields are filled, so values the AI filled earlier and the user did not touch are kept. **Marks accumulate**: new `aiFields` are added to the existing ones, and `missingFields` is recalculated after every merge.
- **D-12:** After a successful analysis the panel **stays open**. It announces a short summary in its `aria-live` region (e.g. «Hemos rellenado N campos. Revísalos.»), and focus does not move.

**Mark lifecycle**
- **D-13:** The «IA» badge on a field disappears on the **first user change** to that field (any onChange), even if the value ends up the same. A field does not get the badge back until a later analysis fills it again, which only happens if it is empty again.
- **D-14:** Tags added by the AI carry a **per-chip mark**: a `Sparkles` icon of 12–14 px (strokeWidth 1.5) before the label, plus visually hidden text «(propuesta por IA)» for screen readers. This is a new optional variant/prop of `common/components/tag-chip.tsx`; existing variants stay unchanged. Tag-group labels get no «IA» badge.
- **D-15:** A chip's AI mark lasts the whole session, until save or until the chip is removed. A chip removed and then re-added by hand has no mark. The mapper reports AI-added tags as a separate set of tag keys (using `tagKey` from `@tfm/contracts`), returned next to `aiFields`, e.g. `{ values, aiFields, aiTags, missingFields }`. This only adds a property to the D-04 signature and changes none of the others.
- **D-16:** «Complétalo tú» (gold border, missing background) is removed once the field is **no longer empty**. If the user clears it again, the highlight does not come back until the next analysis.
- **D-17:** All marks (`aiFields`, `aiTags`, `missingFields`) are **session state** in the form container or hooks. They are never persisted and never shown on load. They clear after a successful save and survive a failed save. — **Reversibility:** costly — persisting them later would change the application contract in `@tfm/contracts` and the API.

**Errors, progress and cancel**
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

**Fixtures and manual test**
- **D-22:** Fixture format: one raw `.txt` per offer (easy to paste in the demo and to read from the Phase 6 seed), plus a `.ts` module that exports, per fixture, the **key expected fields** (a partial expectation, not an exact `OfferExtraction`).
- **D-23:** The fixtures are used in **automated tests** with a fake `LlmClient`: the fixture text goes in, the fake LLM output is canned (including dirty values such as untrimmed strings, an inverted salary range and duplicate tags), and the tests check normalization, the limits and the route behavior. The tests never call Ollama; CI uses `LLM_PROVIDER=mock`.
- **D-24:** The manual test runs through a **dev-only script** (e.g. `apps/api/scripts/try-extract.ts`, run with the existing `tsx`, not part of `npm run test` or CI). It posts each fixture to `POST /api/offers/extract` against real Ollama and times each call. The SUMMARY records a table: fixture | time | correct fields / total vs. the `.ts` expectation | notes. One run through the UI afterwards confirms the end-to-end flow.
- **D-25:** If `gemma4:e2b` falls short on quality or time (e.g. > 60 s on CPU), **record it in the SUMMARY, propose an alternative model and ask the user** before changing `LLM_MODEL`. Do not change the model, and do not rewrite the literal system prompt, without approval.

### Claude's Discretion
- Propagating a client cancel to the server: combine the request's abort signal (`c.req.raw.signal`) with the timeout signal (`AbortSignal.any`) so a cancelled request also stops the LLM call, if Hono's Node adapter exposes it reliably. Otherwise the server just finishes and the web ignores the result.
- File layout inside `apps/api/src/offers/` (`extract.service.ts` as the spec names it, plus `offers.routes.ts`, tests), and how the service receives the `LlmClient` (injected through `AppDeps`, like `pingLlm`).
- Order of merged tags: existing tags first, then the new ones in model order.
- Exact names of the VM additions (`offerText`, the textarea draft state) and how the container keeps the mark sets (`useState` with `Set`s, or form meta).
- Whether the panel uses a shadcn `Collapsible` or a native `<details>`, as long as it is keyboard-operable and labelled. (UI-SPEC already resolved this: use `Collapsible`.)

### Deferred Ideas (OUT OF SCOPE)
- Add the user's existing tags (`GET /api/tags`) to the prompt so their vocabulary is reused. The spec labels this a "future iteration".
- Persist AI marks across sessions (see D-17).
- Load the fixtures into the demo seed: Phase 6 (DEMO-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | `POST /api/offers/extract { text }` validates 50–20,000 chars and returns an `OfferExtraction` | New `offers` route + service, mounted in `createApp` behind an optional `deps.llm`; `offerExtractRequestSchema` already exists (see Standard Stack, Pattern 1) |
| AI-02 | `LlmClient` swappable by `LLM_PROVIDER`; `ping()` feeds `/api/health` | Factory and pings already exist and `main.ts` already wires `pingLlm: () => llm.ping()`; only `extractStructured` of ollama/openai is a placeholder. Request shapes verified against a live Ollama 0.40.13 (Pattern 2) |
| AI-03 | 504 `LLM_TIMEOUT` after `LLM_TIMEOUT_MS`; 502 `LLM_ERROR` after one retry on unparseable/schema-invalid output | Shared `callStructured` helper owning the single total-budget signal and the 2-attempt loop (Pattern 3); pitfalls on abort reasons and `JSON.parse` messages |
| AI-04 | API normalizes the draft and never logs the offer text | `normalizeExtraction` in `extract.service.ts` reusing `normalizeTags`; logging rules (Pitfalls 4, 5) |
| AI-05 | «Pegar oferta» panel with «Autocompletar con IA» and a non-blocking «Analizando la oferta…» / error state | `OfferPanel` + `useOfferExtraction` hook (Patterns 5, 6); UI-SPEC is approved and authoritative for layout/copy |
| AI-06 | Applying a draft fills only empty fields, merges tags, persists nothing until save | `mergeExtractionIntoForm` pure mapper + `form.setFieldValue(..., { dontRunListeners: true })` (Pattern 4) |
| AI-07 | AI-filled fields show «IA», which disappears when the user edits | Form-level `listeners.onChange` clears the mark; programmatic merge skips listeners (verified, Pattern 5) |
| AI-08 | Relevant empty fields highlighted «Complétalo tú» | `missingFields` from the mapper + `FormField` styling (UI-SPEC §Missing-field treatment) |
| AI-09 | Pasted text stored as `offerText` on save | `offerText` joins `ApplicationFormValues`; API `toEditableFields`/`updateEditable` must start writing it (Pitfall 3) |
</phase_requirements>

## Summary

The groundwork is mostly in place. `createLlmClient`, the mock provider, both `ping()`s, the config (`LLM_TIMEOUT_MS`), `ApiError`, the contracts schemas, `tagKey`/`normalizeTags`, the web `request()` with `AbortSignal` support, the theme tokens and the Collapsible/Textarea components already exist. What is missing is: the real `extractStructured` of the Ollama and OpenAI providers (both are placeholders that throw 502), the `offers` route and service, the `offerText` round trip (VM, mapper, API PUT), and the whole web panel/merge/marks layer. No new dependency is needed anywhere.

Three findings matter more than the rest because they change what a plan must contain, and all three were measured on the devcontainer's live Ollama 0.40.13 with `gemma4:e2b` this session. (1) Ollama loads the model with `context_length: 4096`; a 17.7k-character offer needed 3,995 prompt tokens and the generation stopped after 98 tokens (the room left), so the JSON would be truncated and fail parsing. The request needs `options.num_ctx` (8192 worked: 49 s for 17.7k chars). (2) With the **verbatim** system prompt, the model returned the tag labels `"stack"`, `"nice_to_have"`, `"language"` (the enum names) instead of technologies, and once `company: null` although the company is in the text; adding one extra rule to the prompt fixed both. D-25 forbids changing the prompt without approval, so this is an escalation for the user, not something to decide in the plan. (3) The spec says "validate with Zod, then normalize (truncate tags to 40 chars, max 20)", but `offerExtractionSchema` already rejects labels over 40 characters and more than 20 tags, so that truncation can never run on real model output: an over-long label would trigger the retry and then a 502.

On the web side, TanStack Form 1.33.5 already provides what the mark lifecycle needs: a form-level `listeners.onChange` that fires on user edits (`field.handleChange`) but not on `form.setFieldValue(..., { dontRunListeners: true })`; verified headlessly. That lets one hook clear «IA»/«Complétalo tú» marks centrally without touching each field's `onChange`. Phase 2's `PUT` ignores `offerText` today and an existing API test asserts that; both must change together.

**Primary recommendation:** Implement one shared `callStructured` helper (total-budget signal, 2 attempts, error mapping) used by the Ollama and OpenAI providers; keep the service as `prompt + normalize`; send `think:false` and `num_ctx` to Ollama; do the web merge as a pure mapper and clear marks through a form-level `listeners.onChange`; and put the three spec/data contradictions (prompt quality, 40/20 truncation, interface signal param) in front of the user before execution.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Length validation (50–20,000) | API / Backend | Browser / Client | The API is the authority (`offerExtractRequestSchema`); the browser mirrors it for UX using constants exported from contracts (D-19) |
| LLM call, provider switch, timeout, retry | API / Backend | — | Secrets (`LLM_API_KEY`) and the model endpoint stay server-side; browser never talks to the LLM |
| Output validation + normalization (trim, null, salary swap, tag dedupe/truncate) | API / Backend | — | AI-04; single source of truth before the draft reaches any client |
| Health `llm` probe | API / Backend | — | `ping()` already feeds `/api/health` |
| Merge of draft into form (fill-only-empty, tag union) | Browser / Client | — | The draft is never persisted (AI-06); the merge needs the live form values (D-20) |
| AI marks («IA», «Complétalo tú», chip mark) | Browser / Client | — | Session state only (D-17) |
| Persisting `offerText` | API / Backend | Database / Storage | Written by `PUT`/`POST /api/applications` when the user saves (AI-09) |
| Fixture offers | API (test assets) | Database (Phase 6 seed) | Live next to the extraction module; Phase 6 reads the `.txt` files |

## Standard Stack

No new packages. Everything below is already installed (versions read from `node_modules` this session).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.6.7 | Request/response schemas, `z.toJSONSchema` for the model's `format` / `response_format` | Project contract source of truth (`apps/api/package.json`: `"zod": "4.6.7"`) |
| hono | 4.13.13 | Route, `hono/body-limit` middleware (built in, no new dependency) | Existing API framework |
| @hono/node-server | 2.1.5 | Exposes `c.req.raw.signal`, aborted on client disconnect | Source-verified (Pitfall 6) |
| @tanstack/react-form | 1.33.5 | Form state, `listeners.onChange`, `setFieldValue` options | Added in Phase 2 |
| lucide-react | (installed; UI-SPEC lists 1.57.0) | `Sparkles`, `ChevronDown` | Existing icon library |
| radix-ui (Collapsible) | 1.8.1 | Panel toggle (`common/components/ui/collapsible.tsx`) | Already installed shadcn component |
| vitest | 5.0.4 | API (node) and web (jsdom) tests | Existing |
| @testing-library/react / user-event | 16.3.3 / 14.6.8 | Panel and merge UI tests | Existing |
| tsx | 4.23.15 | Dev-only manual test script (D-24) | Existing devDependency of `@tfm/api` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` | `ollama` / `openai` SDKs | Locked out by D-01 (and CLAUDE.md: no new deps) |
| Form-level `listeners.onChange` to clear marks | Editing every field's `onChange` | Touches ~12 controls and is easy to miss one; the listener is one place |
| Shared `callStructured` helper | Duplicating the loop in each provider | Duplicates the subtle timeout/retry rules in two files |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed in this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 Browser (application-edit pod)                     API (Hono)                              LLM
 ─────────────────────────────                      ──────────                              ───
 «Pegar oferta» textarea (draft state)
   │ click «Autocompletar con IA» (>=50 trimmed)
   ▼
 useOfferExtraction ──AbortController──► POST /api/offers/extract {text}
   status: analysing                      │ requireJson, bodyLimit
                                          │ offerExtractRequestSchema.parse  ──400 VALIDATION_ERROR
                                          ▼
                                    extract.service
                                          │ log {length, durationMs} only
                                          ▼
                                    LlmClient.extractStructured(PROMPT, text, offerExtractionSchema, {signal: c.req.raw.signal})
                                          │
                                    callStructured: total = AbortSignal.timeout(LLM_TIMEOUT_MS)
                                          │   combined = AbortSignal.any([total, clientSignal])
                                          ├─ attempt 1 ─ fetch ─────────────────────────────────► ollama /api/chat (format, think:false, num_ctx)
                                          │                                                       openai /chat/completions (json_schema)
                                          │   ◄── content string                                  mock (300 ms, no network)
                                          │   JSON.parse → schema.safeParse
                                          │      ok ───────────────────────────────┐
                                          │      invalid/unparseable ─► attempt 2   │
                                          │      invalid again ─► 502 LLM_ERROR      │
                                          │   timeout.aborted ─► 504 LLM_TIMEOUT     │
                                          ▼                                          │
                                    normalizeExtraction (trim, ""→null, swap salary, ◄┘
                                          tags: truncate 40, dedupe, max 20)
                                          ▼
 ◄──────────── 200 OfferExtraction ───────┘
   │ response parsed with offerExtractionSchema (request())
   ▼
 mergeExtractionIntoForm(form.state.values /* NOW */, extraction, text)
   → { values, aiFields, aiTags, missingFields }
   │ apply only changed keys with form.setFieldValue(k, v, { dontRunListeners: true })
   ▼
 marks state (+= aiFields/aiTags, = missingFields) ──► FormField «IA» badge / «Complétalo tú» / TagChip sparkles
   │ user edits a field ─► form listeners.onChange ─► clear that field's marks
   ▼
 Save ─► POST/PUT /api/applications { ..., offerText } ─► Mongo        (marks dropped on success)
```

### Recommended Project Structure

File names follow `docs/ARCHITECTURE.md` (see Open Question 4 for where CONTEXT/UI-SPEC suggested other names).

```
packages/contracts/src/
└── offer-extraction.schema.ts        # + exported OFFER_TEXT_MIN / OFFER_TEXT_MAX constants (D-19)

apps/api/src/
├── llm/
│   ├── llm.client.ts                 # extractStructured gains optional 4th param { signal }
│   ├── structured-call.ts            # NEW shared: total-budget signal, 2 attempts, error mapping
│   ├── ollama.provider.ts            # real extractStructured
│   ├── openai.provider.ts            # real extractStructured
│   └── mock.provider.ts              # unchanged (honour signal optionally)
├── offers/
│   ├── extract.routes.ts             # POST /extract
│   ├── extract.service.ts            # EXTRACTION_SYSTEM_PROMPT (verbatim) + normalizeExtraction + extract()
│   ├── extract.service.test.ts
│   ├── extract.routes.test.ts
│   └── __fixtures__/
│       ├── remote-senior.txt         # names are suggestions
│       ├── onsite-junior.txt
│       ├── english-nice-to-have.txt
│       └── fixtures.ts               # key expected fields per fixture (partial)
├── scripts/try-extract.ts            # dev-only (D-24); under src/ so it is typechecked and linted
└── app.ts                            # AppDeps.llm?: LlmClient; mount /api/offers

apps/web/src/
├── common/components/
│   ├── ai-mark.tsx                   # «IA» badge (ARCHITECTURE.md name; UI-SPEC called it ai-badge.tsx)
│   └── tag-chip.tsx                  # + optional `aiSuggested` prop
└── pods/application-edit/
    ├── api/api.ts                    # + extractOffer(text, signal)
    ├── application-edit.vm.ts        # + offerText on ApplicationFormValues; mark/status types
    ├── application-edit.mapper.ts    # + mergeExtractionIntoForm; offerText round trip
    ├── application-edit.hooks.ts     # + marks state + form listener + useOfferExtraction
    ├── application-edit.container.tsx
    ├── application-edit.component.tsx
    └── components/offer-panel.tsx, form-field.tsx (+badge/missing), sections (+marks prop)
```

### Pattern 1: Route and service (API)

**What:** The same shape as `applicationsRoutes`: no try/catch, no logging in the route, errors bubble to `app.onError`. Mount only when an `llm` dependency is provided, so existing `createApp({ ping* })` tests keep working.
**Verified current seams:** `AppDeps` is `pingMongo/pingS3/pingLlm/webDistDir?/db?/now?` and routes are mounted inside `if (deps.db) {...}` before `serveStatic` [VERIFIED: apps/api/src/app.ts:14-21, 62-72]. `requireJson` rejects non-JSON POSTs [VERIFIED: apps/api/src/http/require-json.ts].
**Example:**
```typescript
// apps/api/src/offers/extract.routes.ts  (sketch)
import { offerExtractRequestSchema } from "@tfm/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { requireJson } from "../http/require-json.js";
import type { ExtractService } from "./extract.service.js";

export function offersRoutes(service: ExtractService): Hono {
  const routes = new Hono();
  routes.use("*", requireJson);
  // 20,000 chars can be 80 KB of UTF-8 plus JSON escaping; 256 KB is generous and still bounded.
  routes.use("*", bodyLimit({ maxSize: 256 * 1024 }));
  routes.post("/extract", async (c) => {
    const { text } = offerExtractRequestSchema.parse(await c.req.json());
    return c.json(await service.extract(text, { signal: c.req.raw.signal }));
  });
  return routes;
}
```
`bodyLimit` default `onError` answers a bare 413 text body, not the project error shape: pass `onError` that throws an `ApiError` (or reuse `VALIDATION_ERROR` 400) so the `{ error: { code, message } }` contract holds. [ASSUMED: bodyLimit option names `maxSize`/`onError` from Hono docs knowledge; confirm in `node_modules/hono/dist/middleware/body-limit` when implementing.]

### Pattern 2: Provider request shapes

**Ollama** (verified against live Ollama 0.40.13, `gemma4:e2b`, this session): `POST {base}/api/chat`, body
`{ model, stream:false, think:false, options:{ temperature:0, num_ctx:8192 }, format: z.toJSONSchema(schema), messages:[{role:"system",...},{role:"user",...}] }`. The answer is `{ message:{ role, content }, done, done_reason, total_duration, prompt_eval_count, eval_count }`; `content` is the JSON string. With `think:false` no `thinking` field is returned. The `$schema` key that `z.toJSONSchema` emits is accepted by Ollama (it was sent in the live call). [VERIFIED: live curl, request/response observed]

`z.toJSONSchema(offerExtractionSchema)` produces (abridged, run in this session): `"$schema": "https://json-schema.org/draft/2020-12/schema"`, nullable strings as `"type": ["string","null"]`, nullable enums as `anyOf:[{type:"string",enum:[...]},{type:"null"}]`, `salaryMin`: `anyOf:[{"type":"number","minimum":0},{"type":"null"}]`, `currency`: `minLength:3,maxLength:3`, `tags`: `"maxItems": 20` with items `label: minLength:1, maxLength:40`, `"required"` listing all 10 keys and `"additionalProperties": false`. [VERIFIED: ran `z.toJSONSchema(offerExtractionSchema)` in apps/api]

**OpenAI-compatible:** `POST {base}/chat/completions`, headers `Authorization: Bearer ${LLM_API_KEY}` + `content-type: application/json`, body `{ model, temperature:0, messages:[system,user], response_format:{ type:"json_schema", json_schema:{ name:"offer_extraction", strict:true, schema } } }`; answer text at `choices[0].message.content` (may be `null` on a refusal: treat as unparseable). The spec lists only `{ name, schema }`; `strict: true` is an addition (Open Question 3). [CITED: OpenAI Structured Outputs convention; not exercised live, no key] The schema output already meets strict mode's structural rules (all keys required, `additionalProperties:false`) [VERIFIED: schema output above]; whether a given vendor accepts `minLength/maxLength/minimum` in strict mode is unconfirmed. [ASSUMED]

### Pattern 3: Shared `callStructured` (total budget, one retry)

**What:** One function owns D-21. The provider supplies only "send the request and give me the model's text".
**Why a signal parameter:** the spec's `extractStructured(system, input, schema)` has no way to receive the client's abort. Adding an optional fourth parameter `options?: { signal?: AbortSignal }` is backwards compatible with the fake clients the spec requires (a 3-arg fake still satisfies the interface).
```typescript
// apps/api/src/llm/structured-call.ts  (sketch)
import type { z } from "zod";
import { ApiError } from "../errors.js";

export async function callStructured<T>(args: {
  timeoutMs: number;
  signal?: AbortSignal;                       // client cancel (optional)
  schema: z.ZodType<T>;
  send: (signal: AbortSignal) => Promise<string>; // fetch + read body text INSIDE, same signal
}): Promise<T> {
  const timeout = AbortSignal.timeout(args.timeoutMs);          // single total budget
  const signal = args.signal ? AbortSignal.any([timeout, args.signal]) : timeout;
  for (let attempt = 0; attempt < 2; attempt++) {
    let content: string;
    try {
      content = await args.send(signal);
    } catch {
      // Decide by the signal, never by error.name (Pitfall 6).
      if (timeout.aborted) throw new ApiError(504, "LLM_TIMEOUT", "La IA ha tardado demasiado");
      throw new ApiError(502, "LLM_ERROR", "El modelo no está disponible"); // network, non-2xx, client abort
    }
    const parsed = parseJsonObject(content);        // try/catch around JSON.parse; message discarded
    const result = parsed === undefined ? undefined : args.schema.safeParse(parsed);
    if (result?.success) return result.data;
    // unparseable or schema-invalid: loop once more
  }
  throw new ApiError(502, "LLM_ERROR", "La respuesta del modelo no es válida");
}
```
A timeout while a retry is pending needs no extra code: `fetch` with an already-aborted signal rejects immediately, so the retry "uses what is left" and a spent budget becomes a 504. A transport failure or non-2xx is **not** retried (D-21 limits retry to unparseable/invalid output).

### Pattern 4: Pure merge mapper (web)

**What:** `mergeExtractionIntoForm(current, extraction, offerText)` is a pure function in `application-edit.mapper.ts`, returning `{ values, aiFields, aiTags, missingFields }`. Note the third argument: D-04 lists `(current, extraction)` but the function must set `offerText` to the analyzed text, which it cannot know otherwise (Open Question 5).
**Rules (all from D-04/D-11/UI-SPEC):**
- A string/enum field is fillable when `current[k].trim() === ""` and the extraction value is non-null (the spec says `""`; treating whitespace-only as empty is the safe reading, see Open Question 7).
- `salaryMin`/`salaryMax`: `String(n)` into empty fields. Guard: skip a fill that would produce `min > max` against a value the user kept (Pitfall 9).
- `currency` (default `"EUR"` in `EMPTY_FORM_VALUES`): fillable only when both salary fields are empty (UI-SPEC row "currency default", user decision).
- Tags: `normalizeTags([...current.tags, ...extraction.tags])` (contracts; first spelling wins, order kept, cap 20); `aiTags` = `tagKey` of result tags whose key is not among the current tags' keys.
- `missingFields` = of `["title","company","workMode","seniority"]` those still empty **after** the merge. Recomputed every run; it replaces, not accumulates (D-11).
- `aiFields` = only the fields filled **by this run**; the hook unions them into session state.

### Pattern 5: Mark lifecycle through TanStack Form listeners

**Verified (headless `FormApi`/`FieldApi` from `@tanstack/form-core`, this session):** a form-level `listeners.onChange({ formApi, fieldApi })` fires on `field.handleChange` and on `form.setFieldValue` without options; it does **not** fire on `form.setFieldValue(name, value, { dontRunListeners: true })`; and `setFieldValue("offerText", ...)` works for a key that has no mounted `form.Field`. Output observed: `{ a: 'x', offerText: 'hello', tags: [] } []` after two `dontRunListeners` writes, then `[ 'a' ]` after `a.handleChange("y")`. [VERIFIED: ran a script against @tanstack/form-core in apps/web]
**Recommendation:** in `useApplicationForm` pass `listeners: { onChange: ({ fieldApi }) => ... }`:
- clear `fieldApi.name` from `aiFields` (D-13: any user change, even to the same value);
- remove it from `missingFields` only when the new value is non-empty (D-16);
- for `tags`, prune `aiTags` to the `tagKey`s still present (D-15: a chip removed and re-added by hand has no mark, because the mark was pruned at removal).
The merge applies values with `dontRunListeners: true` so it does not clear its own marks.
Keep `useApplicationForm`'s options/return additive: `application-edit.test.tsx` imports it directly (`const { form } = useApplicationForm({...})` at line ~708).

### Pattern 6: Panel state machine

`useOfferExtraction({ form, initialOfferText, marks })` owns: `draft` (textarea text, container/hook state per UI-SPEC), `status` (`idle | analysing | success{summary} | error{code} | cancelled`), a ref to the in-flight `AbortController`, `analyze()`, `cancel()`. On unmount abort silently. On response: read `form.state.values` **at that moment** (D-20), run the pure merge, apply the changed keys, update marks, set the success message. Distinguish a user abort from an error with `controller.signal.aborted` (the web `request()` rethrows the browser's `AbortError`; [VERIFIED: apps/web/src/core/http/http-client.ts `isAbortError` rethrow]). Map `HttpError.code` to the four D-18 messages (`LLM_TIMEOUT`, `LLM_ERROR`, `VALIDATION_ERROR`, anything else including `NETWORK_ERROR`/`INVALID_RESPONSE`).

### Anti-Patterns to Avoid
- **Decide timeout vs client abort by `error.name`:** the Node adapter aborts with a *string* reason (Pitfall 6). Use `timeout.aborted`.
- **Put `offerText` in the textarea state that is saved:** D-10 requires a separate VM field set only on success.
- **Call `field.handleChange` for the merge:** it fires the listener and would clear the marks you just set.
- **Re-parse model output with `JSON.parse` and rethrow:** the `SyntaxError` message embeds a snippet of the content (Pitfall 5).
- **Return `{ error: ... }` from the provider and map later:** throw `ApiError` at the source so `app.onError` handles it uniformly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tag dedupe/normalize/cap | A new dedupe | `normalizeTags`, `tagKey`, `normalizeTagLabel` from `@tfm/contracts` | Already the project standard (CONTEXT canonical refs); tested [VERIFIED: packages/contracts/src/tag.normalize.ts] |
| JSON Schema for the model | A hand-written schema | `z.toJSONSchema(offerExtractionSchema)` | Zod 4 built in; output verified above |
| Combined abort signals | Manual listeners | `AbortSignal.timeout` + `AbortSignal.any` (Node 22) | Native; matches D-21 and the existing `ping()` style |
| Request body size cap | Reading the stream by hand | `hono/body-limit` | Part of the existing Hono dependency |
| Error response shape | Ad-hoc `c.json({error})` | Throw `ApiError(status, code, message)` | Single `app.onError` mapping |
| HTTP client / abort on the web | A new fetch wrapper | `request()` in `core/http/http-client.ts` | Already forwards `signal`, parses the error contract |
| Collapsible panel | A custom disclosure | shadcn `Collapsible` (already installed) | `aria-expanded`/`aria-controls` for free (UI-SPEC) |
| Counter formatting | Manual thousand separators | `Intl.NumberFormat("es-ES")` — note: es-ES omits the separator for 4-digit numbers (`1234`) | UI-SPEC requires the separator always (e.g. «1.234 / 20.000»): use `useGrouping: "always"` [ASSUMED: option value, verify in a unit test] |

**Key insight:** the risky parts are not the HTTP calls; they are the three-way interplay of the total timeout budget, retry and abort reasons on the server, and "programmatic write vs user edit" on the form. Both have a single clean seam (`callStructured`, `dontRunListeners`).

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted.

## Common Pitfalls

### Pitfall 1: Ollama's 4,096-token context silently truncates the answer
**What goes wrong:** A long offer produces truncated JSON, fails parsing, is retried (same result) and ends as 502 `LLM_ERROR`.
**Why it happens:** `/api/ps` reports `"context_length":4096` for the loaded model. With a 17,681-character offer the run reported `prompt_tokens 3995` and `eval 98` (4096 − 3995 = 101 left) and the output was cut. With `options.num_ctx: 8192` the same request returned complete JSON with tags (`eval 202`, 48.9 s). [VERIFIED: live /api/chat and /api/ps runs, this session]
**How to avoid:** send `options: { temperature: 0, num_ctx: 8192 }` for Ollama. A 20,000-character Spanish offer is roughly 4.5–5k tokens; 8192 leaves room for the system prompt and the answer. This is an addition to the spec's `options.temperature:0` (Open Question 2).
**Warning signs:** `done_reason: "length"`; `eval_count` ≈ `num_ctx − prompt_eval_count`.

### Pitfall 2: Total budget vs retry on a CPU model
**What goes wrong:** One 20k-character attempt takes ~50–55 s on this machine (10 cores, CPU only), so a retry cannot complete inside the 90 s total budget; a schema-invalid first answer on a long offer ends as 504 rather than 502.
**Why it happens:** D-21 makes `LLM_TIMEOUT_MS` the budget for both attempts.
**How to avoid:** Accept it (it is the locked decision) and make the retry path testable with short `LLM_TIMEOUT_MS`. Record observed times per fixture in the SUMMARY (D-24).
**Warning signs:** manual test of a long fixture > 60 s (D-25 trigger).

### Pitfall 3: `PUT` ignores `offerText` today, and a test asserts it
**What goes wrong:** If only the web changes, editing and saving never persists `offerText`; if the API is changed without updating the old test, the suite fails.
**Why it happens:** `toEditableFields` copies a fixed list that excludes `offerText`, and its comment says Phase 3 must add it [VERIFIED: apps/api/src/applications/applications.service.ts:30-33 "Phase 3 (offerText) and Phase 5 (cvDocumentId, coverLetterDocumentId) must add their field here / and make the form always send it, otherwise a save would wipe it."]. `updateEditable` `$set`s a fixed list without `offerText` [VERIFIED: apps/api/src/applications/applications.repository.ts:160-175]. The test `"keeps offerText and the document links, whether the body omits them, sends null or sends other values"` expects `offerText` to stay `"texto"` after PUTs with other values [VERIFIED: apps/api/src/applications/applications.update.test.ts:212-252].
**How to avoid:** Plan one API task that (a) adds `offerText` to `EditableFields`, `toEditableFields` and the `$set`, (b) rewrites that test to keep only the **document links** assertions and add `offerText` write/clear behaviour. The web must always send the loaded `offerText` (VM field initialised from the application), otherwise a PUT with `null` would now **wipe** it.
**Warning signs:** `application-edit.mapper.ts:128` still `offerText: null`.

### Pitfall 4: Logging the offer text by accident
**What goes wrong:** Offer text (personal data, long) appears in logs.
**Why it happens:** `app.onError` logs `err.message` for every error [VERIFIED: apps/api/src/app.ts "console.error(err.message);"]; any `Error` whose message embeds input or model output leaks it.
**How to avoid:** Throw only `ApiError`s with fixed messages from the LLM path; log a single line in the service with `{ length, durationMs }` (and status); never log the model output either. Add a test that spies on `console.log/info/warn/error` and asserts no argument contains a sentinel string from the posted text, on the success path and on 400/502/504.

### Pitfall 5: `JSON.parse` / provider errors carry content
**What goes wrong:** Node's `SyntaxError` message includes a snippet of the parsed string, which may contain the offer text echoed by the model. Ollama/OpenAI error bodies can echo parts of the request.
**How to avoid:** `try { JSON.parse } catch { return undefined }` and discard the error; map non-2xx to a fixed `ApiError` message and never include the upstream body or the `Authorization` header (the existing test already checks the key is absent from the error message [VERIFIED: apps/api/src/llm/llm.client.test.ts "without the key"]).

### Pitfall 6: Abort reasons are not always `AbortError`
**What goes wrong:** Mapping by `err.name === "TimeoutError"` misclassifies a client cancel or misses a timeout.
**Why it happens:** `@hono/node-server` 2.1.5 aborts `c.req.raw.signal` with a **string** reason: `req[abortRequest]("Client connection prematurely closed.")` when the response was not finished [VERIFIED: node_modules/@hono/node-server/dist/index.mjs:846-851], so `fetch` rejects with that string. `AbortSignal.timeout` aborts with a `TimeoutError` DOMException.
**How to avoid:** Check `timeout.aborted` (the signal you created), not the error shape. This also confirms the Claude's-Discretion item: `c.req.raw.signal` **is** exposed and aborts on disconnect in this adapter version, so propagating the cancel is viable. The adapter also logs `The user aborted a request.` via `console.info` on `ERR_STREAM_PREMATURE_CLOSE` [VERIFIED: same file :867]; harmless but noisy in tests.

### Pitfall 7: Model quality with the verbatim prompt (escalation, not a plan decision)
**What goes wrong:** With the **literal** AI-EXTRACTION.md system prompt and a short realistic offer, `gemma4:e2b` returned `tags: [{label:"stack",group:"stack"},{label:"nice_to_have",...},{label:"language",...}]` (group names as labels) on two runs, and `company: null` on the first run although "Lumen Analytics busca…" opens the text. With the same prompt plus two extra lines, the output was correct: `React, TypeScript, Vite, Vitest, AWS (stack); Testing Library, GraphQL (nice_to_have); Inglés B2 (language)` and `company: "Lumen Analytics"` (9.6 s warm). The extra lines were: `- label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.` and `- company: la empresa que publica la oferta.` [VERIFIED: live runs a.json/b.json, this session]
**Why it matters:** D-25 forbids changing the prompt or the model without the user's approval; AC "tags proposed" would visibly fail in the demo. Temperature 0 was not fully deterministic across a cold and a warm run (company differed).
**How to avoid:** Implement the verbatim prompt, run the D-24 manual test, and put the evidence above to the user as a decision (Open Question 1). Do not silently "improve" the prompt.

### Pitfall 8: Spec order makes the tag truncation unreachable
**What goes wrong:** AI-EXTRACTION.md says "validate with Zod, then normalize: trim tags to 40 characters, max 20", but the schema handed to the provider rejects labels > 40 and arrays > 20 (`tagSchema.label: .max(40)`, `tags: .max(MAX_TAGS)`) [VERIFIED: packages/contracts/src/tag.schema.ts "label: z.string().trim().min(1).max(40)"; offer-extraction.schema.ts "tags: z.array(tagSchema).max(MAX_TAGS)"]. Real model output with a 41-char label fails validation → retry → 502, and the normalization's truncation never runs. With a *fake* `LlmClient` (D-23) it does run, which is the only place the spec's test would see it.
**How to avoid:** Implement `normalizeExtraction` to truncate and cap anyway (needed for the fake-client tests and for defence), but flag to the user that real over-long output fails instead of being truncated (Open Question 6). A lenient intermediate schema would change the JSON Schema sent to the model, which D-01 pins to `offerExtractionSchema`.

### Pitfall 9: Salary pair can become inverted by a partial fill
**What goes wrong:** The user typed `salaryMin = 60000`; the AI proposes 45000–55000; filling only the empty `salaryMax` yields min 60000 > max 55000 and the form shows «El máximo no puede ser menor que el mínimo.» right after an "AI fill".
**How to avoid:** In the merge, skip filling a salary field when it would invert the pair against a value kept from the user. This still honours "fills only empty fields" (it fills fewer). Cover with a mapper test.

### Pitfall 10: `currency` rule and a currency without salary
**What goes wrong:** UI-SPEC says `currency` is fillable when both salary fields are empty. If the model returns `currency: "EUR"` with no salaries, the form gets an «IA» badge on «Moneda» although there is no salary, and the success count includes it.
**How to avoid:** Fill `currency` only when the extraction also supplies at least one salary value (or when a salary ends up filled). This is a narrowing of the UI-SPEC rule: put it in the Open Questions for confirmation rather than silently diverging.

### Pitfall 11: `LLM_TIMEOUT_MS` above undici's header timeout
**What goes wrong:** Node's `fetch` (undici) has a default `headersTimeout` of 300 s; Ollama non-streaming sends headers only when generation completes. A `LLM_TIMEOUT_MS` > 300000 would fail as a generic fetch error (502) instead of 504. [ASSUMED: undici default; irrelevant at the 90 s default]
**How to avoid:** Note only; no code.

### Pitfall 12: Machine memory is tight
**What goes wrong:** `free -m` showed 7,359 of 7,934 MB used with Ollama loaded; a cold model load took 10 s of an 18.5 s first call. A second heavy process (Mongo tests, typecheck) can slow or evict the model. [VERIFIED: free -m and the first-call timing, this session]
**How to avoid:** Run the manual D-24 test with nothing else heavy running; expect a cold first call (~+10 s). `keep_alive` is not in the spec and is not needed.

## Code Examples

### Normalization (API)
```typescript
// Source: docs/AI-EXTRACTION.md §Normalización en la API + contracts tag helpers
import { normalizeTagLabel, normalizeTags, offerExtractionSchema, type OfferExtraction } from "@tfm/contracts";

const clean = (value: string | null): string | null => {
  const t = value?.trim() ?? "";
  return t === "" ? null : t;
};

export function normalizeExtraction(raw: OfferExtraction): OfferExtraction {
  let { salaryMin, salaryMax } = raw;
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }
  const tags = normalizeTags(
    raw.tags.map((tag) => ({
      label: normalizeTagLabel(tag.label).slice(0, 40).trim(), // truncate BEFORE dedupe/cap
      group: tag.group,
    })),
  );
  return offerExtractionSchema.parse({ // final guard: the result always honours the contract
    title: clean(raw.title), company: clean(raw.company), location: clean(raw.location),
    workMode: raw.workMode, seniority: raw.seniority, contractType: raw.contractType,
    salaryMin, salaryMax, currency: clean(raw.currency), tags,
  });
}
```
`normalizeTags` already drops empty labels, dedupes across groups (first spelling and group win), keeps order and caps at `MAX_TAGS` [VERIFIED: packages/contracts/src/tag.normalize.ts:13-31, "duplicates merged across all groups (the first spelling and its group win), original order kept, at most MAX_TAGS"]. Uppercasing `currency` is not in the spec; the application schema does `.toUpperCase()` on save, so it is optional (Open Question 7).

### Ollama provider body
```typescript
// Source: live-verified request shape (this session) + D-01/D-08
const body = {
  model: config.LLM_MODEL,
  stream: false,
  think: false,
  options: { temperature: 0, num_ctx: 8192 },
  format: z.toJSONSchema(schema),
  messages: [
    { role: "system", content: system },
    { role: "user", content: input },
  ],
};
// send(signal): fetch(`${baseUrl}/api/chat`, { method:"POST", headers:{ "content-type":"application/json" },
//   body: JSON.stringify(body), signal }) -> if !res.ok throw -> (await res.json()).message.content
```

### Web: applying a merge without firing the mark listener
```typescript
// Source: verified headless against @tanstack/form-core 1.33.5
const current = form.state.values;                      // NOW, not at click time (D-20)
const { values, aiFields, aiTags, missingFields } = mergeExtractionIntoForm(current, extraction, text);
for (const key of Object.keys(values) as FormFieldName[]) {
  if (values[key] !== current[key]) {                   // tags: compare by reference/length
    form.setFieldValue(key, values[key], { dontRunListeners: true });
  }
}
```
Type note: `setFieldValue` is generic over the key; an index loop over `keyof` needs a typed helper or per-key calls to stay free of `any`.

### Extract API on the web
```typescript
// apps/web/src/pods/application-edit/api/api.ts  (sketch; own copy per "a pod never imports another pod")
import { offerExtractionSchema, type OfferExtraction } from "@tfm/contracts";
export const extractOffer = (text: string, signal?: AbortSignal): Promise<OfferExtraction> =>
  request("/api/offers/extract", offerExtractionSchema, { method: "POST", body: { text }, signal });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| "JSON mode" + prompt asking for JSON | Constrained decoding with a JSON Schema (`format` / `response_format.json_schema`) | Ollama structured outputs; OpenAI Structured Outputs | The schema constrains syntax, **not** semantics (Pitfall 7: schema-valid but wrong labels) |
| Reasoning models emit `<think>` in content | `think:false` request flag on Ollama | current Ollama | Required for `gemma4:e2b` which lists the `thinking` capability [VERIFIED: /api/tags `"capabilities":[..."thinking"]`] |

**Deprecated/outdated:** none relevant.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenAI-compatible vendors accept `strict: true` and `minLength/maxLength/minimum` in the schema | Pattern 2 | Cloud fallback returns 400/502 until `strict` is dropped or the schema simplified; local path unaffected |
| A2 | `hono/body-limit` option names (`maxSize`, `onError`) | Pattern 1 | Compile error caught by typecheck; trivial to adjust |
| A3 | `Intl.NumberFormat("es-ES", { useGrouping: "always" })` yields «1.234» | Don't Hand-Roll | Counter shows «1234»; caught by a unit test |
| A4 | undici default `headersTimeout` of 300 s | Pitfall 11 | Only matters if `LLM_TIMEOUT_MS` > 300000 |
| A5 | `temperature: 0` is accepted by the user's chosen OpenAI-compatible model (reasoning models such as `gpt-5`/o-series reject it) | Pattern 2 | Cloud fallback errors out; drop the field |
| A6 | Gemini's OpenAI-compatible layer honours `response_format: json_schema` reliably | Pattern 2 | A forum report says it ignored the schema intermittently; our own validate + retry covers it, but quality of the cloud plan B is unproven |

## Open Questions

1. **System prompt vs `gemma4:e2b` quality (needs the user, per D-25).**
   - What we know: verbatim prompt → tag labels equal to group names on 2/2 runs and a missed company on 1/2; +2 rule lines → correct on the 1 run tried (see Pitfall 7).
   - What's unclear: whether the three real fixtures behave like the toy offer; whether the user accepts adding rules to the "literal" prompt, changing model, or accepting the weak tags.
   - Recommendation: build the literal prompt first, run D-24, and bring the table plus the Pitfall 7 evidence to the user. Candidate fixes in order of cost: add the two lines (prompt change), a different local model (e.g. a 4B instruction model), cloud `gemini-2.5-flash-lite`.

2. **`options.num_ctx` is outside the literal spec.** The spec says `options.temperature:0` only. Without `num_ctx` the long-offer case is broken on this Ollama (Pitfall 1). Recommendation: add `num_ctx: 8192` and record it in the SUMMARY as a spec addition; ask for approval together with Q1 since both touch the Ollama request/prompt contract.

3. **`strict: true` on the OpenAI request.** Spec: `json_schema: { name, schema }`. `strict: true` makes constrained decoding actually apply on OpenAI. Recommendation: include it (validate + retry covers failures); drop it if a vendor rejects it.

4. **File names: docs vs CONTEXT/UI-SPEC.** ARCHITECTURE.md names `offers/extract.routes.ts`, `common/components/ai-mark.tsx`, and `scripts/seed.ts` under `apps/api/src/`; CONTEXT/UI-SPEC suggest `offers.routes.ts`, `ai-badge.tsx` and `apps/api/scripts/try-extract.ts` (marked "e.g."/"suggestions"). Recommendation: follow the docs (`extract.routes.ts`, `ai-mark.tsx`, `apps/api/src/scripts/try-extract.ts`; the last gets typechecked and linted for free since `tsconfig.json` includes only `src`). CLAUDE.md says contradictions with docs/ must be flagged; these are naming-only, so the planner may proceed with the docs' names unless the user objects.

5. **D-04 signature.** `mergeExtractionIntoForm(current, extraction)` cannot "set `offerText`" without the analyzed text. Recommendation: add a third parameter `text` (or have the hook set `offerText` right after the merge). Flag in the plan.

6. **Spec order vs tag truncation (Pitfall 8).** Real over-long labels/arrays → retry → 502, not truncation. Recommendation: implement truncation in the normalizer for the fake-client tests as the spec requires, document the real-model behaviour in the SUMMARY, and only if the manual test shows it happening consider a lenient schema (needs user approval because it changes the schema sent to the model).

7. **Small, low-risk normalization/merge choices** (discretion): treat whitespace-only form values as empty; uppercase `currency` in the API normalizer; narrow the currency rule when there is no salary (Pitfall 10). Recommend all three; mention in the plan so they are visible.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v22.23.4 (`AbortSignal.any/timeout` available) | — |
| npm | workspaces | ✓ | 10.9.9 | — |
| Ollama | D-24 manual test, health | ✓ | 0.40.13 at `$LLM_BASE_URL` (`http://ollama:11434`) | `LLM_PROVIDER=mock` |
| Model `gemma4:e2b` | D-08 | ✓ | 4.6B Q4_K_M, capabilities completion/vision/audio/tools/thinking, default `context_length` 4096 | alternative model needs user approval (D-25) |
| MongoDB | API integration tests of applications (PUT `offerText`) | ✓ (`MONGO_URL=mongodb://mongo:27017/tfm`, tests use `tfm_test`) | — | — |
| Cloud LLM key | OpenAI-path manual check | ✗ | — | Cover with mocked `fetch` tests only |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** cloud key (tests use mocked `fetch`).

Measured on this machine (10 cores, no GPU, ~8 GB RAM nearly full): first call 18.5 s (10 s model load), warm short offer 5.5–9.6 s, 17.7k-character offer 36.9 s (truncated output) / 48.9 s (complete, `num_ctx` 8192). [VERIFIED: live runs, this session]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 (+ Testing Library 16.3.3, user-event 14.6.8, jsdom for web) |
| Config file | `apps/api/vitest.config.ts` (node, `@tfm/source` conditions, `fileParallelism: false`); `apps/web/vitest.config.ts` (jsdom, `src/test/setup.ts`); contracts uses defaults |
| Quick run command | API: `npm run test -w @tfm/api -- src/llm src/offers`; web: `npm run test -w @tfm/web -- src/pods/application-edit src/common`; contracts: `npm run test -w @tfm/contracts` |
| Full suite command | `npm run typecheck && npm run test` (then `npm run lint`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | 400 on <50 / >20,000 (trimmed) chars, 400 on non-JSON, 200 + `OfferExtraction` shape; error body `{error:{code,message}}` | API route (Hono `app.request`, fake `LlmClient`) | `npm run test -w @tfm/api -- src/offers/extract.routes.test.ts` | ❌ Wave 0 |
| AI-02 | each provider sends the right body (`format`+`think:false`+`options.temperature:0`; `response_format.json_schema`+Bearer), parses the answer; `createLlmClient` picks by `LLM_PROVIDER`; mock valid offline; `/api/health` `llm` from `ping()` | API unit, `fetch` stubbed (pattern in `llm.client.test.ts`) | `npm run test -w @tfm/api -- src/llm` | ✅ extend `llm.client.test.ts` |
| AI-03 | timeout → 504 `LLM_TIMEOUT` (short `LLM_TIMEOUT_MS`, stub `fetch` that rejects on abort); invalid JSON then valid → success after 1 retry; invalid twice → 502 `LLM_ERROR`; timeout never retried; client abort stops the call | API unit | same | ❌ Wave 0 |
| AI-04 | dirty canned output (untrimmed strings, `""`, inverted salary, duplicate tags, >40-char label, >20 tags) → normalized; sentinel text never appears in any console call (success, 400, 502, 504) | API unit + route | `npm run test -w @tfm/api -- src/offers` | ❌ Wave 0 |
| AI-05 | panel open on create / collapsed on edit; button `aria-disabled` under 50 trimmed chars; «Analizando la oferta…» appears, form stays editable, textarea `readOnly`; one message per error code; cancel aborts and returns focus | web component (mock fetch with a deferred response) | `npm run test -w @tfm/web -- src/pods/application-edit` | ❌ Wave 0 (extend `application-edit.test.tsx`) |
| AI-06 | merge fills only empty fields, never overwrites user values, unions tags case-insensitively, applies values typed during the wait, nothing sent to the API until save | mapper unit + component | same | ❌ Wave 0 |
| AI-07 | «IA» badge appears on filled fields, disappears on first change (even same value), chip mark lasts until removal, re-added chip has no mark | component | same | ❌ Wave 0 |
| AI-08 | `missingFields` = still-empty title/company/workMode/seniority; gold classes + «Complétalo tú»; removed when filled, not restored when cleared; validation error wins | mapper unit + component | same | ❌ Wave 0 |
| AI-09 | analyzed text is the saved `offerText` (POST and PUT); typing without analyzing does not change it; stored `offerText` round-trips on edit; API PUT now persists `offerText` | mapper unit + API integration on `tfm_test` | `npm run test -w @tfm/api -- src/applications/applications.update.test.ts` + web | ❌ rewrite existing test (Pitfall 3) |

### Sampling Rate
- **Per task commit:** the touched workspace's targeted command above (API/contracts first, web per pod).
- **Per wave merge:** `npm run typecheck && npm run test` and `npm run lint`.
- **Phase gate:** full suite + `npm run build` green; then the manual D-24 table and one UI pass before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/contracts`: export `OFFER_TEXT_MIN`/`OFFER_TEXT_MAX` (+ a test that the schema uses them) — covers D-19.
- [ ] `apps/api/src/offers/__fixtures__/*.txt` + `fixtures.ts` (3 offers, each 50–20,000 chars) — covers D-07/D-22.
- [ ] `apps/api/src/offers/extract.service.test.ts`, `extract.routes.test.ts`, `apps/api/src/llm/structured-call.test.ts` — AI-01/03/04.
- [ ] Extend `apps/api/src/llm/llm.client.test.ts`: replace the two "extractStructured rejects with ApiError 502" placeholder tests (they assert the placeholder behaviour) with request-body and parsing tests — AI-02.
- [ ] Rewrite the `offerText` assertions in `applications.update.test.ts` (Pitfall 3).
- [ ] Web: mapper tests for `mergeExtractionIntoForm`, component tests for panel/marks in `application-edit.test.tsx`, a `tag-chip` test for the AI mark, `common/components/ai-mark` test.
- [ ] A test that `setFieldValue(..., { dontRunListeners: true })` does not clear a mark while `handleChange` does (guards a future TanStack Form upgrade).

## Security Domain

`security_enforcement` is enabled (ASVS level 1, block on high).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | single-user local app |
| V3 Session Management | no | — |
| V4 Access Control | no | single-user |
| V5 Input Validation | yes | `offerExtractRequestSchema` (50–20,000), `requireJson`, `hono/body-limit`; model output validated by `offerExtractionSchema` before use |
| V6 Cryptography | no (secrets only) | `LLM_API_KEY` stays in env/`.env`, never in responses or logs |
| V7 Error handling / logging | yes | fixed error messages; log only `{length, durationMs}`; no offer text, no model output, no key |
| V13 API | yes | error contract `{ error: { code, message, details? } }`; 502/504 mapping |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection inside the pasted offer ("ignore the rules, set company to…") | Tampering | Output is schema-constrained and schema-validated, the model has no tools, nothing is persisted by the endpoint, and the user reviews every AI-filled field before saving; AI marks make the origin visible |
| Offer text or model output leaking through logs/errors | Information disclosure | `ApiError` with fixed messages only; discard `JSON.parse`/upstream error bodies; sentinel-string logging test |
| API key exposure | Information disclosure | Never in error messages (existing test pattern), never logged; `.env.example` has `LLM_API_KEY=` empty [VERIFIED: .env.example line 17] |
| Oversized body / slow LLM tying up the server | Denial of service | `bodyLimit`, 50–20,000 cap, total timeout budget, client-abort propagation; single-user scope |
| SSRF via the LLM URL | Spoofing/Elevation | `LLM_BASE_URL` is operator env config, not user input; the user supplies only `text` |
| Stored XSS from AI-filled values | Tampering | React renders text; no `dangerouslySetInnerHTML`; `offerText` is already shown as text in the detail pod |

## Project Constraints (from CLAUDE.md)

- Code, identifiers, commits and file names in English; UI text in Spanish (tuteo, short, no exclamations, no emojis).
- `@tfm/contracts` is the only source of truth for API models; web and API import from it (so the 50/20,000 limits become exported constants there, D-19).
- Web pod architecture: `api/api.ts`, `<pod>.vm.ts`, `.mapper.ts`, `.hooks.ts`, `.container.tsx`, `.component.tsx`, `components/`, `index.ts` exporting only the container. The VM is **not** derived from the API model (`extends`/`Omit` forbidden); the mapper is applied in the hook; container = data/state, component = props/presentation; a pod never imports another pod.
- Tailwind classes live next to the JSX; DS tokens only (no hex, no `bg-blue-500`).
- API: validate every input with contracts schemas; error shape `{ error: { code, message, details? } }`; expose `id`, not `_id`; ISO 8601 UTC dates.
- No `any`. No new dependencies without justification in the plan SUMMARY (this phase needs none).
- Secrets only in `.env`; `.env.example` always up to date (no new variable is introduced; if `num_ctx` is made configurable it must be added there).
- Every GSD plan ends with a `<verify>` that runs at least `npm run typecheck && npm run test`.
- Never log the full offer text.
- Git: branch per phase, atomic Conventional Commits; TDD plans commit RED and GREEN together because the pre-commit hook (`npx lint-staged` + `npm run typecheck`) runs.
- Stack changes need an ADR in `docs/decisiones.md`; none required here.
- Note: the working branch is `phase/02-candidaturas`; CONTEXT/ROADMAP name the Phase 3 branch `phase/03-autocompletado-ia` (STATE already flags branch-name reconciliation). Not a research decision.

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `docs/AI-EXTRACTION.md`, `docs/ARCHITECTURE.md` (API table, folder layout), `docs/DESIGN.md`, `03-CONTEXT.md`, `03-UI-SPEC.md`, `REQUIREMENTS.md`, `STATE.md`; `apps/api/src/{app,main,config,errors}.ts`, `apps/api/src/llm/*`, `apps/api/src/applications/{routes,service,repository}.ts`, `apps/api/src/http/require-json.ts`; `packages/contracts/src/{offer-extraction,tag,tag.normalize,error,application}.schema.ts`; `apps/web/src/pods/application-edit/**`, `common/components/tag-chip.tsx`, `core/http/http-client.ts`
- Live Ollama 0.40.13 at `$LLM_BASE_URL`: `/api/version`, `/api/tags`, `/api/ps`, `/api/show`, and four `/api/chat` runs (request/response shapes, `think:false`, `$schema` accepted, context behaviour, timings)
- `node_modules/@hono/node-server/dist/index.mjs` (abort handling, lines 846-867) and `node_modules/@tanstack/form-core/dist/esm/{FieldApi,FormApi}.js` (listener and `setFieldValue` options) plus a headless run confirming behaviour
- `z.toJSONSchema(offerExtractionSchema)` executed in `apps/api`

### Secondary (MEDIUM confidence)
- WebSearch results on OpenAI Structured Outputs strict-mode rules (third-party summaries; official keyword list not retrieved)
- WebSearch result: Google AI developer forum thread reporting intermittent schema non-adherence on the Gemini OpenAI-compatible layer (single user report)

### Tertiary (LOW confidence)
- Hono `bodyLimit` option names and `Intl` `useGrouping: "always"` from training knowledge (A2, A3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions read from `node_modules`.
- Architecture: HIGH — seams read in code; Ollama request/response shape exercised live.
- Pitfalls: HIGH for 1, 3–6, 8, 9 (reproduced or read in source); MEDIUM for 7 (small sample: 3 live runs on one toy offer) and for cloud-provider behaviour.

**Research date:** 2026-10-31
**Valid until:** 2026-11-07 (defence is 2026-11-09; Ollama/model versions in the devcontainer are fixed, so findings hold until then)
