---
phase: 06-pulido-de-demo
plan: 15
subsystem: testing
tags: [vitest, nyquist, validation, domain-rules, compose-smoke]

requires:
  - phase: 02-candidaturas
    provides: applications API and web pods whose tests back the APP-01..APP-14 rows
  - phase: 05-documentos-en-s3
    provides: documents API, upload and list pods and the compose smoke script
provides:
  - DOMAIN rule coverage table (rules 1-7 to named passing tests) in 06-VALIDATION.md
  - 02-VALIDATION.md and 05-VALIDATION.md closed as validated with audits
  - three gap tests (rule 1 matrix, rule 4 nonexistent link on PUT, offerText no-echo)
affects: [06-17, verify-work, validate-phase]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 89498cfead3520c276c6b48c897c4f44a8da4bbe
plan_head_after: 1261a3844df2cae86d2584b39f1d39dff09436bd

tech-stack:
  added: []
  patterns:
    - "Validation rows turn green only after the named command ran in the same plan"

key-files:
  created: []
  modified:
    - .planning/phases/06-pulido-de-demo/06-VALIDATION.md
    - .planning/phases/02-candidaturas/02-VALIDATION.md
    - .planning/phases/05-documentos-en-s3/05-VALIDATION.md
    - apps/api/src/applications/applications.status.test.ts
    - apps/api/src/applications/applications.documents.test.ts
    - apps/api/src/applications/applications.update.test.ts

key-decisions:
  - "Rule 6 and rule 5 clauses already had named tests; only rule 1 (any-to-any matrix) and rule 4 (PUT with a nonexistent link) needed new ones"
  - "Rows 05-10-T1 and 05-11-T1 both point at the existing h-11 file-button class test; the T2 full-gate tasks of those plans carry no separate row"

patterns-established:
  - "Gap tests follow the owning file's style and end with (rule N) when they trace a DOMAIN rule"

requirements-completed: [DEMO-06]

coverage:
  - id: D1
    description: "Each of the 7 DOMAIN rules maps to a named passing test in the DOMAIN rule coverage (D-23) table"
    requirement: DEMO-06
    verification:
      - kind: unit
        ref: "npm run test -w @tfm/api -- src/applications src/documents"
        status: pass
      - kind: unit
        ref: "npm run test -w @tfm/web -- src/pods/application-edit src/pods/application-detail"
        status: pass
    human_judgment: false
  - id: D2
    description: "02-VALIDATION.md closed as validated: APP-01..APP-14 and security rows mapped to tests that ran green"
    requirement: DEMO-06
    verification:
      - kind: unit
        ref: "npm run test -w @tfm/contracts; npm run test -w @tfm/api -- src/applications src/tags; npm run test -w @tfm/web -- src/pods/application-list src/pods/application-detail src/pods/application-edit src/core/router"
        status: pass
    human_judgment: false
  - id: D3
    description: "05-VALIDATION.md closed as validated, compose smoke row included"
    requirement: DEMO-06
    verification:
      - kind: integration
        ref: "bash scripts/compose-smoke.sh --down (ended with SMOKE OK)"
        status: pass
      - kind: unit
        ref: "npm run typecheck && npm run test && npm run lint && npm run build"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-11-06
status: complete
---

# Phase 6 Plan 15: Rule coverage and closed Nyquist validations Summary

**The seven DOMAIN rules are traced to named tests in one table, and the Phase 2 and Phase 5 validation contracts are closed as `validated` with evidence from commands run in this plan, including a green `compose-smoke.sh --down`.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-11-06T20:45:00Z
- **Completed:** 2026-11-06T21:25:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- «DOMAIN rule coverage (D-23)» table in `06-VALIDATION.md`: 29 clause rows for rules 1-7, every cell filled.
- `02-VALIDATION.md`: concrete test files and commands for APP-01..APP-14, a security-items table, Wave 0 and sign-off ticked, `status: validated`, audit with Escalated 0.
- `05-VALIDATION.md`: 18 task rows plus 05-10-T1 and 05-11-T1 all green, Wave 0 ticked, `status: validated`, audit with Escalated 0.
- `03-VALIDATION.md` confirmed `status: validated`, `nyquist_compliant: true`; not changed.

## DOMAIN rule coverage (D-23)

