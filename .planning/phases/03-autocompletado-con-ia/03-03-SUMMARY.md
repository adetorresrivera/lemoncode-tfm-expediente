---
phase: 03-autocompletado-con-ia
plan: 03
subsystem: api
tags: [llm, normalization, fixtures, hono, body-limit, abort-signal, logging]
status: complete

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-01 tracer (extract service and route), 03-02 LlmCallOptions and callStructured"
provides:
  - "normalizeExtraction: pure, schema-checked cleanup of every model draft"
  - "extract(text, { signal }) with a single { length, durationMs } log line"
  - "256 KiB body limit answered as 400 VALIDATION_ERROR and c.req.raw.signal hand-over"
  - "Three anonymized fixture offers, FixtureExpectation list and scoreExtraction"
  - "npm run try-extract -w @tfm/api (dev-only manual run for plan 03-09)"
affects: [03-09 manual model check, Phase 6 seed (reads the fixture .txt files)]

actuals:
  tokens: 21000
  tasks: 3
  commits: 4
plan_head_before: 11e97e0fac5ea90d7fb4a5ae8a67eef127362c03
plan_head_after: 62a5b42257732adb0e922befda141dc1a9791054

tech-stack:
  added: []
  patterns:
    - "Normalization is a pure function that ends in offerExtractionSchema.safeParse; failure is 502 LLM_ERROR"
    - "Tag identity and dedupe always go through @tfm/contracts normalizeTags, never a local copy"
    - "The log carries lengths and durations only; a sentinel test spies every console method"

key-files:
  created:
    - apps/api/src/offers/extract.service.test.ts
    - apps/api/src/offers/__fixtures__/remote-senior.txt
    - apps/api/src/offers/__fixtures__/onsite-junior.txt
    - apps/api/src/offers/__fixtures__/english-nice-to-have.txt
    - apps/api/src/offers/__fixtures__/fixtures.ts
    - apps/api/src/offers/__fixtures__/fixtures.test.ts
    - apps/api/src/scripts/try-extract.ts
  modified:
    - apps/api/src/offers/extract.service.ts
    - apps/api/src/offers/extract.routes.ts
    - apps/api/src/offers/extract.routes.test.ts
    - apps/api/package.json

key-decisions:
  - "No dependency added (apps/api stays at 6 dependencies + 1 devDependency); hono/body-limit ships with hono"
  - "currency is upper-cased in the normalizer (RESEARCH Q7)"
  - "The log line is literally console.info('offers.extract', { length, durationMs }); error codes reach the log only through app.onError's fixed message"
  - "An oversize body is a 400 VALIDATION_ERROR thrown as ApiError from bodyLimit's onError, not Hono's bare 413"

requirements-completed: [AI-01, AI-03, AI-04]

coverage:
  - id: D1
    description: "Drafts are normalized: trimmed strings, empty to null, upper-cased currency, swapped salary, deduplicated and bounded tags"
    requirement: AI-04
    verification:
      - kind: unit
        ref: "apps/api/src/offers/extract.service.test.ts#normalizeExtraction"
        status: pass
    human_judgment: false
  - id: D2
    description: "One log line with only length and duration; the offer text never reaches any console method or response body on 200, 400, 502 and 504"
    requirement: AI-04
    verification:
      - kind: unit
        ref: "apps/api/src/offers/extract.routes.test.ts#never leaks the offer text"
        status: pass
      - kind: unit
        ref: "apps/api/src/offers/extract.service.test.ts#logs exactly one line with length and duration on success"
        status: pass
    human_judgment: false
  - id: D3
    description: "Timeout maps to 504 LLM_TIMEOUT and model failure to 502 LLM_ERROR; the request signal reaches the model call"
    requirement: AI-03
    verification:
      - kind: unit
        ref: "apps/api/src/offers/extract.routes.test.ts#POST /api/offers/extract hardening"
        status: pass
      - kind: unit
        ref: "apps/api/src/offers/extract.routes.test.ts#answers 200 with a valid extraction and calls the client with the trimmed text"
        status: pass
    human_judgment: false
  - id: D4
    description: "Bodies over 256 KiB answer 400 VALIDATION_ERROR before the model is called"
    requirement: AI-01
    verification:
      - kind: unit
        ref: "apps/api/src/offers/extract.routes.test.ts#answers 400 VALIDATION_ERROR for a 300 KiB body and never calls the model"
        status: pass
    human_judgment: false
  - id: D5
    description: "Three anonymized fixtures accepted by the request schema, with expectations and scoring"
    requirement: AI-01
    verification:
      - kind: unit
        ref: "apps/api/src/offers/__fixtures__/fixtures.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "npm run try-extract prints the fixture | time | correct / total | notes table and the returned extraction"
    requirement: AI-01
    verification:
      - kind: command
        ref: "LLM_PROVIDER=mock npm run try-extract -w @tfm/api"
        status: pass
    human_judgment: true
    rationale: "Correctness against a real model (Ollama) is judged by the user in plan 03-09; the mock answer is fixed and scores low by design"
---

# Phase 3 Plan 03: Clean drafts, fixtures and manual run Summary

**Every model draft is normalized (trim, nulls, upper-case currency, swapped salary, deduplicated and bounded tags) before it reaches the browser, the API logs only length and duration, and three anonymized fixture offers plus `npm run try-extract` back the tests and the manual Ollama check.**

## Performance

- **Tasks:** 3 (task 1 and 2 TDD, task 3 script)
- **Files:** 11 (7 created, 4 modified)
- **Commits:** 4 (1 RED, 3 GREEN/feature)

## Accomplishments

