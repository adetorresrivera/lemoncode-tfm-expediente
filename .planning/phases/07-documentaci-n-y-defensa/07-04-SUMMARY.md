---
phase: 07-documentaci-n-y-defensa
plan: 04
subsystem: docs
tags: [docs, demo, runbook, presentation]

requires:
  - phase: 07-01
    provides: scripts/check-docs.mjs with the --demo contract
  - phase: 07-03
    provides: the five screenshots linked from plan C
provides:
  - docs/presentacion/demo-script.md, the timed 5-minute demo script with pre-flight checklist, plan B (mock), plan C (captures or video) and recording notes
affects: [07-05, 07-06]

actuals:
  tokens: 2100
  tasks: 2
  commits: 2
plan_head_before: fc689bc62084a4f1b3d89e4d2b43269de6e441f3
plan_head_after: cc5ea0042098e28f71f4ace8aad01e20a68e441b

tech-stack:
  added: []
  patterns:
    - "The demo script is also the recording script for the plan C video; the video is never committed"

key-files:
  created:
    - docs/presentacion/demo-script.md
  modified: []

key-decisions:
  - "Adopted the research corrections over the CONTEXT wording: «Estado inicial: Enviada» before «Añadir ronda», final status «Oferta recibida», and the speaker line rests on the two history entries, never on a UI label"
  - "Warm-up threshold: a second warm-up extraction over 20 s, or any error, means starting in mock before the talk"
  - "Opening filter «Remoto» + «React» (3 cards); closing filter on the status «Oferta recibida» only (2 cards), independent of the tags the model proposes"
  - "Step 6 names «Tipo» and «Guardar ronda» (verified in the round dialog) because the round needs a type to save"
  - "The provider table states time qualitatively («unos segundos en CPU» against «al instante»), no seconds figure"

requirements-completed: [PRES-02]

duration: 15 min
completed: 2026-11-07
status: complete
---

# Phase 7 Plan 04: Demo script Summary

A 10-step, exactly 5:00 demo script over the seed (list filters, paste `remote-senior.txt`, AI autofill, correct a field, «Estado inicial: Enviada», round, CV, «Oferta recibida», filtered list), where every step carries a plan B for the mock provider and a plan C capture or video, plus a pre-flight checklist that decides mock before starting.

## Performance

- **Duration:** 15 min
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- `## Antes de empezar`: 9 checklist items (video recorded the night before and kept on laptop and USB; the morning `npm run seed -- --reset` with its warning, for the presenter alone; `docker compose up --build -d` and the health check; `ollama list` shows `gemma4:e2b`; `ollama run` warm-up; two warm-up extractions with `onsite-junior.txt` and the 20 s threshold that switches to `LLM_PROVIDER=mock`; zoom 80-90 %, theme «Claro», no filter, 1280 px; fixture and captures open; stopwatch).
- `## Guion`: the table with 10 rows adding up to 5:00. The status steps follow the real service rule: «Estado inicial: Enviada» (row 5), «Añadir ronda» (row 6, badge moves to «En entrevistas», speaker line «la regla la aplica el servicio»), «Oferta recibida» (row 8). The D-09 line «por eso nada se guarda solo; corrijo el campo y la marca IA desaparece» is in row 4.
- `## Qué verás según el proveedor`, `## Plan B`, `## Plan C` (five capture links, video kept local and on USB, not linked) and `## Grabar el vídeo`.

## Task Commits

1. **Task 1: the «Guion» table (tracer)** - `8be6409` (docs)
2. **Task 2: checklist, plan B, plan C and recording notes** - `cc5ea00` (docs)

**Plan metadata:** committed with this SUMMARY (docs: complete plan).

## Files Created/Modified

- `docs/presentacion/demo-script.md` - the demo script and runbook

## Verification

- Tracer: the plan command printed `GUION OK 10 300`; `node scripts/check-docs.mjs` printed `DOCS OK` (9 files, 0 problems). Every UI label of the script exists in `apps/web/src`.
- `node scripts/check-docs.mjs --demo` printed `DOCS OK` (87 internal links, 0 problems).
- Task 2 acceptance criteria: 9 checklist items (at least 6); `seed -- --reset` appears 2 times; `onsite-junior.txt` 1; video links 0 and no video file tracked by git; `## Plan B`, `## Plan C` and `## Qué verás según el proveedor` once each; no seconds figure in the provider section.
- `npm run typecheck && npm run test` passed (web: 27 files, 890 tests; the Husky pre-commit hook ran typecheck on both commits).

## Decisions Made

See `key-decisions` in the frontmatter. The 15-minute talk with 5:00 of demo and the questions after it stays an assumption (RESEARCH A4) for the author to confirm in 07-05.

## Deviations from Plan

None - plan executed exactly as written. Two wording choices inside the plan's freedom: step 6 adds «Tipo» and «Guardar ronda» (the round dialog requires a type), and the plan C cell of step 5 says the detail capture is a seeded application (Harbor Pine Software) so the presenter does not claim it is the new one.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The script uses only the committed fixtures and seeded documents; the reset is described as a step for the presenter alone, and the executor ran neither `--reset` nor any compose restart.

## Pending for the author (human-check)

Rehearse with a stopwatch over a fresh `npm run seed -- --reset`, following the script, then record the plan C video and keep it on the laptop and a USB (D-10). Timing with narration is the presenter's.

## Next Phase Readiness

Ready for 07-05 (deck): the Demo slide can link `demo-script.md` and last 5:00. The wave 4 sibling plans only need this file to exist.

## Self-Check: PASSED

- FOUND: docs/presentacion/demo-script.md
- FOUND commits: 8be6409 (Task 1), cc5ea00 (Task 2)
