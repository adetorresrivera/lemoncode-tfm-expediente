---
phase: 06-pulido-de-demo
reviewed: 2026-11-07T11:00:00Z
depth: standard
files_reviewed: 92
files_reviewed_list:
  - .gitattributes
  - README.md
  - apps/api/package.json
  - apps/api/src/app.test.ts
  - apps/api/src/app.ts
  - apps/api/src/applications/applications.documents.test.ts
  - apps/api/src/applications/applications.limits.test.ts
  - apps/api/src/applications/applications.mapper.test.ts
  - apps/api/src/applications/applications.mapper.ts
  - apps/api/src/applications/applications.routes.ts
  - apps/api/src/applications/applications.status.test.ts
  - apps/api/src/applications/applications.update.test.ts
  - apps/api/src/documents/documents.mapper.test.ts
  - apps/api/src/main.ts
  - apps/api/src/offers/__fixtures__/fixtures.ts
  - apps/api/src/scripts/seed.ts
  - apps/api/src/scripts/seed/seed.plan.test.ts
  - apps/api/src/scripts/seed/seed.plan.ts
  - apps/api/src/scripts/seed/seed.run.test.ts
  - apps/api/src/scripts/seed/seed.run.ts
  - apps/api/src/scripts/try-extract.ts
  - apps/api/src/startup.test.ts
  - apps/api/src/startup.ts
  - apps/api/src/storage/s3.ts
  - apps/api/src/storage/storage.test.ts
  - apps/api/tsconfig.build.json
  - apps/web/package.json
  - apps/web/scripts/run-vitest.mjs
  - apps/web/src/common/components/ai-mark.tsx
  - apps/web/src/common/components/common-components.test.tsx
  - apps/web/src/common/components/request-status.tsx
  - apps/web/src/common/components/route-error.tsx
  - apps/web/src/common/components/route-not-found.tsx
  - apps/web/src/common/components/status-badge.tsx
  - apps/web/src/common/components/tag-chip.tsx
  - apps/web/src/common/components/theme-toggle.tsx
  - apps/web/src/common/components/ui/alert-dialog.tsx
  - apps/web/src/common/components/ui/dialog.tsx
  - apps/web/src/common/components/ui/sheet.tsx
  - apps/web/src/common/lib/contrast.test.ts
  - apps/web/src/common/lib/contrast.ts
  - apps/web/src/core/router/route-error.test.tsx
  - apps/web/src/core/router/router.test.tsx
  - apps/web/src/core/router/router.ts
  - apps/web/src/core/theme/theme.test.ts
  - apps/web/src/layouts/app-layout.test.tsx
  - apps/web/src/layouts/app-layout.tsx
  - apps/web/src/pods/application-detail/application-detail.component.tsx
  - apps/web/src/pods/application-detail/application-detail.container.tsx
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
  - apps/web/src/pods/application-detail/application-detail.mapper.test.ts
  - apps/web/src/pods/application-detail/application-detail.test.tsx
  - apps/web/src/pods/application-detail/components/delete-dialog.tsx
  - apps/web/src/pods/application-detail/components/detail-states.tsx
  - apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-dialog.tsx
  - apps/web/src/pods/application-detail/components/offer-data-section.tsx
  - apps/web/src/pods/application-edit/application-edit.mapper.test.ts
  - apps/web/src/pods/application-edit/components/edit-states.tsx
  - apps/web/src/pods/application-edit/components/form-field.tsx
  - apps/web/src/pods/application-list/application-list.component.tsx
  - apps/web/src/pods/application-list/application-list.mapper.test.ts
  - apps/web/src/pods/application-list/application-list.test.tsx
  - apps/web/src/pods/application-list/components/list-error.tsx
  - apps/web/src/pods/application-list/components/status-filter.tsx
  - apps/web/src/pods/document-list/components/document-delete-dialog.tsx
  - apps/web/src/pods/document-list/document-list.component.tsx
  - apps/web/src/pods/document-list/document-list.mapper.test.ts
  - apps/web/src/pods/document-list/document-list.test.tsx
  - apps/web/src/pods/document-upload/components/document-picker.tsx
  - apps/web/src/pods/document-upload/components/upload-dialog.tsx
  - apps/web/src/pods/document-upload/document-upload.mapper.test.ts
  - apps/web/src/pods/document-upload/document-upload.test.tsx
  - apps/web/src/routes/__root.tsx
  - apps/web/src/test/a11y.test.tsx
  - apps/web/src/test/axe.ts
  - apps/web/src/test/fake-clock.ts
  - apps/web/src/test/live-regions.test.tsx
  - apps/web/src/test/responsive.test.tsx
  - apps/web/src/test/view-states.test.tsx
  - apps/web/vitest.config.ts
  - compose.yml
  - docs/AI-EXTRACTION.md
  - docs/ARCHITECTURE.md
  - docs/DESIGN.md
  - eslint.config.js
  - package.json
  - packages/contracts/src/application.schema.test.ts
  - packages/contracts/src/application.schema.ts
  - scripts/compose-smoke.sh
  - scripts/compose.cold.yml
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-11-07T11:00:00Z
**Depth:** standard
**Files Reviewed:** 92
**Status:** issues_found

