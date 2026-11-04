# Phase 5: Documentos en S3 - Pattern Map

**Mapped:** 2026-11-04
**Files analyzed:** 38 (new/modified)
**Analogs found:** 36 / 38

All analogs are git-tracked source under `apps/` and `packages/`. Paths below are relative to the repo root.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/contracts/src/document.schema.ts` (mod: `fileName`, list item with `usedBy`) | model | transform | same file + `packages/contracts/src/application.schema.ts` | exact |
| `apps/api/src/storage/s3.ts` (mod: `createDocumentStorage`) | service | file-I/O | same file (`createS3Client`, `ensureBucket`) | exact |
| `apps/api/src/documents/documents.routes.ts` | route | request-response + file-I/O | `apps/api/src/applications/applications.routes.ts` + `apps/api/src/offers/extract.routes.ts` | exact |
| `apps/api/src/documents/documents.service.ts` | service | CRUD + file-I/O | `apps/api/src/applications/applications.service.ts` | role-match |
| `apps/api/src/documents/documents.repository.ts` | model/repo | CRUD | `apps/api/src/applications/applications.repository.ts` | exact |
| `apps/api/src/documents/documents.mapper.ts` | utility | transform | `apps/api/src/applications/applications.mapper.ts` | exact |
| `apps/api/src/documents/file-type.ts`, `file-name.ts` | utility | transform | none (RESEARCH Pattern 2 and 4) | no analog |
| `apps/api/src/http/object-id.ts` (mod: message param) | utility | request-response | same file | exact |
| `apps/api/src/app.ts` (mod: mount `/api/documents`, `storage` dep) | config | request-response | same file lines 70-84 | exact |
| `apps/api/src/applications/applications.service.ts` (mod: link validation, `toEditableFields`) | service | CRUD | same file | exact |
| `apps/api/src/db/mongo.ts` (mod: indexes) | config | CRUD | same file | exact |
| `apps/api/src/documents/*.test.ts`, `apps/api/src/storage/storage.test.ts`, `apps/api/src/test/documents.ts` | test | request-response | `apps/api/src/tags/tags.test.ts` + `apps/api/src/test/mongo.ts` | role-match |
| `apps/api/src/applications/applications.update.test.ts` (rewrite lines 211-246) | test | CRUD | itself | exact |
| `apps/web/src/core/http/http-client.ts` (mod: FormData) | utility | request-response | same file lines 61-71 | exact |
| `apps/web/src/common/lib/format.ts` (+`formatFileSize`) | utility | transform | same file (`formatDate`) | exact |
| `apps/web/src/pods/document-list/*` (api, vm, mapper, hooks, container, component, components, index) | pod | CRUD | `apps/web/src/pods/application-list/*` | exact |
| `apps/web/src/pods/document-upload/*` | pod | request-response (upload) | `apps/web/src/pods/application-detail/components/interview-dialog.tsx` + `application-list/*` hooks | role-match |
| `apps/web/src/pods/document-list/components/document-delete-dialog.tsx` | component | request-response | `apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx` | exact |
| `apps/web/src/pods/application-edit/*` (mod: slot `renderDocumentPicker`, VM, mapper lines 137-138, documents section) | pod | CRUD | `renderCancelLink` slot in same pod | exact |
| `apps/web/src/pods/application-detail/*` (mod: documents fetch, `documents-section.tsx`) | pod | request-response | `status-history.tsx`, `application-detail.hooks.ts` | role-match |
| `apps/web/src/scenes/document-list.scene.tsx` | scene | request-response | `apps/web/src/scenes/application-list.scene.tsx` | exact |
| `apps/web/src/scenes/application-edit.scene.tsx` (mod) | scene | composition | same file lines 45-73 | exact |
| `apps/web/src/routes/documents/index.tsx` | route | request-response | `apps/web/src/routes/applications/index.tsx` | exact |
| `apps/web/src/layouts/app-layout.tsx` (mod) | component | nav | same file lines 52-64 | exact |
| `docs/DOMAIN.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md` | doc | n/a | n/a | n/a |

## Pattern Assignments

### `apps/api/src/documents/documents.routes.ts` (route, multipart request-response)

**Analogs:** `apps/api/src/offers/extract.routes.ts` (bodyLimit + ApiError), `apps/api/src/applications/applications.routes.ts` (id parse + service delegation).

**bodyLimit with onError throwing ApiError** (`extract.routes.ts` 15-27):
```typescript
routes.use(
  "*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: () => {
      throw new ApiError(400, "VALIDATION_ERROR", "La oferta es demasiado larga");
    },
  }),
);
```
For documents use `maxSize: DOCUMENT_MAX_BYTES + 64 * 1024`, code 413 `FILE_TOO_LARGE`, apply it only to `POST /`. Do NOT use `requireJson` on this router (it rejects multipart).

**Handler style** (`applications.routes.ts` 12-14, 23-29): no try/catch, no logging; ZodError and ApiError reach `app.onError`:
```typescript
export function applicationsRoutes(service: ApplicationsService): Hono {
  const routes = new Hono();
  routes.get("/:id", async (c) =>
    c.json(await service.get(parseObjectId(c.req.param("id")))),
  );
  routes.post("/", async (c) => {
    const input = applicationInputSchema.parse(await c.req.json());
    return c.json(await service.create(input), 201);
  });
```
Query validation: `documentQuerySchema.parse(queryInput(c.req.queries()))` (as in `applications.routes.ts` list handler). Full POST and download handler bodies: copy RESEARCH.md Patterns 1 and 4 (wrap `parseBody()` in try/catch -> 400; `c.body(stream, 200, headers)` for download). `DELETE` returns `c.body(null, 204)`.

### `apps/api/src/documents/documents.service.ts` (service, S3-then-Mongo with compensation)

**Analog:** `apps/api/src/applications/applications.service.ts` (factory `createXService(repository, now)` returning an object; `ApiError` for 404/409). Depends on the narrow `DocumentStorage` interface (RESEARCH Pattern 3). Compensation snippet: RESEARCH lines 342-350 (`storage.delete(s3Key).catch(() => undefined)` then rethrow). Delete order: 404 -> 409 -> `repository.deleteById` -> best-effort `storage.delete`.

### `apps/api/src/documents/documents.repository.ts` and `documents.mapper.ts`

**Analogs:** `apps/api/src/applications/applications.repository.ts` (BSON interface with `_id: ObjectId` and `Date`s; factory taking `Db`), `applications.mapper.ts` lines 4-35.

**Mapper rule to copy:** field by field, no spread:
```typescript
// Field by field on purpose: a stored field never reaches the API unless it is named here.
export function mapApplicationDocToApi(doc: ApplicationDoc): Application {
  return { id: doc._id.toHexString(), /* ... */ createdAt: doc.createdAt.toISOString() };
}
```
`applications.cvDocumentId` is a hex string, so the `usedBy` aggregation and the 409 check compare with `id.toHexString()` (RESEARCH Pattern 5 has the aggregation).

### `apps/api/src/storage/s3.ts` (mod)

**Analog:** same file. Keep `createS3Client` (lines 54-65, `maxAttempts: 1`), `ensureBucket` and `pingS3`. Add `createDocumentStorage` after them using the same import block from `@aws-sdk/client-s3` plus `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `NoSuchKey`. Error classification style to copy (lines 74-78): `err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404`. Full adapter: RESEARCH Pattern 3.

