---
phase: 07-documentaci-n-y-defensa
plan: 06
subsystem: docs
tags: [docs, examiner-questions, readme, phase-gate, validation]
status: complete

requires:
  - phase: 07-01
    provides: check-docs.mjs contracts (--qa, --readme, --all) and the ADR log
  - phase: 07-02
    provides: the «Cifras» block, the cost section and check-figures.mjs --prose
  - phase: 07-03
    provides: the five captures and the Mermaid parse
  - phase: 07-04
    provides: docs/presentacion/demo-script.md
  - phase: 07-05
    provides: docs/presentacion/deck.md
provides:
  - docs/presentacion/preguntas-tribunal.md, fifteen examiner questions with short answers that link their ADR or AI-doc section
  - README.md with «Próximos pasos» and links to the five defense documents
  - 07-VALIDATION.md closed with the phase gate evidence (16 commands, all exit 0)
affects: []

actuals:
  tokens: 6900
  tasks: 3
  commits: 3
plan_head_before: 2cd33554b6ce66be3695304f27a260242fc83c1b
plan_head_after: edc0aee12a14f90639cbcb98b7911feeadf2d5f5

tech-stack:
  added: []
  patterns:
    - "Every figure in the examiner answers is copied from a named source block of the AI doc and checked by check-figures.mjs --prose"

key-files:
  created:
    - docs/presentacion/preguntas-tribunal.md
  modified:
    - README.md
    - .planning/phases/07-documentaci-n-y-defensa/07-VALIDATION.md

key-decisions:
  - "ADR-005 left exactly as 07-01 wrote it: the author replied «as-written»; answer 15 cites it and adds no reason of its own"
  - "Answer 6 names three changes from the sources: e2e from the first phases (E2E-01), per-application mutation locks (04 WR-01) and measuring plan time from day one (55 de 62 SUMMARY con duration)"
  - "«Próximos pasos» uses the six bullets of the plan in the same order as slide 11, with the requirement IDs in parentheses"

requirements-completed: [PRES-01, PRES-02, PRES-03, PRES-04, PRES-05]

duration: 40min
completed: 2026-11-07
---

# Phase 7 Plan 06: Examiner questions, README and phase gate Summary

**Fifteen examiner questions with 2-to-4-sentence answers that each link the ADR or AI-doc section behind them, a README that opens the backlog and every defense document, and a phase gate whose 16 commands all exited 0 on the final tree.**

## Task 1 checkpoint: the author's reply

Checkpoint `checkpoint:decision` (`gate="blocking-human"`) on what ADR-005 records as the reason for Silo. Reply, verbatim:

> «as-written»

Effect: ADR-005 in `docs/decisiones.md` was not edited and no reason of mine was added. `git status --porcelain -- docs` printed nothing during Task 1, and `git diff --numstat HEAD -- docs/decisiones.md` printed nothing before the Task 2 commit. `grep -c '^Motivo del autor: '` over ADR-005 prints 0. Answer 15 says only what ADR-005 says (MinIO CE in maintenance since December 2025 and archived in February 2026, Silo a maintained fork the AWS SDK speaks to, switching server touches only `S3_*`).

## Accomplishments

- Task 2 (tracer): `docs/presentacion/preguntas-tribunal.md` with the fifteen fixed headings `### N. <pregunta>`. Each answer has 2 to 4 sentences and ends with a link: 10 links to ADR anchors (ADR-001 to -006 and -009 to -012), plus the AI doc (`#coste-local-frente-a-la-nube`, `#qué-funcionó-y-qué-no`, `#la-ia-dentro-del-producto`, `#cómo-se-usó-la-ia-en-el-desarrollo`), `04-REVIEW-DISPOSITION.md`, `06-UAT.md`, `a11y.test.tsx` and `fixtures.ts`. Answer 5 quotes the extremes of the cost table (1,33 and 17,18 USD for 10 000 ofertas/mes) and the token means of its `text` block (1192 and 183). Answer 12 quotes 290 of 544 commits and answer 6 55 de 62 SUMMARY, all from «Cifras». No cloud model name, no excluded provider, no figure outside those blocks.
- Task 3: `## Próximos pasos` (six bullets, same order as slide 11, with KAN-01, LIB-01/02, DASH-01/02, E2E-01, `ownerId`, AI-10) before `## Documentación`, and the five new documents added to «Documentación» in the existing format. 16 lines added to the README, 0 deleted since `c11ab61`.
- Phase gate: the command of every per-task row of `07-VALIDATION.md` (G01 to G16) ran once on the final tree and exited 0. All 16 rows are `✅ green`, `wave_0_complete: true`, `nyquist_compliant: true`, `status` left as `draft`. The evidence is in the new section «## Gate evidence (07-06)».

