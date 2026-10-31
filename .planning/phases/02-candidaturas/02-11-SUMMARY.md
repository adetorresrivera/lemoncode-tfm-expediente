---
phase: 02-candidaturas
plan: 11
subsystem: ui
tags: [react, tanstack-form, zod, vitest, a11y]
requires:
  - phase: 02-candidaturas
    provides: "02-10 application-edit pod (VM, mapper with the Spanish message table, useApplicationForm, FormField/controlProps, JobSection); 02-03 normalizeTags and TagChip; 02-05 Input/NativeSelect"
provides:
  - "Textarea primitive (field family, min-h-32)"
  - "ConditionsSection({ form }): Modalidad, Seniority, Tipo de contrato, Ubicación, Salario mínimo/máximo, Moneda"
  - "TrackingSection({ form, mode, currentStatus? }): Estado inicial (create only), Fecha de envío, Enlace de la oferta, Notas"
  - "TagGroupInput({ group, legend, soft?, tags, onChange }) and TagsSection({ form }) with the n de 20 counter"
  - "Create form with the four sections in order: Puesto y empresa, Condiciones, Etiquetas, Seguimiento"
affects: [02-12 edit mode renders TrackingSection mode=edit and the current status line, Phase 3 paste panel, filters by stack tag]
actuals:
  tokens: 18000
  tasks: 2
  commits: 2
  plan_head_before: bdcda2faa3203e936136c0101ce283bdb5fb199b
  plan_head_after: 9c3fa91b3aadeca348b270bb3a5f5ad79ced721e
tech-stack:
  added: []
  patterns:
    - "One tags field in the form; each TagGroupInput filters it by group and writes the whole normalized list back"
    - "Add result decided by comparing lengths of normalizeTags([...tags, new]) with the current list (added / cap / duplicate)"
    - "Focus after removal is requested in the handler through a ref and applied in an effect after the list re-rendered"
key-files:
  created:
    - apps/web/src/common/components/ui/textarea.tsx
    - apps/web/src/pods/application-edit/components/conditions-section.tsx
    - apps/web/src/pods/application-edit/components/tracking-section.tsx
    - apps/web/src/pods/application-edit/components/tag-group-input.tsx
    - apps/web/src/pods/application-edit/components/tags-section.tsx
  modified:
    - apps/web/src/pods/application-edit/application-edit.component.tsx
    - apps/web/src/pods/application-edit/application-edit.test.tsx
key-decisions:
  - "No dependency added; package.json and package-lock.json are unchanged"
  - "At 20 tags any rejected add (duplicate or new) announces «Máximo 20 etiquetas», as the plan specifies (cap check precedes the duplicate message)"
  - "Currency select appends a stored code outside EUR/USD/GBP; the mapper already sends null when both salaries are empty"
  - "The 'Quitar {label}' button is found by its aria-label inside the group list when moving focus, so no per-chip refs are kept"
requirements-completed: [APP-01, APP-12]
coverage:
  - id: D1
    description: "Condiciones and Seguimiento sections: controls, defaults, null mapping of empty values, local-noon date, Spanish field errors (salary order, negative salary, URL, notes, long title/company/location)"
    requirement: "APP-01"
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#ApplicationEditContainer conditions and tracking"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tags by group: Enter adds without submitting, normalization feedback (added / duplicate across groups / cap), counter, maxLength 40, chip removal with announced feedback and focus handover, POST body with the three groups"
    requirement: "APP-12"
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#ApplicationEditContainer tags"
        status: pass
    human_judgment: false
  - id: D3
    description: "Keyboard-only pass of /applications/new, 20 chips wrapping at 360 px without horizontal scroll, focus visibility and announcements as heard by a screen reader"
    verification: []
    human_judgment: true
    rationale: "jsdom cannot judge layout, focus ring visibility or actual announcements; harvested by the end-of-phase UAT (human-check of Task 2)"
duration: 25min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 11: Conditions, tracking and tags in the form Summary

**The create form is complete: conditions with a salary range and currency, tracking with initial status, date, link and notes, and tags by group (stack / se valora / idiomas) that reuse the contracts `normalizeTags` for immediate, announced feedback**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2
- **Files:** 7 (5 created, 2 modified)

## Accomplishments

