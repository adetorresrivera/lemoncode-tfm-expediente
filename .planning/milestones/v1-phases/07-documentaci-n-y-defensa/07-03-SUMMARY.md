---
phase: 07-documentaci-n-y-defensa
plan: 03
subsystem: docs
tags: [docs, screenshots, playwright, mermaid, docker, bash]

requires:
  - phase: 07-01
    provides: scripts/check-docs.mjs with the --captures contract (names, IHDR widths, size band)
  - phase: 07-02
    provides: ordering only (Ollama of the devcontainer measured before this plan loaded the compose Ollama)
provides:
  - scripts/browser-tools.sh with the subcommands capture, mermaid and mermaid --self-test
  - docs/presentacion/capturas/capture.mjs, the container-only screenshot recipe
  - docs/presentacion/mermaid-check.mjs, the container-only Mermaid parse check for the deck of 07-05
  - the five screenshots of D-17 (list light, dark and 360 px; detail; form with the AI marks)
affects: [07-04, 07-05, 07-06]

actuals:
  tokens: 4400
  tasks: 3
  commits: 2
plan_head_before: 512eb5e77af0809674b658da73e2385235bd75f7
plan_head_after: 5498a27a76bc09dff63aa2be37329464738ba04b

tech-stack:
  added: []
  patterns:
    - "Browser tools live in a throwaway container from a pinned image, with pinned packages installed there only (--ignore-scripts), never in a package.json or the lockfile"
    - "Every command in the container runs detached (docker exec -d) with a log and an exit-code file, because the foreground exec stream is swallowed in this devcontainer"

key-files:
  created:
    - scripts/browser-tools.sh
    - docs/presentacion/capturas/capture.mjs
    - docs/presentacion/mermaid-check.mjs
    - docs/presentacion/capturas/lista-claro-1280.png
    - docs/presentacion/capturas/lista-oscuro-1280.png
    - docs/presentacion/capturas/lista-movil-360.png
    - docs/presentacion/capturas/detalle-claro-1280.png
    - docs/presentacion/capturas/formulario-ia-claro-1280.png
  modified: []

key-decisions:
  - "Both pinned packages were approved by the human in Task 1, so the full path ran (screenshots and the Mermaid check)"
  - "The AI-marks shot ran on live Ollama at the first attempt, so the mock fallback was not needed and plan C shows Nimbo Software"
  - "The detail shot finds Harbor Pine Software by company through GET /api/applications, because ids change on every reseed"

requirements-completed: [PRES-01, PRES-02]

duration: 25 min
completed: 2026-11-07
status: complete
---

# Phase 7 Plan 03: Browser tools, screenshots and Mermaid check Summary

One command (`bash scripts/browser-tools.sh capture`) turns the running, seeded stack into the five committed screenshots of D-17, and `bash scripts/browser-tools.sh mermaid` gives the deck an offline Mermaid parse check, both through a throwaway Playwright container that leaves nothing in the repository.

## Task 1 checkpoint: the human's reply

Package-legitimacy checkpoint (`gate="blocking-human"`), answered by the user. Reply, verbatim:

> Approved

Resume signal: «approved», so both `playwright@1.56.1` and `mermaid@11.17.2` were used and Tasks 2 and 3 ran in full.

Evidence gathered by the orchestrator before asking:

- `docker image inspect mcr.microsoft.com/playwright:v1.56.1-noble` succeeded (`sha256:f1e7e01021efd65dd1a2c56...`).
- npm registry, `playwright@1.56.1`: repository github.com/microsoft/playwright, maintainers include `@microsoft.com` accounts, published 2025-10-17, no install scripts.
- npm registry, `mermaid@11.17.2`: repository github.com/mermaid-js/mermaid, published 2026-08-25, no install scripts.

## What was built

