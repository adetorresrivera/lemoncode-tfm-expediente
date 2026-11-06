---
phase: "6"
slug: "pulido-de-demo"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-06"
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 (contracts node; api node with real Mongo `tfm_test` + Silo `tfm-assets-test`, `fileParallelism: false`; web jsdom + Testing Library) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` (`setupFiles: ./src/test/setup.ts`), contracts defaults |
| **Quick run command** | `npm run test -w @tfm/api -- src/scripts` · `npm run test -w @tfm/web -- src/<path>` |
| **Full suite command** | `npm run typecheck && npm run test && npm run lint` |
| **Estimated runtime** | ~20 seconds warm (baseline: contracts 57, api 407, web 615 tests) |

---

## Sampling Rate

- **After every task commit:** Run the touched workspace's targeted command
- **After every plan wave:** Run `npm run typecheck && npm run test && npm run lint`
- **Before `/gsd-verify-work`:** Full suite + `npm run build` + `bash scripts/compose-smoke.sh --down` + `bash scripts/compose-smoke.sh --cold` must be green
- **Max feedback latency:** 30 seconds (targeted), compose smoke excluded

---

## Per-Task Verification Map

Filled by the planner/executor per PLAN.md. Requirement → test map from RESEARCH:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DEMO-01 | `buildSeedPlan` shape (12 apps, all statuses, 3 with rounds, dates in window, no mock-draft collisions) | unit | `npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts` | ❌ W0 | ⬜ pending |
| DEMO-01 | Two runs leave 12 seed apps / 3 docs, histories coherent, `--reset` wipes all, `seed` not exposed | integration | `npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts` | ❌ W0 | ⬜ pending |
| DEMO-01 / DEMO-05 | Seed + mock extraction work in the image after cold start | compose smoke | `bash scripts/compose-smoke.sh --cold` | ❌ W0 | ⬜ pending |
| DEMO-02 | README covers run/seed/`--reset`/mock/`LLM_MODEL`/fixtures, no phase notes | grep | `grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md` | n/a | ⬜ pending |
| DEMO-03 | 360 px risk-point guards on screens S1-S11 (D-12) plus shell class backstops | component | `npm run test -w @tfm/web -- src/test/responsive.test.tsx src/layouts src/common` | ❌ W0 (`src/test/responsive.test.tsx`, plan 06-11) | ⬜ pending |
| DEMO-03 / DEMO-04 | Loading, error and empty states of list, detail, form and documents (D-11) | component | `npm run test -w @tfm/web -- src/test/view-states.test.tsx` | ❌ W0 (`src/test/view-states.test.tsx`, plan 06-11) | ⬜ pending |
| DEMO-04 | axe (non-contrast) on list, detail, form, documents, dialog, Sheet, error screens | component | `npm run test -w @tfm/web -- src/test src/core/router` | ❌ W0 | ⬜ pending |
| DEMO-04 | AA contrast of token pairs, light and dark | unit | `npm run test -w @tfm/web -- src/common/lib/contrast.test.ts` | ❌ W0 | ⬜ pending |
| DEMO-06 | Mapper gaps closed, DOMAIN rules traced, 05 WR-01 stable | unit/component | `npm run test -w @tfm/web -- src/pods` · `npm run test -w @tfm/api -- src/applications src/documents` | partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/scripts/seed/seed.plan.test.ts`, `seed.run.test.ts` — DEMO-01 (D-10)
- [ ] `apps/web/src/test/axe.ts` + axe tests; `axe-core` devDependency — DEMO-04 (D-13)
- [ ] `apps/web/src/common/lib/contrast.ts` + `contrast.test.ts` — DEMO-04
- [ ] Mapper unit tests (web pods + api mappers) — DEMO-06 (D-23)
- [ ] `--cold` mode in `scripts/compose-smoke.sh` — DEMO-01/05 (D-15)
- [ ] `apps/web/src/test/view-states.test.tsx` and `apps/web/src/test/responsive.test.tsx` — DEMO-03/04 (D-11, D-12)

---

## DOMAIN rule coverage (D-23)

Each rule of `docs/DOMAIN.md` «Reglas de negocio» traced to the test that proves it. Every test below passed in plan 06-15 (`npm run test -w @tfm/api -- src/applications src/documents` and `npm run test -w @tfm/web -- src/pods/application-edit src/pods/application-detail`). Titles marked «(rule N)» were added or already carried the rule in plan 06-15 or earlier.

