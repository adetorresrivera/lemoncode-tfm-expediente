---
phase: "03"
slug: "autocompletado-con-ia"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-31"
validated: "2026-11-01"
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 (+ Testing Library 16.3.3, user-event 14.6.8, jsdom for web) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, contracts defaults |
| **Quick run command** | `npm run test -w @tfm/api -- src/llm src/offers` · `npm run test -w @tfm/web -- src/pods/application-edit src/common` · `npm run test -w @tfm/contracts` |
| **Full suite command** | `npm run typecheck && npm run test && npm run lint` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the touched workspace's quick command
- **After every plan wave:** Run `npm run typecheck && npm run test && npm run lint`
- **Before `/gsd-verify-work`:** Full suite + `npm run build` green, plus the manual D-24 table
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 03-01 | 1 | AI-01, AI-05, AI-06 | — | — | tracer route + component | `npm run test -w @tfm/api -- src/offers src/app.test.ts; npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-01-T2 | 03-01 | 1 | AI-01, AI-02, AI-05 | T-03 body limits | Malformed body never logged | route / component | `npm run test -w @tfm/api -- src/offers src/llm` | ✅ | ✅ green |
| 03-02-T1 | 03-02 | 2 | AI-03 | — | Timeout budget bounded | unit | `npm run test -w @tfm/api -- src/llm/structured-call.test.ts` | ✅ | ✅ green |
| 03-02-T2 | 03-02 | 2 | AI-02, AI-03 | LLM_API_KEY | Key only in Bearer header | unit (stubbed fetch) | `npm run test -w @tfm/api -- src/llm` | ✅ | ✅ green |
| 03-03-T1 | 03-03 | 3 | AI-04 | — | — | unit + fixtures | `npm run test -w @tfm/api -- src/offers` | ✅ | ✅ green |
| 03-03-T2 | 03-03 | 3 | AI-01, AI-04 | Offer text never logged | One log line: length + duration | route | `npm run test -w @tfm/api -- src/offers src/app.test.ts` | ✅ | ✅ green |
| 03-03-T3 | 03-03 | 3 | AI-04 | — | — | script smoke | `LLM_PROVIDER=mock npm run try-extract -w @tfm/api` | ✅ | ✅ green |
| 03-04-T1 | 03-04 | 2 | AI-06 | — | — | unit (mapper) | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts` | ✅ | ✅ green |
| 03-04-T2 | 03-04 | 2 | AI-08 | — | — | component | `npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-05-T1 | 03-05 | 3 | AI-07, AI-08 | — | — | component | `npm run test -w @tfm/web -- src/common src/pods/application-edit` | ✅ | ✅ green |
| 03-05-T2 | 03-05 | 3 | AI-07 | — | — | component | `npm run test -w @tfm/web -- src/pods/application-edit src/common` | ✅ | ✅ green |
| 03-06-T1 | 03-06 | 4 | AI-06, AI-07 | — | — | unit + component | `npm run test -w @tfm/web -- src/common src/pods/application-edit/application-edit.merge.test.ts` | ✅ | ✅ green |
| 03-06-T2 | 03-06 | 4 | AI-06, AI-07 | — | — | component | `npm run test -w @tfm/web -- src/pods/application-edit src/common` | ✅ | ✅ green |
| 03-07-T1 | 03-07 | 5 | AI-09 | — | — | route | `npm run test -w @tfm/api -- src/applications src/tags` | ✅ | ✅ green |
| 03-07-T2 | 03-07 | 5 | AI-09 | — | — | unit (mapper) | `npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-07-T3 | 03-07 | 5 | AI-09 | — | — | component | `npm run test -w @tfm/web -- src/pods/application-edit src/pods/application-detail` | ✅ | ✅ green |
| 03-08-T1 | 03-08 | 6 | AI-01, AI-05 | — | Limits from contracts only | unit + component | `npm run test -w @tfm/contracts; npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-08-T2 | 03-08 | 6 | AI-05 | — | Abort on cancel/unmount | component | `npm run test -w @tfm/web -- src/pods/application-edit src/common` | ✅ | ✅ green |
| 03-09-T1 | 03-09 | 7 | AI-01, AI-02 | — | — | build + compose smoke | `npm run build && bash scripts/compose-smoke.sh --down` | ✅ | ✅ green (at execution, 03-09 SUMMARY; needs Docker, not re-run in audit) |
| 03-09-T2 | 03-09 | 7 | AI-02, AI-04 | — | — | manual model run | see Manual-Only | — | 🖐 manual |
| 03-09-T3 | 03-09 | 7 | AI-04 | — | — | human checkpoint | see Manual-Only | — | 🖐 manual |
| 03-10-T1 | 03-10 | 1 | AI-01, AI-04 | — | — | route tracer | `npm run test -w @tfm/api -- src/offers` | ✅ | ✅ green |
| 03-10-T2 | 03-10 | 1 | AI-04 | — | Prompt fingerprint pinned | unit + hash check | `npm run test -w @tfm/api -- src/offers` | ✅ | ✅ green |
| 03-10-T3 | 03-10 | 1 | AI-04 | — | — | doc grep | grep checks in PLAN | ✅ | ✅ green |
| 03-11-T1 | 03-11 | 2 | AI-06 | — | — | component | `npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-11-T2 | 03-11 | 2 | AI-06 | — | — | doc grep | grep checks in PLAN | ✅ | ✅ green |
| 03-12-T1 | 03-12 | 3 | AI-05 | — | — | component tracer | `npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-12-T2 | 03-12 | 3 | AI-05, AI-08 | — | — | component | `npm run test -w @tfm/web -- src/pods/application-edit` | ✅ | ✅ green |
| 03-12-T3 | 03-12 | 3 | AI-05 | — | — | doc grep | grep checks in PLAN | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🖐 manual-only*

---

## Requirement Coverage

| Requirement | Test files | Status |
|-------------|-----------|--------|
| AI-01 | `extract.routes.test.ts`, `contracts/schemas.test.ts`, `application.schema.test.ts` | COVERED |
| AI-02 | `llm.client.test.ts` (ollama / openai / mock, ping), `config.test.ts`, `app.test.ts` (`/api/health` llm) | COVERED |
| AI-03 | `structured-call.test.ts`, `extract.service.test.ts`, `extract.routes.test.ts` | COVERED |
| AI-04 | `extract.service.test.ts` (normalize, salary swap, tags, single log line), `extract.pipeline.test.ts`, `fixtures.test.ts`, `extract.routes.test.ts` (no body logging) | COVERED |
| AI-05 | `application-edit.ai.test.tsx` (open/collapsed/fold, «Analizando…», errors, cancel) | COVERED |
| AI-06 | `application-edit.merge.test.ts`, `application-edit.ai.test.tsx` (save only on «Guardar candidatura») | COVERED |
| AI-07 | `form-field.test.tsx`, `common-components.test.tsx` (TagChip), `application-edit.ai.test.tsx` | COVERED |
| AI-08 | `form-field.test.tsx`, `application-edit.ai.test.tsx` | COVERED |
| AI-09 | `applications.update.test.ts`, `application-edit.merge.test.ts`, `application-edit.ai.test.tsx` | COVERED |

Suite at audit: contracts 55 · api 271 · web 407 tests, all green; `npm run typecheck` green.

---

## Wave 0 Requirements

- [x] `packages/contracts`: `OFFER_TEXT_MIN` / `OFFER_TEXT_MAX` exported and used by the schema
- [x] `apps/api/src/offers/__fixtures__/*.txt` + `fixtures.ts` (3 offers, 50–20,000 chars)
- [x] `apps/api/src/offers/extract.service.test.ts`, `extract.routes.test.ts`, `apps/api/src/llm/structured-call.test.ts`
- [x] `apps/api/src/llm/llm.client.test.ts`: replace placeholder 502 tests with request-body/parsing tests
- [x] `apps/api/src/applications/applications.update.test.ts`: rewrite `offerText` assertions (PUT now persists it)
- [x] Web: `mergeExtractionIntoForm` mapper tests, panel/marks component tests, `ai-mark` and tag-chip mark tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real extraction quality with `gemma4:e2b` on the 3 fixtures (D-24) | AI-02, AI-04 | Depends on a live local model; non-deterministic | Run `apps/api/src/scripts/try-extract.ts` against Ollama, record the table in SUMMARY, bring prompt-quality decision to the user (D-25) |
| OpenAI-compatible path against a real vendor | AI-02 | No API key available | Covered by mocked `fetch` tests only |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-01 (validate-phase audit)

## Validation Audit 2026-11-01

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
