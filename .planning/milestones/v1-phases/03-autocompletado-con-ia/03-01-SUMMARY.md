---
phase: 03-autocompletado-con-ia
plan: 01
subsystem: api+ui
tags: [hono, llm, extraction, react, tanstack-form, collapsible]

requires:
  - phase: 01-fundaciones
    provides: LlmClient seam with the mock provider, offer contracts, ApiError and the single error handler
  - phase: 02-gestion-de-candidaturas
    provides: application-edit pod (form, mapper, hooks, container) and the RequestStatus primitive
provides:
  - POST /api/offers/extract (mounted by createApp when deps.llm exists, no database)
  - EXTRACTION_SYSTEM_PROMPT, literal copy of docs/AI-EXTRACTION.md, guarded by a route test
  - OfferPanel «Pegar oferta» with loading, success and D-18 error messages
  - useOfferExtraction hook and mergeExtractionIntoForm (fill-only-empty merge)
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08, 03-09]

actuals:
  tokens: 10700
  tasks: 2
  commits: 2
plan_head_before: f4ab8a515119841253d0f3b5781a260f1d7abea4
plan_head_after: e3d3fc2e70bdf3c98e49d76c2dfce01a6dc5f0a3

tech-stack:
  added: []
  patterns:
    - "Optional dependency mounts an API sub-app (deps.llm), so existing createApp tests are untouched"
    - "Programmatic form writes with setFieldValue(..., { dontRunListeners: true }), one explicit call per field"
    - "Merge reads form.state.values when the response arrives, not when the request left"

key-files:
  created:
    - apps/api/src/offers/extract.service.ts
    - apps/api/src/offers/extract.routes.ts
    - apps/api/src/offers/extract.routes.test.ts
    - apps/web/src/pods/application-edit/components/offer-panel.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
  modified:
    - apps/api/src/app.ts
    - apps/api/src/main.ts
    - apps/web/src/pods/application-edit/api/api.ts
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/application-edit.component.tsx
    - apps/web/src/pods/application-edit/application-edit.test.tsx

key-decisions:
  - "The system prompt is the literal block of docs/AI-EXTRACTION.md; a route test reads the doc and compares it with what the LlmClient receives (D-25 guard)"
  - "createApp mounts /api/offers only with deps.llm and needs no db; main.ts shares one LlmClient between /api/health and extraction (D-03)"
  - "The hook applies the merge field by field with explicit setFieldValue calls because TypeScript cannot correlate a union key with its value type"
  - "An empty-string extraction value counts as no value in the merge, like null"

patterns-established:
  - "Status region of the panel is always mounted outside the collapsible content"
  - "Pod tests drive the whole flow through the container with mockFetch and deferred responses"

requirements-completed: [AI-01, AI-02, AI-05, AI-06]

duration: 12min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 1: Tracer for AI offer autocomplete Summary

**Paste panel to `POST /api/offers/extract` to the swappable `LlmClient` (mock end to end) and back into the form, filling only empty fields and persisting nothing until the user saves.**

## Performance

- **Duration:** about 12 min
- **Completed:** 2026-11-01T06:41:00Z
- **Tasks:** 2
- **Files modified:** 14 (5 created, 9 modified)

## Accomplishments

- `POST /api/offers/extract` validates with `offerExtractRequestSchema` (50 to 20,000 trimmed characters, JSON only), calls the LLM client with the literal system prompt and answers a body valid against `offerExtractionSchema`. No logging in the route or the service.
- The route test compares the system prompt the `LlmClient` receives with the fenced block under «Prompt de sistema» in `docs/AI-EXTRACTION.md`, byte for byte.
- «Pegar oferta» is the first section of the form (open on create, collapsed on edit) with the status region outside the collapsible content: «Analizando la oferta…», the zero/one/many success sentence and one D-18 message per failure (timeout, model, network or unknown).
- The merge fills Puesto, Empresa, Ubicación, Modalidad, Seniority and Tipo de contrato only when empty or whitespace-only, reading the form values at response time, so a value typed during the wait survives.

## Task Commits

1. **Task 1: Tracer, paste an offer, analyse it through the API and see the empty fields filled** - `fafc8b8` (feat)
2. **Task 2: The same path holds at the limits, on errors, during the wait and in edit mode** - `e3d3fc2` (test)

**Plan metadata:** committed separately (docs: complete plan).

Task 2 is `tdd="true"`, but the plan states that no production code changes: the route and the Task 1 hook and panel already satisfied every behavior, so the new tests passed on first run (there was no RED to commit; one test expectation I miscounted, 5 instead of 6 filled fields on an empty form, was fixed in the test before commit).

## Tracer gate

Tracer verify re-run end to end after the Task 1 commit (API offers and app tests, web pod and router tests, `npm run typecheck`): all green, expansion continued.

## Verification

- `npm run typecheck`: clean.
- `npm run test`: contracts 55, api 148, web 295 passed.
- `npm run lint`: clean (`--max-warnings=0`).
- All Task 1 and Task 2 acceptance criteria greps pass.

## Decisions Made

- Explicit per-field `setFieldValue` calls in a `switch` (the plan allowed this fallback; the generic loop did not typecheck).
- Empty-string extraction values are skipped by the merge as well as nulls, so a blank model answer is never counted as a filled field.
- No dependency added (lockfile unchanged). Scope: the explicit 14-file tracer, accepted by the plan (4 API sources, 7 web sources, 3 tests).
- A 400 from the endpoint shows the D-18 «network or unknown» message until plan 03-08 adds the length message.

## Deviations from Plan

None - plan executed exactly as written (the per-field write was an anticipated fallback, and the empty-string rule is a small hardening inside the specified merge).

## Issues Encountered

- `node_modules` is not present in the worktree; resolution walks up to the main checkout's `node_modules`, which works because contracts are unchanged.
- The plan commit ledger file under the shared git dir could not be written from the isolated worktree; `plan_head_before` is the dispatch base `f4ab8a5`, and the commit count was measured with `git rev-list --count` against it.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-03-01 to T-03-03 are mitigated: `requireJson` plus the request schema, no logging on the path, output validated against `offerExtractionSchema`, nothing persisted).

## Next Phase Readiness

Plans 03-02 (provider bodies, call options), 03-03 (normalization, signal, logging) and the UI slices 03-04 to 03-08 extend these seams without architectural change. With `LLM_PROVIDER=ollama|openai` the endpoint answers 502 `LLM_ERROR` until 03-02 lands; `mock` works end to end. `REQUIREMENTS.md` was not touched (AI-01, AI-02, AI-05, AI-06 are shared with sibling plans; the orchestrator owns the shared-ID gate).

## Self-Check: PASSED

- Created files exist: extract.service.ts, extract.routes.ts, extract.routes.test.ts, offer-panel.tsx, application-edit.ai.test.tsx.
- Commits `fafc8b8` and `e3d3fc2` are ancestors of HEAD.
