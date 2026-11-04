---
phase: 05-documentos-en-s3
reviewed: 2026-11-04T00:00:00Z
depth: standard
files_reviewed: 70
files_reviewed_list:
  - apps/api/src/app.ts
  - apps/api/src/applications/applications.documents.test.ts
  - apps/api/src/applications/applications.repository.ts
  - apps/api/src/applications/applications.service.ts
  - apps/api/src/applications/applications.update.test.ts
  - apps/api/src/db/mongo.ts
  - apps/api/src/documents/documents.mapper.ts
  - apps/api/src/documents/documents.repository.ts
  - apps/api/src/documents/documents.routes.ts
  - apps/api/src/documents/documents.service.ts
  - apps/api/src/documents/documents.test.ts
  - apps/api/src/documents/documents.upload.test.ts
  - apps/api/src/documents/file-checks.test.ts
  - apps/api/src/documents/file-name.ts
  - apps/api/src/documents/file-type.ts
  - apps/api/src/http/object-id.ts
  - apps/api/src/main.ts
  - apps/api/src/storage/s3.ts
  - apps/api/src/storage/storage.test.ts
  - apps/api/src/test/documents.ts
  - apps/web/src/common/lib/enum-labels.ts
  - apps/web/src/common/lib/format.test.ts
  - apps/web/src/common/lib/format.ts
  - apps/web/src/core/http/http-client.ts
  - apps/web/src/core/router/router.test.tsx
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
  - apps/web/src/pods/application-detail/components/documents-section.tsx
  - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
  - apps/web/src/pods/application-edit/application-edit.component.tsx
  - apps/web/src/pods/application-edit/application-edit.container.tsx
  - apps/web/src/pods/application-edit/application-edit.mapper.ts
  - apps/web/src/pods/application-edit/application-edit.test.tsx
  - apps/web/src/pods/application-edit/application-edit.vm.ts
  - apps/web/src/pods/application-edit/components/documents-section.tsx
  - apps/web/src/pods/document-list/api/api.ts
  - apps/web/src/pods/document-list/components/document-delete-dialog.tsx
  - apps/web/src/pods/document-list/components/document-row.tsx
  - apps/web/src/pods/document-list/document-list.component.tsx
  - apps/web/src/pods/document-list/document-list.container.tsx
  - apps/web/src/pods/document-list/document-list.hooks.ts
  - apps/web/src/pods/document-list/document-list.mapper.ts
  - apps/web/src/pods/document-list/document-list.test.tsx
  - apps/web/src/pods/document-list/document-list.vm.ts
  - apps/web/src/pods/document-list/index.ts
  - apps/web/src/pods/document-upload/api/api.ts
  - apps/web/src/pods/document-upload/components/document-picker.tsx
  - apps/web/src/pods/document-upload/components/upload-dialog.tsx
  - apps/web/src/pods/document-upload/document-upload.component.tsx
  - apps/web/src/pods/document-upload/document-upload.container.tsx
  - apps/web/src/pods/document-upload/document-upload.hooks.ts
  - apps/web/src/pods/document-upload/document-upload.mapper.ts
  - apps/web/src/pods/document-upload/document-upload.test.tsx
  - apps/web/src/pods/document-upload/document-upload.vm.ts
  - apps/web/src/pods/document-upload/index.ts
  - apps/web/src/routes/documents/index.tsx
  - apps/web/src/scenes/application-edit.scene.tsx
  - apps/web/src/scenes/document-list.scene.tsx
  - apps/web/src/test/mock-fetch.ts
  - packages/contracts/src/document.schema.ts
  - packages/contracts/src/schemas.test.ts
  - scripts/compose-smoke.sh
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-11-04
**Depth:** standard
**Files Reviewed:** 70
**Status:** issues_found

## Summary

The phase is in good shape. The upload path holds up under adversarial reading:

