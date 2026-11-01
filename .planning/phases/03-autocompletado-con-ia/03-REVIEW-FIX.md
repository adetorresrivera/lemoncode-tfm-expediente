---
phase: 03-autocompletado-con-ia
fixed_at: 2026-11-01T13:00:00Z
review_path: .planning/phases/03-autocompletado-con-ia/03-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-11-01
**Source review:** .planning/phases/03-autocompletado-con-ia/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (fix_scope critical_warning; no Critical findings, Info out of scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-02: The global error handler logs a fragment of the pasted offer on malformed JSON

**Files modified:** `apps/api/src/app.ts`, `apps/api/src/offers/extract.routes.test.ts`
**Commit:** a149b27
**Applied fix:** `onError` now logs the fixed string `SyntaxError (malformed JSON body)` for any `SyntaxError` instead of `err.message` (V8 quotes ~20 characters of the body there). The error response contract `{ error: { code, message, details? } }` is untouched. New test `never logs any part of a malformed body` posts a malformed body with a marker inside the V8 snippet window and asserts that no console method received it. I confirmed the test fails without the fix and passes with it.

### WR-01: Normalization of over-long labels and surplus tags is unreachable; one off-spec field fails the whole analysis

**Files modified:** `apps/api/src/offers/extract.service.ts`, `apps/api/src/llm/llm.client.ts`, `apps/api/src/llm/ollama.provider.ts`, `apps/api/src/llm/openai.provider.ts`, `apps/api/src/offers/extract.service.test.ts`, `apps/api/src/offers/extract.routes.test.ts`, `apps/api/src/offers/extract.pipeline.test.ts` (new), `docs/AI-EXTRACTION.md`
**Commit:** 104f733
**Status note:** logic change, requires human verification of the intended leniency boundaries.
**Applied fix:**
- Decision D-01 respected: the JSON Schema sent to the model (Ollama `format`, OpenAI `response_format`) is still `z.toJSONSchema(offerExtractionSchema)`. A new optional `LlmCallOptions.responseSchema` (defaults to the parsing schema) lets the pipeline parse with a different schema than the one shown to the model. No change to `packages/contracts`, no casts, no `any`.
- `rawOfferExtractionSchema` is defined in `extract.service.ts` as `offerExtractionSchema.extend(...)`: any label length, any tag count, empty labels, free-form `currency`, unsigned salaries. It is derived from the contract, not a redefinition of an API model, and nothing leaves the API with it.
- `callStructured` is unchanged (one retry, 502 `LLM_ERROR` for output unusable even under the lenient schema, 504 on timeout). `normalizeExtraction` now takes the raw type, additionally drops negative salaries and sets a `currency` that is not a three-letter code (e.g. `"€"`, `" EU"`) to `null`; labels are cut to 40, empties removed, duplicates merged and tags capped to 20 by the existing `cutLabel`/`normalizeTags`, and the final strict `offerExtractionSchema.safeParse` remains as a defensive 502.
- Tests: new `extract.pipeline.test.ts` runs the real pipeline (createLlmClient with a stubbed `fetch`, ollama and openai) with over-long raw output (long label, 28 tags with case duplicates, empty label, `currency: "€"`, inverted salaries) and asserts truncation, capping to 20, cleanup and a 200 through `POST /api/offers/extract` instead of 502. It also asserts the schema sent to the model is still the contract one, and that genuinely unusable output yields 502 after exactly one retry. Existing service/route tests updated for the new call arguments; the old "currency € throws 502" test was replaced by "currency € becomes null" plus a defensive-path test with an unrepairable enum.
- Docs: `docs/AI-EXTRACTION.md` updated (LlmClient signature with `options`, OpenAI `strict: true`, the raw-versus-strict validation, the two-step normalization rules including 20-tag cap and currency/negative-salary handling). The system prompt block and `EXTRACTION_SYSTEM_PROMPT` were not touched (route test comparing both passes).

**Known-deviations note:** the 03-09 SUMMARY «Known deviations» entry (ROADMAP Phase 3 SC1 «tags … truncated» observable only with fake test clients; real over-long output answers 502 `LLM_ERROR`) is now obsolete: behaviour matches the original spec, and truncation/capping is observable through the real pipeline (covered by `extract.pipeline.test.ts`). I did not edit the historical `03-09-SUMMARY.md`/`03-03-SUMMARY.md`; the orchestrator may want to annotate them as superseded. The Pitfall 8 line at 03-09-SUMMARY.md:287 is likewise outdated.

## Verification

- Gates (`npm run typecheck`, `npm run lint`, `npm run test`) all passed in the **main checkout**: api 223 tests, web 403 tests, contracts 55 tests; commits went through the pre-commit hooks (no `--no-verify`).
- Isolation deviation: `workflow.use_worktrees` is not set in `.planning/config.json` (default true), but no temporary worktree was created. A hand-made worktree has no `node_modules`, so the gates the task requires could not run there. Edits and commits were made directly on branch `phase/03-autocompletado-ia` while the working tree was clean and the orchestrator was waiting; no sentinel or temp branch exists.

---

_Fixed: 2026-11-01_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
