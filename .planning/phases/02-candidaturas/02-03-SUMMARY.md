---
phase: 02-candidaturas
plan: 03
subsystem: api, web, contracts
tags: [tags, normalization, mongo-aggregation, react, status-badge, tag-chip]
requires:
  - phase: 02-candidaturas
    provides: applications repository/service/mapper/routes, list states (plans 02-01, 02-02)
provides:
  - normalizeTagLabel, tagKey, normalizeTags in @tfm/contracts
  - tags stored with a normalized key (tags.key_1 index), key never sent to the API
  - GET /api/tags (merged counts, es-locale order)
  - common enum labels, formatSalaryRange, StatusBadge, TagChip
  - DS application card in the list
affects: [02-04, 02-05, 02-06, 02-08, 02-11, 02-12, 06]
tech-stack:
  added: []
  patterns:
    - one pure normalization in contracts used by service (source of truth) and later by form and filter
    - literal token lookup objects for status classes
key-files:
  created:
    - packages/contracts/src/tag.normalize.ts
    - packages/contracts/src/tag.normalize.test.ts
    - apps/api/src/tags/tags.routes.ts
    - apps/api/src/tags/tags.test.ts
    - apps/web/src/common/lib/enum-labels.ts
    - apps/web/src/common/components/status-badge.tsx
    - apps/web/src/common/components/tag-chip.tsx
    - apps/web/src/common/components/common-components.test.tsx
    - apps/web/src/pods/application-list/components/application-card.tsx
  modified:
    - packages/contracts/src/index.ts
    - apps/api/src/db/mongo.ts
    - apps/api/src/app.ts
    - apps/api/src/applications/applications.repository.ts
    - apps/api/src/applications/applications.service.ts
    - apps/web/src/common/lib/format.ts
    - apps/web/src/common/lib/format.test.ts
    - apps/web/src/pods/application-list/application-list.vm.ts
    - apps/web/src/pods/application-list/application-list.mapper.ts
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
key-decisions:
  - "Tag dedupe is across groups: the first occurrence keeps its spelling and group (DOMAIN.md, UI-SPEC)"
  - "tagKey = NFC + trim + whitespace collapse + String toLowerCase; the stored tags[].key is what filters (02-04) and the aggregation use"
  - "More than 20 raw tags is a 400 from the schema (reject, not truncate); normalizeTags still caps at MAX_TAGS for forms"
  - "formatSalaryRange prints one amount when both bounds are equal"
requirements-completed: [APP-04, APP-12, APP-14]
duration: 25 min
completed: 2026-10-31
status: complete
commits: 2
plan_head_before: da85a977c066025535aa82060723d23d6d04a028
plan_head_after: 1476e569b6389b3b2baf4da4a38b632a125028c2
actuals:
  tokens: 30000
  tasks: 2
  commits: 2
---

# Phase 2 Plan 03: Tags normalized and summarized, DS application cards Summary

**One Unicode-safe tag normalization in @tfm/contracts drives the service (stored `tags[].key`, `tags.key_1` index) and `GET /api/tags` with merged counts in Spanish alphabetical order; the list now renders DS cards with StatusBadge, TagChip, salary and last-updated date.**

## Accomplishments

- `normalizeTags`: NFC, trim, whitespace collapse, empty labels dropped, case-insensitive duplicates merged across groups (first spelling and group kept), original order, capped at 20. A label over 40 characters is never cut (the schema rejects it).
- API: `create` stores `key = tagKey(label)` per tag; the mapper still maps field by field, so the response never contains `key` (asserted on POST and GET /api/tags raw text).
- `GET /api/tags`: aggregation grouped on the stored `(key, group)` (no server-side lower-casing), label from the oldest application, sorted in JS by count desc, `localeCompare(..., "es")`, then group order. «Éxito» sorts before «Zod» in a test. `[]` when there are no applications.
- Web common: `STATUS_LABELS` and the other enum labels, `TAG_GROUP_ORDER`, `formatSalaryRange` (range, Desde, Hasta, single amount, null, currency), `StatusBadge` (literal lookup: label, icon and token pair per status; icon and dot aria-hidden), `TagChip` (default, soft, removable «Quitar {label}», selected toggle with `aria-pressed` and a check icon).
- List pod: new view model and mapper (tags ordered stack, nice_to_have, language; first 3; `hiddenTagCount`; salary; `updatedAtLabel`), `ApplicationCard` (`li > article`, serif h2 with sr-only company, company · location, badge, tag list, «+N» with sr-only « etiquetas más», mono salary, «Actualizada …»).
- T-02-07: tests render `<img src=x onerror=alert(1)>` as a tag label and as a title and assert no `img` element. T-02-08: tagKey tests cover Éxito/éxito, Ñandú/ñandú and composed vs decomposed «Café».

## Task Commits

1. Task 1: `6ceb9fa` feat(02-03): normalize tags at the source, store tags.key and add GET /api/tags
2. Task 2: `1476e56` feat(02-03): application cards with StatusBadge, TagChip, salary and last-updated date

## Verification

- `npm run typecheck`, `npm run lint` and `npm run test` pass (contracts 51, api 61, web 83). The pre-commit hook ran the same checks on both commits.
- All acceptance-criteria greps of both tasks pass, including the token-only guard and the no-`toLower`-in-repository guard.
- No dependency added; `package-lock.json` unchanged.

## TDD Gate Compliance

Both tasks are `tdd="true"` but the pre-commit hook runs the whole suite, so a failing RED-only commit cannot be made without bypassing hooks. Honest record: for Task 1 the normalization implementation was written together with its tests and the tests were run GREEN; a RED run was not performed separately (the only failures seen were test-authoring errors: a 1-character title rejected by the schema, then fixed). For Task 2 the same applies; the only failure was a test matcher for the NBSP in the salary. Both tasks are committed as single `feat(02-03)` commits with no separate `test(02-03)` commit.

## Notes for later plans

- The Phase 6 seed must go through the service (or compute `key` with `tagKey`), otherwise stored tags lack the key.
- Applications created in the development database `tfm` before this plan (for example by a manual `curl` POST during plans 02-01 and 02-02) store tags without `key`. They are not migrated, so they do not match the stack filter of plan 02-04 and `GET /api/tags` groups them under a missing key instead of merging them with their case variants. Delete them, or re-save them once plan 02-12 adds PUT. Test runs are unaffected because `tfm_test` is wiped before each test.
- The existing `tags.label_1` index is kept; `tags.key_1` serves the `$all` filter of plan 02-04.
- The card is not yet a link: plan 02-08 turns the h2 into the stretched detail link.

## Deviations from Plan

None - plan executed exactly as written. (The mapper needed no change for key hiding; the assertion lives in `tags.test.ts`.)

## Known Stubs

None.

## Threat Flags

None. `GET /api/tags` is a read-only endpoint over existing data and was in the plan.

## Self-Check: PASSED

- All created files exist on disk; commits `6ceb9fa` and `1476e56` are ancestors of HEAD; the working tree is clean.
