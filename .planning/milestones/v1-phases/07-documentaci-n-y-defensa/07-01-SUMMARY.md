---
phase: 07-documentaci-n-y-defensa
plan: 01
subsystem: docs
tags: [docs, adr, link-checker, node, markdown]

requires:
  - phase: 06-pulido-de-demo
    provides: tree at c11ab61 (README and docs/ baseline, compose.yml pins)
provides:
  - scripts/check-docs.mjs with generic link, anchor, image, voice, provider and secret checks
  - doc-contract flags --adr, --ia, --demo, --deck, --qa, --readme, --captures, --all and --self-test
  - docs/decisiones.md with ADR-001 to ADR-012 (D-18)
affects: [07-02, 07-03, 07-04, 07-05, 07-06]

actuals:
  tokens: 14998
  tasks: 3
  commits: 2
plan_head_before: 24528f8280f7ff58ba0692e13f6d54acaa5fbbfb
plan_head_after: 30873ec1896ae10a11bc5d56cda97232ed74273a

tech-stack:
  added: []
  patterns:
    - "Doc contracts as executable flags of one dependency-free Node script, each proven by a self-test that breaks one rule at a time"

key-files:
  created:
    - scripts/check-docs.mjs
    - docs/decisiones.md
  modified: []

key-decisions:
  - "All doc contracts of the phase live in scripts/check-docs.mjs (interface first); later plans only write documents and run their flag"
  - "ADR-005 records only the rationale on record (fork mantenido de MinIO, compatible con el SDK de AWS) plus cited external facts; the author confirms or completes it in 07-06 Task 1"
  - "ADR-011 states that the sha256 fingerprint is a plan-time check and that the test compares the prompt byte a byte"

requirements-completed: [PRES-04]

coverage:
  - id: D1
    description: "scripts/check-docs.mjs checks every relative link, image and anchor of README.md and docs/**/*.md and enforces voice, provider and secret rules (6 files, 9 links, 0 problems at the plan baseline)"
    requirement: PRES-04
    verification:
      - kind: other
        ref: "node scripts/check-docs.mjs (DOCS OK)"
        status: pass
      - kind: other
        ref: "node scripts/check-docs.mjs --self-test (SELF-TEST OK, 28 casos)"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/decisiones.md holds ADR-001 to ADR-012 in D-18 order, each with Contexto, Decisión, Alternativas, Consecuencias and a Fuentes line"
    requirement: PRES-04
    verification:
      - kind: other
        ref: "node scripts/check-docs.mjs --adr (DOCS OK)"
        status: pass
    human_judgment: true
    rationale: "Whether each ADR reads as the author's reasoning, and ADR-005 in particular, needs the author's confirmation (blocking checkpoint in 07-06 Task 1)"
  - id: D3
    description: "Doc-contract flags for the other deliverables exit 1 with 'CHECK FAIL: <path> missing' until their documents exist"
    requirement: PRES-04
    verification:
      - kind: other
        ref: "for f in --ia --demo --deck --qa --captures --readme; do node scripts/check-docs.mjs $f; done (each exit 1)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-07
status: complete
---

# Phase 7 Plan 01: Docs checker and ADR log Summary

**Dependency-free `scripts/check-docs.mjs` (links, anchors, images, voice, D-16 providers, secrets, one structural contract per phase deliverable, 28-case self-test) plus `docs/decisiones.md` with the 12 ADRs of D-18.**

## Performance

- **Duration:** ~25 min (estimated; the start time was not recorded)
- **Completed:** 2026-11-07
- **Tasks:** 3 (Task 3 produced no separate commit, see Deviations)
- **Files created:** 2

## Accomplishments

