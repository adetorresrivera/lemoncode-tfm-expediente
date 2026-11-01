---
phase: 03-autocompletado-con-ia
reviewed: 2026-11-01T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - apps/api/package.json
  - apps/api/src/app.ts
  - apps/api/src/applications/applications.repository.ts
  - apps/api/src/applications/applications.service.ts
  - apps/api/src/applications/applications.update.test.ts
  - apps/api/src/llm/llm.client.test.ts
  - apps/api/src/llm/llm.client.ts
  - apps/api/src/llm/ollama.provider.ts
  - apps/api/src/llm/openai.provider.ts
  - apps/api/src/llm/structured-call.test.ts
  - apps/api/src/llm/structured-call.ts
  - apps/api/src/main.ts
  - apps/api/src/offers/__fixtures__/english-nice-to-have.txt
  - apps/api/src/offers/__fixtures__/fixtures.test.ts
  - apps/api/src/offers/__fixtures__/fixtures.ts
  - apps/api/src/offers/__fixtures__/onsite-junior.txt
  - apps/api/src/offers/__fixtures__/remote-senior.txt
  - apps/api/src/offers/extract.routes.test.ts
  - apps/api/src/offers/extract.routes.ts
  - apps/api/src/offers/extract.service.test.ts
  - apps/api/src/offers/extract.service.ts
  - apps/api/src/scripts/try-extract.ts
  - apps/web/src/common/components/ai-mark.tsx
  - apps/web/src/common/components/common-components.test.tsx
  - apps/web/src/common/components/tag-chip.tsx
  - apps/web/src/pods/application-edit/api/api.ts
  - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
  - apps/web/src/pods/application-edit/application-edit.component.tsx
  - apps/web/src/pods/application-edit/application-edit.container.tsx
  - apps/web/src/pods/application-edit/application-edit.hooks.ts
  - apps/web/src/pods/application-edit/application-edit.mapper.ts
  - apps/web/src/pods/application-edit/application-edit.merge.test.ts
  - apps/web/src/pods/application-edit/application-edit.test.tsx
  - apps/web/src/pods/application-edit/application-edit.vm.ts
  - apps/web/src/pods/application-edit/components/conditions-section.tsx
  - apps/web/src/pods/application-edit/components/field-props.ts
  - apps/web/src/pods/application-edit/components/form-field.test.tsx
  - apps/web/src/pods/application-edit/components/form-field.tsx
  - apps/web/src/pods/application-edit/components/job-section.tsx
  - apps/web/src/pods/application-edit/components/offer-panel.tsx
  - apps/web/src/pods/application-edit/components/tag-group-input.tsx
  - apps/web/src/pods/application-edit/components/tags-section.tsx
  - docs/AI-EXTRACTION.md
  - packages/contracts/src/offer-extraction.schema.ts
  - scripts/compose-smoke.sh
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-01
**Depth:** standard
**Files Reviewed:** 44 (the 45th path in the scope list is an empty trailing line)
**Status:** issues_found

## Summary

The phase is carefully built. I found no critical defects. The cancel path, the stale-response guards and the merge rule are sound: a field the user edited is never overwritten, tags are unioned without duplicates, and the «IA» marks are read at response time. I traced these against the sources:

- `structured-call.ts` (timeout and client abort)
- `extract.routes.ts`
- the merge in `application-edit.mapper.ts`
- `application-edit.hooks.ts` (mark bookkeeping)

I found two real problems:

- The API normalization (label cutting, tag cap, empty labels) is unreachable for real model output, because the same strict schema rejects that output first.
- The shared error handler logs a fragment of the pasted offer when the body is malformed JSON.

The remaining items are minor.

## Warnings

### WR-01: Normalization of over-long labels and surplus tags is unreachable; one off-spec field fails the whole analysis

**File:** `apps/api/src/offers/extract.service.ts:93-99` (with `apps/api/src/llm/structured-call.ts:50-51` and `packages/contracts/src/offer-extraction.schema.ts:19-20`)
**Issue:**
- `createExtractService` hands `offerExtractionSchema` to `llm.extractStructured`. `callStructured` runs `schema.safeParse` on the raw model output before `normalizeExtraction` ever sees it.
- That schema is strict: `tagSchema` has `label.min(1).max(40)`, `tags.max(20)`, and `currency` is `length(3)`.
- A model that returns a 45-character label, 21+ tags (for example 22 with 3 case duplicates), an empty label, or `currency: "€"` or `" EU"` therefore fails validation. The call is retried and then answered as 502 `LLM_ERROR`.
- Code and docs promise something else:
  - `cutLabel` exists to cut to 40 units.
  - `docs/AI-EXTRACTION.md` §Normalización says "deduplicar, quitar vacías, recortar a 40 caracteres".
  - `extract.service.test.ts:99-125` tests "cuts a 45-character label" and "keeps the first 20 of 25 distinct tags".
- Those tests call `normalizeExtraction` directly with objects that bypass the schema. In the real pipeline that path can never run, so the tests give false confidence.
- The retry does not help much. At `temperature: 0` the model usually returns the same output.
- The result is that a small model such as `gemma4:e2b` is likely to fail the demo flow on a slightly long label or a 21st tag, instead of degrading gracefully.

**Fix:** Validate the model output with a lenient "raw" schema, then normalize, then validate strictly. For example, export a `rawOfferExtractionSchema` from contracts (or build it in the service). In it, `tags` is `z.array(z.object({ label: z.string(), group: tagGroupSchema }))` with no max, and `currency` is `z.string().nullable()`. Pass that schema to `extractStructured` (it also feeds `z.toJSONSchema`) and keep the final `offerExtractionSchema.safeParse` in `normalizeExtraction`:

