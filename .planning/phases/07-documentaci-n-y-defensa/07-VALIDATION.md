---
phase: "7"
slug: "documentaci-n-y-defensa"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-07"
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing suite) + Node scripts without framework for doc checks |
| **Config file** | per workspace; none needed for doc checks — Wave 0 adds `scripts/check-docs.mjs` |
| **Quick run command** | `node scripts/check-docs.mjs` |
| **Full suite command** | `npm run typecheck && npm run test` |
| **Estimated runtime** | ~45 seconds (full); ~2 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/check-docs.mjs` (once it exists) + `npm run typecheck`
- **After every plan wave:** Run `npm run typecheck && npm run test` + `node scripts/check-figures.mjs`
- **Before `/gsd-verify-work`:** Full suite and all doc checks must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-T1 | 07-01 | 1 | PRES-04 (all docs: links) | T-07-01 | No secret-shaped string, no excluded provider in phase docs | script | `node scripts/check-docs.mjs && npx eslint scripts/check-docs.mjs --max-warnings=0` | ❌ W0 (created by this task) | ⬜ pending |
| 07-01-T2 | 07-01 | 1 | PRES-04 | T-07-02 | ADR-005 states only the recorded rationale | script | `node scripts/check-docs.mjs --adr` | ❌ W0 | ⬜ pending |
| 07-01-T3 | 07-01 | 1 | PRES-01 … PRES-05 (contracts) | T-07-03 | No rule can pass on invalid input | script | `node scripts/check-docs.mjs --self-test && node scripts/check-docs.mjs --adr && npm run lint && npm run typecheck && npm run test` | ❌ W0 | ⬜ pending |
| 07-02-T1 | 07-02 | 2 | PRES-03 | T-07-06 | Every figure recomputed from git and .planning | script | `node scripts/check-figures.mjs && node scripts/check-docs.mjs` | ❌ W0 (created by this task) | ⬜ pending |
| 07-02-T2 | 07-02 | 2 | PRES-03 | T-07-06 | Every claim links its source | script | `node scripts/check-docs.mjs && node scripts/check-figures.mjs` | ✅ after 07-02-T1 | ⬜ pending |
| 07-02-T3 | 07-02 | 2 | PRES-03 | T-07-04, T-07-05, T-07-SC | Offer text never printed; official price source; scratch-only install | script | `node scripts/check-figures.mjs --tests && node scripts/check-docs.mjs --ia && npm run lint && npm run typecheck && npm run test` | ✅ after 07-02-T1 | ⬜ pending |
| 07-03-T1 | 07-03 | 2 | PRES-01, PRES-02 | T-07-SC | Packages verified by a human before any install (blocking-human) | checkpoint | `docker image inspect mcr.microsoft.com/playwright:v1.56.1-noble --format '{{.Id}}'` plus the recorded resume signal | n/a | ⬜ pending |
| 07-03-T2 | 07-03 | 2 | PRES-02 | T-07-07, T-07-10 | Container on the compose network only, removed after use | script | `bash -n scripts/browser-tools.sh && node scripts/check-docs.mjs --captures` (read-only re-check; the capture itself is 07-03 Task 2 `<automated>`) | ❌ W0 | ⬜ pending |
| 07-03-T3 | 07-03 | 2 | PRES-01, PRES-02 | T-07-08, T-07-09 | No write to the user's data; no personal data in images | script | `bash scripts/browser-tools.sh mermaid --self-test && node scripts/check-docs.mjs --captures && npm run typecheck && npm run test` | ❌ W0 | ⬜ pending |
| 07-04-T1 | 07-04 | 3 | PRES-02 | T-07-13 | Labels match the real UI | script | 07-04 Task 1 `<automated>` (prints `GUION OK 10 300`) | ❌ W0 | ⬜ pending |
| 07-04-T2 | 07-04 | 3 | PRES-02 | T-07-11, T-07-12 | `--reset` only by the presenter; only committed fixtures | script | `node scripts/check-docs.mjs --demo && npm run typecheck && npm run test` | ✅ after 07-04-T1 | ⬜ pending |
| 07-05-T1 | 07-05 | 4 | PRES-01 | T-07-15 | Figures copied from «Cifras» | script | 07-05 Task 1 `<automated>` (prints `DECK SPINE OK 11 900`) | ❌ W0 | ⬜ pending |
| 07-05-T2 | 07-05 | 4 | PRES-01 | T-07-14, T-07-16 | Snippets byte-identical to the repository | script | `node scripts/check-docs.mjs --deck && npm run typecheck && npm run test` · `bash scripts/browser-tools.sh mermaid docs/presentacion/deck.md` (SKIP if 07-03 recorded «approved without mermaid») | ✅ after 07-05-T1 | ⬜ pending |
| 07-06-T1 | 07-06 | 5 | PRES-05 | T-07-17 | Answers agree with ADRs and figures | script | `node scripts/check-docs.mjs --qa` | ❌ W0 | ⬜ pending |
| 07-06-T2 | 07-06 | 5 | PRES-01 … PRES-05 (README) | T-07-18 | Additions only, no secret | script | `node scripts/check-docs.mjs --readme` | ✅ (README exists) | ⬜ pending |
| 07-06-T3 | 07-06 | 5 | PRES-01 … PRES-05 (gate) | T-07-19 | No product, config or manifest change; no video tracked | script | `node scripts/check-docs.mjs --all && node scripts/check-figures.mjs --tests && npm run lint && npm run typecheck && npm run test` · 07-06 Task 3 second `<automated>` (product diff and video check) | ✅ after 07-01 … 07-05 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky* — task IDs filled at planning time (6 plans, 16 tasks); 07-06 Task 3 runs every row once and records the results under «## Gate evidence (07-06)».

---

## Wave 0 Requirements

- [ ] `scripts/check-docs.mjs` (07-01) — links/anchors/images, voice and D-16 rules, one contract flag per deliverable (deck snippet byte-compare included), `--self-test` (header `/* global console, process */`)
- [ ] `scripts/check-figures.mjs` (07-02) — figure recomputation anchored on `c11ab61` and `9c70231`, cost arithmetic, `--tests`
- [ ] `scripts/browser-tools.sh` (07-03) — host runner for the throwaway Playwright container (`capture`, `mermaid`, `mermaid --self-test`)
- [ ] `docs/presentacion/capturas/capture.mjs` (07-03) — reproducible screenshot recipe (container-only, not linted)
- [ ] `docs/presentacion/mermaid-check.mjs` (07-03) — Mermaid parse check (container-only, not linted)
- No new test framework; no new dependency.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mermaid renders on GitHub | PRES-01 | Needs the GitHub preview | Open the PR file view for `deck.md` and `ia-en-el-proyecto.md` |
| Demo rehearsal fits 5:00 | PRES-02 | Human timing | Run the script with a stopwatch over a fresh seed |
| ADR 5 rationale (Silo vs SeaweedFS/RustFS) | PRES-04 | Author's reasoning not recorded in `.planning/` | Author confirms or edits the ADR text |
| Plan C video recorded | PRES-02 | Recorded by the user, not committed (D-10) | User records following the demo script |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
