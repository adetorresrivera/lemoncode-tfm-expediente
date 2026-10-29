---
phase: "02"
slug: "candidaturas"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-29"
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
| **Estimated runtime** | contracts ~24 s, API ~10 s, web ~55 s, typecheck ~113 s (9p mount; see Wave 0 volume decision) |

---

## Sampling Rate

- **After every task commit:** Run the touched workspace's targeted tests (contracts/API first; web per pod)
- **After every plan wave:** Run `npm run typecheck && npm run test` and `npm run lint`
- **Before `/gsd-verify-work`:** Full suite + build must be green, plus the manual rows below
- **Max feedback latency:** ~60 s for targeted tests; ~120 s for typecheck

---

## Per-Task Verification Map

Requirement-level map (task-level rows are completed by the plans' `<verify>` blocks).

| Requirement | Test Type | Automated Command | File Exists |
|-------------|-----------|-------------------|-------------|
| APP-01 | contracts unit + API POST 201/400 + form component | `npm run test -w @tfm/contracts`; `npm run test -w @tfm/api -- src/applications`; `npm run test -w @tfm/web -- src/pods/application-edit` | contracts ✅, rest ❌ W0 |
| APP-02 | mapper unit + API PUT + edit prefill component | same | ❌ W0 |
| APP-03 | API DELETE 204/404 (documents row untouched) + AlertDialog component | API + web detail | ❌ W0 |
| APP-04 | mapper unit + `formatSalaryRange` + card component | `npm run test -w @tfm/web -- src/pods/application-list src/common` | ❌ W0 |
| APP-05 | hook/container with mocked `fetch` (loading, error+retry, empty, empty-by-filters) | web list | ❌ W0 |
| APP-06 | service on real Mongo (Unicode tags, regex metachar `q`, empty `$all` guard) + filter bar component | API + web list | ❌ W0 |
| APP-07 | `parseSearch`/`stringifySearch` round-trip + hostile URLs + router reload test | `npm run test -w @tfm/web -- src/core/router src/pods/application-list` | ❌ W0 |
| APP-08 | service sort (nulls last, deterministic) + sort select component | API + web | ❌ W0 |
| APP-09 | detail component (no rounds/documents markup, collapsible text, safe `sourceUrl`) + mapper | web detail | ❌ W0 |
| APP-10 | service (concurrent PATCH → one write) + route 404/strict body + hook rollback + single in-flight | API + web detail | ❌ W0 |
| APP-11 | service: `appliedAt` once on first `enviada`; manual value prevails | API | ❌ W0 |
| APP-12 | contracts `normalizeTags`/`tagKey` unit + service stores `key` (mapper strips) + `TagGroupInput` component | contracts + API + web edit | ❌ W0 |
| APP-13 | service with injected clock: bumps on PUT/PATCH, not on no-op | API | ❌ W0 |
| APP-14 | `GET /api/tags` merge/oldest spelling/count desc + `TagFilter` shows only `stack` | API + web list | ❌ W0 |

Security rows (from RESEARCH § Security Domain, T-02-01…T-02-14): PUT cannot forge `id/createdAt/statusHistory/interviews/ownerId/status`; `status[$ne]=x`, `q` metacharacters and `q` > 100 chars rejected; malformed `:id` → 404; `text/plain` POST → 400; validation errors never echo `offerText`; hostile search URLs do not crash the list.

---

## Wave 0 Requirements

- [ ] `apps/api/src/test/mongo.ts` — per-file test DB helper (`tfm_test_<suffix>`) + `ensureIndexes(db)` extraction in `db/mongo.ts`
- [ ] `packages/contracts/src/tag.normalize.ts` + `tag.normalize.test.ts`; query-schema tightening (`q.max(100)`) + updates in `application.schema.test.ts`
- [ ] `apps/web/src/test/mock-fetch.ts`; rewrite `core/router/router.test.tsx` and `pods/application-list/application-list.test.tsx` (Phase 1 tests encode the stub)
- [ ] Install `@tanstack/react-form@1.33.5`; after install `npm ls @tanstack/devtools-event-client` must show 0.4.x
- [ ] shadcn-style primitives: `input`, `label`, `textarea`, `native-select`, `alert-dialog`, `collapsible`, `skeleton`
- [ ] Decision (user): devcontainer `node_modules` volume to cut web test/typecheck latency (RESEARCH Q6)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard-only flow, 360 px layout, AA contrast on list/detail/form | APP-04, APP-09 | Visual and focus behavior not asserted in jsdom | Tab through create → save → filter → change status → delete at 360 px, light and dark |
| Filters survive a real browser reload | APP-07 | Router history in a real browser | Apply filters, reload, confirm same list and URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
