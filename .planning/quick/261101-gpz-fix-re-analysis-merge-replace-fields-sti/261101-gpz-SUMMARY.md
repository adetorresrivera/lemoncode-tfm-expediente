---
phase: quick-261101-gpz
plan: 01
subsystem: web / application-edit pod (AI autocomplete)
tags: [ai, merge, marks, re-analysis, tdd]
requires:
  - phase 03 plan 09 UI review finding (re-analysis does not replace AI-filled fields)
provides:
  - mergeExtractionIntoForm with a fourth optional parameter (previous IA marks) that treats marked fields and chips as replaceable
  - ref-backed useAiMarks (getMarks, setFromMerge) read at response time
  - spec text for the re-analysis rule (AI-EXTRACTION.md step 4, 03-UI-SPEC.md, D-11, AI-06)
affects:
  - apps/web/src/pods/application-edit
tech-stack:
  added: []
  patterns: [ref as source of truth for session marks, pure merge with optional previous-marks argument]
key-files:
  created: []
  modified:
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/application-edit.merge.test.ts
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
    - docs/AI-EXTRACTION.md
    - .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md
    - .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
    - .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md
    - .planning/REQUIREMENTS.md
decisions:
  - "A field still marked IA counts as free (empty) for the merge; a marked field the analysis does not fill is reset to its EMPTY_FORM_VALUES value (currency back to EUR)"
  - "Marks are replaced by each merge (aiFields, aiTags, missingFields) and read from a ref at response time"
status: complete
actuals:
  tokens: 40000
  tasks: 3
  commits: 3
plan_head_before: 1db5c448e4d895f0a3d42e30377ab658f7f6f501
plan_head_after: 9e32c9f8fec513e285a7baf898eaf4e551f99cb0
completed: 2026-11-01
---

# Phase quick-261101-gpz Plan 01: Re-analysis replaces fields still marked IA Summary

A second analysis in the application form now replaces (or clears) every scalar field and AI chip still marked «IA», keeps user-typed or edited values and the user's tags, and recomputes the «IA» and «Complétalo tú» marks from the new result.

The `commits` count above is measured over the three task commits, before this SUMMARY commit. The SUMMARY commit makes four in total. The commit ledger file under the git dir could not be written by the sandbox guard, so the base is the known worktree base `1db5c44`.

## Commits

- `b317f11` fix(quick-261101-gpz): replace fields still marked IA on re-analysis (Task 1)
- `4f0f808` fix(quick-261101-gpz): replace AI-proposed tags on re-analysis (Task 2)
- `9e32c9f` docs(quick-261101-gpz): state the re-analysis rule for fields still marked IA (Task 3)

## TDD Gate Compliance

RED and GREEN are committed together in each task, because the pre-commit hook runs the whole suite (Phase 2 convention in STATE.md).

- Task 1 RED, seen failing before GREEN: 7 new merge tests (replace, clear, salary replace, salary reset, inversion guard, marked currency reset, unmarked currency kept) and the 3 new Testing Library tests, plus the updated «drops the missing sentence on a second analysis» test. The updated «brings Complétalo tú back» test already passed in RED (the same summary text it used to wait on still passes), and the «does not mutate» test passed in RED because the old code never mutated. 11 failed, 90 passed.
- Task 2 RED: 5 new merge tag tests and the 2 chip component tests (the new one and the updated one) failed before GREEN. 7 failed, 100 passed.

## Design decisions as applied