- `normalizeExtraction` is pure, builds a new object, reuses `normalizeTagLabel` and `normalizeTags` from `@tfm/contracts`, cuts labels to 40 UTF-16 units without leaving a lone high surrogate, and ends in `offerExtractionSchema.safeParse` (failure: 502 `LLM_ERROR`).
- `createExtractService(llm).extract(text, { signal })` forwards `{ signal }` to `LlmClient.extractStructured` and logs `console.info("offers.extract", { length, durationMs })` once, in a `finally`, on success and on failure.
- The route applies `bodyLimit` of 256 KiB (400 `VALIDATION_ERROR` in the project error shape) and passes `c.req.raw.signal` to the service.
- Route tests cover the three fixtures through the route with dirty canned output, 502/504 mapping, and a sentinel (`SENTINEL-OFFER-9c1`) that never appears in any console method or response body on 200, 502, 504, short-text 400 and 300 KiB 400.
- `remote-senior.txt`, `onsite-junior.txt`, `english-nice-to-have.txt` (2.1k to 2.6k characters each) with `fixtures.ts` (`OFFER_FIXTURES`, `readFixtureText`, `scoreExtraction`) and tests.
- `npm run try-extract -w @tfm/api` posts the fixtures in-process (or to `API_URL`), prints provider, the table and each returned extraction, never the offer text, and exits 1 if any call is not 200.

## TDD

- **RED** (`7a3a60a`): `extract.service.test.ts` with 16 tests; all 16 failed on their planned assertions (`not implemented` stub and missing log/option behavior). A compile-only stub of `normalizeExtraction` and the optional `options` parameter were added in the same commit because the Husky pre-commit hook runs `npm run typecheck`, which rejects a test importing a missing symbol. Semantic assessment: the target tests executed and failed on the intended behavior, not on import or syntax errors.
- **GREEN** (`6a5370a`, `3c5b8fe`): the service implementation, fixtures and route changes; all tests pass.
- **REFACTOR:** none needed.

## Task Commits

1. RED: `7a3a60a` test(03-03): add failing tests for extraction normalization and logging
2. Task 1: `6a5370a` feat(03-03): normalize extraction drafts, log length/duration and add fixture offers
3. Task 2: `3c5b8fe` feat(03-03): bound the extract body and hand the request signal to the model call
4. Task 3: `62a5b42` feat(03-03): add dev-only try-extract script for the fixture offers

## Known deviations

- **ROADMAP Phase 3 SC1 «tags … truncated»** is observable only with fake test clients (the mock provider answer is already within the limits). Real over-long model output (a label over 40 characters or more than `MAX_TAGS` tags) fails `offerExtractionSchema` (`label .max(40)`, `tags .max(MAX_TAGS)`) inside `callStructured`, is retried once and answers 502 `LLM_ERROR` (RESEARCH Pitfall 8, Open Question 6 resolved 2026-10-31). Accepted by the user; the ROADMAP wording is not changed. The 40-character cut and the 20-tag cap remain implemented in `normalizeExtraction` as the spec asks.
- The 300 KiB route test also passes without `bodyLimit` because the 20,000-character schema cap rejects the text anyway; `bodyLimit` protects the parse step (T-03-08) and its contract (error shape) is what the test pins.

## Decisions Made

- Currency upper-cased in the normalizer; a draft still invalid after normalization is 502 `LLM_ERROR`, never 400.
- The exact log line is `console.info("offers.extract", { length, durationMs })`.
- No dependency added (`apps/api` keeps 6 dependencies and 1 devDependency).

## Hand-over to later plans

- **Phase 6 seed:** the fixture `.txt` files are not copied by `tsc -p tsconfig.build.json`; the seed must read them from `src/offers/__fixtures__` or copy them into `dist`.
- **Plan 03-09:** run `npm run try-extract -w @tfm/api` with `LLM_PROVIDER=ollama` and show the user the table.
- `src/scripts/try-extract.ts` and `__fixtures__/fixtures.ts` are compiled by the build tsconfig (only `*.test.ts` is excluded); both are harmless in `dist` and not imported by `main.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RED commit needed a compile-only stub**
- **Found during:** RED commit of Task 1
- **Issue:** the pre-commit hook runs `npm run typecheck`, which failed on the test importing `normalizeExtraction` and calling `extract` with two arguments before they existed.
- **Fix:** added a stub `normalizeExtraction` that throws and the optional `options` parameter on `ExtractService.extract`; tests still failed on assertions (16 of 16). Hooks were not bypassed.
- **Files modified:** `apps/api/src/offers/extract.service.ts`, `apps/api/src/offers/extract.service.test.ts`
- **Commit:** `7a3a60a`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on behavior; the RED/GREEN sequence is preserved.

## Issues Encountered

None. The worktree has no `node_modules`; Node resolution used the shared root `node_modules` of the main checkout, whose `@tfm/contracts` symlink points to the same source as this branch.

## Known Stubs

None.

## Threat Flags

None. T-03-07 (logging), T-03-08 (body size) and T-03-09 (model output) are mitigated as planned; no new network surface was added (the script is dev-only and calls the existing route).

## Self-Check: PASSED

- All created files exist on disk and all four commits are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (api 209 tests, contracts 55, web 322) and `npm run lint` pass.
- `LLM_PROVIDER=mock npm run try-extract -w @tfm/api` exits 0 and prints the three fixture rows.
- Task acceptance criteria re-run: `normalizeTags(` and `normalizeExtraction` present, 3 `.txt` fixtures, one `console.` in the service, prompt untouched, `bodyLimit` and `c.req.raw.signal` in the route, sentinel in the route test, no `console.` in the route, `"test": "vitest run"` unchanged, dependency counts 6 and 1.