| Rule | Clause | Test file | Test title |
|------|--------|-----------|------------|
| 1 | Any status to any other, one history entry each | `applications.status.test.ts` | allows a move between any two of the seven statuses and records each in the history (rule 1) |
| 1 | No entry for an unchanged status | `applications.status.test.ts` | is idempotent for the current status: 200, same document, no history entry, updatedAt kept |
| 2 | First `enviada` sets `appliedAt`, kept after that, user value prevails | `applications.status.test.ts` | sets appliedAt to the instant of the history entry on the move to enviada; keeps the first appliedAt through guardada -> enviada -> guardada -> enviada; never overwrites an appliedAt the user set |
| 3 | A round while `enviada` moves to `en_entrevistas` with a history entry; other statuses stay | `applications.interviews.test.ts` | creates round 1, moves an enviada application to en_entrevistas and sets updatedAt; rule 3 only fires from enviada |
| 4 | Linked document is undeletable (409 `DOCUMENT_IN_USE`) | `documents.test.ts`, `applications.documents.test.ts` | answers 409 DOCUMENT_IN_USE and keeps everything when %s links it; makes a linked document undeletable until the link is cleared (rule 4) |
| 4 | Wrong-type and nonexistent links rejected with the field error (create and edit) | `applications.documents.test.ts` | rejects a cover letter as CV and a CV as cover letter, writing nothing; rejects a wrong-type link with 400 and leaves every stored field unchanged; reports a malformed and an unknown id together as nonexistent; rejects a link to a document that does not exist with the error in the field and keeps the stored fields (rule 4) |
| 5 | Confirmation before delete; documents stay, unlinked | `application-detail.test.tsx`, `applications.documents.test.ts`, `applications.delete.test.ts` | delete dialog > opens with the title…; keeps the documents of a deleted application, now deletable (rule 5); leaves the documents collection untouched |
| 6 | Draft fills only empty fields, tags merge without duplicates, nothing persists until save | `application-edit.merge.test.ts`, `application-edit.ai.test.tsx` | keeps the values the user typed; adds the proposed tags after the existing ones, in model order, without duplicates; saves the merged values only when the user presses «Guardar candidatura» |
| 7 | `updatedAt` changes on status, round add/edit/delete and field edit | `applications.status.test.ts`, `applications.interviews.test.ts`, `applications.update.test.ts` | answers 200 with the new status…; creates round 1…; replaces the fields of one round…; pulls one round…; updates the editable fields… |

The full 29-row table with commands is in `06-VALIDATION.md`.

## Validation files: gaps found / resolved / escalated

| File | Gaps found | Resolved | Escalated |
|------|-----------|----------|-----------|
| `02-VALIDATION.md` | 1 | 1 | 0 |
| `05-VALIDATION.md` | 0 | 0 | 0 |
| `03-VALIDATION.md` | verified, no change | | |

## Gap tests added

- `apps/api/src/applications/applications.status.test.ts`: allows a move between any two of the seven statuses and records each in the history (rule 1)
- `apps/api/src/applications/applications.documents.test.ts`: rejects a link to a document that does not exist with the error in the field and keeps the stored fields (rule 4)
- `apps/api/src/applications/applications.update.test.ts`: never echoes the offerText in a validation error, on PUT or on POST (security row of 02)

## Compose smoke

`bash scripts/compose-smoke.sh --down` ran in Task 3 of this plan and ended with `SMOKE OK` (exit 0); it backs row 05-09-T1. `03-VALIDATION.md` was left untouched (`git diff --quiet` exits 0).

## Task Commits

1. **Task 1: DOMAIN rules to named tests** - `5dbc38a` (test)
2. **Task 2: Phase 2 validation closed** - `cd1d926` (test)
3. **Task 3: Phase 5 validation closed** - `1261a38` (docs)

## Files Created/Modified
- `.planning/phases/06-pulido-de-demo/06-VALIDATION.md` - DOMAIN rule coverage table
- `.planning/phases/02-candidaturas/02-VALIDATION.md` - validated, concrete commands, security table, audit
- `.planning/phases/05-documentos-en-s3/05-VALIDATION.md` - validated, rows green, 05-10/05-11 rows, audit
- `apps/api/src/applications/applications.status.test.ts`, `applications.documents.test.ts`, `applications.update.test.ts` - three gap tests

## Decisions Made
- Only clauses without a test got a new one; existing titles were mapped as they are.
- Rows 05-10-T1 and 05-11-T1 share the file-button class test; the human checks of their T2 tasks live in `05-UAT.md`, not in the validation map.

## Deviations from Plan

None - plan executed exactly as written. The rule 6 file `application-edit.merge.test.ts` needed no new test, so it is unchanged.

## Issues Encountered
- The first draft of the rule 1 test built dates with a day counter that passed 31 and produced an invalid clock; switched to minute offsets before the first commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phases 2, 3 and 5 carry a validated Nyquist contract; the DOMAIN rule table is ready for `/gsd-validate-phase 06`.
- No new dependencies were added.

## Self-Check: PASSED

- Commits `5dbc38a`, `cd1d926`, `1261a38` are ancestors of HEAD.
- Acceptance criteria: DOMAIN section present with rows 1-7; `02-VALIDATION.md` validated, 0 `❌ W0`, Escalated 0; `05-VALIDATION.md` validated, 1 `⬜` (legend), Escalated 0; 03 unchanged.
- `npm run typecheck`, `npm run test` (contracts 59, api 467, web 882), `npm run lint`, `npm run build` and `compose-smoke.sh --down` all exit 0.

---
*Phase: 06-pulido-de-demo*
*Completed: 2026-11-06*