### `apps/api/src/http/object-id.ts` (mod)

Currently hardcodes `"Candidatura no encontrada"` (line 112). Add a `notFoundMessage` parameter with that default, or a sibling `parseDocumentId`, so malformed ids answer «Documento no encontrado»:
```typescript
export function parseObjectId(raw: string): ObjectId {
  if (!OBJECT_ID_PATTERN.test(raw)) {
    throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
  }
  return new ObjectId(raw);
}
```

### `apps/api/src/app.ts` (mod)

Mount inside the existing `if (deps.db)` block (lines ~70-84), additionally gated on `deps.storage` the way `deps.llm` gates offers:
```typescript
if (deps.db) {
  const service = createApplicationsService(createApplicationsRepository(deps.db), deps.now);
  app.route("/api/applications", applicationsRoutes(service));
  app.route("/api/tags", tagsRoutes(service));
}
if (deps.llm) {
  app.route("/api/offers", offersRoutes(createExtractService(deps.llm)));
}
```
Must stay before `serveStatic`. `main.ts` builds `createDocumentStorage(s3, config.S3_BUCKET)`. The applications service gains a documents lookup dependency for D-12 (`findDocumentTypes`).

### `apps/api/src/applications/applications.service.ts` (mod)

`toEditableFields` (lines 51-71) copies keys one by one; add `cvDocumentId: input.cvDocumentId, coverLetterDocumentId: input.coverLetterDocumentId` and delete the stale comment above it ("Phase 5 ... must add its fields here"). Link validation throws `ApiError(400, "VALIDATION_ERROR", "Datos no válidos", { fieldErrors: { cvDocumentId: ["El documento no es un CV"] } })`. EditableFields type in `applications.repository.ts` must also gain the two fields.

