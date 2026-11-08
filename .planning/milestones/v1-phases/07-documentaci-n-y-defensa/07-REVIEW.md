---
phase: 07-documentaci-n-y-defensa
reviewed: 2026-11-07T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - scripts/check-docs.mjs
  - scripts/check-figures.mjs
  - scripts/browser-tools.sh
  - docs/presentacion/capturas/capture.mjs
  - docs/presentacion/mermaid-check.mjs
  - README.md
  - docs/decisiones.md
  - docs/ia-en-el-proyecto.md
  - docs/presentacion/deck.md
  - docs/presentacion/demo-script.md
  - docs/presentacion/preguntas-tribunal.md
findings:
  critical: 0
  warning: 5
  info: 8
  total: 13
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-11-07
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 7 changes no product code, so the review covers five dev-only scripts and six documents. I ran the read-only checks (`check-docs.mjs --all`, `--self-test`, `check-figures.mjs` without `--tests`, `bash -n`, eslint and prettier on `scripts/`). I did not start the stack, run the browser container or install anything.

What holds up:
- Every figure in the «Cifras» block matches git at `c11ab61`. I recomputed the commit counts, the per-phase ranges, the 7 SUMMARY files without `duration` and the cost table. The ranges plus the root commit sum to 544.
- The UI strings, seed data (3 remote+React cards, 2 `oferta_recibida` cards, Harbor Pine with 3 rounds, CV and cover letter), mock draft, the 300 ms mock delay, the pinned compose images, `LLM_TIMEOUT_MS=90000`, `temperature: 0` and the `llm.client.ts#L18-L26` snippet all agree with the code.
- The shell is safe against injection. The shot list is validated against `[a-z0-9,-]`, file names go through `printf '%q'`, `rm -rf` only touches `mktemp -d` directories and the container is removed in an EXIT trap.

There is no blocker. The real problems are one internal contradiction in the demo timing that an examiner can catch, and several checks that report green while verifying less than the documents claim.

## Warnings

### WR-01: Demo script says Ollama takes «unos segundos» and gates the demo on 20 s, but the project's own evidence says ~48 s

**File:** `docs/presentacion/demo-script.md:14` and `docs/presentacion/demo-script.md:44`
**Issue:** Line 44 states the Ollama extraction «Tarda unos segundos en CPU». Line 14 sends the presenter to the mock provider if the second warm-up extraction takes more than 20 s. These contradict:
- `docs/decisiones.md:139` (ADR-006): «en CPU tarda de decenas de segundos a más de un minuto según la oferta».
- `.planning/phases/06-pulido-de-demo/06-UAT.md:170`: 48 s with Ollama after warm-up, 13 s with mock.
- `docs/ia-en-el-proyecto.md:205`: a CPU extraction takes long enough that the demo has to warm the model first.
- `LLM_TIMEOUT_MS` defaults to 90 000 ms (`apps/api/src/config.ts:25`).

With the measured 48 s, the documented check would send the author to plan B every time on the machine where the UAT was done. The 0:50 budget for step 3 (line 25) also leaves no room to narrate around a 48 s wait. An examiner reading ADR-006 next to the demo script will see two different claims. `check-docs.mjs` enforces the literal `20 s` in the checklist (line 514), so the inconsistency is locked in by the checker.
**Fix:** Pick one measured number and use it everywhere. For example, in `demo-script.md:44` write «Tarda de decenas de segundos a algo más de un minuto en CPU (48 s medidos en la UAT)». Set the plan B threshold in line 14 above the measured time (for example 60 s, in line with D-25), then update the `"20 s"` needle in `checkDemo` (check-docs.mjs:514) and the step 3 budget accordingly.

### WR-02: `browser-tools.sh mermaid` demands the Compose network, and `mermaid-check.mjs` calls itself «offline» while needing the npm registry

**File:** `scripts/browser-tools.sh:74-79,155-156`; `docs/presentacion/mermaid-check.mjs:1`; `docs/presentacion/deck.md:12`
**Issue:** `preflight()` aborts unless the network `expediente_default` exists. That network exists only after `docker compose up` has run once. The `mermaid` subcommand and `--self-test` never contact the app, yet `deck.md:12` tells the presenter to run `bash scripts/browser-tools.sh mermaid docs/presentacion/deck.md` «antes de ensayar». With the stack down this fails with «network expediente_default does not exist». The header of `mermaid-check.mjs` says «Offline Mermaid syntax check», but `start_container` runs `npm i playwright mermaid` inside the container (line 87), which needs the registry.
**Fix:** Split the preflight. For `mermaid`, only check the image. Start the container without `--network "$NET"`, or with the default bridge, and require the network only in `run_capture`. Reword the comment to «runs without the app; needs network access to install the pinned packages».

### WR-03: The prose rules do not tie a number to the right figure and are not wired into any documented command

