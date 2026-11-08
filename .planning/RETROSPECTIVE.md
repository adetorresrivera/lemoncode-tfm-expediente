# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1 — MVP

**Shipped:** 2026-11-08
**Phases:** 7 | **Plans:** 68 | **Sessions:** not tracked

### What Was Built
- Walking skeleton under `docker compose up`: monorepo, `@tfm/contracts`, Hono API with real health, themed shell (Phase 1)
- Applications tracker with URL-synced filters, detail, atomic status history and a shared create/edit form (Phase 2)
- AI autofill from a pasted offer through a swappable `LlmClient`, filling only empty fields with «IA» marks and proposed tags (Phase 3)
- Interview rounds with the `enviada → en_entrevistas` rule, and CV / cover letters in Silo linked from the form (Phases 4-5)
- Repeatable, accessible demo (seed, README, 360 px, keyboard, axe AA) and script-checked defense material (Phases 6-7)

### What Worked
- One vertical slice per phase on a fixed date, with the walking skeleton first: every later phase shipped on a running image, and the compose smoke grew with each feature.
- Defining every contracts schema in Phase 1 (FND-02): later phases added behavior only, and web/API never drifted.
- UAT with gap-closure plans: Phase 3 (03-10..03-12) and Phase 5 (05-10, 05-11) closed real UI and model issues found by the author before the PR.
- Human gates where they mattered: the prompt fingerprint (D-25), the only new runtime dependency (`@tanstack/react-form`), timed demo runs by the author.
- Docs as code in Phase 7: `check-docs.mjs` and `check-figures.mjs` kept every figure and link in the defense material backed by the repo.

### What Was Inefficient
- Debug sessions were diagnosed, then fixed through gap-closure plans, but their own status was never closed, so they surfaced as open items at milestone close.
- Verification went stale for phases 1-6 because later phases touched covered files; no milestone audit was run before close.
- The pre-commit hook runs the whole suite, so TDD plans could not commit RED and GREEN separately.
- Environment drift: the GSD install hard-codes `/workspaces/TFM/.claude` and needed a symlink; a Vitest worker-start flake needed a retry wrapper (06-13).
- Review findings (WR/IN) accumulated in `*-REVIEW-DISPOSITION.md` files; Phase 6 paid off part of the Phase 2 debt but several advisories remain.

### Patterns Established
- Course pod architecture (api / vm / mapper / hooks / container / component) with mappers tested so the API never leaks `_id` or storage-only fields.
- Mutations of a sub-document go through the parent service in one pipeline `findOneAndUpdate` (status, rounds, `updatedAt`).
- File type by magic bytes plus extension, no library; S3 object compensation when the metadata insert fails.
- 44 px targets, `motion-safe:` animations and axe in both themes as build failures, not defense-day surprises.
- Stacked PRs, one per phase branch `phase/NN-nombre`.

### Key Lessons
1. Close a debug session in the same plan that fixes it, so the milestone audit reflects reality.
2. Run `/gsd-audit-milestone` (or re-verify) on the last phase day, not after shipping; stale verification is cheap to refresh then.
3. Measure the local model early on the target hardware: gemma4:e2b on CPU timing out shaped prompts, timeouts and the mock plan B.
4. Keep the pre-commit fast (lint + typecheck) and move the full suite to pre-push if TDD history matters.

### Cost Observations
- Model mix: not tracked (adaptive model profile)
- Sessions: not tracked
- Notable: 68 plans in 13 days; the largest phase (Phase 6, 17 plans) was polish and testing, not features.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1 | — | 7 | First GSD milestone: fixed 7-phase roadmap, UAT gap-closure plans, docs checked by scripts |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1 | 1416 (Phase 6 gate) | not measured | 1 runtime (`@tanstack/react-form`), 1 dev (`axe-core`) |

### Top Lessons (Verified Across Milestones)

1. (Pending a second milestone.)
