---
phase: 03-autocompletado-con-ia
plan: 02
subsystem: api
tags: [llm, ollama, openai, fetch, abort-signal, zod, structured-output]

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-01 tracer: AppDeps.llm, createExtractService calling extractStructured with three arguments"
provides:
  - "LlmCallOptions and the optional fourth extractStructured parameter"
  - "callStructured: one total timeout budget, one retry, fixed 502/504 errors"
  - "Real Ollama (/api/chat) and OpenAI-compatible (/chat/completions) extractStructured behind LLM_PROVIDER"
affects: [03-03 route hands the request signal to extractStructured, docs/AI-EXTRACTION.md]

actuals:
  tokens: 5900
  tasks: 2
  commits: 4
plan_head_before: 78efd6d15627e02c787bae52cf75b93d370a8329
plan_head_after: 7af226cadc7b1823738258b8fc2de26040cd2ee2

tech-stack:
  added: []
  patterns:
    - "Providers only say how to send one request; callStructured owns budget, retry and error mapping"
    - "Timeout vs cancel decided by timeout.aborted on the signal we created, never by error name"

key-files:
  created:
    - apps/api/src/llm/structured-call.ts
    - apps/api/src/llm/structured-call.test.ts
  modified:
    - apps/api/src/llm/llm.client.ts
    - apps/api/src/llm/ollama.provider.ts
    - apps/api/src/llm/openai.provider.ts
    - apps/api/src/llm/llm.client.test.ts

key-decisions:
  - "Native fetch only; no dependency added (apps/api stays at 6 dependencies + 1 devDependency)"
  - "Transport failures and non-2xx answers are not retried; only unparseable or schema-invalid output is (D-21)"
  - "Cancel by the client ends as 502 LLM_ERROR, timeout as 504 LLM_TIMEOUT, told apart by timeout.aborted"

patterns-established:
  - "Fixed error messages: no key, header, upstream body or model output in any ApiError message"

requirements-completed: [AI-02, AI-03]

coverage:
  - id: D1
    description: "LLM_PROVIDER=ollama sends the structured /api/chat request (think false, temperature 0, num_ctx 8192, format = JSON Schema) and parses message.content"
    requirement: AI-02
    verification:
      - kind: unit
        ref: "apps/api/src/llm/llm.client.test.ts#posts the structured chat request to {base}/api/chat"
        status: pass
      - kind: unit
        ref: "apps/api/src/llm/llm.client.test.ts#returns the schema-valid object parsed from message.content"
        status: pass
    human_judgment: false
  - id: D2
    description: "LLM_PROVIDER=openai sends a strict json_schema chat/completions request with bearer key and parses choices[0].message.content (stubbed fetch only, no key in the devcontainer)"
    requirement: AI-02
    verification:
      - kind: unit
        ref: "apps/api/src/llm/llm.client.test.ts#posts a strict json_schema request to {base}/chat/completions"
        status: pass
      - kind: unit
        ref: "apps/api/src/llm/llm.client.test.ts#answers 502 LLM_ERROR on a 401 without the key in the message"
        status: pass
    human_judgment: false
  - id: D3
    description: "Total LLM_TIMEOUT_MS budget across both attempts: 504 LLM_TIMEOUT, no retry; one timeout signal per call"
    requirement: AI-03
    verification:
      - kind: unit
        ref: "apps/api/src/llm/structured-call.test.ts#answers 504 LLM_TIMEOUT without retrying when the budget runs out"
        status: pass
      - kind: unit
        ref: "apps/api/src/llm/structured-call.test.ts#turns a budget spent in the first attempt into 504, not 502"
        status: pass
    human_judgment: false
  - id: D4
    description: "Unparseable or schema-invalid output retried exactly once, then 502 LLM_ERROR; client abort propagates upstream as 502"
    requirement: AI-03
    verification:
      - kind: unit
        ref: "apps/api/src/llm/structured-call.test.ts#answers 502 LLM_ERROR after two schema-invalid outputs, calling send exactly twice"
        status: pass
      - kind: unit
        ref: "apps/api/src/llm/structured-call.test.ts#aborts the signal given to send when the client aborts and answers 502, never 504"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real call against the local gemma4:e2b through Ollama (not exercised in this plan; tests use a stubbed fetch)"
    requirement: AI-02
    verification: []
    human_judgment: true
    rationale: "No live Ollama call was run here; the request shape follows the live-verified RESEARCH Pattern 2, but the end-to-end click is covered by plan 03-03 and phase UAT."

duration: 4min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 02: Real LLM providers behind one budget and retry Summary

**Ollama and OpenAI-compatible structured extraction on native fetch, with a single `callStructured` helper owning the total timeout budget, the one retry and fixed 502/504 errors.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-01T08:37:00Z
- **Completed:** 2026-11-01T08:41:30Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `callStructured` creates one `AbortSignal.timeout(LLM_TIMEOUT_MS)` per request, combines it with the request signal via `AbortSignal.any`, retries once on unparseable or schema-invalid output and maps everything else to fixed `ApiError`s (504 `LLM_TIMEOUT`, 502 `LLM_ERROR`).
- Ollama provider posts `/api/chat` with `think: false`, `options { temperature: 0, num_ctx: 8192 }`, `format = z.toJSONSchema(schema)`; OpenAI-compatible provider posts `/chat/completions` with a strict `json_schema` response format and bearer key. `ping()` is unchanged, so `/api/health` still reports the provider through the same client.
- `LlmClient.extractStructured` gains the optional `options?: LlmCallOptions` (`{ signal?: AbortSignal }`); the mock provider and the 03-01 service are untouched and still type-check.