## Summary

Reviewed the seed script and its plan/runner, startup retry, S3 deadlines, body limit on applications, SPA fallback change, compose smoke `--cold`, the a11y/responsive/reduced-motion edits, the route error screens, the Spanish README and docs, and the new test suites. `npm run typecheck`, `npm run lint`, `@tfm/web` tests (890) and `@tfm/api` tests (467) all pass in this checkout.

No security or data-loss blockers were found. The seed's destructive path (`--reset`) is strictly opt-in, announces its counts before deleting, and its tests run against `tfm_test` and the test bucket only. API mappers whitelist field by field, so the storage-only `seed` mark cannot leak. Concerns are one user-facing regression introduced by a contract change, a resource leak that the new retry loop makes reachable, and a non-atomic seed marking.

## Warnings

### WR-01: New `sourceUrl` length cap shows a misleading validation message

**File:** `apps/web/src/pods/application-edit/application-edit.mapper.ts:318` (cause: `packages/contracts/src/application.schema.ts:38`)
**Issue:** This phase added `.max(2048)` to `sourceUrl`. `issueToMessage` answers every `sourceUrl` issue with «Introduce una dirección válida que empiece por http:// o https://.», without checking `issue.code`. A URL longer than 2048 characters (long tracking or redirect links from job boards are common) is a perfectly valid http(s) URL, yet the form tells the user it is not valid and gives no hint to shorten it. The field has no `maxLength` either, unlike title, notes and tags, which all have a dedicated `too_big` message. The same applies to an application stored before this phase with a longer URL: opening it for edit fails validation with the wrong explanation. No mapper test covers the `too_big` case (only `ftp://` at `application-edit.mapper.test.ts:330`).
**Fix:**
```ts
case "sourceUrl":
  if (issue.code === "too_big") {
    return "El enlace admite hasta 2.048 caracteres.";
  }
  return "Introduce una dirección válida que empiece por http:// o https://.";
```
Add a mapper test with a 2049-character `https://` URL.

### WR-02: Mongo client leaks when `ensureIndexes` fails inside the new startup retry

**File:** `apps/api/src/main.ts:28-37` (cause: `apps/api/src/db/mongo.ts:30-36`)
**Issue:** `connectMongo` creates a `MongoClient`, awaits `connect()` and then `ensureIndexes(db)`. If `ensureIndexes` throws (primary not ready, index build error on a cold Mongo, which is exactly the case the retry is meant to absorb), the connected client is never closed and `connectMongo` rejects without returning it. The new wrapper in `main.ts` only closes `conn.client` when `ensureBucket` fails, because `conn` does not exist yet in the earlier failure. Each of up to 10 attempts can therefore leave a live client with its monitoring connections. The process exits on final failure, but on eventual success the leaked clients from earlier attempts stay open for the life of the API.
**Fix:** close the client inside `connectMongo` on any failure after creating it:
```ts
const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
try {
  await client.connect();
  const db = client.db();
  await ensureIndexes(db);
  return { client, db };
} catch (err) {
  await client.close().catch(() => undefined);
  throw err;
}
```
The `try/catch` in `main.ts` can then stay as is, or be simplified.

### WR-03: Seed marking is a second write, so an interrupted run leaves unmarked demo records