- The body limit rejects oversized bodies before parsing (checked against Hono 4.13.13's `bodyLimit`, for both the Content-Length and the chunked path).
- The MIME type and extension come from the detected content, never from the client.
- The DOCX check reads the ZIP central directory with bounds checks and never inflates.
- The S3 key is built from a restricted slug under a server-generated id.
- `Content-Disposition` is built with an ASCII fallback plus RFC 5987, and control characters are stripped from the name first.
- Insert failure compensates by deleting the object.
- The pods respect the architecture rules (no pod imports another pod, view models are declared field by field, only DS tokens are used, no `any`).

No BLOCKER was found. The warnings concern a cross-site write path that the JSON-only guard used to close, a check-then-act race between linking and deleting a document, and one web delete flow that cannot recover from a 404.

## Warnings

### WR-01: Multipart upload accepts cross-site "simple" requests (CSRF write path)

**File:** `apps/api/src/documents/documents.routes.ts:21-34`
**Issue:** The applications router mounts `requireJson` precisely because a cross-site `text/plain` or form post is a "simple" request that needs no CORS preflight. The documents router deliberately skips it (comment on line 21) because it receives multipart. But `multipart/form-data` is also a CORS-safelisted content type, so any web page the user opens can `fetch("http://localhost:8080/api/documents", { method: "POST", mode: "no-cors", body: formData })` or submit a plain `<form enctype="multipart/form-data">`. The API then writes up to 5 MB per request into Silo and Mongo. The response is unreadable to the attacker and DELETE needs a preflight, so the impact is storage and library pollution only. It is still the exact class of hole the JSON guard exists to close, and the multipart route is now the only write endpoint without any equivalent.
**Fix:** Add an origin check on this router, for example Hono's built-in middleware, which validates `Origin` for form content types:
```ts
import { csrf } from "hono/csrf";
// ...
routes.use("*", csrf()); // same-origin only; the SPA and API share an origin in the image and via the Vite proxy in dev
```
Alternatively, require a custom header (for example `X-Requested-With`) that the web client sets in `uploadDocument`. A custom header forces a preflight that the API never grants.

### WR-02: Link validation and document deletion race (dangling link)

**File:** `apps/api/src/documents/documents.service.ts:120-134` and `apps/api/src/applications/applications.service.ts:91-121, 187-198`
**Issue:** Rule 4 is enforced as check-then-act. `remove` calls `isInUse(id)` and then `deleteById(id)`. `update` and `create` call `validateDocumentLinks` (a `findTypes` read) and then write the link. If a PUT that links document D lands between `isInUse` returning false and `deleteById` (or between `findTypes` and the application write), the document is deleted while an application points at it. That is the "record pointing to a missing thing" state the service comments say must never happen. The detail pod then shows "No hemos podido cargar este documento", and every later save of that application fails with "El documento no existe" until the user unlinks the CV or letter by hand. A single user makes the window tiny, but two tabs or a double submit can hit it.
**Fix:** Make the delete conditional and atomic against the link, or re-check after delete and roll back. For example, after `deleteById` succeeds, re-run `isInUse(id)`. If it is now true, re-insert the saved `doc` and throw the 409. Alternatively, apply the link write with a precondition (a transaction, or an `updateOne` filtered on the document still existing). At minimum, document the accepted race in the service.

### WR-03: Deleting an already-deleted document leaves a ghost row the user cannot clear

**File:** `apps/web/src/pods/document-list/document-list.container.tsx:55-69` and `apps/web/src/pods/document-list/document-list.mapper.ts:23-26`
**Issue:** When the DELETE answers 404 (the document was already removed from another tab or by the smoke script), `remove` rejects. `deleteErrorMessage` maps every non-`DOCUMENT_IN_USE` code to "No se pudo eliminar el documento. Inténtalo de nuevo.". The row stays in the list and "Inténtalo de nuevo" can never succeed, because every retry returns the same 404. The only way out is a manual reload. The same happens when a refetch response that was already in flight when the delete was confirmed lands afterwards, because the response replaces `rows` with a list that may still contain the deleted document.
**Fix:** Treat `NOT_FOUND` on delete as success for the list. In the hook's `remove`, catch `HttpError` with `code === "NOT_FOUND"`, drop the row and show the "Documento eliminado." feedback. Otherwise bump the attempt so the list refetches. Add a test for the 404 case.

## Info

### IN-01: Bidirectional-override characters survive file-name sanitizing

**File:** `apps/api/src/documents/file-name.ts:19`
**Issue:** `sanitizeFileName` strips only `\p{Cc}`. Format characters (`\p{Cf}`) such as U+202E (right-to-left override) and zero-width characters stay in `fileName`. The name is stored and returned in the API and the `filename*` parameter, so a crafted name can render with a reversed or misleading extension in file managers. The server-side extension check is not affected, because it runs on the raw suffix.
**Fix:** `raw.slice(...).replace(/[\p{Cc}\p{Cf}]/gu, "")`, and extend the test in `file-checks.test.ts`.

### IN-02: Uppercase hex ids are accepted by the path parser but rejected by link validation

**File:** `apps/api/src/documents/documents.repository.ts:79-90` and `apps/api/src/applications/applications.service.ts:105`
**Issue:** `findTypes` accepts 24-hex ids in either case and keys its map by `toHexString()` (lowercase). `validateDocumentLinks` then looks the id up by the exact string the client sent. An uppercase but otherwise valid id answers "El documento no existe", which contradicts the "either case" intent of `parseObjectId`. The failure is safe, because nothing wrong is stored.
**Fix:** Lowercase the ids in `validateDocumentLinks`, or make `findTypes` key the map by the input id. Or drop `/i` and say so in the comments.

### IN-03: Compose smoke leaves a document, an object and an application behind on failure

**File:** `scripts/compose-smoke.sh:232-284`
**Issue:** The comment promises both records are removed "before finishing (T-05-34)". Every `fail` between the upload and the final DELETE exits the script without cleanup. A failed run therefore leaves a "Smoke CV" document and, after the linking step, an application "Smoke documentos" in the demo data.
**Fix:** Register a `trap` that deletes `$doc_app_id` and then `$doc_id` when they are set (application first, because of rule 4).

### IN-04: List item mapper duplicates the document mapper field list

**File:** `apps/api/src/documents/documents.mapper.ts:19-35`
**Issue:** `mapDocumentDocToListItem` repeats all nine fields of `mapDocumentDocToApi`. A new document field has to be added in two places, and forgetting one is silent until the contract parse fails.
**Fix:** `return { ...mapDocumentDocToApi(doc), usedBy };`. This is still explicit, because the base mapper names every field.

### IN-05: Upload and pick containers duplicate the outcome and success-timer logic

**File:** `apps/web/src/pods/document-upload/document-upload.container.tsx:34-85, 90-159`
**Issue:** `GenericUpload` and `PickerUpload` carry the same `uploading`, `outcome` and `success` state, the same 5 s timer effect, and the same `onStart`, `onCancelled`, `onFailed` and `onSettled` handlers. A fix to one (for example how a cancelled upload clears) has to be copied to the other.
**Fix:** Extract a `useUploadSession()` hook in `document-upload.hooks.ts` that returns `{ uploading, liveMessage, successMessage, handlers }` and takes only the `onUploaded` side effect.

### IN-06: Filter change keeps the previous filter's rows and counter on screen

**File:** `apps/web/src/pods/document-list/document-list.hooks.ts:94-101` and `document-list.container.tsx:37-38`
**Issue:** `refreshing` is meant for the post-upload reload, but it also applies to a filter change. While the new type loads, the previous type's rows stay on screen, and the counter reports `rows.length` of those stale rows under the newly selected filter ("Carta" showing the CV rows, with their delete buttons live). The window is short.
**Fix:** Clear the rows on a type change (only keep them for a refresh-token or retry change), or compare `result.key`'s type segment with the current `type` before setting `refreshing`.

---

_Reviewed: 2026-11-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