### API tests (`documents.*.test.ts`)

**Analog:** `apps/api/src/tags/tags.test.ts` lines 1-40: `createApp({ ...allUp, db: testDb.db, now: () => instant })`, `useTestDb()` in `beforeAll`, `testDb.reset()` in `beforeEach` (`apps/api/src/test/mongo.ts`, `documents` is already in `TEST_COLLECTIONS`). Use `app.request("/api/documents", { method: "POST", body: formData })` (no content-type header). Inject `fakeStorage()` from RESEARCH "Code Examples"; failing-insert test wraps the real repository.

### `apps/web/src/core/http/http-client.ts` (mod)

Current lines 66-71:
```typescript
const { method = "GET", body, signal } = options;
const init: RequestInit = { method, signal };
if (body !== undefined) {
  init.headers = { "content-type": "application/json" };
  init.body = JSON.stringify(body);
}
```
Add a branch before: `if (body instanceof FormData) { init.body = body; }` with no headers. Error mapping already exposes `HttpError.code` (FILE_TOO_LARGE, UNSUPPORTED_FILE_TYPE reach the dialog).

### `apps/web/src/pods/document-list/*` (pod, CRUD list)

**Analog:** `apps/web/src/pods/application-list/` (same file set). Excerpts:

**api/api.ts** (lines 1-31): `request(path, schema.array(), { signal })` with query built from known keys only via `URLSearchParams`.