```ts
const raw = await llm.extractStructured(
  EXTRACTION_SYSTEM_PROMPT,
  text,
  rawOfferExtractionSchema,
  { signal: options?.signal },
);
return normalizeExtraction(raw); // normalizeExtraction takes the raw type; its final parse stays strict
```

If the strict behaviour is intended, remove `cutLabel`, the over-20 and over-40 tests, and the "recortar a 40" line in the docs so they stop claiming a behaviour that cannot happen.

### WR-02: The global error handler logs a fragment of the pasted offer on malformed JSON

**File:** `apps/api/src/app.ts:106`
**Issue:**
- `onError` does `console.error(err.message)` for every error. For the `SyntaxError` thrown by `c.req.json()`, V8 puts a snippet of the body in the message.
- I ran it on Node 22.23.4: `Unexpected token 'B', "{"text": Buscamos d"... is not valid JSON`. The snippet is about 20 characters of the user's offer text, in the server log.
- `CLAUDE.md` and `docs/AI-EXTRACTION.md` say never to log the offer text, and the comment on lines 102-104 claims "never ... the request body".
- It is not the full text, but the invariant is stated as absolute, and `extract.routes.test.ts` ("malformed JSON") does not assert on the log content.

**Fix:** Do not log the message of `SyntaxError` (or ZodError) instances:

```ts
app.onError((err, c) => {
  console.error(
    err instanceof SyntaxError ? "SyntaxError (malformed JSON body)" : err.message,
  );
```

Add a test that posts malformed JSON containing a recognisable marker and asserts that `console.error` never received it.

## Info

### IN-01: Any non-recognised failure of the extraction request is reported as "No hay conexión"; a throw in the merge is also mislabeled

**File:** `apps/web/src/pods/application-edit/application-edit.hooks.ts:260-267` and `:377-380`
**Issue:**
- `errorReasonOf` maps everything except `LLM_TIMEOUT`, `LLM_ERROR` and `VALIDATION_ERROR` to `"network"`. A 500 `INTERNAL_ERROR` or an `INVALID_RESPONSE` (the server answered, but with an unexpected body) tells the user "No hay conexión con el servidor".
- The `.then` merge handler and `.catch` share one chain. If `form.setFieldValue` throws mid-merge, the user sees an error, some fields were already written, and `onMerged` never ran, so those values carry no «IA» mark and are treated as the user's.

**Fix:** Map `NETWORK_ERROR` to `"network"` and the rest to `"model"`. Move the `.catch` to the `extractOffer` call so that only request failures reach it (`extractOffer(...).then(onOk, onError)`).

### IN-02: A user-chosen currency can be overwritten when both salary fields are blank

**File:** `apps/web/src/pods/application-edit/application-edit.mapper.ts:232-242`
**Issue:**
- `currency` defaults to `"EUR"`, so it is never blank. The merge treats it as free whenever `salaryWasBlank`, even if the user explicitly picked `GBP`. The edit dropped the «IA» mark, but the default cannot be told apart from a deliberate choice.
- It is arguably right to follow the offer's currency when the AI also filled a salary.
- It is still an exception to the "never overwrite a user-edited value" rule that `docs/AI-EXTRACTION.md` and AI-06 state without qualification.

**Fix:** Either note the exception in the docs, or track "currency touched by the user" (the listener already fires) and treat only an untouched default as free.

### IN-03: Retrying at temperature 0 repeats the same failure

**File:** `apps/api/src/llm/structured-call.ts:4,39-53`
**Issue:**
- The single retry is spec-mandated, but both providers send `temperature: 0`, so an invalid or unparseable answer is usually reproduced exactly. The user waits two timeouts' worth of budget at worst for the same 502. The budget is shared, so the wait is bounded.
- Related: Ollama is sent `num_ctx: 8192`, while `OFFER_TEXT_MAX` is 20,000 characters (about 5-7k tokens), plus prompt, schema and output. A maximal offer can still hit the window.

**Fix:** Retry with a small temperature (for example 0.2) on the second attempt. Consider `num_ctx: 16384`, or document the effective limit.

### IN-04: Docs drift from the implementation

**File:** `docs/AI-EXTRACTION.md:44-60`
**Issue:**
- The documented `LlmClient.extractStructured` signature lacks the fourth `options?: LlmCallOptions` parameter that the code and the route (abort on client cancel) rely on.
- The OpenAI row shows `json_schema: { name, schema }`, but the code also sends `strict: true`.
- The §Normalización bullets "quitar vacías, recortar a 40" do not describe reachable behaviour (see WR-01).

**Fix:** Update the signature and the table. Resolve WR-01 first, then align the Normalización section.

### IN-05: Trailing-slash normalization of `LLM_BASE_URL` is done three times

**File:** `apps/api/src/llm/llm.client.ts:33-36`, `ollama.provider.ts:10`, `openai.provider.ts:16`
**Issue:** `createLlmClient` strips one trailing slash, then each provider strips all trailing slashes again. The first pass is redundant. The `const { $schema: _dialect, ...rest }` plus `void _dialect` trick in `openai.provider.ts:20-21` is an unusual way to appease the unused-variable lint.
**Fix:** Keep the normalization in one place (the providers). Remove it from `createLlmClient` and the `void` line (an ESLint `varsIgnorePattern: "^_"` rule covers it).

---

_Reviewed: 2026-11-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
