---
phase: "4"
slug: "rondas-de-entrevista"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 04-01-T1 | 04-01 | 1 | INT-01, INT-02, INT-04, APP-13 | T-04-01, T-04-02 | `$literal` on client values; body validated with `interviewInputSchema`; id generated server-side | integration (real Mongo) + component | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` · `npm run test -w @tfm/web -- src/pods/application-detail src/core/router && npm run typecheck` | ✅ | ✅ green |
| 04-01-T2 | 04-01 | 1 | INT-01, INT-02, INT-04 | T-04-03, T-04-04, T-04-05, T-04-06 | 400/404 boundaries, `$title` stored verbatim, concurrent creates atomic, no logging | integration + component | `npm run test -w @tfm/api -- src/applications` · `npm run test -w @tfm/web -- src/pods/application-detail src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ | ✅ green |
| 04-02-T1 | 04-02 | 2 | INT-01 | T-04-08 | unparsable date reported, never dropped; UTC ISO sent | unit (fixed TZ) + component | `npm run test -w @tfm/web -- src/common src/pods/application-detail` · `npm run typecheck` | ✅ | ✅ green |
| 04-02-T2 | 04-02 | 2 | INT-05 | T-04-09 | notes rendered as a text node | unit + component | `npm run test -w @tfm/web -- src/common src/pods/application-detail src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ | ✅ green |
| 04-03-T1 | 04-03 | 3 | INT-03, INT-02, APP-13 | T-04-10, T-04-11, T-04-12 | per-key `$set` with `arrayFilters` (stored round kept when absent, D-28); body id ignored; `$pull` without renumbering; no resurrection; status untouched | integration (real Mongo) | `npm run test -w @tfm/api -- src/applications` · `npm run typecheck` | ✅ | ✅ green |
| 04-03-T2 | 04-03 | 3 | INT-03, APP-13 | T-04-11 | edit-mode «Ronda» required, no client round numbering (D-28) | component + hook | `npm run test -w @tfm/web -- src/pods/application-detail src/core/router && npm run typecheck` | ✅ | ✅ green |
| 04-03-T3 | 04-03 | 3 | INT-03, APP-13 | T-04-13 | confirmation dialog; one DELETE in flight | component + gate | `npm run test -w @tfm/web -- src/pods/application-detail src/core/router` · `npm run typecheck && npm run test && npm run lint` | ✅ | ✅ green |
| 04-04-T1 | 04-04 | 4 | INT-01, INT-03, INT-04 | T-04-15 | one mutation at a time; select aria-disabled during round saves | component | `npm run test -w @tfm/web -- src/pods/application-detail src/core/router && npm run typecheck` | ✅ | ✅ green |
| 04-04-T2 | 04-04 | 4 | INT-01, INT-03, INT-04 | T-04-16 | smoke deletes its application | phase gate + compose smoke | `npm run typecheck && npm run lint && npm run test && npm run build` · `docker compose version && bash scripts/compose-smoke.sh --down` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

The code-review fixes made after execution are covered too. WR-01 (`57aa1db`) added three tests: a stored date is kept when only another field is edited, a new date is sent once the control changes, and the mapper keeps, changes or clears the date. WR-02 (`501d46f`) added two: the mutation lock is scoped to one application, and no success timer is armed after unmount. All five live in `application-detail.interviews.test.tsx` and pass in the 2026-11-03 audit.

---

## Wave 0 Requirements

- [x] `apps/api/src/applications/applications.interviews.test.ts` — INT-01..04, APP-13 (modelled on `applications.status.test.ts`); created by 04-01 Task 1, extended by 04-01 Task 2 and 04-03 Task 1
- [x] `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx` — mapper, dialog, list, edit/delete, busy guard, focus return; created by 04-02 Task 1 (the 04-01 web tests live in `application-detail.test.tsx` to keep the tracer under the file limit)
- [x] Extend `apps/web/src/common/lib/format.test.ts` — `formatDateTime`, local↔ISO helpers with `vi.stubEnv("TZ")`; 04-02
- [x] Update `application-detail.test.tsx` in 04-01 Task 1 (~L72 strict VM test, ~L535 rounds/documents test reduced to documents, ~L1079 status-region count 2 → 3, idle `interviewActions` in the three direct renders); 04-03 Tasks 2 and 3 add `update`/`remove` no-ops to that helper

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native datetime-local picker rendering | INT-01 | Browser-native control, not rendered by jsdom | Open «Añadir ronda» in Chrome/Firefox/Safari, pick a date and time |
| Dialog at 360 px with soft keyboard | INT-01 | Viewport + virtual keyboard | Mobile emulation 360 px, fill the form, check nothing is cut off |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (every workspace runs `vitest run`)
- [x] Feedback latency < 60s (full gate ~24 s; compose smoke ~31 s with a warm image cache)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-03 (Nyquist audit: 6 requirements covered, 0 partial, 0 missing; contracts 55, api 317, web 496 tests green; compose smoke `SMOKE OK`)

## Validation Audit 2026-11-03

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
