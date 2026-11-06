---
phase: "6"
slug: "pulido-de-demo"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-06"
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 (contracts node; api node with real Mongo `tfm_test` + Silo `tfm-assets-test`, `fileParallelism: false`; web jsdom + Testing Library) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` (`setupFiles: ./src/test/setup.ts`), contracts defaults |
| **Quick run command** | `npm run test -w @tfm/api -- src/scripts` · `npm run test -w @tfm/web -- src/<path>` |
| **Full suite command** | `npm run typecheck && npm run test && npm run lint` |
| **Estimated runtime** | ~20 seconds warm (baseline: contracts 57, api 407, web 615 tests) |

---

## Sampling Rate

- **After every task commit:** Run the touched workspace's targeted command
- **After every plan wave:** Run `npm run typecheck && npm run test && npm run lint`
- **Before `/gsd-verify-work`:** Full suite + `npm run build` + `bash scripts/compose-smoke.sh --down` + `bash scripts/compose-smoke.sh --cold` must be green
- **Max feedback latency:** 30 seconds (targeted), compose smoke excluded

---

## Per-Task Verification Map

Filled by the planner/executor per PLAN.md. Requirement → test map from RESEARCH:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DEMO-01 | `buildSeedPlan` shape (12 apps, all statuses, 3 with rounds, dates in window, no mock-draft collisions) | unit | `npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts` | ❌ W0 | ⬜ pending |
| DEMO-01 | Two runs leave 12 seed apps / 3 docs, histories coherent, `--reset` wipes all, `seed` not exposed | integration | `npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts` | ❌ W0 | ⬜ pending |
| DEMO-01 / DEMO-05 | Seed + mock extraction work in the image after cold start | compose smoke | `bash scripts/compose-smoke.sh --cold` | ❌ W0 | ⬜ pending |
| DEMO-02 | README covers run/seed/`--reset`/mock/`LLM_MODEL`/fixtures, no phase notes | grep | `grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md` | n/a | ⬜ pending |
| DEMO-03 | 360 px risk-point guards on screens S1-S11 (D-12) plus shell class backstops | component | `npm run test -w @tfm/web -- src/test/responsive.test.tsx src/layouts src/common` | ❌ W0 (`src/test/responsive.test.tsx`, plan 06-11) | ⬜ pending |
| DEMO-03 / DEMO-04 | Loading, error and empty states of list, detail, form and documents (D-11) | component | `npm run test -w @tfm/web -- src/test/view-states.test.tsx` | ❌ W0 (`src/test/view-states.test.tsx`, plan 06-11) | ⬜ pending |
| DEMO-04 | axe (non-contrast) on list, detail, form, documents, dialog, Sheet, error screens | component | `npm run test -w @tfm/web -- src/test src/core/router` | ❌ W0 | ⬜ pending |
| DEMO-04 | AA contrast of token pairs, light and dark | unit | `npm run test -w @tfm/web -- src/common/lib/contrast.test.ts` | ❌ W0 | ⬜ pending |
| DEMO-06 | Mapper gaps closed, DOMAIN rules traced, 05 WR-01 stable | unit/component | `npm run test -w @tfm/web -- src/pods` · `npm run test -w @tfm/api -- src/applications src/documents` | partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/scripts/seed/seed.plan.test.ts`, `seed.run.test.ts` — DEMO-01 (D-10)
- [ ] `apps/web/src/test/axe.ts` + axe tests; `axe-core` devDependency — DEMO-04 (D-13)
- [ ] `apps/web/src/common/lib/contrast.ts` + `contrast.test.ts` — DEMO-04
- [ ] Mapper unit tests (web pods + api mappers) — DEMO-06 (D-23)
- [ ] `--cold` mode in `scripts/compose-smoke.sh` — DEMO-01/05 (D-15)
- [ ] `apps/web/src/test/view-states.test.tsx` and `apps/web/src/test/responsive.test.tsx` — DEMO-03/04 (D-11, D-12)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No horizontal scroll at 360/768/1280, both themes | DEMO-03 | No browser in the devcontainer; jsdom has no layout | Walk screens S1-S11 at each viewport, record in UAT; every reported overflow is fixed with a guard in 06-17 Task 3 |
| Full keyboard walkthrough, visible focus, reduced motion | DEMO-04 | Real focus rendering needs a browser | Tab through the demo flow, record in UAT |
| Demo flow under 2 minutes with Ollama and with mock | DEMO-05 | Timed human run | Run the flow twice with a timer, record times in UAT |
| README screenshot | DEMO-02 | Needs a browser capture | Capture seeded list, light theme, store as `docs/img/application-list.png` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