**File:** `apps/api/src/scripts/seed/seed.run.ts:195-202` and `:231-238`
**Issue:** Each seeded application and document is created through the service and only afterwards marked with `markSeed` in a separate `updateOne`. If the process dies, or `markSeed` fails, between the two writes (Mongo hiccup, Ctrl-C while rehearsing), the record exists without `seed: true`. A later plain `npm run seed` neither removes it (it deletes `{ seed: true }` only) nor reports it, so the list shows a duplicate of the demo entry; for documents, the Silo object also stays. README promises that the plain seed can be repeated and yields exactly the demo set; only `--reset` recovers from this state, and it also wipes the user's own data. The window is small, but the seed is run repeatedly and interactively before the defence.
**Fix:** write the mark with the record. Either extend the repository `insert` to accept an extra storage-only field for the seed path, or at minimum mark inside a `finally` guarded by the created id, and document that an interrupted seed needs `--reset`:
```ts
const created = await applicationsService.create(...);
try { await markSeed(db, "applications", created.id); }
catch (err) { log("No se pudo marcar una candidatura de demo; usa --reset."); throw err; }
```

## Info

### IN-01: Body-limit block duplicated between applications and offers routes

**File:** `apps/api/src/applications/applications.routes.ts:21-33`
**Issue:** The `bodyLimit({ maxSize: 256 * 1024, onError: throw ApiError(...) })` block is a near copy of `offers/extract.routes.ts:14-26` (same magic number, different status and message: 413 here, 400 there for the same oversize condition). The two endpoints now answer the same situation with different status codes.
**Fix:** extract `jsonBodyLimit(message, status)` into `http/` with a named `MAX_JSON_BODY_BYTES` constant, and pick one status (413 is the correct one) for both.

### IN-02: Retry attempt count is duplicated and the final message hides the cause

**File:** `apps/api/src/main.ts:32-37`
**Issue:** `attempts: 10` appears in the options and again as the literal in `"API startup failed after 10 attempts"`. Changing one silently desynchronises the log.
**Fix:** `const STARTUP_ATTEMPTS = 10;` and interpolate it.

### IN-03: `compose-smoke.sh --cold` silently exits on some failures

**File:** `scripts/compose-smoke.sh:~270` (`doc_first="$(http_send GET /api/documents | sed 1d | node ...)"`)
**Issue:** The assignment is a pipeline under `set -euo pipefail`. If the request fails or the list is empty (`JSON.parse(s)[0].id` throws), the script exits through `set -e` with a Node stack trace and no `SMOKE FAIL:` line, and the `[ -n "$doc_first" ]` guard on the next line is unreachable for that case. The same holds for `count_items` failures, though those do print through `fail`.
**Fix:** `doc_first="$(...)" || fail "could not read the first seeded document"`.

### IN-04: DESIGN.md still describes the old tag chip height

**File:** `docs/DESIGN.md:21` (code: `apps/web/src/common/components/tag-chip.tsx:34,60,81`)
**Issue:** The spec says the chip is `h-7`. This phase made toggle chips `h-11 min-w-11` and removable chips `h-11` with a `size-11` remove button. The other DS edits (status badge, AI mark, shell) were updated in the same doc; this one was missed.
**Fix:** note the 44 px touch target for interactive and removable chips in the «Etiqueta» entry.

### IN-05: Test helpers and guards with side effects or brittle strategy

**File:** `apps/web/src/test/axe.ts:9`, `apps/web/src/test/responsive.test.tsx:1-140`
**Issue:** `checkA11y` sets `document.documentElement.lang = "es"` and never restores it (it persists within the file's jsdom). `responsive.test.tsx` verifies 360/768/1280 px behaviour by parsing Tailwind class strings and a hand-maintained `CONTENT_WIDTH` table; it will not notice a layout break that does not involve a fixed `w-`/`min-w-` token, and it mirrors the shell's padding by hand. The file itself says real measurement is a human pass, so this is a known limit, noted here only so the passing suite is not read as evidence of no horizontal scroll.
**Fix:** restore `lang` in an `afterEach`; keep the human viewport pass in the demo checklist.

---

_Reviewed: 2026-11-07T11:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
