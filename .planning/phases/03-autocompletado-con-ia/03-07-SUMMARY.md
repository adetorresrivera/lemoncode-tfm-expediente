---
phase: 03-autocompletado-con-ia
plan: 07
subsystem: api-ui
tags: [offer-text, put, react, tanstack-form, vitest]

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-04 mergeExtractionIntoForm and useOfferExtraction; 03-05 marks; 03-06 tag merge"
  - phase: 02-candidaturas
    provides: "PUT whitelist hand-over (offerText and document ids outside it); OfferTextSection in the detail"
provides:
  - "PUT /api/applications/:id writes offerText exactly as sent (null clears it)"
  - "ApplicationFormValues.offerText (empty string means none), mapped both ways"
  - "mergeExtractionIntoForm(current, extraction, text) sets values.offerText to the analyzed text"
  - "Edit-mode paste panel prefilled with the stored offer text"
affects: [03-08]

actuals:
  tokens: 21000
  tasks: 3
  commits: 5
plan_head_before: 536208f7ff38cb1cb4a650c7575410c01a0ddc6c
plan_head_after: e985930

tech-stack:
  added: []
  patterns:
    - "offerText has no mounted field: it is written with form.setFieldValue and dontRunListeners only after a successful analysis"
    - "The edit form always sends the loaded offerText back, so an unrelated save never wipes it"

key-files:
  created: []
  modified:
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/api/src/applications/applications.update.test.ts
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.merge.test.ts
    - apps/web/src/pods/application-edit/application-edit.test.tsx
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx

key-decisions:
  - "No dependency added; package.json files and the lockfile are unchanged"
  - "PUT semantics change on purpose: offerText is written as sent, and an omitted or null value clears the stored text (schema default null). The edit form always sends the loaded value, which is why the form model carries it from the first render"
  - "mergeExtractionIntoForm takes a required third parameter text (RESEARCH Q5) so tsc finds any call left with two arguments; every call site (merge tests and the single caller in useOfferExtraction) was updated in Task 2"
  - "offerText is never listed in aiFields: it is not an AI-filled field and gets no mark"
  - "Only Phase 5's cvDocumentId and coverLetterDocumentId remain outside the PUT whitelist (still pinned by a test)"

requirements-completed: [AI-09]

duration: 20 min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 07: Analyzed offer stored with the application Summary

**The offer the user analysed is saved as offerText on create and edit, stays untouched by plain typing, and comes back into the paste panel when the application is edited.**

## Accomplishments

- API: `EditableFields.offerText` plus an explicit `$set` in `updateEditable`; `toEditableFields` copies it key by key. The update test is rewritten into one test for the document links (kept on every PUT variant), one for offerText write and clear, and one for the 20,000 / 20,001 limit (400 `VALIDATION_ERROR`, nothing changed).
- Form model: `ApplicationFormValues.offerText` (`""` when none); `mapApplicationFromApiToFormValues` turns null into `""`; `mapFormValuesToApiInput` sends `textOrNull(values.offerText)` instead of a hard-coded null.
- Merge: `mergeExtractionIntoForm(current, extraction, text)` writes `values.offerText = text`; `useOfferExtraction.analyze` keeps `analyzedText = draft.trim()`, sends it and passes it to the merge, then writes `offerText` into the form with `dontRunListeners`.
- Container: `ApplicationEditForm` passes `initialDraft: values.offerText`; `ApplicationCreate` keeps `""`.
- Flow tests: create posts the trimmed analyzed text; changing the textarea afterwards without analysing keeps the analyzed text; never analysing posts null; edit prefills the panel, sends the stored text back unchanged, keeps it when the textarea is edited without analysing, sends the new trimmed text after re-analysing, and starts empty for a stored null.

## TDD Gate Compliance

Plan type is `execute` with `tdd="true"` tasks; the RED/GREEN sequence was followed for Tasks 1 and 3.

- RED (Task 1) `1ff2777`: two new PUT tests failed on `expected 'texto' to be 'otro'` and on the 20,000-character case (assertion failures for the planned behavior, not load errors).
- GREEN (Task 1) `5934b74`.
- Task 2 `cfe8f98`: tests and implementation in one commit, because a required third argument cannot be tested before it compiles; `tsc` and the updated tests are the gate.
- RED (Task 3) `d343117`: four flow tests failed on `expected null to be '<offer>'` and on the prefilled value.
- GREEN (Task 3) `e985930`.

## Deviations from Plan

None - plan executed exactly as written.

The worktree had no `node_modules`; `npm ci` (lockfile, no new package) and `npm run build -w @tfm/contracts` were run locally to execute the checks. Nothing tracked changed.

## Verification

- `npm run test -w @tfm/api -- src/applications src/tags`: 7 files, 95 tests passed.
- `npm run test -w @tfm/web -- src/pods/application-edit src/pods/application-detail src/core/router`: 7 files, 248 tests passed.
- `npm run typecheck && npm run test && npm run lint`: all exit 0 (contracts 55, api 211, web 369 tests).
- Acceptance greps of all three tasks: pass (including the single-caller check for `mergeExtractionIntoForm(`).

## Known Stubs

None.

## Threat Flags

None. T-03-13 holds (key-by-key whitelist, explicit `$set`, 20,000 cap tested, document ids still outside); T-03-14 unchanged (the detail renders the stored text as React text).

## Self-Check: PASSED

- Commits `1ff2777`, `5934b74`, `cfe8f98`, `d343117`, `e985930` are ancestors of HEAD.
- All ten files listed under key-files exist and were modified in those commits.
