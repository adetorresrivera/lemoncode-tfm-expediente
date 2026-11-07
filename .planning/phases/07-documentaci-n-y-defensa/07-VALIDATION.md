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
| 7-xx-xx | TBD | TBD | PRES-01 | — | N/A | script | `node scripts/check-docs.mjs --deck` | ❌ W0 | ⬜ pending |
| 7-xx-xx | TBD | TBD | PRES-02 | — | N/A | script | `node scripts/check-docs.mjs --demo` | ❌ W0 | ⬜ pending |
| 7-xx-xx | TBD | TBD | PRES-03 | — | N/A | script | `node scripts/check-figures.mjs` | ❌ W0 | ⬜ pending |
| 7-xx-xx | TBD | TBD | PRES-04 | — | N/A | script | `node scripts/check-docs.mjs` (12 `## ADR-` with 4 sub-headings) | ❌ W0 | ⬜ pending |
| 7-xx-xx | TBD | TBD | PRES-05 | — | N/A | script | `node scripts/check-docs.mjs` (15 questions, 2–4 sentences) | ❌ W0 | ⬜ pending |
| 7-xx-xx | TBD | TBD | All | — | No secrets or full offer text in docs | grep | `node scripts/check-docs.mjs` (links, anchors, images, voice, no Gemini/Groq) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky* — the planner fills task IDs; see `07-RESEARCH.md` § Validation Architecture.

---

## Wave 0 Requirements

- [ ] `scripts/check-docs.mjs` — links/anchors/images/required sections/voice checks (header `/* global console, process */`)
- [ ] `scripts/check-figures.mjs` (or flags on one script) — figure recomputation anchored on `c11ab61`, snippet byte-compare
- [ ] `docs/presentacion/capturas/capture.mjs` — reproducible screenshot recipe (not linted)
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
