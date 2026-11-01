---
phase: 03-autocompletado-con-ia
plan: 05
subsystem: ui
tags: [react, tanstack-form, accessibility, vitest, ai-extraction]

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-04 AiMarks type, RELEVANT_FIELDS and missingFields from mergeExtractionIntoForm"
provides:
  - "AiMark: navy «IA» badge with aria-hidden text and an sr-only «Rellenado por la IA»"
  - "FormField/controlProps flags aiFilled and missing (gold border and «Complétalo tú», error wins)"
  - "useAiMarks hook (session marks), form-level listeners.onChange via the onUserChange option, clearStatus"
  - "ApplicationEditComponent required prop marks, forwarded to JobSection and ConditionsSection"
affects: [03-06, 03-07, 03-08]

actuals:
  tokens: 8500
  tasks: 2
  commits: 2
plan_head_before: 11e97e0fac5ea90d7fb4a5ae8a67eef127362c03
plan_head_after: e7f6f34f9e2dd14e2564c73768cc8d703f2188a6

tech-stack:
  added: []
  patterns:
    - "Marks are pod session state in useState Sets with stable callbacks, not form meta"
    - "A merge writes with dontRunListeners; a form-level listeners.onChange is the only path that clears marks"

key-files:
  created:
    - apps/web/src/common/components/ai-mark.tsx
    - apps/web/src/pods/application-edit/components/form-field.test.tsx
  modified:
    - apps/web/src/common/components/common-components.test.tsx
    - apps/web/src/pods/application-edit/components/form-field.tsx
    - apps/web/src/pods/application-edit/components/field-props.ts
    - apps/web/src/pods/application-edit/components/job-section.tsx
    - apps/web/src/pods/application-edit/components/conditions-section.tsx
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/application-edit.component.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx

key-decisions:
  - "No dependency added; apps/web/package.json and the lockfile are unchanged"
  - "Marks are cleared on a successful save only (together with the summary line); a failed save keeps them (D-17)"
  - "Narrowing of the listener field name and of the user-changed value uses type-guard functions (isFormFieldName, isAiFillable, isRelevant), no casts and no any"
  - "Both container modes call clearStatus from a later declaration inside onSaved: the callback only runs after a save, when the extraction hook already exists"

requirements-completed: [AI-07, AI-08]

duration: 20 min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 05: IA badge and «Complétalo tú» Summary

**Fields the AI filled show a navy «IA» badge announced through aria-describedby, relevant fields still empty get the gold «Complétalo tú» treatment, and both marks follow the user: they fade on edit, accumulate across analyses and vanish after a successful save.**

## Performance

- **Duration:** about 20 min
- **Tasks:** 2
- **Files:** 11 (2 created, 9 modified). Explicit scope acceptance from the plan: three of them are co-located tests, and the component prop and the container that passes it had to land in one commit because the pre-commit hook runs the typecheck.

## Accomplishments

- `AiMark` renders the UI-SPEC markup exactly (`inline-flex h-5 ... bg-brand-navy ... text-brand-parchment`, `aria-hidden` «IA», `sr-only` «Rellenado por la IA»). `FormField` places it next to the `Label`, outside the `label` element, so `getByLabelText("Puesto *")` keeps working.
- `controlProps` lists `{id}-hint`, `{id}-ai`, `{id}-missing`, `{id}-error` in that order and returns `className: "border-brand-gold bg-ai-missing-bg"` only for a missing field without an error; callers that pass no flags get the same output as before.
- `JobSection` and `ConditionsSection` take optional `marks`; only title, company, workMode and seniority can be «missing»; tags, status, dates, URL and notes never get a badge.
- `useAiMarks`: a merge unions the filled fields and replaces the missing list (D-11); any user change drops the field's «IA» (D-13); a non-blank value drops «Complétalo tú» and clearing it again does not restore it (D-16). Callbacks are `useCallback` with functional updates.
- `useApplicationForm` gains `onUserChange` fed by a form-level `listeners.onChange`; the merge keeps writing with `dontRunListeners`, so an AI fill never clears its own marks. `useOfferExtraction` gains `clearStatus`.
- The container calls `marks.clear()` and `clearStatus()` in `onSaved` before navigating, in create and edit mode; a failed save touches nothing.
- Tests: 1 `AiMark` case, 8 `FormField`/`controlProps` cases, 9 flow cases (badge and missing treatment, no highlight on location/contract/salary, edit and restore, clear and re-clear, second analysis, validation error wins, failed save, successful save, edit mode after load).

## Task Commits

1. **Task 1: IA badge and Complétalo tú on the form fields** - `d63659d` (feat)
2. **Task 2: Marks follow the user** - `e7f6f34` (feat)

## TDD Gate Compliance

The tests of each task were written first and run before the implementation: Task 1 failed with 6 of 8 failing (missing module and absent badge/line assertions), Task 2 with 8 of 28 failing on the planned assertions (no badges rendered). Each failure was on the target assertion, not on a syntax or setup fault. The RED state could not be committed on its own: the Husky pre-commit hook runs `npm run typecheck`, which rejects tests that import symbols that do not exist yet. Test and implementation therefore share one `feat(03-05)` commit per task. The plan is `type: execute`, so no separate `test(...)` commit gate applies.

## Deviations from Plan

None - plan executed exactly as written. Two small details worth noting, neither a deviation: `controlProps` always returns the `className` key (undefined when not missing), as the plan describes, and `useAiMarks` is a `function` declaration so the acceptance grep `export function useAiMarks` matches.

## Issues Encountered

None.

## Verification

- `npm run test -w @tfm/web -- src/pods/application-edit src/common src/core/router`: 8 files, 201 tests passed.
- `npm run typecheck && npm run test && npm run lint`: contracts 55, api 170, web 341 tests passed; tsc and eslint (`--max-warnings=0`) clean.
- Acceptance greps of both tasks pass (AiMark and strings present, no hex or palette classes, `listeners` and `useAiMarks` present, `marks={` in the component, no `localStorage`/`sessionStorage` in the pod).
- Threat model T-03-11 mitigated: every AI-filled field carries the badge until the user edits it; no `dangerouslySetInnerHTML`; marks never persisted. T-03-SC: no package installed.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Ready for 03-06. The binding interfaces are in place: `AiMark`, `FormField` flags, `useAiMarks`, `clearStatus`, and the `marks` prop on `ApplicationEditComponent`. REQUIREMENTS.md, STATE.md and ROADMAP.md were not touched here (parallel worktree mode: the orchestrator owns those writes).

## Self-Check: PASSED

- FOUND: apps/web/src/common/components/ai-mark.tsx
- FOUND: apps/web/src/pods/application-edit/components/form-field.test.tsx
- FOUND: commit d63659d
- FOUND: commit e7f6f34
