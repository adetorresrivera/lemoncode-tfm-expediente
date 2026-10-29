---
phase: 01-fundaciones-y-walking-skeleton
plan: 03
subsystem: contracts
tags: [zod, contracts, llm, mock-provider, openai, ollama]

requires:
  - phase: 01-fundaciones-y-walking-skeleton
    provides: "plan 01-01 contracts package, LlmClient seam, ApiError; plan 01-02 quality gate"
provides:
  - "Nine domain enums (DOMAIN.md order) and TERMINAL_STATUSES exported from @tfm/contracts"
  - "tag, interview, document, offer-extraction and application contracts (entity, input, query, status change) with inferred types"
  - "LlmClient factory complete: ollama, openai and mock behind LLM_PROVIDER; mock offline and contract-valid"
affects: [01-04, 01-05, 01-06, phase-2, phase-3, phase-4]

actuals:
  tokens: 16500 # chars/4 over the realized diff
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Zod 4 derivations on un-refined objects; refine always applied last"
    - "Providers receive a config with the trailing slash of LLM_BASE_URL already stripped"

key-files:
  created:
    - packages/contracts/src/enums.ts
    - packages/contracts/src/tag.schema.ts
    - packages/contracts/src/interview.schema.ts
    - packages/contracts/src/document.schema.ts
    - packages/contracts/src/offer-extraction.schema.ts
    - packages/contracts/src/application.schema.ts
    - packages/contracts/src/schemas.test.ts
    - packages/contracts/src/application.schema.test.ts
    - apps/api/src/llm/mock.provider.ts
    - apps/api/src/llm/openai.provider.ts
    - apps/api/src/llm/llm.client.test.ts
  modified:
    - packages/contracts/src/index.ts
    - apps/api/src/llm/llm.client.ts

key-decisions:
  - "Bounds chosen where docs were silent: document name 1..120, version 1..40, interview notes max 5000, currency three upper-case letters (upper-cased after trim)"
  - "Tag normalisation (collapse spaces, case-insensitive dedupe) stays Phase 2 behaviour; schema validates shape and 20 / 40 bounds only"
  - "sourceUrl uses z.url({ protocol: /^https?$/ }) so javascript: and ftp: are rejected (T-01-12)"

patterns-established:
  - "Contract tests assert error.issues[0].path and one-step-either-side boundaries"
  - "LLM tests stub fetch with vi.stubGlobal and drive the 300 ms mock delay with fake timers"

requirements-completed: [FND-02]

duration: 35min
completed: 2026-10-29
status: complete
plan_head_before: 984165c176bb2ef30f86d6c7ef947ddf10ed6a91
plan_head_after: 5a571b7ae83dd0c19431055b5265fe9d192afae3
---

# Phase 1 Plan 03: Contracts and LLM providers Summary

**Every API model of docs/ARCHITECTURE.md (nine enums plus tag, interview, document, offer-extraction and application schemas) lives in @tfm/contracts with boundary tests, and `createLlmClient` switches between ollama, openai and an offline mock with no code change.**

## Accomplishments

- All enum `.options` keep the docs/DOMAIN.md order; `TERMINAL_STATUSES` is exported.
- `applicationInputSchema` fills defaults from `{title, company}`, accepts `salaryMin === salaryMax`, rejects `salaryMin > salaryMax` at path `salaryMax`, restricts `sourceUrl` to http/https and upper-cases `currency`. Refinement is applied last on schemas derived from an un-refined fields object (Zod 4 Pitfall 8).
- `applicationQuerySchema` turns absent status into `undefined`, one value into a one-element array, repeated values into an array; sort defaults to `updatedAt`. `statusChangeSchema` is strict.
- `mock` provider: ping true with no network; `extractStructured` resolves at 300 ms with `MOCK_OFFER_EXTRACTION` (typed `satisfies OfferExtraction`, validated through the passed schema). `openai` ping hits `{base}/models` with a bearer header (2 s timeout). `ollama` and `openai` `extractStructured` reject with `ApiError(502, LLM_ERROR)` until Phase 3.
- Verification: `npm run typecheck`, `npm run test` (contracts 40 tests, api 34 tests), `npm run lint`, `npm run format:check` and the z.enum placement gate (no `z.enum(` under apps/ outside `apps/api/src/config.ts`) all pass; `npm run build -w @tfm/contracts` emits `dist/application.schema.d.ts`.
- No dependency added.

## Deviations from Plan

### Process

**1. [Rule 3 - Blocking] TDD RED and GREEN committed together per task**
- **Found during:** Task 1
- **Issue:** The Husky pre-commit from plan 01-02 runs `npm run typecheck`, so a test-only RED commit that imports not-yet-existing modules cannot be committed without `--no-verify`, which is prohibited.
- **Fix:** Tests and implementation were authored test-first within each task but committed together; each task is one atomic `feat` commit. A separate failing-RED run was not captured.
- **Files modified:** none beyond the plan's list.

**2. [Rule 1 - Bug] Test typing and lint fixes in llm.client.test.ts**
- **Found during:** Task 3 verification
- **Issue:** An untyped `vi.fn` made `mock.calls[0]` an empty tuple (TS2493), and underscore params tripped `no-unused-vars`.
- **Fix:** Typed the mock as `vi.fn<(url: string, init?: RequestInit) => Promise<Response>>`.
- **Commit:** 5a571b7

Otherwise the plan executed as written. No auth gates.

## Known Stubs

- `ollama.provider.ts` and `openai.provider.ts` `extractStructured` intentionally throw `ApiError(502, LLM_ERROR, "Extracción no disponible todavía")`; Phase 3 (AI-02) implements them. Not a Phase 1 goal blocker.

## Threat Flags

None. T-01-12 (javascript: URLs), T-01-13 (bounds), T-01-14 (key never logged or in errors), T-01-15 (no input logging), T-01-16 (2 s ping timeout) are mitigated and test-asserted where testable.

## Next Phase Readiness

Plans 01-04 onward can import every model from `@tfm/contracts`; `LLM_PROVIDER=mock` runs fully offline and `/api/health` reports `llm` from the provider-aware `ping()`.

## Self-Check: PASSED

- Files exist: all contracts and llm files listed under key-files.
- Commits exist: 72c56c7, b799bf3, 5a571b7 (ancestors of HEAD).
