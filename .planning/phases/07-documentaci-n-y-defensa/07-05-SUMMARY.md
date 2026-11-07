---
phase: 07-documentaci-n-y-defensa
plan: 05
subsystem: docs
tags: [docs, deck, presentation, mermaid]
status: complete

requires:
  - phase: 07-01
    provides: scripts/check-docs.mjs with the --deck contract
  - phase: 07-02
    provides: the «Cifras» block and check-figures.mjs --prose
  - phase: 07-03
    provides: the five captures and the Mermaid parse in a throwaway container
  - phase: 07-04
    provides: docs/presentacion/demo-script.md linked from slide 3
provides:
  - docs/presentacion/deck.md, the defense deck source - 11 slides, 15:00, 3 Mermaid diagrams, 2 verbatim snippets, 3 captures
affects: [07-06]

actuals:
  tokens: 2830
  tasks: 2
  commits: 2
plan_head_before: 3c643e5c25f5c478814870b2609fd1949dfeedae
plan_head_after: af5907457cd881e2e513795a4440bb29b5704fa9

tech-stack:
  added: []
  patterns:
    - "Deck figures only from the «Cifras» text block of docs/ia-en-el-proyecto.md, checked by check-figures.mjs --prose"
    - "Code snippets live under a source marker and are byte-compared by check-docs.mjs --deck"

key-files:
  created:
    - docs/presentacion/deck.md
  modified: []

key-decisions:
  - "11 slides, not 10: «La IA en el producto» and «GSD y Claude Code» get one minute each; together they keep the ~2 min of D-02"
  - "The 15:00 exclude the examiners' questions; the deck says so in «Cómo usar este guion» and gives the --deck-total recipe if the author says otherwise"
  - "LlmClient snippet on «Arquitectura», mapper snippet on «Pods y contratos», the view model quoted inline (D-04 allows two blocks)"
  - "Slide 11 lists Kanban, document library with suggested CV, dashboard, e2e and login, matching PRODUCT.md and the 07-06 README list"

requirements-completed: [PRES-01]

duration: 15min
completed: 2026-11-07
---

# Phase 7 Plan 05: Defense deck Summary

**An 11-slide, 15:00 defense deck in Spanish with the demo as slide 3, container, extraction and GSD-loop Mermaid diagrams, two byte-identical code snippets and every figure taken from the «Cifras» block.**

## Accomplishments

- Task 1 (tracer): `docs/presentacion/deck.md` with 11 slides `## Diapositiva N: <título>`, each with bullets, a `**Nota del orador:**` and a `**Tiempo:**`; times add up to 15:00, demo (5:00) third, right after «MVP e iteraciones». The front end has its own slides (Pods y contratos, Formulario y marcas IA, Accesibilidad y responsive). Slide 2 uses the values 6, 6, 62, 5, 544, 11 and 1416 from «Cifras». The tracer command printed `DECK SPINE OK 11 900`, and `--prose` printed `FIGURES OK`.
- Task 2: container `flowchart LR` and `LlmClient` snippet (slide 4), mapper snippet with `StackTagOptionVm { label: string }` and the contracts import inline (slide 5), extraction `sequenceDiagram` (slide 8), GSD loop `flowchart LR` with the «huecos» arrow back to plan (slide 9), and the form, mobile and dark captures (slides 6 and 7).

## Verification

- `node scripts/check-docs.mjs --deck`: `DOCS OK` (92 internal links, 0 problems).
- `bash scripts/browser-tools.sh mermaid docs/presentacion/deck.md`: `MERMAID OK (3 diagramas)` (07-03 SUMMARY has no `mermaid-check: skipped` line, so the parse was mandatory and ran). No `expediente-browser` container left behind.
- `node scripts/check-figures.mjs --prose docs/presentacion/deck.md`: `FIGURES OK (72 cifras)`.
- `npm run typecheck` and `npm run test`: pass (the pre-commit hook also ran them on both commits).
- Guards: 0 matches for `gpt-`, 0 for the two excluded providers, 4 for «compatible con OpenAI».

## Deviations from Plan

None - plan executed as written. Task 1 was committed as a version without the diagrams, snippets and captures so that each task has its own commit; Task 2 added them.

## Pending human checks

- Open the deck in the GitHub PR file view (after `/gsd-ship 7`): the three diagrams should render as diagrams, not error blocks (GitHub's renderer is not checkable locally).
- Confirm that the 15 minutes do not include the examiners' questions. If they do, shorten slides 4-10 and re-run `node scripts/check-docs.mjs --deck --deck-total=m:ss`.

## Known Stubs

None.

## Threat Flags

None. No new endpoints or trust boundaries; only documentation. T-07-14 (snippets byte-compared), T-07-15 (figures from «Cifras») and T-07-16 (only the reviewed seed-data captures) are mitigated by the checks above.

## Dependencies

No dependencies added. The Mermaid check reused the tooling approved in 07-03.

## Self-Check: PASSED

- FOUND: docs/presentacion/deck.md
- FOUND commits: f03d09c, af59074
