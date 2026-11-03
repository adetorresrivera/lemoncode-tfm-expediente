---
phase: quick-261101-gfe
plan: 01
subsystem: api
tags: [llm, prompt, extraction, pitfall-7]
requires: []
provides:
  - extraction system prompt with the two Pitfall 7 rules (D-25 «prompt»)
key-files:
  modified:
    - docs/AI-EXTRACTION.md
    - apps/api/src/offers/extract.service.ts
    - .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md
decisions:
  - "D-25 applied: company rule after title rule; label rule inside the tags sub-list; LLM_MODEL stays gemma4:e2b"
status: complete
commits: 3
plan_head_before: 4e9f36f3cce0062be9285dae74ee8bba7a5b93d7
plan_head_after: 70c3886
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
completed: 2026-11-01
---

# Quick 261101-gfe: D-25 prompt change (Pitfall 7 rules) Summary

Two approved rule lines added to the literal extraction prompt (docs block and `EXTRACTION_SYSTEM_PROMPT` together), new fingerprint recorded, and gemma4:e2b measured again with the new prompt.

## New fingerprint

`8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a` (previous `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`).

## Commits

- `63be8d8` feat(quick-261101-gfe): add Pitfall 7 rules to extraction prompt (D-25) (docs/AI-EXTRACTION.md and extract.service.ts, 2 insertions each)
- `bc3ff9a` docs(261101-gfe): record new approved prompt fingerprint under D-25 decision
- `70c3886` docs(261101-gfe): record try-extract rerun with the D-25 prompt
- The SUMMARY commit follows as the final commit.

## Rerun outcome

Labels fixed on all three fixtures (no label equals a group name, company filled on all three); no 504 or 502 (10 to 21 s per call, machine with about 7.9 GB available); a few tags still missing or mis-grouped and `location` on english-nice-to-have still scored wrong. Timeout concern stays open for a loaded machine. Details are in 03-09-SUMMARY.md under «Model rerun with the D-25 prompt». No further prompt or model change was made.

## Verification

- RED confirmed: the verbatim-prompt route test failed after the docs edit alone, passed after the constant matched (41 tests in the two targeted files).
- Fingerprint gate prints the new hash. `npm run typecheck` and `npm run test` pass (web 55, api 211, 385 in the third workspace).
- `.env.example`, `compose.yml` and `03-09-PLAN.md` unchanged against the base commit.
- `npm ci` was run in the worktree because `node_modules` was missing (lockfile install, no dependency added).

## Deviations from Plan

None. Plan executed as written. The tracer gate (tests re-run end-to-end) passed before expansion.

## Known Stubs

None.

## Self-Check: PASSED

Commits 63be8d8, bc3ff9a and 70c3886 exist on the worktree branch; the three modified files contain the expected content.
