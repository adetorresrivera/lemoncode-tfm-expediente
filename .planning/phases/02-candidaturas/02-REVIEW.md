---
phase: 02-candidaturas
reviewed: 2026-10-31T00:00:00Z
depth: standard
files_reviewed: 113
files_reviewed_list:
  - apps/api/src/app.ts
  - apps/api/src/applications/applications.create-list.test.ts
  - apps/api/src/applications/applications.delete.test.ts
  - apps/api/src/applications/applications.item.test.ts
  - apps/api/src/applications/applications.mapper.ts
  - apps/api/src/applications/applications.query.test.ts
  - apps/api/src/applications/applications.query.ts
  - apps/api/src/applications/applications.repository.ts
  - apps/api/src/applications/applications.routes.ts
  - apps/api/src/applications/applications.service.ts
  - apps/api/src/applications/applications.status.test.ts
  - apps/api/src/applications/applications.update.test.ts
  - apps/api/src/db/mongo.ts
  - apps/api/src/http/object-id.ts
  - apps/api/src/http/query-input.ts
  - apps/api/src/http/require-json.ts
  - apps/api/src/main.ts
  - apps/api/src/tags/tags.routes.ts
  - apps/api/src/tags/tags.test.ts
  - apps/api/src/test/mongo.ts
  - apps/api/vitest.config.ts
  - apps/web/package.json
  - apps/web/src/common/components/common-components.test.tsx
  - apps/web/src/common/components/request-status.tsx
  - apps/web/src/common/components/status-badge.tsx
  - apps/web/src/common/components/tag-chip.tsx
  - apps/web/src/common/components/ui/alert-dialog.tsx
  - apps/web/src/common/components/ui/button.tsx
  - apps/web/src/common/components/ui/collapsible.tsx
  - apps/web/src/common/components/ui/input.tsx
  - apps/web/src/common/components/ui/label.tsx
  - apps/web/src/common/components/ui/native-select.tsx
  - apps/web/src/common/components/ui/skeleton.tsx
  - apps/web/src/common/components/ui/textarea.tsx
  - apps/web/src/common/components/ui/toggle-group.tsx
  - apps/web/src/common/components/ui/toggle.tsx
  - apps/web/src/common/hooks/use-debounced-callback.ts
  - apps/web/src/common/lib/enum-labels.ts
  - apps/web/src/common/lib/format.test.ts
  - apps/web/src/common/lib/format.ts
  - apps/web/src/core/router/application-search.ts
  - apps/web/src/core/router/router.test.tsx
  - apps/web/src/core/router/router.ts
  - apps/web/src/core/router/search-params.test.ts
  - apps/web/src/core/router/search-params.ts
  - apps/web/src/core/router/use-arrival-notice.ts
  - apps/web/src/layouts/app-layout.test.tsx
  - apps/web/src/layouts/app-layout.tsx
  - apps/web/src/pods/application-detail/api/api.ts
  - apps/web/src/pods/application-detail/application-detail.component.tsx
  - apps/web/src/pods/application-detail/application-detail.container.tsx
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-detail/application-detail.mapper.ts
  - apps/web/src/pods/application-detail/application-detail.test.tsx
  - apps/web/src/pods/application-detail/application-detail.vm.ts
  - apps/web/src/pods/application-detail/components/delete-dialog.tsx
  - apps/web/src/pods/application-detail/components/detail-states.tsx
  - apps/web/src/pods/application-detail/components/notes-section.tsx
  - apps/web/src/pods/application-detail/components/offer-data-section.tsx
  - apps/web/src/pods/application-detail/components/offer-text-section.tsx
  - apps/web/src/pods/application-detail/components/status-change.tsx
  - apps/web/src/pods/application-detail/components/status-history.tsx
  - apps/web/src/pods/application-detail/components/tags-section.tsx
  - apps/web/src/pods/application-detail/index.ts
  - apps/web/src/pods/application-edit/api/api.ts
  - apps/web/src/pods/application-edit/application-edit.component.tsx
  - apps/web/src/pods/application-edit/application-edit.container.tsx
  - apps/web/src/pods/application-edit/application-edit.hooks.ts
  - apps/web/src/pods/application-edit/application-edit.mapper.ts
  - apps/web/src/pods/application-edit/application-edit.test.tsx
  - apps/web/src/pods/application-edit/application-edit.vm.ts
  - apps/web/src/pods/application-edit/components/conditions-section.tsx
  - apps/web/src/pods/application-edit/components/edit-states.tsx
  - apps/web/src/pods/application-edit/components/field-props.ts
  - apps/web/src/pods/application-edit/components/form-field.tsx
  - apps/web/src/pods/application-edit/components/job-section.tsx
  - apps/web/src/pods/application-edit/components/tag-group-input.tsx
  - apps/web/src/pods/application-edit/components/tags-section.tsx
  - apps/web/src/pods/application-edit/components/tracking-section.tsx
  - apps/web/src/pods/application-edit/index.ts
  - apps/web/src/pods/application-list/api/api.ts
  - apps/web/src/pods/application-list/application-list.component.tsx
  - apps/web/src/pods/application-list/application-list.container.tsx
  - apps/web/src/pods/application-list/application-list.hooks.ts
  - apps/web/src/pods/application-list/application-list.mapper.ts
  - apps/web/src/pods/application-list/application-list.test.tsx
  - apps/web/src/pods/application-list/application-list.vm.ts
  - apps/web/src/pods/application-list/components/application-card.tsx
  - apps/web/src/pods/application-list/components/empty-filtered-state.tsx
  - apps/web/src/pods/application-list/components/empty-state.tsx
  - apps/web/src/pods/application-list/components/filter-panel.tsx
  - apps/web/src/pods/application-list/components/list-error.tsx
  - apps/web/src/pods/application-list/components/list-skeleton.tsx
  - apps/web/src/pods/application-list/components/result-count.tsx
  - apps/web/src/pods/application-list/components/search-field.tsx
  - apps/web/src/pods/application-list/components/select-filters.tsx
  - apps/web/src/pods/application-list/components/status-filter.tsx
  - apps/web/src/pods/application-list/components/tag-filter.tsx
  - apps/web/src/routes/applications/$applicationId/edit.tsx
  - apps/web/src/routes/applications/$applicationId/index.tsx
  - apps/web/src/routes/applications/index.tsx
  - apps/web/src/routes/applications/new.tsx
  - apps/web/src/scenes/application-detail.scene.tsx
  - apps/web/src/scenes/application-edit.scene.tsx
  - apps/web/src/scenes/application-list.scene.tsx
  - apps/web/src/test/mock-fetch.ts
  - apps/web/src/test/setup.ts
  - packages/contracts/src/application.schema.test.ts
  - packages/contracts/src/application.schema.ts
  - packages/contracts/src/index.ts
  - packages/contracts/src/tag.normalize.test.ts
  - packages/contracts/src/tag.normalize.ts
  - scripts/compose-smoke.sh
