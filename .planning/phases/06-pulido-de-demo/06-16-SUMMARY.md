---
phase: 06-pulido-de-demo
plan: 16
subsystem: delivery
tags: [docker-compose, smoke-test, readme, docs, ollama]
requires: [06-02, 06-03, 06-05, 06-12]
provides:
  - "compose-smoke.sh --cold: isolated clean-machine proof of the delivered image"
  - "final Spanish README (runbook)"
  - "Ollama keep-alive of 30 minutes"
affects: [06-17]
tech-stack:
  added: []
  patterns:
    - "isolated compose project through COMPOSE_PROJECT_NAME and COMPOSE_FILE exports, with a !reset override"
    - "detached seed in the container polled through files"
key-files:
  created:
    - scripts/compose.cold.yml
  modified:
    - scripts/compose-smoke.sh
    - docs/ARCHITECTURE.md
    - docs/AI-EXTRACTION.md
    - docs/DESIGN.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - README.md
    - compose.yml
key-decisions:
  - "Cold smoke runs as a function (run_cold) defined after the helpers and invoked before the default flow; it is the only EXIT trap in cold mode"
  - "Project name is verified twice (exported value and the name Compose resolves) before any down -v"
  - "Image-size ceiling 450 MB (measured 397,121,535 bytes)"
requirements-completed: [DEMO-01, DEMO-02, DEMO-05]
status: complete
commits: 3
plan_head_before: b904ecbce43901ea39427e55208dc7765c6283cf
plan_head_after: 9de2fde155ed6ed725f2108b0e92cd49b88cd578
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
coverage:
  - deliverable: "bash scripts/compose-smoke.sh --cold seeds, serves and extracts on fresh volumes in expediente-cold and leaves nothing behind"
    verification:
      - kind: command
        ref: "bash scripts/compose-smoke.sh --cold"
        status: pass
    human_judgment: false
  - deliverable: "Docs and requirement text (ARCHITECTURE, AI-EXTRACTION, DESIGN, DEMO-01, ROADMAP SC1) agree on the seed and the pasted offers"
    verification:
      - kind: command
        ref: "task 2 grep gates"
        status: pass
    human_judgment: false
  - deliverable: "README is final, in Spanish in the DS voice, and complete for a stranger"
    verification:
      - kind: command
        ref: "task 3 grep gates and prettier --check"
        status: pass
    human_judgment: true
    rationale: "Voice and clarity are judged in the 06-17 human read-through"
  - deliverable: "OLLAMA_KEEP_ALIVE 30m on the ollama service"
    verification:
      - kind: command
        ref: "docker compose config -q and grep OLLAMA_KEEP_ALIVE"
        status: pass
    human_judgment: false
---

# Phase 6 Plan 16: Cold start, docs write-back and final README Summary

An isolated `--cold` mode of the compose smoke proves the delivered image on fresh volumes (seed, reset, PDF download, mock extraction, size, pins, healthchecks), the docs and requirement text now match the seed and the pasted offers, and the final Spanish README plus a 30-minute Ollama keep-alive cover the defense runbook.

## Results

- **Cold-start time:** `cold start: 28 s` (image layers cached; the build itself took seconds).
- **Image size:** `tfm-app:0.1.0` = 397,121,535 bytes (ceiling 450,000,000).
- **Smoke result:** `bash scripts/compose-smoke.sh --cold` ended with `SMOKE OK`. Seed printed «Seed listo: 12 candidaturas y 3 documentos»; second seed and `--reset` («Borrando todo en tfm / tfm-assets: 12 candidaturas, 3 documentos, 3 objetos.») both left 12 and 3; the seeded PDF downloaded starting with `%PDF-`; the mock extraction answered 200 with «Lumen Analytics».
- **Isolation verified:** after the run `docker compose -p expediente-cold ps -a -q` is empty and `expediente_ollama-data` (plus the other default volumes) is intact.
- `npm run typecheck && npm run test` passed after every task (contracts 59, api 464, web 882 tests).

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Cold start of the real image in an isolated project | 9826f5a |
| 2 | Docs and requirement text aligned with the seed and pasted offers | 01f4600 |
| 3 | Final README and Ollama keep-alive | 9de2fde |

## Docs updated

- `docs/ARCHITECTURE.md`: scripts tree (seed, seed/, assets/, try-extract), seed and `--reset` commands, the cold smoke with its Compose v2.24 requirement and the 450 MB ceiling.
- `docs/AI-EXTRACTION.md`: the 3 fixtures live in `docs/demo/ofertas/`, feed fixture tests and `try-extract`, are pasted live and never seeded.
- `docs/DESIGN.md`: new «Página no encontrada y error de pantalla» section under «Pantallas».
- `.planning/REQUIREMENTS.md` (DEMO-01 and footer) and `.planning/ROADMAP.md` (Phase 6 SC1 only): D-08 wording. Requirement checkboxes and plan-progress rows left to the orchestrator.

## README sections

Qué es + captura (`docs/img/application-list.png`, captured in 06-17), Requisitos (Compose v2.24), Arrancar en 3 comandos, Datos de demo, Ofertas para la demo, Cambiar de modelo, Calentar el modelo antes de la demo, Si Ollama falla, Comprobar que todo está sano (incluye `--cold`), Desarrollo en el devcontainer, Estructura del repositorio, Scripts, Variables de entorno, Calidad, Documentación. Only Ollama, `mock` and the generic «compatible con OpenAI» endpoint are named.

## Deviations from Plan

None - plan executed exactly as written. Two small implementation notes, no rule applied:

- The plan says to place the cold branch "right after option parsing"; it uses helpers defined later, so it is a function placed after the helpers and called before the default flow. Behaviour is the one specified (default `trap cleanup_smoke_records EXIT` never registered in cold mode).
- Counting items and reading the first document id use `node` on the host (JSON parsing) instead of grepping ids, because applications contain nested ids.

The worktree had no `node_modules`; `npm ci --ignore-scripts` was run at the worktree root (no `package.json` or lockfile change). The plan-head ledger file was recorded after the first commit from the known spawn base, same value.

## Dependencies

None added.

## Known Stubs

None. The README references `docs/img/application-list.png`, which does not exist yet by design: 06-17 captures it.

## Threat Flags

None.

## Issues Encountered

None.

## Next

Ready for 06-17 (re-run the cold smoke after 06-13, capture the README screenshot, human read-through).

## Self-Check: PASSED

- FOUND: scripts/compose.cold.yml, scripts/compose-smoke.sh, README.md, compose.yml
- FOUND commits: 9826f5a, 01f4600, 9de2fde