| Rule | Clause | Test file | Test title | Command |
|------|--------|-----------|------------|---------|
| 1 | Any status moves to any other, each move adds one history entry | `apps/api/src/applications/applications.status.test.ts` | allows a move between any two of the seven statuses and records each in the history (rule 1) | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 1 | A move appends `{ status, at }` and sets `updatedAt` to that instant | `apps/api/src/applications/applications.status.test.ts` | answers 200 with the new status, one new history entry and updatedAt equal to its instant | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 1 | Unchanged status adds no history entry | `apps/api/src/applications/applications.status.test.ts` | is idempotent for the current status: 200, same document, no history entry, updatedAt kept | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 1 | Concurrent moves to the same status add one entry only | `apps/api/src/applications/applications.status.test.ts` | writes exactly one extra history entry for three concurrent moves to enviada | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | First `enviada` sets `appliedAt` to the history instant | `apps/api/src/applications/applications.status.test.ts` | sets appliedAt to the instant of the history entry on the move to enviada | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | Other statuses leave `appliedAt` empty | `apps/api/src/applications/applications.status.test.ts` | does not fill appliedAt on a move to any other status | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | Only the first `enviada` counts | `apps/api/src/applications/applications.status.test.ts` | keeps the first appliedAt through guardada -> enviada -> guardada -> enviada | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | A value the user set is never overwritten | `apps/api/src/applications/applications.status.test.ts` | never overwrites an appliedAt the user set | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 3 | A round while `enviada` moves to `en_entrevistas` with a history entry | `apps/api/src/applications/applications.interviews.test.ts` | creates round 1, moves an enviada application to en_entrevistas and sets updatedAt | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 3 | From any other status the status and history stay | `apps/api/src/applications/applications.interviews.test.ts` | rule 3 only fires from enviada > keeps status and history when the status is %s | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 3 | A second round while `en_entrevistas` adds no history entry | `apps/api/src/applications/applications.interviews.test.ts` | adds no history entry for a second round while en_entrevistas and numbers it 2 | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 4 | A linked document cannot be deleted (409 `DOCUMENT_IN_USE`, Spanish message) | `apps/api/src/documents/documents.test.ts` | answers 409 DOCUMENT_IN_USE and keeps everything when %s links it | `npm run test -w @tfm/api -- src/documents/documents.test.ts` |
| 4 | Deletable again once the link is cleared | `apps/api/src/applications/applications.documents.test.ts` | makes a linked document undeletable until the link is cleared (rule 4) | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Wrong-type link on create is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | rejects a cover letter as CV and a CV as cover letter, writing nothing | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Wrong-type link on edit is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | rejects a wrong-type link with 400 and leaves every stored field unchanged | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Non-existent link on create is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | reports a malformed and an unknown id together as nonexistent | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Non-existent link on edit is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | rejects a link to a document that does not exist with the error in the field and keeps the stored fields (rule 4) | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 5 | Deleting an application asks for confirmation | `apps/web/src/pods/application-detail/application-detail.test.tsx` | delete dialog > opens with the title, the description with title and company, and focus on «Conservar candidatura» | `npm run test -w @tfm/web -- src/pods/application-detail/application-detail.test.tsx` |
| 5 | Its documents stay in the library, unlinked and deletable | `apps/api/src/applications/applications.documents.test.ts` | keeps the documents of a deleted application, now deletable (rule 5) | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 5 | The documents collection is untouched by the delete | `apps/api/src/applications/applications.delete.test.ts` | leaves the documents collection untouched | `npm run test -w @tfm/api -- src/applications/applications.delete.test.ts` |
| 6 | The draft fills only empty fields and keeps what the user typed | `apps/web/src/pods/application-edit/application-edit.merge.test.ts` | mergeExtractionIntoForm: the six-field rule > keeps the values the user typed | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts` |
| 6 | Tags merge without duplicates | `apps/web/src/pods/application-edit/application-edit.merge.test.ts` | mergeExtractionIntoForm: tags > adds the proposed tags after the existing ones, in model order, without duplicates | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts` |
| 6 | Nothing is persisted until the user saves | `apps/web/src/pods/application-edit/application-edit.ai.test.tsx` | saves the merged values only when the user presses «Guardar candidatura» | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.ai.test.tsx` |
| 7 | `updatedAt` changes on a status change | `apps/api/src/applications/applications.status.test.ts` | answers 200 with the new status, one new history entry and updatedAt equal to its instant | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 7 | `updatedAt` changes when a round is added | `apps/api/src/applications/applications.interviews.test.ts` | creates round 1, moves an enviada application to en_entrevistas and sets updatedAt | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 7 | `updatedAt` changes when a round is edited | `apps/api/src/applications/applications.interviews.test.ts` | replaces the fields of one round, keeps its id and the other rounds, and sets updatedAt | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 7 | `updatedAt` changes when a round is deleted | `apps/api/src/applications/applications.interviews.test.ts` | pulls one round, keeps the other numbers, answers 200 with the application and the next round is 4 | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 7 | `updatedAt` changes when the fields are edited | `apps/api/src/applications/applications.update.test.ts` | updates the editable fields, normalizes tags and keeps status, history, interviews, createdAt and ownerId | `npm run test -w @tfm/api -- src/applications/applications.update.test.ts` |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No horizontal scroll at 360/768/1280, both themes | DEMO-03 | No browser in the devcontainer; jsdom has no layout | Walk screens S1-S11 at each viewport, record in UAT; every reported overflow is fixed with a guard in 06-17 Task 3 |
| Full keyboard walkthrough, visible focus, reduced motion | DEMO-04 | Real focus rendering needs a browser | Tab through the demo flow, record in UAT |
| Demo flow under 2 minutes with Ollama and with mock | DEMO-05 | Timed human run | Run the flow twice with a timer, record times in UAT |
| README screenshot | DEMO-02 | Needs a browser capture | Capture seeded list, light theme, store as `docs/img/application-list.png` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
