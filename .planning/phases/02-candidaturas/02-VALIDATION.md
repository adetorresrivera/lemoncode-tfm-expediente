---
phase: "02"
slug: "candidaturas"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-29"
validated: "2026-11-06"
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 (+ Testing Library 16.3.3 / user-event 14.6.8 / jest-dom 7.0.1 / jsdom 30.1.2 for web) |
| **Config file** | `packages/contracts` (defaults), `apps/api/vitest.config.ts` (node, `@tfm/source` conditions), `apps/web/vitest.config.ts` (jsdom, `src/test/setup.ts`) |
| **Quick run command** | contracts: `npm run test -w @tfm/contracts -- src/<file>`; API: `npm run test -w @tfm/api -- src/applications`; web: `npm run test -w @tfm/web -- src/pods/<pod>` |
| **Full suite command** | `npm run typecheck && npm run lint && npm run test && npm run build` |
| **Estimated runtime** | contracts ~24 s, API ~10 s, web ~55 s, typecheck ~113 s (9p mount; no `node_modules` volume for now, user decision 2026-10-30) |

---

## Sampling Rate

- **After every task commit:** Run the touched workspace's targeted tests (contracts/API first; web per pod)
- **After every plan wave:** Run `npm run typecheck && npm run test` and `npm run lint`
- **Before `/gsd-verify-work`:** Full suite + build must be green, plus the manual rows below
- **Max feedback latency:** ~60 s for targeted tests; ~120 s for typecheck

---

## Per-Task Verification Map

Requirement-level map. Every command was run green in plan 06-15 on 2026-11-06 (contracts 59, API `src/applications src/tags` 165, web `src/pods/application-list src/pods/application-detail src/pods/application-edit src/core/router src/common/lib/format.test.ts` 558 tests passing).