findings:
  critical: 0
  warning: 4
  info: 9
  total: 13
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-10-31
**Depth:** standard
**Files Reviewed:** 113
**Status:** issues_found

## Summary

Reviewed the Phase 2 API (Hono routes, service, repository, query builder, indexes), the shared contracts, the three web pods (list, detail, edit) with their scenes and routes, and the compose smoke script. Test files were read for reliability only.

The implementation is solid on the points that usually go wrong. Filters are built field by field and the user's `q` is regex-escaped. Path ids are validated before they reach `ObjectId`. The PUT and POST documents are built key by key, so forged `status`, `statusHistory`, `ownerId` or `createdAt` cannot reach Mongo. The status change is a single atomic pipeline update. `sourceUrl` is restricted to http and https in the contract and again at render time. The error handler never echoes internal messages. The pod boundaries (no pod imports another pod, router imports only in scenes) and the DS-token rule hold. No `any` appears outside the generated route tree.

No critical issues were found. The warnings are an unbounded-input gap on the API, a smoke script that can leave data behind, and two UI state defects (a stale delete error and a false "no results" message while a refetch is in flight). There is no structural findings block for this review.

## Warnings

### WR-01: No request-body limit and several unbounded string fields in the input contract

**File:** `packages/contracts/src/application.schema.ts:36-44` (also `apps/api/src/app.ts:56`)
**Issue:** `offerText` is capped at 20000 and `notes` at 5000, but `sourceUrl`, `cvDocumentId` and `coverLetterDocumentId` have no `max`. Hono applies no body-size limit by default and `app.ts` registers no `bodyLimit`. A single POST or PUT can carry a multi-megabyte `sourceUrl`. It is persisted to Mongo, returned in every list response, and written into a rendered `href`. The server runs in a container with other services, so this is a robustness and denial-of-service gap, not only a hygiene one. `salaryMin` and `salaryMax` are also unbounded (any finite double passes). `Intl.NumberFormat` renders them fine, but a value like `1e300` is accepted as a salary.
**Fix:**
```ts
// application.schema.ts
sourceUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().default(null),
cvDocumentId: z.string().min(1).max(64).nullable().default(null),
coverLetterDocumentId: z.string().min(1).max(64).nullable().default(null),
salaryMin: z.number().nonnegative().max(1e9).nullable().default(null),
salaryMax: z.number().nonnegative().max(1e9).nullable().default(null),

// app.ts
import { bodyLimit } from "hono/body-limit";
app.use("/api/*", bodyLimit({ maxSize: 256 * 1024 }));
```
Map the 413 from `bodyLimit` to the standard `{ error: { code, message } }` shape (see IN-04).

