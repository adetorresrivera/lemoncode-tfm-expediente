---
phase: 03-autocompletado-con-ia
plan: 06
subsystem: ui
tags: [react, tags, ai-extraction, accessibility, vitest]

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-04 mergeExtractionIntoForm, ExtractionMerge, success status; 03-05 useAiMarks, onUserChange listener, marks prop"
provides:
  - "mergeExtractionIntoForm unions the proposed tags (normalizeTags) and returns aiTags (tagKey list)"
  - "TagChip optional aiSuggested mark: 12 px Sparkles plus sr-only «(propuesta por IA)»"
  - "AiMarks.aiTags in the session marks, pruned when a chip leaves the list"
  - "Success line that counts fields and tags with singular and plural forms"
affects: [03-07, 03-08]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 68e3c4e5b2d91a3bab367438e47573841832930b
plan_head_after: 0926d793ed0f353f68ba532dd6b7941f1c6572df

tech-stack:
  added: []
  patterns:
    - "Tag mark identity is tagKey(label); the web never re-implements normalization"
    - "The tags field is written with dontRunListeners only when the AI added chips, so the merge never prunes its own marks"

key-files:
  created: []
  modified:
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.merge.test.ts
    - apps/web/src/common/components/tag-chip.tsx
    - apps/web/src/common/components/common-components.test.tsx
    - apps/web/src/pods/application-edit/components/tag-group-input.tsx
    - apps/web/src/pods/application-edit/components/tags-section.tsx
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.component.tsx
    - apps/web/src/pods/application-edit/components/offer-panel.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx

key-decisions:
  - "No dependency added; apps/web/package.json and the lockfile are unchanged"
  - "Merged tag order: the existing tags first in their order, then the new ones in model order; when MAX_TAGS is reached the user's tags are kept and the extra AI tags are dropped (normalizeTags over [...current, ...proposed])"
  - "A proposed tag whose key already exists (any group) is not added: the user's spelling and group win, and it gets no mark"
  - "aiTags in the marks are tag keys; the removed-chip pruning runs in the existing form-level onChange listener (name === tags) with Array.isArray and a label type guard, no casts"
  - "The tags field is written only when merge.aiTags is non-empty, so an analysis with no new tags leaves the groups untouched"

requirements-completed: [AI-06, AI-07]

duration: 25 min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 06: Proposed tags with an AI mark Summary

**The AI's stack, «se valora» and language tags join the user's tags without duplicates (tagKey, existing first, cap kept), each proposed chip shows a Sparkles mark read as «(propuesta por IA)» until it is removed or the form is saved, and the success line counts fields and tags.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2
- **Files:** 11 modified (plan-accepted scope: three are co-located tests)

## Accomplishments

- `mergeExtractionIntoForm` builds `normalizeTags([...current.tags, ...extraction.tags])` and reports `aiTags` as the keys not present before. Only `normalizeTags` and `tagKey` from `@tfm/contracts` are used (no duplicated normalization).
- `TagChip` takes `aiSuggested`: a `size-3 text-primary` Sparkles (`strokeWidth` 1.5, `aria-hidden`) before the truncating label and an `sr-only` «(propuesta por IA)» after it, outside the truncating span. The remove button keeps «Quitar {label}». The toggle variant and every chip without the prop render as before.
- `TagGroupInput`/`TagsSection` take `aiTags` and pass `aiSuggested={aiTags?.has(tagKey(tag.label)) === true}`; legends get no badge. `ApplicationEditComponent` forwards `marks.aiTags`.
- `useAiMarks`: `addFromMerge` unions `aiTags`; the existing `onUserChange` prunes keys no longer present in the tag list (a chip removed and re-added by hand has no mark); `clear()` empties them with the rest after a successful save.
- `useOfferExtraction` writes the merged tag list with `dontRunListeners` only when the AI added chips, and reports `tagsAdded`.
- `OfferPanel` success copy: nothing new, fields only (plan 03-01 sentences), tags only («Hemos añadido 1 etiqueta. Revísala.» / «M etiquetas. Revísalas.»), both («Hemos rellenado N campos y añadido M etiquetas. Revísalos.», `1 campo`/`1 etiqueta` in the singular). The «Te falta completar» sentence is still appended. No parenthesised plural suffix.
- Tests: 6 merge cases, 3 `TagChip` cases, 7 flow cases (three groups with marks and the «3 de 20» counter, singular/plural sentences, user spelling wins with no mark, removed chip loses its mark for good, second analysis keeps marks and adds only new tags, loading/error leave the chips, save clears the marks).

## Task Commits

1. **Task 1: Tag union in the merge and the AI mark on TagChip** - `d1c3871` (feat)
2. **Task 2: Proposed tags appear marked in their groups and the summary counts them** - `0926d79` (feat)

## TDD Gate Compliance

Both tasks are `tdd="true"` inside a `type: execute` plan. The RED step was run (Task 1: 6 target tests failed on their planned assertions: `aiTags` undefined, tags not unioned, Sparkles/sr-only note absent) before the implementation, but no separate `test(03-06)` commit exists: the pre-commit hook runs `npm run typecheck`, and a test file reading `merge.aiTags` or a typed `aiSuggested` prop cannot be committed before the types exist. Each task is therefore a single `feat` commit holding tests and implementation, as the plan's per-task file lists describe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing flow tests assumed the shared EXTRACTION fixture had no tags in the success line**
- **Found during:** Task 2
- **Issue:** The `EXTRACTION` fixture in `application-edit.ai.test.tsx` carried a React tag, so every «Hemos rellenado N campos. Revísalos.» assertion would now read «… y añadido 1 etiqueta …».
- **Fix:** The fixture's `tags` is now `[]`; the tag behaviours have their own fixtures and describe block.
- **Files modified:** apps/web/src/pods/application-edit/application-edit.ai.test.tsx
- **Commit:** 0926d79

**Total deviations:** 1 auto-fixed (1 blocking test fixture). **Impact:** none on production code.

## Issues Encountered

None. `node_modules` is not present in the worktree; commands resolve it from the parent checkout, and `@tfm/contracts` (unchanged here) resolves there too.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or trust boundary; T-03-12 is mitigated by `normalizeTags` (cap, user tags first) and chip truncation with the full label in `title`; T-03-SC: no package installed.

## Verification

- `npm run typecheck && npm run test && npm run lint` exits 0 (contracts 55, api 209, web 358 tests).
- Acceptance greps: `aiSuggested`/`(propuesta por IA)` in tag-chip, `aiTags`/`normalizeTags(` in the mapper, `aiSuggested=` in tag-group-input, `aiTags=` in the component, `Revísala.`/`Revísalas.` in offer-panel, no `(s)` in offer-panel: all pass.

## Self-Check: PASSED

- Commits `d1c3871` and `0926d79` are ancestors of HEAD.
- All 11 modified files exist on disk.