- `scripts/browser-tools.sh`: header with usage, `set -euo pipefail`, `cd` to the repo root, `fail` with the prefix `BROWSER FAIL:`, exit 2 on an unknown subcommand. It checks that the pinned image and the network `expediente_default` exist, starts `expediente-browser-$$` with `sleep 900`, installs the pinned packages inside it with `--ignore-scripts --no-audit --no-fund`, checks `/api/health` from inside the network, runs the recipe detached with a log, copies out only `*.png` and removes the container with a `trap` on EXIT.
- `docs/presentacion/capturas/capture.mjs`: one new browser context per shot with `deviceScaleFactor: 1`, `colorScheme` and the `expediente-theme` key set with `addInitScript`; waits for `main` and `document.fonts.ready`. It prints only `SHOT <name> <w>x<h>` and `CAPTURE FAIL: <name> <first line>`; it never prints page text and never clicks «Guardar candidatura».
- `docs/presentacion/mermaid-check.mjs`: extracts the fenced `mermaid` blocks of the Markdown files given, loads `mermaid.min.js` with `addScriptTag` in an empty Chromium page and runs `mermaid.parse` per block. It prints `ok <file>:<line>` or `ERR <file>:<line> <message>`, then `MERMAID OK (<n> diagramas)` or `MERMAID FAIL` (exit 1); zero blocks and an unclosed fence are failures.

## Evidence

- Applications in the stack before any shot: 12. After all shots: 12 (`GET /api/applications`), so the captures created nothing.
- `PROVIDER ollama` printed by the runner on both capture runs. The AI-marks shot succeeded on the first attempt, so the mock fallback was not used and the image shows «Nimbo Software» (the offer `docs/demo/ofertas/remote-senior.txt`; banner «Hemos rellenado 8 campos y añadido 7 etiquetas. Revísalos.»). 07-04 can word plan C with Ollama.
- `bash scripts/browser-tools.sh capture lista-claro-1280,lista-oscuro-1280,lista-movil-360` ended `CAPTURE OK (3 PNG)` in about 10 s; `... capture detalle-claro-1280,formulario-ia-claro-1280` ended `CAPTURE OK (2 PNG)`.
- `bash scripts/browser-tools.sh mermaid --self-test` printed `MERMAID SELF-TEST OK`: a valid `flowchart LR` and `sequenceDiagram` gave `MERMAID OK (2 diagramas)`, a broken block gave `MERMAID FAIL` (`Parse error on line 2`) and exit 1.
- `node scripts/check-docs.mjs --captures` printed `DOCS OK`. `npm run typecheck && npm run test` passed (web: 27 files, 890 tests; the Husky pre-commit hook ran typecheck on both commits).
- No container `expediente-browser-*` remains; `git diff --name-only -- package.json package-lock.json` prints nothing.
- Visual check of the five PNGs (Read tool): seeded data only, themes as named, the 360 px list readable, the detail shows Harbor Pine Software with three rounds, both documents and the three-entry history, the form shows the «IA» marks and the banner. Nothing personal or secret is visible. The human-check of the plan (opening the five PNGs) remains for the author.

## Dependency justification (CLAUDE.md)

`playwright@1.56.1`, exact pin, never in any `package.json` or the lockfile. It gives the automated, reproducible screenshots of D-17 and the browser that runs the Mermaid parse. It lives only in the throwaway container started from `mcr.microsoft.com/playwright:v1.56.1-noble` (the browsers come with the image), is installed with `--ignore-scripts` and is removed after each run. Audit verdict: `[SUS]` only for `too-new` on the latest release; the older pin matches the local image and the Phase 6 browser pass, has Microsoft maintainers and no install scripts. Human approval in Task 1: «Approved». It was installed (`added 2 packages` per run).

`mermaid@11.17.2`, exact pin, same container-only rule (`--ignore-scripts`, removed after each run, never in a `package.json` or the lockfile). It is the offline syntax check of the deck diagrams before the GitHub preview (parse-OK is necessary, not sufficient, for the GitHub rendering). Audit verdict: `[SUS]` only for `too-new` on the latest release; 11.17.2 was published 2026-08-25, comes from github.com/mermaid-js/mermaid and has no install scripts. Human approval in Task 1: «Approved». It was installed (`added 115 packages` per run, transitive dependencies of mermaid, in the container only).

## Deviations from Plan

None - plan executed exactly as written. The Mermaid check was not skipped: this SUMMARY has no skip marker line, so 07-05 and 07-06 run `bash scripts/browser-tools.sh mermaid` as planned.

## Known Stubs

None.

## Threat Flags

None. The runner reaches only `http://app:8080` on the compose network, writes nothing to the user's data and logs no offer text.

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: scripts/browser-tools.sh, docs/presentacion/capturas/capture.mjs, docs/presentacion/mermaid-check.mjs and the five PNGs of docs/presentacion/capturas/
- FOUND commits: 763968b (Task 2), 5498a27 (Task 3)
