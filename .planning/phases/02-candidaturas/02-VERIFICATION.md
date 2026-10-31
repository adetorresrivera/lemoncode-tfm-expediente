---
phase: 02-candidaturas
verified: 2026-10-31T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - .planning/phases/02-candidaturas/02-01-PLAN.md
  - .planning/phases/02-candidaturas/02-01-SUMMARY.md
  - .planning/phases/02-candidaturas/02-02-PLAN.md
  - .planning/phases/02-candidaturas/02-02-SUMMARY.md
  - .planning/phases/02-candidaturas/02-03-PLAN.md
  - .planning/phases/02-candidaturas/02-03-SUMMARY.md
  - .planning/phases/02-candidaturas/02-04-PLAN.md
  - .planning/phases/02-candidaturas/02-04-SUMMARY.md
  - .planning/phases/02-candidaturas/02-05-PLAN.md
  - .planning/phases/02-candidaturas/02-05-SUMMARY.md
  - .planning/phases/02-candidaturas/02-06-PLAN.md
  - .planning/phases/02-candidaturas/02-06-SUMMARY.md
  - .planning/phases/02-candidaturas/02-07-PLAN.md
  - .planning/phases/02-candidaturas/02-07-SUMMARY.md
  - .planning/phases/02-candidaturas/02-08-PLAN.md
  - .planning/phases/02-candidaturas/02-08-SUMMARY.md
  - .planning/phases/02-candidaturas/02-09-PLAN.md
  - .planning/phases/02-candidaturas/02-09-SUMMARY.md
  - .planning/phases/02-candidaturas/02-10-PLAN.md
  - .planning/phases/02-candidaturas/02-10-SUMMARY.md
  - .planning/phases/02-candidaturas/02-11-PLAN.md
  - .planning/phases/02-candidaturas/02-11-SUMMARY.md
  - .planning/phases/02-candidaturas/02-12-PLAN.md
  - .planning/phases/02-candidaturas/02-12-SUMMARY.md
  - apps/api/src/applications/applications.query.ts
  - apps/api/src/applications/applications.repository.ts
  - apps/api/src/applications/applications.routes.ts
  - apps/api/src/applications/applications.service.ts
  - apps/web/src/core/router/application-search.ts
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-edit/application-edit.hooks.ts
  - apps/web/src/pods/application-edit/application-edit.mapper.ts
  - apps/web/src/pods/application-list/application-list.component.tsx
  - apps/web/src/pods/application-list/application-list.hooks.ts
  - packages/contracts/src/application.schema.ts
  - packages/contracts/src/tag.normalize.ts
  - scripts/compose-smoke.sh
covered_digest: "v4:sha256:9861e07f9912055f74ecae41a44c53920801cec50539ece71b6ef0f940557138"
behavior_unverified: 0
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Layout at 360 px and 1024 px in light and dark on the list, the detail and the form (30-char and 120-char titles, 20 tag chips, 15-entry history, long company names)"
    expected: "No horizontal scroll; titles wrap; full-width buttons below sm; timeline dots sit on the line; collapsible chevron rotates; header action wraps correctly"
    why_human: "jsdom cannot evaluate layout or theme rendering (02-05 D6, 02-08 D5, 02-10 D5, 02-11 D3, 02-12 D6)"
  - test: "Keyboard-only pass: create form (Enter in a tag input adds a tag and never submits, chip removal returns focus to a neighbour), status selector (arrow keys), delete dialog (initial focus on «Conservar candidatura», Tab/Enter/Esc, focus returns to «Eliminar»), landing on the list with focus on its h1"
    expected: "Every control reachable and operable by keyboard with a visible focus ring; announcements arrive through the polite status regions"
    why_human: "Focus ring visibility, tab order feel and screen-reader announcements are visual/auditory judgments (02-06 D5, 02-09 D7, 02-10 D5, 02-11 D3)"
  - test: "Real-browser round trip of filters: pick a status, a stack tag and «Fecha de envío», reload, press Back"
    expected: "Same URL, controls and results after reload; Back leaves the list instead of replaying filter clicks; «Limpiar filtros» returns to /applications"
    why_human: "Reload/Back in a real browser was not driven by hand (02-06 D6); the URL logic is covered by jsdom router tests only"
  - test: "Focus ring and DS look of Button, Toggle, ToggleGroup, filter panel and empty-by-filters card in light and dark"
    expected: "Solid 2 px ring in the ring colour, semibold labels, spacing and hierarchy per 02-UI-SPEC"
    why_human: "Visual conformance to the UI-SPEC cannot be asserted in jsdom (02-05 D6, 02-06 D5)"
---

# Phase 2: Candidaturas Verification Report