- `Textarea` primitive in the field family (`min-h-32 px-4 py-2`, tokens only).
- «Condiciones»: three native selects whose «Sin indicar» maps to `null`, «Ubicación», salary min/max (`type=number`, `inputMode=numeric`, `min=0`, hint «Importe anual bruto.» wired through `aria-describedby`) and «Moneda» (EUR, USD, GBP; an unknown stored code is appended).
- «Seguimiento»: «Estado inicial» only in `mode="create"` (7 statuses, default Guardada), «Fecha de envío» (hint, sent as local noon ISO), «Enlace de la oferta» (`type=url`, placeholder `https://`) and «Notas» (`rows=5`). All Spanish errors come from the 02-10 mapper table; the sections only show them.
- «Etiquetas»: three fieldsets with sr-only labels «Añadir etiqueta a {grupo}», `maxLength=40`, outline «Añadir», Enter that calls `preventDefault()` and adds, an always-mounted polite status line per group, the polite `{n} de 20` counter, wrapping chip lists (`flex flex-wrap`, soft chips for «Se valora») and removal that announces «{label} quitada.» and moves focus to the next chip's remove button, else the previous, else the input.
- Adding runs `normalizeTags([...current, new])`: a longer result is an add (announced with the normalized spelling), otherwise «Máximo 20 etiquetas» at the cap or «Ya está en la lista». Empty or whitespace input does nothing and says nothing.
- Tests: 22 new in `application-edit.test.tsx` (web suite 240 -> 262; contracts 55, api 123 unchanged). `npm run typecheck`, `npm run lint` and `npm run test` pass.

## Task Commits

1. **Task 1: Condiciones and Seguimiento sections** - `62b1c65` (feat; RED and GREEN together, see TDD Gate Compliance)
2. **Task 2: Tags by group with Enter-to-add and normalization feedback** - `9c3fa91` (feat; same)

## Decisions Made

See `key-decisions`. No dependency added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in test] List query ambiguous with empty tag lists**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** the «wraps the chips» test used `getByRole("list")`, but each group renders its `ul` even when empty, so three lists matched
- **Fix:** scoped the query to the Stack group
- **Files modified:** `application-edit.test.tsx`
- **Committed in:** 9c3fa91

**2. [Plan wording] Literal strings kept in the components**
- **Found during:** Task 2 (acceptance greps)
- **Issue:** the plan's greps look for the literals `Máximo 20 etiquetas` and `de 20`; a first version built them from `MAX_TAGS`
- **Fix:** the Spanish copy is written literally (the cap comparison still uses `MAX_TAGS`)
- **Files modified:** `tag-group-input.tsx`, `tags-section.tsx`
- **Committed in:** 9c3fa91

**Total deviations:** 2 trivial, no scope or interface change. `TrackingSection` declares `currentStatus?` as the plan's interface requires but does not use it yet (plan 02-12 renders the edit-mode status line).

## TDD Gate Compliance

The pre-commit hook runs typecheck and the whole suite, so a RED-only commit is impossible; RED was run locally and RED plus GREEN were committed together for both tasks (no `test(02-11)` commit exists; flagged on purpose, as in earlier plans).

- **Task 1 RED:** 9 of the 10 new tests failed with assertion failures on missing UI (`Unable to find a label with the text of: Salario mínimo` and similar); the file loaded and all tests ran. The tenth ("posts an empty date, link, notes and conditions as null") already passed because the 02-10 mapper does the null mapping; it is a regression guard. semanticAssessment: valid RED. GREEN: 37 of 37 (an edit-mode test was added afterwards).
- **Task 2 RED:** 12 of 49 failed (11 tag tests plus the section-order test now expecting «Etiquetas»), all assertion failures on the missing UI. semanticAssessment: valid RED. GREEN: 49 of 49.
- `check tdd-red-evidence` was not run (project reporter is not TAP).

## Issues Encountered

- The sandbox refuses compound shell commands that mix `cd`, heredocs and git; tests were added with the Edit tool instead.
- Prettier (lint-staged) reformatted the new files; no behavior change.

## Known Stubs

None. `TrackingSection`'s `currentStatus` prop is accepted but intentionally unused until plan 02-12.

## Threat Flags

None. T-02-26 is mitigated: `maxLength=40` on the tag input, the same `normalizeTags` and contracts schema on client and server (the API still rejects more than 20 raw tags), chips rendered as React text, and `sourceUrl` limited to http/https by the schema. T-02-SC: no install, lockfile unchanged.

## Hand-over notes

- **02-12:** render `TrackingSection mode="edit"` (no «Estado inicial») plus the «Estado actual:» line using `currentStatus`; initial values for edit come from a new mapper into `ApplicationFormValues`; `tags` already hold `{ label, group }`.
- **Human check pending (D3):** open `/applications/new` with the keyboard only, add 20 tags at 360 px, remove a chip and watch where focus goes.

## Self-Check: PASSED

- Created files exist: textarea.tsx, conditions-section.tsx, tracking-section.tsx, tag-group-input.tsx, tags-section.tsx (FOUND).
- Commits `62b1c65` and `9c3fa91` are ancestors of HEAD; `git rev-list --count` from `plan_head_before` is 2.
- Acceptance greps of both tasks pass; `npm run typecheck && npm run test && npm run lint` exit 0; package.json and the lockfile are unchanged.

---
*Phase: 02-candidaturas*
*Completed: 2026-10-31*
