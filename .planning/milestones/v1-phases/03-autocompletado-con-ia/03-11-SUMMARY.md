---
phase: 03-autocompletado-con-ia
plan: 11
subsystem: web
tags: [tags, placeholder, copy, gap-closure, ui]
gap_ids: [G-03-2b]
requires:
  - phase: 03-autocompletado-con-ia
    provides: plan 03-10 (D-26 and the «Gap closure decisions» subsection in 03-CONTEXT.md)
provides:
  - required `placeholder` prop on TagGroupInput
  - per-group tag example placeholders set by TagsSection
  - amended phase-2 copy contract and decision D-27
affects: [03-12, 02-UI-SPEC.md]
tech-stack:
  added: []
  patterns: [group copy set by the parent next to the legend, required prop so a group cannot render without its own example]
key-files:
  created: []
  modified:
    - apps/web/src/pods/application-edit/components/tag-group-input.tsx
    - apps/web/src/pods/application-edit/components/tags-section.tsx
    - apps/web/src/pods/application-edit/application-edit.test.tsx
    - .planning/phases/02-candidaturas/02-UI-SPEC.md
    - .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
key-decisions:
  - "D-27: each tag-group input shows its own example: Stack tecnológico «Ej.: React», Se valora «Ej.: Docker», Idiomas «Ej.: Inglés B2»"
patterns-established:
  - "Copy that varies per group lives in TagsSection; TagGroupInput holds no copy of its own for it"
requirements-completed: [AI-06]
status: complete
duration: 10min
completed: 2026-11-01
commits: 2
plan_head_before: e55ccfc0fe612773e7d0be893837ab8aefd883a6
plan_head_after: 67f86f12c0e79b3853721cab69f6e6168010b730
actuals:
  tokens: 1500
  tasks: 2
  commits: 2
---

# Phase 3 Plan 11: Per-group tag placeholders Summary

**Each tag input in the application form now shows its own example («Ej.: React», «Ej.: Docker», «Ej.: Inglés B2») through a required `placeholder` prop on `TagGroupInput`, with the phase-2 copy contract amended and D-27 recorded.**

No dependency added. `gap_ids: [G-03-2b]`.

## What changed

- `TagGroupInput` takes `placeholder: string` (required, no default) and forwards it to the `Input`; the hard-coded «Ej.: React» literal is gone. A call site that omits it fails `tsc`.
- `TagsSection` sets the three placeholders next to each legend: Stack tecnológico «Ej.: React», Se valora «Ej.: Docker», Idiomas «Ej.: Inglés B2».
- The test «shows three labelled groups, the counter and always-mounted status lines» asserts each group's own placeholder. It was run red first (failed on «Se valora», received «Ej.: React»), then made green. RED and GREEN went into one commit because the pre-commit hook runs the full suite.
- Legends, the sr-only label «Añadir etiqueta a {grupo}», `maxLength={40}`, Enter-adds-without-submit, the status line and the chips with their AI mark are untouched.
- Copy contract: `02-UI-SPEC.md` (Etiquetas section and the «Placeholders» row of the copy table) names the three per-group placeholders with an amendment marker pointing to 03-CONTEXT.md D-27. `03-CONTEXT.md` has D-27 appended after D-26, without rewriting the D-01/D-25 amendments or D-26.

## Task commits

| Task | Commit | Description |
| ---- | ------ | ----------- |
| 1 (tracer) | 5b647e3 | placeholder prop, per-group copy, form test |
| 2 | 67f86f1 | 02-UI-SPEC.md amendment and D-27 |

## Verification

- `npm run test -w @tfm/web -- src/pods/application-edit && npm run typecheck`: 4 files, 181 tests passed.
- `npm run typecheck && npm run test && npm run lint`: all green (contracts 55, api 260, web 403 tests; ESLint with zero warnings).
- Task 2 grep checks (Ej.: Docker and Ej.: Inglés B2 at least twice in 02-UI-SPEC.md, G-03-2b, D-27, `UAT G-03-2b, plan 03-11`) pass.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Static string literals rendered as an attribute; no new input surface (T-03-21 accepted, T-03-SC: no package installed, lockfile unchanged).

## Self-Check: PASSED

- tag-group-input.tsx, tags-section.tsx, application-edit.test.tsx, 02-UI-SPEC.md, 03-CONTEXT.md modified and present.
- Commits 5b647e3 and 67f86f1 are ancestors of HEAD.