**Phase Goal:** As a job seeker, I want to create, find, review and move my applications through their states, so that I have one reliable record of every selection process.
**Verified:** 2026-10-31
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

The goal is achieved in the codebase. Every roadmap success criterion is backed by implemented, wired code that I read in the repository and by passing tests that exercise real MongoDB through the Hono app. The status is `human_needed` only because layout, focus-ring and keyboard-feel checks cannot run in jsdom; there are no failed truths and no gaps.

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Create with only title (2-120) and company (1-120) required, edit later with the same form, tags by group trimmed / space-collapsed / case-insensitively deduped (first spelling kept) / capped at 20; invalid input shows validation errors from the contracts schema | VERIFIED | `packages/contracts/src/application.schema.ts` (title `min(2).max(120)`, company `min(1).max(120)`, tags `.max(MAX_TAGS)`); `tag.normalize.ts` `normalizeTags` (NFC, trim, collapse `\s+`, `tagKey` lower-case dedupe across groups, first spelling wins, break at MAX_TAGS). `applications.service.ts` normalizes on create and update and stores `key`. The web form runs `applicationInputSchema.safeParse` in `validateApplicationForm` (`application-edit.mapper.ts`) with Spanish copy per issue, plus server 400 `fieldErrors` mapping. Create and edit share `useApplicationForm` / `ApplicationEditComponent` (`mode="create"|"edit"`). API test "answers 400 and stores nothing when more than 20 tags are sent" and "stores normalized tags with a key" pass. |
| 2 | List shows cards (title, company · location, status badge, up to 3 tags plus `+N`, salary, last-updated) and distinct loading, error-with-retry, empty and empty-by-filters states | VERIFIED | `application-card.tsx` renders all card elements; `application-list.mapper.ts` orders stack > nice_to_have > language, slices 3, `hiddenTagCount`. `application-list.component.tsx` branches `ListSkeleton` / `ListError` (with `onRetry`) / `EmptyFilteredState` (when `hasActiveFilters`) / `EmptyState`. About 60 list tests pass, including exactly 3 tags (no counter), 4 tags (+1), 5 tags (+2), retry refetching once. One transient defect noted as WR-04 below. |
| 3 | Filter by free text, status (multi), stack tags from `GET /api/tags` ordered by count, work mode, seniority; sort by update or applied date; filters and sort in the URL, survive reload, «Limpiar filtros» resets | VERIFIED (browser reload/Back is a human item) | Server: `applications.query.ts` builds the Mongo filter field by field (`$in` for status, `$all` of `$elemMatch` on `tags.key` for stack AND, escaped case-insensitive `$or` regex for q, workMode, seniority) and sort (`appliedAt` desc with `updatedAt`/`_id` tie-breakers). `GET /api/tags` aggregates by `(key, group)` and orders by count desc, label (es), group. Web: `core/router/search-params.ts` plain repeated keys; `application-search.ts` derives `listSearchSchema` from the contract with `.catch` leniency; the route uses `validateSearch` and `stripSearchParams({sort})`; `useApplicationList` keys on the query string and aborts stale requests; scene writes filters with `replace: true`. Router tests "issues the same query after a reload of the same URL", "«Limpiar filtros» returns to exactly /applications", hostile-param tests pass. |
| 4 | Detail shows offer data, tags grouped by type, status history, notes and collapsible original offer text; interview and documents sections not rendered; delete behind a confirmation dialog; documents not deleted | VERIFIED | `application-detail.component.tsx` renders `OfferDataSection`, `TagsSection` (groups from mapper), `NotesSection`, `OfferTextSection` (Collapsible, shown when `offerText` exists), `StatusHistory` (newest first). No interview or document markup exists in the pod (confirmed by reading the component and the mapper). `DeleteDialog` uses `AlertDialog` with initial focus on «Conservar candidatura». API: `repository.deleteById` touches only `applications`; test "leaves the documents collection untouched" passes; second DELETE and PATCH after delete give 404 and never recreate. |
| 5 | Change status to any of the 7 states; each change appends `{status, at}`; same status adds nothing; first move to `enviada` sets `appliedAt` when empty; `updatedAt` changes on every modification | VERIFIED | `repository.changeStatus` is one atomic pipeline `findOneAndUpdate` guarded by `status: { $ne }`: sets status, `$concatArrays` history entry, `appliedAt` only when `enviada` and null/missing, and `updatedAt`. The service returns `get(id)` when the guard misses (idempotent 200, no entry). `updateEditable` `$set`s `updatedAt: now`. Create also fills `appliedAt` for an initial `enviada`. Tests: "is idempotent for the current status", "writes exactly one extra history entry for three concurrent moves", "keeps the first appliedAt through guardada -> enviada -> guardada -> enviada", "never overwrites an appliedAt the user set", PUT "updatedAt advances". Web `StatusChange` offers all 7 enum values, `changeStatus` is optimistic, serialized by `busyRef`, rolls back on failure, and skips a no-op change. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/contracts/src/application.schema.ts`, `tag.normalize.ts` | Single source of truth for input, query, status-change schemas and tag normalization | VERIFIED | Imported by both API and web (`@tfm/contracts`); no web/API redefinition found. |
| `apps/api/src/applications/*` (routes, service, repository, query, mapper) | GET list/item, POST, PUT, PATCH status, DELETE + `GET /api/tags` | VERIFIED | Real Mongo calls, no stubs; `requireJson`, `parseObjectId`, `queryInput` guards in place. |
| `apps/web/src/pods/application-list` | Cards, filters, states, tag filter | VERIFIED | Full pod file set, `index.ts` exports the container only. |
| `apps/web/src/pods/application-detail` | Detail, status change, delete | VERIFIED | Wired through `ApplicationDetailScene`. |
| `apps/web/src/pods/application-edit` | Create/edit form | VERIFIED | Wired via `routes/applications/new.tsx` and `$applicationId/edit.tsx`. |
| `apps/web/src/routes/applications/*`, `scenes/*` | Route -> scene -> pod | VERIFIED | Scenes supply link render props and navigation; no pod imports another pod (grep clean). |
| `scripts/compose-smoke.sh` | CRUD round trip in the production image | VERIFIED (static) | POST/GET/PUT/PATCH/tags/DELETE/404 steps present. Orchestrator reports a clean `SMOKE OK`; I did not re-run Docker. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Route `/applications/` | `ApplicationListContainer` | `listSearchSchema` -> `pickListSearch` -> `buildApplicationsQuery` -> `getApplications` | WIRED | Query string is built from known keys only. |
| `useStackTags` | `GET /api/tags` | `getTags` -> `mapStackTagsFromApiToVm` (stack only) | WIRED | Order served by the API (count desc) is kept. |
| `StatusChange` | `PATCH /api/applications/:id/status` | `useApplicationDetail.changeStatus` -> `patchApplicationStatus` | WIRED | Response replaces the view. |
| `DeleteDialog` | `DELETE /api/applications/:id` | `remove` -> `deleteApplication` -> `onDeleted` -> scene navigates with notice | WIRED | |
| Form submit | POST / PUT | `useApplicationForm` -> `createApplication` / `updateApplication` (with `keepStoredAppliedAt`) | WIRED | |
| `createApp` | repository | `AppDeps.db` -> `createApplicationsRepository` -> service -> routes | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Real data | Status |
|----------|---------------|--------|-----------|--------|
| List cards | `applications` | `GET /api/applications` -> Mongo `find(filter).sort()` | Yes | FLOWING |
| Stack tag filter | `options` | `GET /api/tags` -> Mongo `aggregate` | Yes | FLOWING |
| Detail | `vm` | `GET /api/applications/:id` -> Mongo `findOne` | Yes | FLOWING |
| Edit form | `initialValues` | Same GET, mapped to form values | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck, all workspaces | `npm run typecheck` | exit 0 | PASS |
| Lint | `npm run lint` (`--max-warnings=0`) | exit 0 | PASS |
| Full test suite (once, `LLM_PROVIDER=mock`, real Mongo `tfm_test`) | `npm test` | contracts 55, api 134, web 282, all passing | PASS |
| Debt markers (TBD/FIXME/XXX/TODO/HACK) in `apps/`, `packages/`, `scripts/` | grep | none | PASS |
| `any` in source, hex colours, `bg-blue-*` | grep | none | PASS |
| VMs not derived from API models | grep `extends`/`Omit`/`Pick` in `*.vm.ts` | none | PASS |

### Probe Execution

Step 7c: SKIPPED. Phase 2 plans declare no `probe-*.sh`, and no `scripts/*/tests/probe-*.sh` exists. The compose smoke script is the phase gate; the orchestrator ran it and reported `SMOKE OK`.

### Requirements Coverage

All 14 IDs appear in at least one PLAN `requirements` field, and `REQUIREMENTS.md` maps exactly APP-01..APP-14 to Phase 2. No orphaned requirements.

| Requirement | Source plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| APP-01 create (title/company required) | 02-01, 02-10, 02-11 | SATISFIED | Contract schema, `POST`, create form with schema validation |
| APP-02 edit with the same form | 02-12 | SATISFIED | `ApplicationEditForm`, `PUT` whitelist (`toEditableFields`), edit route |
| APP-03 delete with confirmation, documents untouched | 02-09 | SATISFIED | `DeleteDialog`, `deleteById`, documents-untouched test |
| APP-04 card contents | 02-03 | SATISFIED | `application-card.tsx`, mapper |
| APP-05 loading / error / empty / empty-by-filters | 02-01, 02-02, 02-05 | SATISFIED | Component branches and tests |
| APP-06 filters (text, status, stack, work mode, seniority) | 02-04, 02-05, 02-06 | SATISFIED | `applications.query.ts`, filter panel |
| APP-07 URL state, reload, «Limpiar filtros» | 02-05 | SATISFIED (reload/Back real-browser pass is a human item) | search-params, route, router tests |
| APP-08 sort by update or applied date | 02-04, 02-06 | SATISFIED | `buildApplicationsSort`, sort select |
| APP-09 detail: offer data, grouped tags, history, notes, collapsible offer text; linked documents | 02-07, 02-08 | SATISFIED for Phase 2 scope | Linked documents are Phase 5 (DOC-04) and the ROADMAP criterion 4 states the section is not rendered until then. Offer text renders only when `offerText` is set; Phase 2 has no input for it (Phase 3, AI-09), so the collapsible is covered by component tests with seeded data. |
| APP-10 status change, history entry, no-op adds nothing | 02-09 | SATISFIED | Atomic pipeline + idempotent guard + tests |
| APP-11 first `enviada` sets `appliedAt` | 02-01, 02-09 | SATISFIED | Pipeline `$cond`, create path, tests |
| APP-12 tag groups + normalization | 02-03, 02-11 | SATISFIED | `normalizeTags`, `TagGroupInput` (three groups, feedback "Ya está en la lista" / "Máximo 20 etiquetas") |
| APP-13 `updatedAt` on any modification incl. status and interview changes | 02-01, 02-09, 02-12 | SATISFIED for Phase 2 scope | create/PUT/PATCH all set `updatedAt`. Interview changes do not exist until Phase 4 (INT-04, ROADMAP Phase 4 criterion 4 owns this). |
| APP-14 stack filters from `GET /api/tags` by count | 02-03, 02-06 | SATISFIED | `listTags` sort, `useStackTags`, `TagFilter` |

Note: `REQUIREMENTS.md` still shows APP-01..APP-14 as `[ ]` / `Pending`. That is bookkeeping for the orchestrator to update once this verification is accepted; it is not a code gap.

### Anti-Patterns Found

None blocking. No debt markers, no placeholder UI, no stub handlers, no `any`, no hex colours, one new dependency (`@tanstack/react-form`, in the mandated stack and gated by plan 02-10's legitimacy checkpoint).

### Code review (02-REVIEW.md, advisory)

0 critical, 4 warnings, 9 info; all dispositions are `open`. None breaks a must-have; I confirmed WR-04 and WR-03 in the code.

| ID | Finding | Impact on phase goal |
|----|---------|----------------------|
| WR-01 | No body-size limit; `sourceUrl`, document ids and salaries unbounded | Robustness / DoS hygiene; no must-have broken. Recommend fixing before the demo is exposed anywhere. |
| WR-02 | `compose-smoke.sh` leaves the smoke record if a later step fails (no `trap`) | Only on failure paths; can pollute the demo list. |
| WR-03 | Delete dialog shows a stale error after cancel and reopen | Minor UX defect. |
| WR-04 | List flashes the empty-by-filters message while a refetch is in flight when the previous result was empty (`application-list.component.tsx`: `firstLoad` is false during refresh, so `applications.length === 0` wins) | Transient false state; the final state is correct. Does not break criterion 2 (distinct states exist) but is worth a one-line fix. |
| IN-09 | Saving a stale edit form can erase an automatic `appliedAt` (two-tab scenario) | Single-user, low risk. |
| IN-01..08 | Search field not following external URL change, PUT validating ignored fields, unused indexes, error-handler edge cases, 36 px toggles and no disabled styling, silent salary drop, detail `document.title` not reset, legacy documents breaking the list | Hygiene / polish. |

### Human Verification Required

Listed in the frontmatter (4 items): layout at 360/1024 px in both themes; keyboard-only operation of form, status selector and delete dialog; filters surviving reload/Back in a real browser; focus-ring and DS look. These are the `human_judgment: true` items the SUMMARYs themselves flag (02-05 D6, 02-06 D5/D6, 02-08 D5, 02-09 D7, 02-10 D5, 02-11 D3, 02-12 D6). They overlap with Phase 6 (DEMO-03, DEMO-04) acceptance and are not gaps.

### Gaps Summary

No gaps. All five roadmap success criteria are implemented, wired to real data and covered by passing tests (471 tests, typecheck and lint clean). Items deferred by design (linked documents to Phase 5, interview-driven `updatedAt`/rounds to Phase 4, offer-text input to Phase 3) match the ROADMAP scope for Phase 2 and are not counted against it.

---

_Verified: 2026-10-31_
_Verifier: Claude (gsd-verifier)_
