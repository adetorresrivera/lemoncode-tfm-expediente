---
phase: 03-autocompletado-con-ia
reviewed: 2026-11-01T14:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - apps/api/src/app.ts
  - apps/api/src/llm/llm.client.ts
  - apps/api/src/llm/ollama.provider.ts
  - apps/api/src/llm/openai.provider.ts
  - apps/api/src/offers/extract.pipeline.test.ts
  - apps/api/src/offers/extract.routes.test.ts
  - apps/api/src/offers/extract.service.test.ts
  - apps/api/src/offers/extract.service.ts
  - docs/AI-EXTRACTION.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 3: Code Review Report (incremental re-review of WR-01 / WR-02 fixes)

**Reviewed:** 2026-11-01T14:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found (info only)

## Summary

Both fixes are correct and complete. No regressions found.

**WR-01 (lenient parse, normalize, strict parse):**
- `callStructured` now validates with `rawOfferExtractionSchema` (`extract.service.ts:39`). The strict `offerExtractionSchema.safeParse` still runs on the normalized result (`extract.service.ts:99`) and maps a failure to 502 `LLM_ERROR`.
- Retry and timeout semantics are unchanged. `structured-call.ts` is untouched. A raw answer that fails even the lenient schema still gets one retry and then 502. `extract.pipeline.test.ts` asserts 2 fetch calls for `{ title: 42 }`.
- The provider shows the model the contract schema, not the lenient one. Ollama sends `format: z.toJSONSchema(options?.responseSchema ?? schema)` and OpenAI does the same with `$schema` stripped. `extract.service.ts:124` always passes `responseSchema: offerExtractionSchema`. The pipeline test compares the schema in the actual request body for both providers against `z.toJSONSchema(offerExtractionSchema)`. The lenient schema has no `maxItems` or `maxLength`, so the assertion would fail if it leaked.
- The raw schema is derived with `.extend` from the contract, so new contract fields are inherited. `normalizeExtraction` builds an `OfferExtraction` literal, so `tsc` flags any drift. Enums stay strict, so a hallucinated enum value is still retried.
- Normalization edge cases traced:
  - A cut label cannot be empty.
  - Re-normalization inside `normalizeTags` is idempotent.
  - Dedupe runs after the cut.
  - A negative salary becomes null before the swap.
  - `-0` passes.
  - `ß` and other characters whose uppercase form has a different length are rejected by `/^[A-Z]{3}$/`.

**WR-02 (no body fragment in logs):**
- `onError` now logs a fixed string for any `SyntaxError` (`app.ts:108-112`). Every other branch is unchanged.
- I checked the other places a body fragment could be logged.
  - `console.*` sites in `apps/api/src`: only `main.ts` (env errors), `extract.service.ts` (length and duration) and the dev script `try-extract.ts` (not request-path).
  - `JSON.parse` / `res.json()` in the providers: `structured-call.ts` drops the caught error, and `send()` failures are rethrown as fixed `ApiError`s.
  - `ZodError.message` (Zod 4): carries issue messages, not input values.
  - `HTTPException`: custom, fixed messages.
  - `requireJson` and `bodyLimit`: fixed `ApiError`s.
- The new route test places the marker where V8 quotes the snippet, asserts `console.error` was called, and checks every console method, so it is not vacuous.

**Verification run:** `npm run typecheck` is clean, `npm run lint` passes with `--max-warnings=0`, and `vitest run` in `apps/api` passes 223 of 223.

The three items below are minor and none block shipping.

## Info

### IN-01: Symbol currency is dropped instead of mapped, although the prompt tells the model to map it

**File:** `apps/api/src/offers/extract.service.ts:56-60`
**Issue:** `toCurrencyCode("€")` returns `null`, and the comment says "dropped, not guessed". The system prompt (line 21) explicitly instructs the model: 'Si hay "€", EUR'. So the symbol-to-code mapping is part of the documented extraction contract. If a provider ignores the structured-output `format` and returns `"€"`, the salary survives with no currency and the user must refill it. This is low impact: both providers send a schema with `length(3)`, so `"€"` is unlikely in practice.
**Fix:** Optionally map the unambiguous symbols before the regex test, for example:
```ts
const CURRENCY_SYMBOLS: Record<string, string> = { "€": "EUR", "£": "GBP" };
// in toCurrencyCode: const code = CURRENCY_SYMBOLS[value] ?? value.toUpperCase();
```
`$` is ambiguous (USD, CAD, MXN), so leave it as null. Update the normalization section of `docs/AI-EXTRACTION.md` and the tests (`extract.service.test.ts:161`, `extract.pipeline.test.ts:110`) if you do.

### IN-02: Tag label limit is a second hard-coded copy of the contract's `max(40)`

**File:** `apps/api/src/offers/extract.service.ts:33`
**Issue:** `MAX_LABEL_UNITS = 40` duplicates the literal in `tagSchema` (`packages/contracts/src/tag.schema.ts`: `.max(40)`), which exports `MAX_TAGS` but no label limit. If the contract limit is lowered, the strict re-parse starts returning 502 for labels that were cut to the old 40. If it is raised, the API silently stays stricter. This predates the fix, but the lenient-schema design makes the two limits more tightly coupled.
**Fix:** Export `MAX_TAG_LABEL_LENGTH` from contracts, use it in `tagSchema`, and import it here.

### IN-03: The fixed SyntaxError log string names a cause the handler cannot guarantee

**File:** `apps/api/src/app.ts:108-112`
**Issue:** Any `SyntaxError` reaching `onError` is logged as "SyntaxError (malformed JSON body)". The handler already maps every `SyntaxError` to 400 "JSON no válido" regardless of origin (existing behavior). A `SyntaxError` from elsewhere, such as a future `JSON.parse` of stored data or an invalid `RegExp`, would be logged with a misleading label and no diagnostic detail. Today, no other `SyntaxError` source exists in `apps/api/src` request paths.
**Fix:** Use a neutral label such as `"SyntaxError (message withheld)"`, or leave as is and revisit if another source appears.

---

_Reviewed: 2026-11-01T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