**File:** `scripts/check-figures.mjs:477-481,563`; `docs/presentacion/deck.md:12`; `docs/ia-en-el-proyecto.md:106`
**Issue:**
- Rule P1 builds `allowed` from every «Cifras» value (line 563) and accepts a counted number if it equals any value. «62 commits» or «1416 minutos» would pass, because 62 and 1416 are values of other keys.
- The deck, the Q&A and the README are only checked if someone passes `--prose <file>` by hand. The only command documented for the figures (`ia-en-el-proyecto.md:106`) and the deck's «Cómo usar» list (`deck.md:12-13`) never mention it. I ran it manually and the deck and the Q&A pass, so there is no wrong figure today. Nothing keeps it that way.
- Run on `demo-script.md` and `README.md` it also reports `20 s`, `90 %`, `60 s` and `30 minutos`. Wiring it in for every document would need an allowlist.
**Fix:** Map each counted noun to its key (`commits` to `commits_total`, `planes` to `planes`, `tests` to `tests`, and so on) and compare against that key only. Add `--prose docs/presentacion/deck.md --prose docs/presentacion/preguntas-tribunal.md` to the command list in `ia-en-el-proyecto.md` and in the deck. Add an exemption mechanism for operational timings in the demo script.

### WR-04: `check-docs --ia` never verifies the `<!-- source: … -->` snippet of the AI document

**File:** `scripts/check-docs.mjs:365-488` (no snippet check); `docs/ia-en-el-proyecto.md:147-159`
**Issue:** `ia-en-el-proyecto.md` embeds `llm.client.ts#L18-L26` with the same `<!-- source -->` convention as the deck. Only `checkDeck` (lines 742-779) compares the fence with the source lines. Today the lines match, so there is no wrong content. When `llm.client.ts` changes, `--deck` fails and `--ia` stays green with a stale snippet in the document the README presents as the technical reference. Both snippets also depend on absolute line numbers, so any edit above line 18 breaks both.
**Fix:** Extract the snippet loop of `checkDeck` into a function (for example `checkSnippets(doc, root, fail)`) and call it from `checkIa` as well.

### WR-05: `check-figures.mjs` exits 0 with «FIGURES OK» while `tests` and two keys are not independently checked

**File:** `scripts/check-figures.mjs:529-535,573-576,141-146`; `docs/ia-en-el-proyecto.md:31`
**Issue:**
- Without `--tests`, the `tests` line (1416) is skipped. The script prints `SKIP tests (usa --tests)` and then `FIGURES OK (72 cifras)` with exit 0.
- `ia-en-el-proyecto.md:31` claims «Cada línea se recalcula con `node scripts/check-figures.mjs`», which is false for `tests` and for the first figure an examiner will ask about.
- `corte` and `commit_merge_pr_6` are compared with themselves. When the ancestry check passes, `real.corte = docCorte` and `real.commit_merge_pr_6 = docPr6` (lines 141, 146), and both count towards the 72 «cifras».
**Fix:** Change the sentence in line 31 to «con `--tests` se recalculan también los tests». Make the default run end with `FIGURES OK (N cifras, tests sin comprobar)`, or fail unless `--no-tests` is given. Do not count `corte` and `commit_merge_pr_6` in `checked`.

## Info

### IN-01: `capture.mjs` and `mermaid-check.mjs` are never linted or formatted

**File:** `docs/presentacion/capturas/capture.mjs`, `docs/presentacion/mermaid-check.mjs`
**Issue:** `eslint.config.js` and `.prettierignore` ignore `docs/**` and `docs`, so `npm run lint` and `format:check` pass without reading them. Forced with `eslint --no-ignore`, they produce 24 `no-undef` errors (`console`, `process`, `window`, `document`). `check-figures.mjs` and `check-docs.mjs` do carry `/* global … */` headers. This does not affect behaviour. It does mean these two files are the only phase scripts outside the quality gate.
**Fix:** Move them to `scripts/browser/` and update the `docker cp` paths in `browser-tools.sh`, or add `/* global window, document, console, process */` and an ESLint override for them.

### IN-02: Self-test of the mermaid check accepts any failure as «broken diagram rejected»

**File:** `scripts/browser-tools.sh:172-179`
**Issue:** The negative arm passes when the output contains `MERMAID FAIL`. The same line is printed when the check cannot run (browser launch error, missing `mermaid.min.js`, a failed `docker cp`). The positive arm runs first and must report `MERMAID OK (2 diagramas)`, so a broken environment is unlikely to get this far. Even so, the negative arm does not prove that the parser rejected the syntax.
**Fix:** Also require an `ERR … bad.md:` line for a parse error: `grep -q '^ERR .*bad.md:[0-9]'` and `! grep -q 'could not run'`.

### IN-03: `dias_con_commits` is computed in UTC by the script but in author-local time by the documented command

