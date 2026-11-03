---
phase: 03-autocompletado-con-ia
plan: 04
subsystem: ui
tags: [react, zod, tanstack-form, vitest, ai-extraction]

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-01 tracer: mergeExtractionIntoForm six-field rule, useOfferExtraction, OfferPanel"
provides:
  - "mergeExtractionIntoForm fills salary pair and currency without inverting a range or inventing a currency"
  - "missingFields (Puesto, Empresa, Modalidad, Seniority) computed by the merge and carried in the success status"
  - "«Te falta completar: ...» sentence appended to every success summary"
  - "AiMarks view-model type for plan 03-05"
  - "application-edit.merge.test.ts, the merge's unit-test file"
affects: [03-05, 03-06, 03-07]

actuals:
  tokens: 6300
  tasks: 2
  commits: 2
plan_head_before: 78efd6d15627e02c787bae52cf75b93d370a8329
plan_head_after: cd4c582d8bbe3857a47663579bd0c546addb9320

tech-stack:
  added: []
  patterns:
    - "Pure merge returns values + aiFields + missingFields; the hook only applies them"

key-files:
  created:
    - apps/web/src/pods/application-edit/application-edit.merge.test.ts
  modified:
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/components/offer-panel.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx

key-decisions:
  - "Currency is filled only when both salary fields were empty, the analysis filled at least one and returned a currency (user-accepted narrowing of the UI-SPEC rule, 2026-10-31)"
  - "A salary fill that would invert the pair against a kept value is skipped, never overwritten (user-accepted refinement, Pitfall 9)"
  - "The missing sentence is appended to every success text, including «No hemos encontrado datos nuevos...», as the UI-SPEC says «any success text»"

requirements-completed: [AI-06, AI-08]

duration: 12 min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 04: Full scalar merge Summary

**The AI merge now fills the salary range and currency without inverting a range or inventing a currency, and the panel names the relevant fields (Puesto, Empresa, Modalidad, Seniority) still empty.**

## Performance

- **Duration:** about 12 min
- **Tasks:** 2
- **Files:** 6 (1 created, 5 modified)

## Accomplishments

- `mergeExtractionIntoForm` fills `salaryMin` and `salaryMax` as `String(n)` (45000.5 stays «45000.5»), skips a side whose fill would invert the pair against a value the user kept, and fills `currency` only together with a salary it filled itself (edge AI-02 web part, Pitfalls 9-10).
- The merge returns `missingFields` in `RELEVANT_FIELDS` order, computed from the merged values (whitespace-only counts as empty), so a second analysis recalculates from the values at that moment.
- `useOfferExtraction` stores `missing: merge.missingFields` in the success status; the write loop of 03-01 already covered salary and currency, so no per-field change was needed.
- `OfferPanel` appends «Te falta completar: Empresa y Seniority.» (form order, «, » and a final « y») to the summary.
- `AiMarks` is declared in the VM next to the two lists it mirrors, for plan 03-05 to render.
- 22 merge unit tests (six-field rule, salary pair, currency, missing fields, no mutation) and 5 new flow tests.

## Task Commits

1. **Task 1: Full scalar merge** - `65c1104` (feat)
2. **Task 2: Missing fields in the summary** - `cd4c582` (feat)

TDD note: the merge test file was written first and run against the 03-01 mapper; 13 of 22 tests failed on the planned assertions (`missingFields` undefined, salary/currency not filled), then the implementation made all 22 pass. RED and GREEN went into one commit per task because the pre-commit hook runs `tsc`, and a test file referencing the not-yet-existing `missingFields` cannot be committed alone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing 03-01 flow tests asserted the old counts and sentences**
- **Found during:** Task 2
- **Issue:** with salary and currency now filled, the full extraction counts 9 fields instead of 6 (8 instead of 5 when a title was typed), and every success text may now end with the missing sentence.
- **Fix:** updated the expected strings in `application-edit.ai.test.tsx`; no behavior test was removed.
- **Files modified:** apps/web/src/pods/application-edit/application-edit.ai.test.tsx
- **Commit:** cd4c582

**Total deviations:** 1 auto-fixed (1 test expectation update). **Impact:** none on scope.

## Decisions Made

- User-accepted refinements of the UI-SPEC rules: the narrowed currency rule and the salary guard (see key-decisions).
- No dependency added.
- Probes AI-06 and AI-08 (came back unclassified, «review manually») were reviewed by hand and covered by the merge and flow tests; none dismissed. AI-07 and the on-field highlight are plan 03-05.

## Issues Encountered

None.

## Verification

- `npm run test -w @tfm/web -- src/pods/application-edit src/core/router`: 153 passed.
- `npm run typecheck && npm run test && npm run lint`: exit 0 (contracts 55, api 148, web 322 tests).
- Acceptance greps (`RELEVANT_FIELDS`, `missingFields`, `Te falta completar`, `missing: merge.missingFields`, no `extends`/`Omit<`/`Pick<` in the VM): all pass.

## Known Stubs

None.

## Threat Flags

None. T-03-10 mitigated as planned (empty fields only, no inverted range, currency only with a filled salary, every AI value counted in the summary).

## Next Phase Readiness

Ready for 03-05: `AiMarks`, `RELEVANT_FIELDS`, `ExtractionMerge.missingFields` and the `onMerged` callback are in place.

## Self-Check: PASSED

- FOUND: apps/web/src/pods/application-edit/application-edit.merge.test.ts
- FOUND commits: 65c1104, cd4c582
