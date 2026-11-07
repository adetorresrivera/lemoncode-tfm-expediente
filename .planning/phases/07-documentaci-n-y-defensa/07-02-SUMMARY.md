---
phase: 07-documentaci-n-y-defensa
plan: 02
subsystem: docs
tags: [docs, ai, figures, git, cost, tokens, node]

requires:
  - phase: 07-01
    provides: scripts/check-docs.mjs with the --ia contract and the voice and provider rules
provides:
  - scripts/check-figures.mjs, which recomputes every figure of the AI doc from git and .planning at c11ab61
  - prose rules P1-P3 and the --prose flag that 07-05 and 07-06 reuse for the deck and the Q&A
  - docs/ia-en-el-proyecto.md with the six sections of the --ia contract
affects: [07-03, 07-05, 07-06]

actuals:
  tokens: 9100
  tasks: 3
  commits: 3
plan_head_before: b2eacbf567bd4c7f2103ae613aa29aac112a7089
plan_head_after: e916dc81ea89c9b3c331f28dae4944ed2adaaf1e

tech-stack:
  added: []
  patterns:
    - "Every development figure of a document lives in one block that a committed script recomputes; prose may only repeat those values"
    - "Cost = tokens measured on the real request times the public price, with each cell recomputed by the script"

key-files:
  created:
    - scripts/check-figures.mjs
    - docs/ia-en-el-proyecto.md
  modified:
    - scripts/check-docs.mjs

key-decisions:
  - "Figures are read from git at c11ab61 and from .planning through git show, never from the working tree, so Phase 7 files cannot move them"
  - "A figure the script cannot recompute is removed from the doc, not given a new key (review scores, stopwatch seconds, timeouts, the count of SUMMARY files with a TDD gate section)"
  - "Cloud input tokens use the JSON Schema without the $schema key, as openai.provider.ts sends it; the without-schema figure is stated as the lower bound"

requirements-completed: [PRES-03]

coverage:
  - id: D1
    description: "scripts/check-figures.mjs recomputes the 45 keys of the Cifras block (commits by type and phase, PRs, plans, summaries, durations) from git at c11ab61, plus the per-phase sum invariant and the test count with --tests"
    requirement: PRES-03
    verification:
      - kind: other
        ref: "node scripts/check-figures.mjs --tests (FIGURES OK, 73 cifras)"
        status: pass
      - kind: other
        ref: "RED proofs: commits_total 545, unknown key horas_reales and commits_raiz 0 each exit 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prose rules P1-P3 reject counted nouns without a Cifras key, review scores, timings, percentages and leftover placeholders in the doc and in files given with --prose"
    requirement: PRES-03
    verification:
      - kind: other
        ref: "RED proof with 16/24, 90 s, 35 SUMMARY and 53 % (4 FIGURE FAIL), RED proof with <prs> and <commits_total> (2 FIGURE FAIL), GREEN proof on real values"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs/ia-en-el-proyecto.md explains the GSD plus Claude Code loop, what worked and what did not with a source per claim, the AI inside the product and the local-versus-cloud cost"
    requirement: PRES-03
    verification:
      - kind: other
        ref: "node scripts/check-docs.mjs --ia (DOCS OK, 76 internal links, 0 problems)"
        status: pass
    human_judgment: true
    rationale: "Whether the 'Qué funcionó y qué no' section reads as the author's own honest account needs the author's review before the defense"
  - id: D4
    description: "Cost table: 3 fixtures measured on Ollama and recounted with o200k_base, six small OpenAI models priced from the public page, every average and every cost cell recomputed"
    requirement: PRES-03
    verification:
      - kind: other
        ref: "RED proof with 999,99 in one cell prints exactly one FIGURE FAIL: coste line"
        status: pass
    human_judgment: false

duration: ~60min
completed: 2026-11-07
status: complete
---

# Phase 7 Plan 02: AI doc and figure checker Summary

**`docs/ia-en-el-proyecto.md` tells how GSD and Claude Code built the project and how the model works inside it, and `scripts/check-figures.mjs` recomputes all 73 figures (git at `c11ab61`, `.planning/`, test count, token averages and every cloud-cost cell) and rejects any prose number that is not one of them.**

## Performance

- **Duration:** ~60 min (estimated; the start time was not recorded)
- **Completed:** 2026-11-07
- **Tasks:** 3 (Task 1 was the tracer)
- **Files created:** 2, modified: 1

## Accomplishments

- `node scripts/check-figures.mjs` prints `SKIP tests (usa --tests)` and `FIGURES OK (72 cifras)`; with `--tests` it runs the suite (59 + 467 + 890) and prints `FIGURES OK (73 cifras)` with no skip. All 45 keys of the «Cifras» block matched on the first run, and the PR tips are derived from the merge commits, not hard-coded.
- Unknown keys, mismatches, a broken per-phase sum (`suma_fases`), prose figures that are not «Cifras» values (P1, P2) and leftover `<clave>` placeholders (P3) all exit 1. `--prose <file>` applies the same prose rules to the deck and the Q&A in 07-05 and 07-06.
- The doc has the six sections the `--ia` contract expects. «Qué funcionó y qué no» has 11 sourced bullets, none with a count, score or timing beyond the «Cifras» values.
- The measurement was re-run against the devcontainer Ollama and matches RESEARCH exactly: Ollama 1004 / 884 / 922 input and 263 / 175 / 216 output tokens; `o200k_base` 1257 / 1145 / 1175 input with the schema, 925 / 813 / 843 without it, 219 / 150 / 180 output. Means 1192 / 860 / 183.
- Prices were re-fetched on 2026-11-07 from `developers.openai.com/api/docs/pricing` (Standard tier, parsed from the page data). The six rows are unchanged from RESEARCH. The cost per offer runs from the cheapest to the dearest model and is projected to 100 and 10 000 offers a month.