### WR-02: compose-smoke leaves the smoke record in the Mongo volume when a later step fails

**File:** `scripts/compose-smoke.sh:136-166`
**Issue:** The comment says the round trip "deletes it before finishing (T-02-29)". Cleanup is only the final `DELETE` step. Any failure after the `POST` at line 138 (a PUT assertion, the PATCH `appliedAt` check, the tags check) calls `fail`, which runs `exit 1`. The "Smoke test" record then stays in the persistent compose Mongo volume and shows up in the demo list. There is no `trap`.
**Fix:** Register cleanup once the id is known.
```bash
cleanup_app() {
  [ -n "${app_id:-}" ] && http_send DELETE "/api/applications/$app_id" >/dev/null 2>&1 || true
}
trap cleanup_app EXIT
```
The final explicit `DELETE` assertion can stay. The trap is then a harmless second delete that returns 404.

### WR-03: Delete dialog shows a stale error after cancel and reopen

**File:** `apps/web/src/pods/application-detail/components/delete-dialog.tsx:50-57` (state owned by `application-detail.hooks.ts:65-68, 178-188`)
**Issue:** After a failed DELETE the hook keeps `deletion = { key, state: "error" }` until the next delete attempt. If the user dismisses the dialog with "Conservar candidatura" or Escape and opens it again later, the dialog opens already showing "No se pudo eliminar la candidatura. Inténtalo de nuevo." for an action they have not retried. The `role="status"` region announces it again to screen readers on open.
**Fix:** Expose a reset from the hook (`resetDeleteError`) and call it when the dialog opens or closes.
```tsx
const handleOpenChange = (next: boolean) => {
  if (!next && deleting) return;
  if (next) onOpen(); // hook: setDeletion(null) when state === "error"
  setOpen(next);
};
```

### WR-04: List shows "no results" while a refetch is in flight

**File:** `apps/web/src/pods/application-list/application-list.component.tsx:57-91` (with `application-list.hooks.ts:63-71`)
**Issue:** While refreshing, the hook keeps the previous `applications`. If the previous result was empty (for example a status filter with zero matches) and the user then changes the filter, the render takes the `applications.length === 0` branch. It shows `EmptyFilteredState` ("Ninguna candidatura coincide con los filtros") and the count reads "Sin candidaturas" while the new request is still pending. The text is wrong, and `aria-live` announces it. The page flickers to a false empty state before the real rows arrive. It also happens when the previous result was non-empty and the new query is the first one to return nothing, but only for the duration of the fetch.
**Fix:** Treat an empty stale list during refresh as loading.
```tsx
const showSkeleton = firstLoad || (refreshing && applications.length === 0);
const count = showSkeleton || status === "error" ? null : applications.length;
// ...
{showSkeleton ? <ListSkeleton /> : status === "error" ? ... }
```

## Info

### IN-01: Search field does not follow the URL after the first render

**File:** `apps/web/src/pods/application-list/components/search-field.tsx:17-21`, `filter-panel.tsx:56-61`
**Issue:** The field owns its text and only resets through the `clearCount` remount. If `q` changes in the URL without the user typing (a link such as `/applications?q=react` clicked while the list is mounted, or history back/forward), the input keeps its old text while the results already use the new `q`. The design comment explains why a continuous sync is avoided (it would eat keystrokes during the debounce). The gap is not documented as a known limitation.
**Fix:** Key the field on the URL value only when it differs from what the field last emitted, or add a comment that external URL changes are intentionally unsupported.

### IN-02: PUT validates fields it then ignores

**File:** `apps/api/src/applications/applications.routes.ts:35-39`, `applications.service.ts:34-53`
**Issue:** PUT parses the body with `applicationInputSchema`, which includes `status`, `offerText`, `cvDocumentId` and `coverLetterDocumentId`. None of them is written. A client that sends an invalid `status` or an over-long `offerText` on PUT gets a 400 for a field the endpoint would have ignored. A valid `status` is silently dropped, which the tests lock in. The service comment already notes that Phase 3 and Phase 5 must remember to add fields here.
**Fix:** Consider a dedicated `applicationUpdateSchema` (editable fields only) in `@tfm/contracts` so the contract states what PUT accepts. This is also where the Phase 3 and Phase 5 additions belong.

### IN-03: Indexes that nothing uses

**File:** `apps/api/src/db/mongo.ts:5-15`
**Issue:** The text index on `{ title, company }` and the `tags.label` index are never queried. Search uses `$regex` on `title` and `company`, and the tag filter uses `tags.key`. They cost write time and storage. The text index also cannot be changed later without an `IndexOptionsConflict`, as the comment itself warns. The `status_1` and `updatedAt_-1` indexes help only marginally on a single-user collection.
**Fix:** Drop the unused indexes, or switch search to `$text` if the index is meant to stay. `docs/ARCHITECTURE.md:71` lists them, so update the doc if they go.

