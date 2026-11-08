---
phase: 06-pulido-de-demo
plan: 14
subsystem: testing
tags: [vitest, mappers, api, whitelist, seed]

requires:
  - phase: 01-fundaciones
    provides: contracts package and the API mappers under test
provides:
  - direct unit tests for the five web pod mappers
  - whitelist tests for the API application and document mappers (seed mark and stray fields proved absent)
  - interview subdocuments mapped field by field in the application API mapper
affects: [06-01 seed (storage-only seed mark), future mapper changes]

actuals:
  tokens: 13000
  tasks: 2
  commits: 3
plan_head_before: b5291beef861f609f52c6a08598f0d3b9d0ea042
plan_head_after: bf1e97246aaaae2a7723ae6e8d1681b5991ddb83

tech-stack:
  added: []
  patterns:
    - "Mapper tests are pure Vitest files co-located with the mapper; dates built from local wall-clock values so they do not depend on the machine zone"
    - "API whitelist tests cast a doc with extra stored fields through unknown and compare the output keys with the contract schema keys"

key-files:
  created:
    - apps/web/src/pods/application-list/application-list.mapper.test.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.test.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.test.ts
    - apps/web/src/pods/document-list/document-list.mapper.test.ts
    - apps/web/src/pods/document-upload/document-upload.mapper.test.ts
    - apps/api/src/applications/applications.mapper.test.ts
    - apps/api/src/documents/documents.mapper.test.ts
  modified:
    - apps/api/src/applications/applications.mapper.ts

key-decisions:
  - "Interviews are whitelisted field by field in mapApplicationDocToApi (they were passed through as stored)"
  - "s3Key is part of the documentSchema contract, so the document mappers expose it and the test asserts the output keys equal the contract keys instead of asserting s3Key absent"

patterns-established:
  - "Whitelist proof: output keys must equal the contract schema keys, so adding a stored field never leaks and adding a contract field forces a mapper change"

requirements-completed: [DEMO-06]

coverage:
  - id: D1
    description: "Every web pod mapper has a co-located mapper.test.ts calling each exported function and constant"
    requirement: DEMO-06
    verification:
      - kind: unit
        ref: "npm run test -w @tfm/web -- src/pods (five *.mapper.test.ts files)"
        status: pass
      - kind: other
        ref: "mapper gate from the plan <interfaces>, run with GNU grep: prints 0 (baseline 43)"
        status: pass
    human_judgment: false
  - id: D2
    description: "API mappers map _id to a string id, dates to ISO UTC, keep nulls, and drop stored fields outside the whitelist including seed"
    requirement: DEMO-06
    verification:
      - kind: unit
        ref: "apps/api/src/applications/applications.mapper.test.ts and apps/api/src/documents/documents.mapper.test.ts"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-11-06
status: complete
---

# Phase 06 Plan 14: Mapper tests Summary

**Direct Vitest coverage for all five web pod mappers and both API mappers, proving the API never leaks `_id`, the storage-only `seed` mark or any other stored field, and closing a real leak: interview subdocuments were passed through unfiltered.**

## Performance

- **Duration:** 14 min
- **Tasks:** 2 of 2
- **Files:** 7 test files created, 1 mapper modified

## Accomplishments

- Five `*.mapper.test.ts` files, one per web pod (list, detail, edit, document list, document upload). Each calls every exported function and constant of its mapper; `mergeExtractionIntoForm` stays covered by the existing `application-edit.merge.test.ts`.
- Mapper gate from the plan: 43 before, 0 after (5 mapper test files, baseline 0).
- `applications.mapper.test.ts` and `documents.mapper.test.ts`: string 24-hex `id`, no `_id`, ISO 8601 UTC dates (`createdAt`, `updatedAt`, `appliedAt`, history `at`), nulls preserved, a doc written without `appliedAt` reads as null, tags drop their stored `key`, extra stored fields (`seed: true`, `_internal`) absent, output keys equal the contract keys and the output passes `applicationSchema`, `documentSchema` and `documentListItemSchema`.
- Expected values were taken from the mapper source, the contracts and the UI copy, not pasted from a run.

## Task Commits

1. Task 1: web pod mapper tests: `a8f1725`
2. Task 2 (fix found by the new test): `bd4dd25`
3. Task 2: API mapper whitelist tests: `bf1e972`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Interview subdocuments were not whitelisted in the application API mapper**
- **Found during:** Task 2
- **Issue:** `mapApplicationDocToApi` returned `interviews: doc.interviews` as stored, so any extra field on a stored round (a seed mark, an internal) would reach the API. This contradicts the mapper's own comment («a stored field never reaches the API unless it is named here») and threat T-06-21.
- **Fix:** map each round field by field (`id`, `round`, `type`, `scheduledAt`, `mode`, `notes`, `outcome`). The new test «drops stored fields outside the whitelist inside an interview» failed first, then passed.
- **Files modified:** `apps/api/src/applications/applications.mapper.ts`
- **Commit:** `bd4dd25`

**2. [Plan wording] `s3Key` is exposed by design**
- The task text says «`s3Key` not exposed if the contract does not include it». The contract `documentSchema` does include `s3Key`, so both document mappers expose it today. No behavior change; the test asserts the output keys equal the contract keys.

**Total deviations:** 1 auto-fixed (Rule 2), 1 plan wording note. **Impact:** one small additive hardening, no contract change, all existing tests still pass.

## Verification

- `npm run typecheck && npm run test && npm run lint` exit 0 (contracts 57 tests, api 424, web 711).
- Environment note: in this agent shell `grep` is a wrapper around ugrep that exits 2 when one of two files is missing, which makes the plan's mapper gate print 29 even when every symbol is covered. The gate was run with `command grep` (GNU grep 3.8) and prints 0. Plain GNU grep (CI, devcontainer) behaves as the plan expects.
- Acceptance criteria: `ls apps/web/src/pods/*/*.mapper.test.ts | wc -l` = 5; both API test files exist and contain `seed`.

## Issues Encountered

None beyond the grep wrapper note above.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or trust boundary; T-06-21 mitigated by the whitelist tests plus the interview fix. No package installed (T-06-SC); `npm ci` only populated the worktree `node_modules` without changing `package.json` or the lockfile.

## Next Phase Readiness

Plan 06-01 adds the storage-only `seed: true` mark; the API mapper tests already assert it never leaves the mapper, so that plan can rely on them.

## Self-Check: PASSED

- Created files exist (7 test files, this SUMMARY).
- Commits `a8f1725`, `bd4dd25`, `bf1e972` are ancestors of HEAD.