## Task Commits

TDD tasks, RED then GREEN:

1. **Task 1: One timeout budget and one retry** - `cf67aa9` (test, RED: 12 assertion failures against a throwing stub), `a9294df` (feat, GREEN: 12 pass)
2. **Task 2: Real Ollama and OpenAI-compatible extraction** - `d5291a9` (test, RED: 10 failing provider/interface tests; includes the `LlmCallOptions` interface addition so the fourth-argument test type-checks), `7af226c` (feat, GREEN: 35 pass in src/llm)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified

- `apps/api/src/llm/structured-call.ts` - `callStructured`: budget, retry, error mapping
- `apps/api/src/llm/structured-call.test.ts` - 12 tests: retry, 502/504, abort, one timeout per call, no output leakage
- `apps/api/src/llm/llm.client.ts` - `LlmCallOptions` and optional fourth parameter
- `apps/api/src/llm/ollama.provider.ts` - real `extractStructured`
- `apps/api/src/llm/openai.provider.ts` - real `extractStructured`
- `apps/api/src/llm/llm.client.test.ts` - request-body, parsing, timeout, abort and interface tests replacing the Phase 1 always-502 assertions

## Spec additions

Recorded here for `docs/AI-EXTRACTION.md` to pick up:

- `extractStructured(system, input, schema, options?: LlmCallOptions)` with `LlmCallOptions = { signal?: AbortSignal }`: backwards-compatible; three-argument fakes, the mock and the 03-01 service still type-check (RESEARCH Pattern 3).
- Ollama `options.num_ctx: 8192` next to `temperature: 0` (user-approved 2026-10-31, RESEARCH Pitfall 1). Code constant, so `.env.example` does not change.
- OpenAI-compatible request uses `strict: true` inside `json_schema` and omits the top-level `$schema` key emitted by `z.toJSONSchema` (RESEARCH Q3, A1). Ollama receives the schema unchanged.
- The cloud (OpenAI-compatible) path is tested only with a stubbed `fetch`; there is no key in the devcontainer.

## Decisions Made

- No dependency added: native `fetch` only (D-01, CLAUDE.md).
- Timeout vs cancel is decided by `timeout.aborted` on the signal created in `callStructured`, never by the rejection's name (RESEARCH Pitfall 6).
- `callStructured` also checks the combined signal before starting the second attempt, so a budget spent in the first attempt yields 504 even if a provider's `send` would not notice the aborted signal.
- After two invalid answers, if the budget has expired meanwhile the result is 504 rather than 502 (budget spent takes precedence).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RED commit needed the interface change and a lint-clean stub**
- **Found during:** Task 1 and Task 2 RED commits
- **Issue:** the pre-commit hook runs lint-staged and `npm run typecheck`. A stub with an unused `_args` parameter failed ESLint, and the Task 2 test passing a fourth argument failed typecheck until `LlmCallOptions` existed.
- **Fix:** the Task 1 stub references its argument in its thrown message; the `LlmCallOptions` interface change (plan step 0) was committed together with the Task 2 RED tests instead of with GREEN.
- **Files modified:** apps/api/src/llm/structured-call.ts, apps/api/src/llm/llm.client.ts
- **Verification:** both RED commits passed hooks; the RED test runs failed on assertions (12 and 10 failures), not on import or syntax errors.
- **Committed in:** cf67aa9, d5291a9

---

**Total deviations:** 1 auto-fixed (1 blocking, commit ordering only)
**Impact on plan:** None on behavior or scope.

## Issues Encountered

None. TDD note: RED evidence was inspected semantically (target tests failed on `expected ... to be an instance of ApiError` and on missing request-body assertions); `workflow.tdd_mode` machine classification was not requested for this plan.

## Verification

- `npm run test -w @tfm/api -- src/llm`: 35 tests pass (2 files).
- `npm run typecheck && npm run test && npm run lint`: all green (contracts 55, api 170, web 295 tests).
- Acceptance greps: `callStructured` export, `AbortSignal.any`, `timeout.aborted`, no `console.` in structured-call.ts, `think: false`, `num_ctx: 8192`, `json_schema`, `strict: true`, one `callStructured(` per provider, placeholder text gone, dependency count unchanged (6 + 1).

## Threat Flags

None. T-03-04 (no key or upstream body in messages), T-03-05 (one total budget plus request signal) and T-03-06 (parse error discarded) are mitigated and covered by tests.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-03 can pass `{ signal: c.req.raw.signal }` as the fourth argument of `extractStructured` from the route.
- Manual check pending for the phase UAT: a real click against `gemma4:e2b` (the request shape follows the live-verified RESEARCH Pattern 2 but was not exercised live here).

## Self-Check: PASSED

All six files exist; commits cf67aa9, a9294df, d5291a9 and 7af226c are ancestors of HEAD.

---
*Phase: 03-autocompletado-con-ia*
*Completed: 2026-11-01*