### IN-04: Error-handler and JSON-gate edge cases

**File:** `apps/api/src/app.ts:124-138`, `apps/api/src/http/require-json.ts:6-20`
**Issue:**
- An `HTTPException` with a status other than 400 or 404 (405, 413, 415) is returned with that HTTP status but with the code `INTERNAL_ERROR` and the message "Error interno". The code and the status disagree.
- `requireJson` is registered with `routes.use("*")`, so an unknown sub-path such as `PUT /api/applications/x/y` with `text/plain` answers 400 "Se esperaba application/json" instead of 404.
- `startsWith("application/json")` also accepts `application/jsonx`.
**Fix:** Map 413 and 405 explicitly (for example `VALIDATION_ERROR` and `NOT_FOUND`), and match the media type with `/^application\/json(\s*;|$)/i`.

### IN-05: Small targets and no disabled styling for aria-disabled buttons

**File:** `apps/web/src/pods/application-list/components/status-filter.tsx:43`, `apps/web/src/common/components/ui/button.tsx:7`
**Issue:** The status filter toggles are `h-9` (36 px) while the rest of the UI uses `h-11` (44 px) for touch targets. The project targets 360 px screens. The save and delete controls use `aria-disabled` (so focus is kept), but `buttonVariants` only styles `disabled:`, so a pending "Guardar candidatura" or "Eliminar candidatura" looks identical to an active one. Only the label change signals the state.
**Fix:** Use `h-11` on the toggles, and add `aria-disabled:opacity-50 aria-disabled:cursor-not-allowed` to the base button class.

### IN-06: An unparseable salary is silently dropped

**File:** `apps/web/src/pods/application-edit/application-edit.mapper.ts:28-29`, `components/conditions-section.tsx:162-171`
**Issue:** The salary inputs are `type="number"`. For input the browser cannot parse (for example "1e" or a trailing comma) the control's `value` is `""`. `amountOrNull("")` returns `null`, so the salary is saved as empty with no error. The `invalid_type` message "Introduce un importe en números." is only reachable through paste paths that bypass the number input. Spanish-formatted input such as `52.000` is also read as `52` by browsers that accept it.
**Fix:** Keep the number input, but add `step="any"` and a hint such as "Sin puntos ni comas, por ejemplo 52000." Alternatively use `type="text"` with `inputMode="numeric"` so the mapper's NaN path really runs.

### IN-07: Detail page title is not reset for the loading, not-found and error states

**File:** `apps/web/src/pods/application-detail/application-detail.container.tsx:34-38`, `apps/web/src/scenes/application-detail.scene.tsx`
**Issue:** `document.title` is only set once the application has loaded. On a not-found or error state, and while loading, the tab title is still the previous page's (for example another application's title). The list and edit scenes set their own title.
**Fix:** Set a default in the scene (`"Candidatura · Expediente"`) and let the container override it when `vm` is present.

### IN-08: One legacy document breaks the whole list

**File:** `apps/api/src/applications/applications.mapper.ts:17,26`, `applications.repository.ts:131-135, 189-197`
**Issue:** The mapper tolerates a missing `appliedAt` (and says so), but it dereferences `doc.tags.map` and `doc.statusHistory.map` unguarded. A document without them (a hand-inserted or seeded document from a later phase) throws a `TypeError`, which turns the entire `GET /api/applications` into a 500. In the same way, the `changeStatus` pipeline does `$concatArrays` on `$statusHistory`, which yields `null` if the field is missing, and the tag summaries group documents without `tags.key` under a `null` key. The tests only cover the missing-`appliedAt` case.
**Fix:** `(doc.tags ?? [])`, `(doc.statusHistory ?? [])` in the mapper, `{ $ifNull: ["$statusHistory", []] }` in the pipeline, and a `$match: { "tags.key": { $exists: true } }` before the unwind. The seed script (later phase) must write `key` on every tag.

### IN-09: Saving a stale edit form can erase an automatic appliedAt

**File:** `apps/web/src/pods/application-edit/application-edit.container.tsx:66-74`, `apps/api/src/applications/applications.repository.ts:172`
**Issue:** PUT is a full replacement of the editable set, and `appliedAt` is part of it. If the user opens the edit form (appliedAt empty), then moves the application to "Enviada" from another tab (the server fills `appliedAt`), saving the old form sends `appliedAt: null` and wipes the value the server just set. This is single-user and needs two tabs, so it is low risk, but it is silent data loss.
**Fix:** Accept it and document it, or send an optimistic-concurrency token (`updatedAt` from the loaded summary) and answer 409 on mismatch.

---

_Reviewed: 2026-10-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
