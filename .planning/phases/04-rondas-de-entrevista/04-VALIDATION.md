---
phase: "4"
slug: "rondas-de-entrevista"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-01"
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 — API (node, real Mongo `tfm_test`, `fileParallelism: false`); web (jsdom, Testing Library, user-event) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `npm run test -w @tfm/api -- src/applications` · `npm run test -w @tfm/web -- src/pods/application-detail src/common` |
| **Full suite command** | `npm run typecheck && npm run test && npm run lint` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the API or web quick command matching the task
- **After every plan wave:** Run `npm run typecheck && npm run test && npm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner / executor) | — | — | INT-01..05, APP-13 | — | `$literal` on client strings; body validated with `interviewInputSchema` | integration / component | see quick commands | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/applications/applications.interviews.test.ts` — INT-01..04, APP-13 (modelled on `applications.status.test.ts`)
- [ ] `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx` — mapper, dialog, busy guard, focus return
- [ ] Extend `apps/web/src/common/lib/format.test.ts` — `formatDateTime`, local↔ISO helpers with `vi.stubEnv("TZ")`
- [ ] Update `application-detail.test.tsx` (~535 «never renders interview rounds», ~1079 status-region count)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native datetime-local picker rendering | INT-01 | Browser-native control, not rendered by jsdom | Open «Añadir ronda» in Chrome/Firefox/Safari, pick a date and time |
| Dialog at 360 px with soft keyboard | INT-01 | Viewport + virtual keyboard | Mobile emulation 360 px, fill the form, check nothing is cut off |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