**hooks** (`application-list.hooks.ts` 14-60): keyed-result pattern; `Result` union with `key`, derived loading, `AbortController` per effect, mapper applied in `.then`, `HttpError` -> `code`:
```typescript
const key = `${queryString}#${attempt}`;
useEffect(() => {
  const controller = new AbortController();
  getApplications(queryRef.current, controller.signal)
    .then((data) => { if (controller.signal.aborted) return;
      setResult({ key, outcome: "ok", applications: mapApplicationListFromApiToVm(data) }); })
    .catch((error: unknown) => { if (controller.signal.aborted) return;
      setResult({ key, outcome: "error", code: error instanceof HttpError ? error.code : "INTERNAL_ERROR" }); });
  return () => controller.abort();
```
Include a `refreshToken` prop in the key for D-27 (scene bumps it on `onUploaded`). **index.ts** exports only the container: `export { ApplicationListContainer } from "./application-list.container";`. VM must not extend or Omit the API model.

### `apps/web/src/pods/document-list/components/document-delete-dialog.tsx`

**Analog:** `application-detail/components/interview-delete-dialog.tsx` (whole file, 89 lines). Copy: controlled `AlertDialog` with `open={item !== null}`, `last` state to keep text while unmounting, ignore close while `deleting`, `AlertDialogAction` with `event.preventDefault()` and `{deleting ? "Eliminando…" : "Eliminar"}`, `role="status" aria-live="polite"` wrapper with `RequestStatus kind="error"`. Set the 409 message «Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.» when `code === "DOCUMENT_IN_USE"`.

### `apps/web/src/pods/document-upload/*` (pod, picker + dialog)

**Analog:** `application-detail/components/interview-dialog.tsx`.
- Imports (lines 1-36): `Dialog, DialogContent, DialogDescription, DialogTitle` from `@/common/components/ui/dialog`; `Input`, `Label`, `NativeSelect/NativeSelectOption`, `ToggleGroup/ToggleGroupItem` (`TOGGLE_ITEM_CLASS` line 44-45 for the CV/Carta toggle), `RequestStatus`.
- Close guard (lines 59-74): ignore close requests while saving; `onInteractOutside={(e) => e.preventDefault()}`; `onCloseAutoFocus` prop returns focus to the opener button ref (needed since no `DialogTrigger`).
- Form mounted inside `DialogContent` so each opening resets (lines 104-137). Its `onSubmit` must additionally call `event.stopPropagation()` (RESEARCH Pattern 7, verified): 
```typescript
onSubmit={(event) => {
  event.preventDefault();
  event.stopPropagation(); // synthetic submit crosses the portal into the application <form>
  if (form.state.isSubmitting) return;
  void form.handleSubmit();
}}
```
- Focus first invalid control (lines 118-124): `requestAnimationFrame` + `querySelector('[aria-invalid="true"]')`.
- Picker buttons inside the outer form (`Subir nuevo`, retry) must be `type="button"`.
- Upload hook: `fetch` + `AbortController` as `application-list.hooks.ts`; send `FormData` through `request()`. Client-side checks use `DOCUMENT_MAX_BYTES` from contracts. Tests: `userEvent.setup({ applyAccept: false })`.

### `apps/web/src/pods/application-edit/*` (mod: slot)

**Analog:** `renderCancelLink` slot. Scene side (`scenes/application-edit.scene.tsx` 45-73) passes render props:
```tsx
<ApplicationEditContainer
  applicationId={applicationId}
  onSaved={handleSaved}
  renderCancelLink={({ className, children }) => ( <Link ...>{children}</Link> )}
```
Add `renderDocumentPicker={({ type, selectedId, onSelected }) => <DocumentUploadContainer type={type} selectedId={selectedId} onSelected={onSelected} />}`. Type `RenderDocumentPicker` goes in `application-edit.vm.ts` next to `RenderCancelLink`. Mapper (`application-edit.mapper.ts` 135-138): replace `cvDocumentId: null, coverLetterDocumentId: null` with `values.cvDocumentId === "" ? null : values.cvDocumentId` (and the mirror `?? ""` on the way in; add `""` to `EMPTY_FORM_VALUES`); remove the "no inputs until Phase 5" comment. New section after `tracking-section.tsx`.

### `apps/web/src/pods/application-detail/*` (mod: documents section)

**Analogs:** `components/status-history.tsx` (side-column section), `application-detail.component.tsx` lines 154-155:
```tsx
<div className="min-w-0 lg:col-span-1">
  <StatusHistory history={vm.history} />
</div>
```
Add `<DocumentsSection documents={vm.documents} />` below it. Fetching per-id with `Promise.allSettled` in `application-detail.hooks.ts` using the keyed-result pattern (RESEARCH Pattern 10); one failure degrades only that row.

### `apps/web/src/scenes/document-list.scene.tsx`, `routes/documents/index.tsx`

**Analogs:** `scenes/application-list.scene.tsx` (header: eyebrow «Expediente», h1 `font-serif text-[28px] font-semibold leading-[1.2]` with `tabIndex={-1}`, `document.title` effect; see `application-edit.scene.tsx` lines 16-44) and route:
```typescript
export const Route = createFileRoute("/applications/")({
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams({ sort: "updatedAt" })] },
  component: ApplicationListScene,
});
```
Use `createFileRoute("/documents/")` with `validateSearch: documentQuerySchema` (a `core/router/` search helper like `application-search.ts` if a TanStack validator adapter is needed). The scene holds the refresh counter and passes it to the list container and `onUploaded` to the upload container (pods never import each other).

## Shared Patterns

### Error handling (API)
**Source:** `apps/api/src/errors.ts` (`ApiError(status, code, message, details?)`) and `app.onError` in `apps/api/src/app.ts`. Handlers do not catch; throw `ApiError` or let `ZodError` through. Details shape follows `z.flattenError` (`{ formErrors, fieldErrors }`). Never log file name, bytes or the full key.

### Contracts as single source
**Source:** `packages/contracts/src/document.schema.ts`. Extend `documentSchema` with `fileName: z.string().min(1).max(255)` and add a list-item schema (`documentSchema.extend({ usedBy: z.int().min(0) })` is fine in contracts; the web VM must not derive from it). Error codes already exist in `packages/contracts/src/error.schema.ts`. Rebuild contracts before the final verify.

### Web HTTP and states
**Source:** `apps/web/src/core/http/http-client.ts` (`request`, `HttpError`), `@/common/components/request-status` for error/loading messages, keyed-result hooks without React Query.

### Quality gate
Each plan ends with `<verify>` running `npm run typecheck && npm run test`. TDD: RED and GREEN in the same commit. No `any`, no new dependencies.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/api/src/documents/file-type.ts` | utility | transform | No binary signature code in repo; use RESEARCH Pattern 2 (ZIP central directory, not local-header walk) |
| `apps/api/src/documents/file-name.ts` | utility | transform | No sanitizer exists; use RESEARCH Pattern 4 (`contentDisposition`) and D-07 slug rules |
| `apps/api/src/test/documents.ts` | test helper | file-I/O | No storage fakes yet; use RESEARCH "fake storage" example. One helper file (created by 05-01, extended by 05-02) holds `fakeStorage`, the real-Silo `useTestStorage` on `tfm-assets-test`, the PDF/ZIP/DOCX byte builders and the multipart helper; the plans name it `test/documents.ts` (refreshed during plan revision; an earlier draft said `test/storage.ts`) |

## Metadata

**Analog search scope:** `apps/api/src`, `apps/web/src` (pods, scenes, routes, core, common), `packages/contracts/src`
**Files scanned:** ~25 read or listed
**Pattern extraction date:** 2026-11-04