**File:** `scripts/check-figures.mjs:184-186`; `docs/ia-en-el-proyecto.md:99`
**Issue:** The script converts `%at` to UTC. The «Cómo se calculó» command uses `git log --format=%ad --date=short`, which formats in each author's timezone. Both give 11 today. A commit made just after local midnight in another timezone would make them differ, although the section says every line can be reproduced with the listed commands.
**Fix:** Use `--date=format-local:%F` with `TZ=UTC` in the documented command, or say that the script counts UTC days.

### IN-04: README structure list is stale, and the voice check skips the README

**File:** `README.md:129-138`; `scripts/check-docs.mjs:251-265`
**Issue:** `README.md:137` describes `scripts/` as «humo de Compose y su override en frío». It now also holds `check-docs.mjs`, `check-figures.mjs` and `browser-tools.sh`, and `docs/presentacion/` is not listed. `checkVoice` iterates over `VOICE_FILES`, which includes the README, but the emoji and exclamation checks are guarded by `isPhaseDoc`, so the README (edited in this phase for «Próximos pasos») is never checked for them. It is clean today.
**Fix:** Update the line to «scripts/ humo de Compose, comprobaciones de documentación y herramientas de navegador». Drop the `isPhaseDoc` guard or add the README to `PHASE_DOCS`.

### IN-05: Small overstatements in the AI document and the deck

**File:** `docs/ia-en-el-proyecto.md:7,121-122`; `docs/presentacion/deck.md:130,199`
**Issue:**
- Line 7 says every phase repeats the same cycle and leaves a file per step. Phase 2 has no `02-UI-REVIEW.md`, and line 121 lists UI reviews for phases 1, 3, 5 and 6 but not the existing `04-UI-REVIEW.md`.
- Line 122 says commit `98e5c63` left the chips at 44 px. `06-UAT.md` (finding 5) shows the stack chips still measured 42 × 44 after that commit and needed `bd6f63b` (`min-w-11`).
- The deck's «chips medían entre 28 y 36 px» mixes two controls: stack chips (28 px) and status filter buttons (36 px).

An examiner who has read the UAT could notice any of these.
**Fix:** Say «casi todas las fases» in line 7, add `04-UI-REVIEW.md` or drop the list, cite `98e5c63` and `bd6f63b` together, and write «los chips de 28 px y los botones de estado de 36 px».

### IN-06: ADR intro misdescribes the ADR order, and ADR-005 relies on a non-neutral source

**File:** `docs/decisiones.md:5`; `docs/decisiones.md:104,112`
**Issue:**
- Line 5 says the order is structure, then data and infrastructure, and «al final las reglas propias de la IA». ADR-006 (Ollama and the provider) comes before ADR-007 (Compose), ADR-008 (shadcn) and ADR-009 (hooks), so the sentence does not match the list.
- ADR-005 supports the MinIO maintenance and archive dates (2025-12-03, 2026-02-12) with a single blog, `vonng.com`. It appears to belong to the Silo (`pgsty`) fork's maintainer, which is an interested party for the decision. The sentence «Este registro no añade más razones de las que quedaron anotadas.» (line 108) reads as filler.
**Fix:** Reword line 5 to «estructura, luego la IA, la infraestructura y la interfaz, y al final las reglas de los datos». Add a primary source for the MinIO dates (the repository's archive notice) next to the blog. Remove the filler sentence.

### IN-07: Container install pins only the top-level packages

**File:** `scripts/browser-tools.sh:87`
**Issue:** The script claims pinned packages, but `npm init -y && npm i playwright@1.56.1 mermaid@11.17.2 --ignore-scripts` runs with no lockfile, so every transitive dependency is resolved at run time. `--ignore-scripts` limits the risk, but the packages still run in the browser container on a presentation machine. The comment on line 5 promises more reproducibility than this gives.
**Fix:** Say «top-level pinned» in the header, or pass `--package-lock-only` with a small lockfile stored in `docs/presentacion/capturas/`.

### IN-08: `set -e` is ignored inside `mermaid_exec`, so a failed `docker cp` is only caught later

**File:** `scripts/browser-tools.sh:132-142,185,163`
**Issue:** `mermaid_exec` is called from `mermaid_exec "$@" || exit 1` and from `x="$(mermaid_exec …)" ||`. In both contexts bash ignores `errexit` inside the function, so a failing `docker exec mkdir` or `docker cp` does not stop it. A path whose first segment contains `:` is read by `docker cp` as `container:path` and fails. It does not become a false green, because the missing file makes the in-container run print `ERR mermaid check could not run`. The error the presenter sees is then misleading.
**Fix:** Chain the steps with `|| return 1` inside `mermaid_exec`, and prefix relative paths with `./` before `docker cp`.

---

_Reviewed: 2026-11-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