| Requirement | Test Type | Automated Command | File Exists | Status |
|-------------|-----------|-------------------|-------------|--------|
| APP-01 | contracts unit + API POST 201/400 + form component | `npm run test -w @tfm/contracts -- src/application.schema.test.ts`; `npm run test -w @tfm/api -- src/applications/applications.create-list.test.ts`; `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.test.tsx` | ✅ | ✅ green |
| APP-02 | mapper unit + API PUT + edit prefill component | `npm run test -w @tfm/api -- src/applications/applications.update.test.ts`; `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.mapper.test.ts src/pods/application-edit/application-edit.test.tsx` | ✅ | ✅ green |
| APP-03 | API DELETE 204/404 (documents row untouched) + AlertDialog component | `npm run test -w @tfm/api -- src/applications/applications.delete.test.ts`; `npm run test -w @tfm/web -- src/pods/application-detail/application-detail.test.tsx` | ✅ | ✅ green |
| APP-04 | mapper unit + `formatSalaryRange` + card component | `npm run test -w @tfm/web -- src/pods/application-list/application-list.mapper.test.ts src/pods/application-list/application-list.test.tsx src/common/lib/format.test.ts` | ✅ | ✅ green |
| APP-05 | hook/container with mocked `fetch` (loading, error+retry, empty, empty-by-filters) | `npm run test -w @tfm/web -- src/pods/application-list/application-list.test.tsx` | ✅ | ✅ green |
| APP-06 | service on real Mongo (Unicode tags, regex metachar `q`, empty `$all` guard) + filter bar component | `npm run test -w @tfm/api -- src/applications/applications.query.test.ts`; `npm run test -w @tfm/web -- src/pods/application-list/application-list.test.tsx` | ✅ | ✅ green |
| APP-07 | `parseSearch`/`stringifySearch` round-trip + hostile URLs + router reload test | `npm run test -w @tfm/web -- src/core/router/search-params.test.ts src/core/router/router.test.tsx` | ✅ | ✅ green |
| APP-08 | service sort (nulls last, deterministic) + sort select component | `npm run test -w @tfm/api -- src/applications/applications.query.test.ts`; `npm run test -w @tfm/web -- src/pods/application-list/application-list.test.tsx` | ✅ | ✅ green |
| APP-09 | detail component (no rounds/documents markup, collapsible text, safe `sourceUrl`) + mapper | `npm run test -w @tfm/web -- src/pods/application-detail/application-detail.test.tsx src/pods/application-detail/application-detail.mapper.test.ts` | ✅ | ✅ green |
| APP-10 | service (concurrent PATCH → one write) + route 404/strict body + hook rollback + single in-flight | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts`; `npm run test -w @tfm/web -- src/pods/application-detail/application-detail.test.tsx` | ✅ | ✅ green |
| APP-11 | service: `appliedAt` once on first `enviada`; manual value prevails | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts src/applications/applications.create-list.test.ts` | ✅ | ✅ green |
| APP-12 | contracts `normalizeTags`/`tagKey` unit + service stores `key` (mapper strips) + `TagGroupInput` component | `npm run test -w @tfm/contracts -- src/tag.normalize.test.ts`; `npm run test -w @tfm/api -- src/tags/tags.test.ts src/applications/applications.mapper.test.ts`; `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.test.tsx` | ✅ | ✅ green |
| APP-13 | service with injected clock: bumps on PUT/PATCH, not on no-op | `npm run test -w @tfm/api -- src/applications/applications.update.test.ts src/applications/applications.status.test.ts` | ✅ | ✅ green |
| APP-14 | `GET /api/tags` merge/oldest spelling/count desc + `TagFilter` shows only `stack` | `npm run test -w @tfm/api -- src/tags/tags.test.ts`; `npm run test -w @tfm/web -- src/pods/application-list/application-list.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Security rows (RESEARCH § Security Domain, T-02-01…T-02-14)

| Item | Test file | Test title |
|------|-----------|------------|
| PUT cannot forge `id/createdAt/statusHistory/interviews/ownerId/status` (strict whitelist) | `apps/api/src/applications/applications.update.test.ts` | ignores forged ownerId, createdAt, statusHistory, interviews and id in the body; keeps status and statusHistory when the body says rechazada and when it has no status |
| POST ignores forged server-owned fields | `apps/api/src/applications/applications.create-list.test.ts` | ignores id, createdAt, statusHistory, interviews and ownerId sent by the client |
| Hostile `status` (`status[$ne]=x`, unknown value) rejected | `apps/api/src/applications/applications.query.test.ts` | answers 400 VALIDATION_ERROR for an unknown status; ignores operator-shaped keys so they never reach Mongo |
| `q` metacharacters are literal, `q` > 100 chars rejected | `apps/api/src/applications/applications.query.test.ts` | treats regex metacharacters in q literally; answers 400 for q longer than 100 characters |
| Malformed `:id` answers 404 | `apps/api/src/applications/applications.delete.test.ts`, `applications.status.test.ts` | answers 404 for an unknown id and for a malformed id (delete); answers 404 for an unknown id and for a malformed id, and creates nothing (status) |
| `text/plain` POST answers 400 | `apps/api/src/applications/applications.create-list.test.ts` | answers 400 VALIDATION_ERROR when the content-type is not application/json |
| Validation errors never echo `offerText` | `apps/api/src/applications/applications.update.test.ts` | never echoes the offerText in a validation error, on PUT or on POST (gap test added in plan 06-15) |
| Hostile search URLs do not crash the list | `apps/web/src/core/router/router.test.tsx` | renders the list unfiltered for hostile search params and never an error screen |

---

## Wave 0 Requirements

- [x] `apps/api/src/test/mongo.ts` — test DB helper bound to the literal `tfm_test` (D-11), with API test files run one after another (`fileParallelism: false` in `apps/api/vitest.config.ts`) + `ensureIndexes(db)` extraction in `db/mongo.ts`
- [x] `packages/contracts/src/tag.normalize.ts` + `tag.normalize.test.ts`; query-schema tightening (`q.max(100)`) + updates in `application.schema.test.ts`
- [x] `apps/web/src/test/mock-fetch.ts`; rewrite `core/router/router.test.tsx` and `pods/application-list/application-list.test.tsx` (Phase 1 tests encode the stub)
- [x] Install `@tanstack/react-form@1.33.5`; after install `npm ls @tanstack/devtools-event-client` shows 0.4.4
- [x] shadcn-style primitives: `input`, `label`, `textarea`, `native-select`, `alert-dialog`, `collapsible`, `skeleton` (all in `apps/web/src/common/components/ui/`)
- [x] Decision (user, 2026-10-30): no devcontainer `node_modules` volume for now; web test runs of about one minute are accepted (RESEARCH Q6, Open Question 3 resolved). Targeted per-pod web runs stay the per-task feedback loop

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard-only flow, 360 px layout, AA contrast on list/detail/form | APP-04, APP-09 | Visual and focus behavior not asserted in jsdom | Tab through create → save → filter → change status → delete at 360 px, light and dark |
| Filters survive a real browser reload | APP-07 | Router history in a real browser | Apply filters, reload, confirm same list and URL |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-06 (plan 06-15)

---

## Validation Audit 2026-11-06

| Metric | Count |
|---|---|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap found: no test asserted that a validation error on the application endpoints never echoes `offerText` (security row). Resolved with `never echoes the offerText in a validation error, on PUT or on POST` in `apps/api/src/applications/applications.update.test.ts`. All 14 requirement rows name existing test files and their commands ran green in plan 06-15.