## Task Commits

1. **Task 1 (tracer): figures block and checker** - `4cb6e36` (feat)
2. **Task 2: what worked, the AI in the product, prose rules** - `1787164` (docs)
3. **Task 3: cost section and cost recomputation** - `e916dc8` (docs)

**Plan metadata:** the SUMMARY commit that follows this file.

## Verification

- Plan-level: `node scripts/check-figures.mjs --tests` -> `FIGURES OK (73 cifras)`; `node scripts/check-docs.mjs --ia` -> `DOCS OK`; `npm run lint`, `npm run typecheck` and `npm run test` pass (59 + 467 + 890 tests). `node scripts/check-docs.mjs --self-test` -> `SELF-TEST OK (28 casos)`.
- Task 1 acceptance: RED proofs for `commits_total: 545` (1 `FIGURE FAIL: commits_total`), an unknown `horas_reales` key (exit 1) and `commits_raiz: 0` (2 failures); the per-phase sum prints `SUMA OK 544`; heading and `c11ab61` greps pass.
- Task 2 acceptance: 11 bullets with a `.planning/` link (>= 8), 6 lines naming a gap-closure plan, decision or chip size (>= 6), 6 product-section lines (>= 6); RED proof with `16/24`, `90 s`, `35 SUMMARY` and `53 %` prints 4 failures; RED proof with `<prs>` and `<commits_total>` prints 2; the GREEN proof on real values exits 0.
- Task 3 acceptance: RED proof with `999,99` in one cost cell prints exactly 1 `FIGURE FAIL: coste` line; 6 `| gpt-` rows (>= 4); the pricing URL and the date `2026-11-07` are present; `gpt-` appears on no line outside the cost table; neither excluded provider appears; the scratch script is not tracked and `git diff` over `package.json`, `package-lock.json`, `apps` and `packages` is empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `check-docs.mjs --ia` took the first table of the cost section as the cost table**
- **Found during:** Task 3
- **Issue:** the plan asks for the token table first and the price table after it, but `checkIa` looked for the 100 and 10 000 header in the first `|` line of the section, which is the token table. The contract could not pass with the layout the plan describes.
- **Fix:** the check now looks for the header among all `|` lines of the section; the failure message is unchanged. The self-test still passes (28 cases).
- **Files modified:** scripts/check-docs.mjs
- **Commit:** `e916dc8`

**2. [Rule 3 - Blocking] The sandbox worktree had no `node_modules`**
- **Found during:** Task 1 setup
- **Issue:** `--tests`, ESLint and the pre-commit typecheck need the workspace dependencies.
- **Fix:** symlinked the main checkout's `node_modules` (root, `apps/api`, `apps/web`) into the worktree. They are untracked and gitignored; nothing was installed.

**Total deviations:** 2 auto-fixed (blocking). **Impact:** none on the contract; every acceptance criterion passes.

## Issues Encountered

- `docs/AI-EXTRACTION.md` line 62 already names both providers that D-16 excludes (reported by 07-01). The AI doc never names them, and the doc checker passes.
- The SUMMARY of 03-10 describes the guard and the `idioma` alias; the model-only `idiomas` field came later with quick task 261101-qh3. The doc says so in those words, as the plan's single sentence would have merged the two.

## Dependency justification (CLAUDE.md)

`js-tiktoken@1.0.21` was used for the `o200k_base` token counts of the cost table (D-15). It lived in a scratch directory outside the repository, installed with `--ignore-scripts`, and never entered any `package.json` or the lockfile; the package audit verdict was OK. It was installed (not the RESEARCH fallback counts) and the counts it produced equal the RESEARCH values. The scratch directory has been removed. The repository gains no dependency: the diff over `package.json`, `package-lock.json`, `apps` and `packages` is empty.

## Known Stubs

None.

## Threat Flags

None. The scratch script printed only fixture names and counts, sent the three committed fixtures to the local Ollama only, and was deleted. The price source is the official page, cited with its access date.

## Next Phase Readiness

Ready for 07-03, which depends on this plan: the Ollama measurement is finished, so the AI-marks capture can load the CPU. 07-05 and 07-06 call `node scripts/check-figures.mjs --prose <file>` for the deck and the Q&A.

## Self-Check: PASSED

- FOUND: scripts/check-figures.mjs
- FOUND: docs/ia-en-el-proyecto.md
- FOUND: scripts/check-docs.mjs
- FOUND commit 4cb6e36
- FOUND commit 1787164
- FOUND commit e916dc8