1. **Free rule.** A field is free when blank or marked «IA». Free fields take the new value; a marked field the analysis does not fill is reset to `EMPTY_FORM_VALUES[field]` and not listed in `aiFields`.
2. **Salary guard.** Only a salary side that is not free (the user's) bounds the other side. An AI fill that would invert against a user value is skipped and the marked side is reset to "".
3. **Currency.** Written when both salary sides are free, at least one was filled, the extraction returned a currency, and the currency is still marked «IA» or both sides of `current` were blank. A marked currency not written is reset to EUR. Accepted consequence, pinned by a test: an unmarked currency next to AI-marked salaries is kept, because marks cannot tell a default EUR from a user choice.
4. **Tags.** Chips whose key is in the previous `aiTags` are dropped, the remaining user chips are unioned with the new tags through `normalizeTags` (user first, user wins on a duplicate key). A re-proposed chip returns in the new spelling and group and stays marked. Dropped AI chips free slots under the cap.
5. **Marks replaced.** `setFromMerge` sets `aiFields`, `aiTags` and `missingFields` to the merge's lists.
6. **Read at response time.** `useAiMarks` keeps a `useRef` written synchronously in its callbacks; `getMarks` is stable. `useOfferExtraction` reads it in the response handler next to `form.state.values` (D-20) and writes every field in the union of the previous and the new `aiFields`. The tag list is written when the merge added chips or the previous marks held a chip key.
7. **Signature.** `mergeExtractionIntoForm(current, extraction, text, previous?)`, `previous` typed `Pick<AiMarks, "aiFields" | "aiTags">`, default two empty sets. `ExtractionMerge` and `application-edit.vm.ts` are unchanged.

## AI-06 wording

The orchestrator addendum asked for the AI-06 line to be reconciled, so `.planning/REQUIREMENTS.md` line 47 was edited (text only): it now reads that applying a draft fills empty fields and fields still marked «IA» (replacing or clearing them), never touches user-typed or user-edited values, merges tags without duplicates (AI chips not edited are replaced), and never persists until the user saves. The checkbox and the traceability table are unchanged. The plan itself had said not to edit it; the addendum overrides that.

## Existing tests whose expectations or names changed

- «drops the missing sentence on a second analysis once the user completed the field»: the second analysis now refills the 8 marked fields, so it waits for «Hemos rellenado 8 campos. Revísalos.» instead of the «No hemos encontrado datos nuevos» sentence. The «Te falta completar» absence assertion stays.
- «brings Complétalo tú back only when a later analysis leaves the field empty»: waits on `findByText(MISSING)` instead of the «No hemos encontrado datos nuevos» text, because the second analysis reads the same summary as the first.
- «keeps earlier badges on a second analysis…» renamed to «marks the fields a second analysis fills again, leaves the edited one unmarked and recalculates the missing list» (assertions unchanged, inline comment updated).
- «keeps the marks of the chips still present when a second analysis adds only new tags» renamed to «replaces the AI chips still present when a second analysis proposes other tags»: the AI chip is now replaced, so the test expects no chip «React», chip «react» marked, chip «Docker» marked, «2 de 20».
- Every existing merge test passes unmodified (no fourth argument = no marks).

## Deviations from Plan

- [Addendum] AI-06 in REQUIREMENTS.md was edited, as the orchestrator requested (see above). No other deviation.
- The plan-head ledger file inside the git dir could not be created because the sandbox guard rejects commands that touch the git dir path; `plan_head_before` is the known worktree base.

## Verification

- `npm run typecheck`, `npm run lint` (zero warnings) and `npm run test` pass from the repo root (three workspaces: 55, 211 and 403 tests passing).
- Prompt block sha256 is still 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a.
- `npm ci` was run in the worktree (node_modules was missing).
- No new dependency, no `any`, no pod-to-pod import, `application-edit.vm.ts`, `packages/contracts` and `apps/api` are unchanged.

## Human check pending (cannot be done without a browser)

With the dev stack (`npm run dev`, `LLM_PROVIDER=ollama` or `mock`), on `/applications/new` paste one fixture from `apps/api/src/offers/__fixtures__`, analyse, edit one filled field, then paste a different fixture and analyse again. The untouched «IA» fields and chips must show the second offer's values (or be empty), the edited field and any hand-typed tag must stay, and the badges must match what the second analysis filled.

## Known Stubs

None.

## Threat Flags

None. T-261101-gpz-01 and -02 are mitigated by the tests described above (unmarked values never written; in-flight edit honoured).

## Self-Check: PASSED

- Commits `b317f11`, `4f0f808`, `9e32c9f` exist on the branch.
- The modified files listed in the frontmatter exist.
