---
phase: "03"
slug: "autocompletado-con-ia"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-31"
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
| (filled by planner/executor per PLAN.md tasks) | | | AI-01..AI-09 | | Offer text never logged | unit / route / component | see RESEARCH.md § Validation Architecture | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/contracts`: `OFFER_TEXT_MIN` / `OFFER_TEXT_MAX` exported and used by the schema
- [ ] `apps/api/src/offers/__fixtures__/*.txt` + `fixtures.ts` (3 offers, 50–20,000 chars)
- [ ] `apps/api/src/offers/extract.service.test.ts`, `extract.routes.test.ts`, `apps/api/src/llm/structured-call.test.ts`
- [ ] `apps/api/src/llm/llm.client.test.ts`: replace placeholder 502 tests with request-body/parsing tests
- [ ] `apps/api/src/applications/applications.update.test.ts`: rewrite `offerText` assertions (PUT now persists it)
- [ ] Web: `mergeExtractionIntoForm` mapper tests, panel/marks component tests, `ai-mark` and tag-chip mark tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real extraction quality with `gemma4:e2b` on the 3 fixtures (D-24) | AI-02, AI-04 | Depends on a live local model; non-deterministic | Run `apps/api/src/scripts/try-extract.ts` against Ollama, record the table in SUMMARY, bring prompt-quality decision to the user (D-25) |
| OpenAI-compatible path against a real vendor | AI-02 | No API key available | Covered by mocked `fetch` tests only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