- `node scripts/check-docs.mjs` runs in well under a second and prints `7 files, 52 internal links, 0 problems` and `DOCS OK` on the current tree. At the plan baseline (before `docs/decisiones.md`) it printed `6 files, 9 internal links, 0 problems`. Broken links print `BROKEN`, bad anchors `BAD ANCHOR`, rule failures `CHECK FAIL: <file>:<line> <reason>`; an unknown flag exits 2.
- The generic voice rules apply to the five phase docs and the README: no emoji, no `¡` or `!` in prose, no excluded provider (built from fragments so the script does not spell them), `gpt-` only on table rows of the cost section of the AI doc, no secret-shaped string.
- The mode flags `--adr`, `--ia`, `--demo`, `--deck` (`--deck-total=m:ss`), `--qa`, `--readme`, `--captures` and `--all` encode the whole contract of the phase. Each prints `CHECK FAIL: <path> missing` and exits 1 until its document exists (measured now: `--ia`, `--demo`, `--deck`, `--qa`, `--readme`, `--adr` one missing item each; `--captures` five).
- `--self-test` builds a valid fixture tree (README, five phase docs, a source file for the snippet check, five PNGs) and applies 27 single breaking changes; each must produce a problem containing the expected text. Output: `SELF-TEST OK (28 casos)`.
- `docs/decisiones.md` holds ADR-001 to ADR-012 in D-18 order. `--adr` passes. ADR-005 states only the recorded rationale and cited external facts (MinIO CE maintenance mode 2025-12-03, archived 2026-02-12; SeaweedFS, RustFS, Garage as alternatives). ADR-011 says the fingerprint is checked at plan time and that a test compares the prompt byte a byte.

## Task Commits

1. **Task 1 (tracer): link, anchor and voice checker** - `ab320e8` (feat). It contains the whole script, not only the generic part (see Deviations).
2. **Task 2: ADR log** - `30873ec` (docs)
3. **Task 3: contracts and self-test** - no separate commit; the work is in `ab320e8`. Its `<verify>` was run on the final tree and passed.

**Plan metadata:** the SUMMARY commit that follows this file.

## Verification

- Branch gate: the main checkout is on `phase/07-documentacion-defensa` (`git worktree list --porcelain` first block). Commits were made from the agent worktree branch `worktree-agent-ac7318a9e3d0215b9`, which the orchestrator merges.
- `node scripts/check-docs.mjs` -> `DOCS OK`; `--adr` -> `DOCS OK`; `--self-test` -> `SELF-TEST OK (28 casos)`.
- `npx eslint scripts/check-docs.mjs --max-warnings=0` -> clean; `npm run lint`, `npm run typecheck`, `npm run test` -> all pass (890 web tests plus the API and contracts suites).
- Task 1 RED proofs: a README with a broken link exits 1 with one `BROKEN` line; a docs file naming an excluded provider exits 1; `--nope` exits 2.
- Task 2 counts: 12 ADR headings, 12 of each sub-heading, 12 `Fuentes:` lines, `compatible con el SDK de AWS`, `vonng.com`, `infoq.com`, `byte a byte` and `deeed808` present, 0 mentions of the excluded providers.
- `git diff --name-only c11ab61 HEAD -- apps packages package.json package-lock.json` -> empty. No dependency added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESLint `no-undef` for `Buffer`**
- **Found during:** Task 1 verify
- **Issue:** the self-test builds PNG headers with `Buffer`; the plan's header only declares `console` and `process`.
- **Fix:** second comment line `/* global Buffer */`. Line 1 stays `/* global console, process */` as the acceptance criterion requires.
- **Files modified:** scripts/check-docs.mjs
- **Commit:** `ab320e8`

### Process deviation

**2. Whole script committed in Task 1.** The plan splits the script across three tasks (generic part, `--adr`, then the other flags and the self-test). I wrote the script once and committed it in Task 1. Task 2 therefore only commits `docs/decisiones.md`, and Task 3 has no commit of its own; its acceptance criteria and `<verify>` were run and pass. The tracer check (a full end-to-end run on the repository) passed before expansion.

**3. Stricter secret regex.** The `sk-` pattern has a word boundary (`\bsk-...`) so words ending in "sk" followed by a long slug, such as `task-...`, do not trip it. Real keys still match.

**Total deviations:** 1 auto-fixed (blocking), 2 process notes. **Impact:** none on the contract; every acceptance criterion passes.

## Issues Encountered

- `docs/AI-EXTRACTION.md` line 62 already names both providers that D-16 excludes. It is an existing spec document (`CLAUDE.md`: do not change the spec docs without asking), so it is outside the provider rule and outside this phase. Reporting it to the user as the plan asked.
- ADR-005 is not final until the author answers the blocking `checkpoint:decision` of 07-06 Task 1.

## Known Stubs

None.

## Threat Flags

None. The script reads local files only and the ADRs cite repository paths and public URLs.

## Next Phase Readiness

Ready for 07-02: `scripts/check-docs.mjs --ia` is red until `docs/ia-en-el-proyecto.md` exists, and every later plan has its flag waiting.

## Self-Check: PASSED

- FOUND: scripts/check-docs.mjs
- FOUND: docs/decisiones.md
- FOUND commit ab320e8
- FOUND commit 30873ec