## Verification

- Tracer: `node scripts/check-docs.mjs --adr` and `--qa` print `DOCS OK`; `node scripts/check-figures.mjs --prose docs/presentacion/preguntas-tribunal.md` prints `FIGURES OK (72 cifras)`. Acceptance one-liners: `COSTE OK 1,33 17,18`, `CIFRAS OK`, 15 headings, 10 ADR links, 0 matches for `gpt-` and for the two excluded providers, 1 for «byte a byte».
- README: `node scripts/check-docs.mjs --readme` prints `DOCS OK`; `git diff --numstat c11ab61 -- README.md` prints `16 0 README.md`.
- Gate G16: product diff since `c11ab61` empty (0 files), no video tracked, main checkout on `refs/heads/phase/07-documentacion-defensa`, `--readme`, `--all`, `check-figures.mjs --tests`, `npm run lint`, `npm run typecheck` and `npm run test` all exit 0. G09 ran `MERMAID SELF-TEST OK` and G13 `MERMAID OK (3 diagramas)` (07-03 SUMMARY has no `mermaid-check: skipped` line); no `expediente-browser` container left.

## Deviations from Plan

None - plan executed as written. Notes on the run, not deviations: the continuation started at Task 2 with the Task 1 reply; the cwd-drift sentinel file under the worktree git dir could not be written because the runtime blocks shell commands that name git internals, so the worktree root was verified with `git rev-parse --show-toplevel` before the commits instead. The `node_modules` symlinks used for the hooks and the gate were created for the run and removed before returning.

## Human checks for the end-of-phase UAT

1. The five captures of 07-03 (`docs/presentacion/capturas/*.png`): look at them once for anything personal or wrong.
2. The timed rehearsal of the demo script over a fresh `npm run seed -- --reset`, and the plan C video, recorded by the author and kept on the laptop and a USB, never committed (07-04, D-10).
3. The GitHub Mermaid preview of `docs/presentacion/deck.md` and `docs/ia-en-el-proyecto.md` in the PR file view after `/gsd-ship 7` (07-05; GitHub's renderer is not checkable locally).
4. The 15-minute rule: confirm that the 15 minutes of the deck do not include the examiners' questions (07-05, RESEARCH Open Question 1). If they do, shorten slides 4-10 and re-run `node scripts/check-docs.mjs --deck --deck-total=m:ss`.

## Notes for the author

- `docs/AI-EXTRACTION.md` line 62 still names the two cloud providers that D-16 keeps out of the other docs. It is a spec document outside the phase documents, so it was left untouched; the generic check does not cover it.
- Answer 6 is a judgement call from the review dispositions (04 WR-01) and E2E-01; change the wording if you would give different changes.

## Known Stubs

None.

## Threat Flags

None. Documentation and a planning file only. T-07-17 (figures checked against source blocks), T-07-18 (README additions only), T-07-19 (no product, config or manifest change, no video) and T-07-20 (ADR-005 settled by the blocking checkpoint, reply recorded above) are mitigated by the checks above.

## Dependencies

No dependencies added; no manifest changed (G16 proves it).

## Self-Check: PASSED

- FOUND: docs/presentacion/preguntas-tribunal.md
- FOUND: README.md with `## Próximos pasos`
- FOUND: .planning/phases/07-documentaci-n-y-defensa/07-VALIDATION.md with `## Gate evidence (07-06)`
- FOUND commits: db7907b, 8b0d7c0, edc0aee
