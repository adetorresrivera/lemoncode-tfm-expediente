# Phase 2: Candidaturas - Pattern Map

**Mapped:** 2026-10-30
**Files analyzed:** ~40 (new/modified)
**Analogs found:** partial. Phase 1 only shipped a health endpoint, the list pod skeleton and the http client. There is no repository/service/Mongo-query analog, no form, and no TanStack Router search-param analog. Those fall back to RESEARCH.md.

All paths are git-tracked (verified with `git ls-files`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `apps/api/src/applications/applications.routes.ts` | route | request-response | `apps/api/src/app.ts` (`/api/health`, lines 52-60) | role-partial |
| `apps/api/src/applications/applications.service.ts` | service | CRUD | `apps/api/src/errors.ts` (ApiError usage) | no real analog |
| `apps/api/src/applications/applications.repository.ts` | repository | CRUD | `apps/api/src/db/mongo.ts` | partial |
| `apps/api/src/applications/applications.mapper.ts` | mapper | transform | none in api (web mapper: `application-list.mapper.ts`) | partial |
| `apps/api/src/tags/tags.routes.ts` | route | request-response | `apps/api/src/app.ts` | role-partial |
| `apps/api/src/app.ts` (modify: AppDeps, mount routes) | config | request-response | itself | exact |
| `apps/api/src/main.ts` (modify: pass db) | config | - | itself | exact |
| `apps/api/src/applications/*.test.ts` | test | CRUD | `apps/api/src/app.test.ts` | role-match |
| `packages/contracts/src/tag.schema.ts` (add `normalizeTags`) | utility | transform | itself (`MAX_TAGS`, `tagSchema`) | exact |
| `apps/web/src/pods/application-list/**` (rewrite) | pod | request-response | itself (Phase 1 skeleton) | exact |
| `apps/web/src/pods/application-detail/**` | pod | request-response | `pods/application-list/` | exact |
| `apps/web/src/pods/application-edit/**` | pod | CRUD (form) | `pods/application-list/` + RESEARCH (TanStack Form) | role-match |
| `apps/web/src/scenes/application-{list,detail,edit}.scene.tsx` | scene | - | `scenes/application-list.scene.tsx` | exact |
| `apps/web/src/routes/applications/{index,new,$applicationId/index,$applicationId/edit}.tsx` | route | - | `routes/applications/index.tsx` | exact |
| `apps/web/src/common/components/{status-badge,tag-chip,request-status}.tsx` | component | - | `pods/application-list/components/empty-state.tsx`, `common/components/theme-toggle.tsx` | role-match |
| `apps/web/src/common/components/ui/*` (new shadcn: select, input, dialog, ...) | component | - | `common/components/ui/button.tsx` | exact |
| Pod `api/api.ts` files | service | request-response | `pods/application-list/api/api.ts` | exact |
| Pod tests | test | - | `pods/application-list/application-list.test.tsx` | exact |

## Pattern Assignments

### API routes (`applications.routes.ts`, `tags.routes.ts`)

**Analog:** `apps/api/src/app.ts`. Use `new Hono()` and return `c.json(body, status)`. A factory such as `applicationsRoutes(service): Hono` is mounted via `app.route("/api/applications", ...)` inside `createApp`. Deps are injected through `AppDeps` (lines 11-16).

```ts
export type AppDeps = { pingMongo: () => Promise<boolean>; ...; webDistDir?: string };
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  app.use("*", secureHeaders({ strictTransportSecurity: false }));
  app.get("/api/health", async (c) => { ...; return c.json(body, 200); });
  if (deps.webDistDir) app.use("*", serveStatic({ root: deps.webDistDir })); // line 64
```

Mount the new routes BEFORE `serveStatic` and `notFound` (lines 64+).

Add to `AppDeps` something like `applications: ApplicationsService`. Existing `app.test.ts` has an `allUp` deps object (lines 12-16), which must be extended to keep compiling.

**Validation and errors (copy as is, do not re-implement).** Throwing a `z.ZodError` (via `schema.parse(await c.req.json())`) is mapped to 400 `VALIDATION_ERROR` by `app.onError` (lines 94-103). A malformed JSON `SyntaxError` is mapped to 400. `ApiError` is mapped by code and status (lines 83-92).

```ts
throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
```

`ApiError(status, code, message, details?)` is in `apps/api/src/errors.ts` lines 4-21. Check the valid `ErrorCode` values in `packages/contracts/src/error.schema.ts`.

For the query string: `applicationQuerySchema.parse(...)`. The repeated key arrives via `c.req.queries()`; the `multi` preprocess (application.schema.ts lines 83-86) accepts a scalar or an array. Build an object where multi-valued keys keep arrays, otherwise `c.req.query()` loses repeats.

Rules: never log bodies or `offerText`; the handler logs only `err.message` (lines 80-81). DELETE returns `c.body(null, 204)`.

### `applications.repository.ts` / `applications.mapper.ts` (api)

**Analog:** `apps/api/src/db/mongo.ts`. The index set (lines 12-24) already exists: `status`, `updatedAt`, `tags.label`, and a text index (unused per D-03). `connectMongo` returns `{ client, db }`; the repo takes `Db` and uses `db.collection("applications")`. `main.ts` (lines 17-18) is where `db` is available to build the repo and service and pass them into `createApp`.

No existing analog for a document-to-contract mapper. Use the contracts types: `Application` and `ApplicationInput` (application.schema.ts lines 94-98). Map `_id.toHexString()` to `id` and `Date` to `.toISOString()`. Parse the output with `applicationSchema` in tests to guard shape. Dates in the contract are `z.iso.datetime()` strings.

### `applications.service.ts`

No analog. Use D-06 to D-09 and RESEARCH.md. Throw `ApiError` for 404. `normalizeTags` is the pure function to add to contracts and import from `@tfm/contracts` (D-09).

### `packages/contracts/src/tag.schema.ts` (add `normalizeTags`)

**Analog:** the file itself. Reuse `MAX_TAGS` and `Tag`.

```ts
export const MAX_TAGS = 20;
export const tagSchema = z.object({ label: z.string().trim().min(1).max(40), group: tagGroupSchema });
```

Export is automatic via `index.ts` (`export * from "./tag.schema.js"`). Tests live beside the schema, like `schemas.test.ts`. The contracts package builds before the api and web, so run it before consumers.

### API tests (D-11, real Mongo `tfm_test`)

**Analog:** `apps/api/src/app.test.ts`. Pattern for HTTP-level tests:

```ts
const res = await createApp(allUp).request("/api/health");
expect(res.status).toBe(200);
const body = errorResponseSchema.parse(await bodyOf(res));
beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => undefined); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
```

`vitest.config.ts` includes `src/**/*.test.ts` in the node environment and sets the `@tfm/source` condition. New tests under `src/applications/` are picked up. Use `MongoClient` with a `tfm_test` DB from `MONGO_URL` and clean the collection in `beforeEach`.

### Web pods (`application-list`, `application-detail`, `application-edit`)

**Analog:** `apps/web/src/pods/application-list/` (the whole folder). Copy the file layout: `api/api.ts`, `<pod>.vm.ts`, `<pod>.mapper.ts`, `<pod>.hooks.ts`, `<pod>.container.tsx`, `<pod>.component.tsx`, `components/`, `index.ts`, and a co-located `<pod>.test.tsx`. Note that `application-detail/index.ts` and `application-edit/index.ts` currently exist as empty stubs (check content before overwriting).

**api.ts** (lines 1-5). Extend with POST, PUT, PATCH and DELETE via `request(path, schema, { method, body, signal })`:

```ts
import { applicationSchema, type Application } from "@tfm/contracts";
import { request } from "@/core/http/http-client";
export const getApplications = (signal?: AbortSignal): Promise<Application[]> =>
  request("/api/applications", applicationSchema.array(), { signal });
```

DELETE returns 204: `request` skips JSON for 204 and then runs `schema.safeParse(undefined)`, so pass `z.undefined()` as the schema. Errors surface as `HttpError` (`core/http/http-client.ts` lines 6-23) with `.code`, `.status`, and `NETWORK_ERROR` for connectivity failures. `AbortError` is rethrown (lines 34-38), so hooks must ignore it.

**vm.ts:** independent interface, no `extends` or `Omit` (existing `ApplicationListItem`, `application-list.vm.ts` lines 1-6, uses plain `string` fields).

**mapper.ts** (lines 4-15). Pure functions named `mapXFromApiToVm`; the edit pod adds `mapXFromVmToApi` (strings to `null`).

```ts
export const mapApplicationFromApiToVm = (application: Application): ApplicationListItem => ({
  id: application.id, title: application.title, ...
});
export const mapApplicationListFromApiToVm = (applications: Application[]) => applications.map(mapApplicationFromApiToVm);
```

**hooks.ts:** the Phase 1 hook (`application-list.hooks.ts`) is a stub whose comment says the real fetch with AbortController goes here. The mapper is applied in the hook after receiving data. Return `{ data, status/error, retry }`.

**container.tsx** (lines 1-8): calls the hook and passes props to the component. **component.tsx** (lines 1-26): props only. Container = data and state, component = presentation. `index.ts` exports only the container.

**Component styling** (empty state and list item). Use DS tokens only:

```tsx
<ul aria-label="Candidaturas" className="flex flex-col gap-3">
  <li className="rounded-md border border-border bg-card p-4">
    <p className="font-serif text-lg">{application.title}</p>
    <p className="text-muted-foreground">{application.company}</p>
```

The Phase 1 `EmptyState` text must be kept (the Phase 1 test asserts it). If its copy changes, update `application-list.test.tsx`.

**Pod tests** (`application-list.test.tsx`). Build fixtures with `applicationSchema.parse({...})` (lines 14-24) and use `render` and `screen` from Testing Library. Use `toStrictEqual` on mappers. For fetch, copy `stubFetch` and the `json()` helper from `core/http/http-client.test.ts` lines 5-17, with `vi.unstubAllGlobals()` in `afterEach`.

**Pod isolation:** pods never import other pods. Shared pieces (`status-badge`, `tag-chip`, `request-status`) go in `common/components/`.

### Scenes (`scenes/application-*.scene.tsx`)

**Analog:** `scenes/application-list.scene.tsx` lines 1-15. Header block with eyebrow `text-[11px] uppercase tracking-[0.08em] text-muted-foreground`, `h1 font-serif text-3xl`, then the Container. Scenes decide navigation (use `useNavigate` and `Route` hooks in the scene and pass callbacks like `onSaved` to the container).

### Routes

**Analog:** `routes/applications/index.tsx` (lines 1-6):

```tsx
export const Route = createFileRoute("/applications/")({ component: ApplicationListScene });
```

For D-13 add `validateSearch: applicationQuerySchema` (no analog yet; see RESEARCH.md; Zod 4 schema with `.default` and `preprocess` can need an adapter). New files: `new.tsx`, `$applicationId/index.tsx`, `$applicationId/edit.tsx`. `routeTree.gen.ts` is tracked and regenerated by the Vite plugin; commit the regenerated file. Root is `routes/__root.tsx` (`createRootRoute({ component: AppLayout })`).

### Common components and shadcn

**Analog:** `common/components/theme-toggle.tsx` for imports from `@/common/components/ui/...` and lucide-react icons, with a named function export. Existing `ui/` has button, separator, sheet, toggle, toggle-group only. New shadcn primitives (input, select, dialog or alert-dialog, skeleton, etc.) are added via the shadcn CLI per `apps/web/components.json`; any Radix dependency has to be justified in the SUMMARY (CLAUDE.md). `cn` helper: `common/lib/utils.ts`. Dates and money: `formatDate(iso)` and `formatMoney(amount, currency)` from `@/common/lib/format` (`format.ts` lines 1-24), which are mapper-side formatters.

## Shared Patterns

### Error contract
**Source:** `apps/api/src/app.ts` lines 78-135 (single `onError`) and `apps/web/src/core/http/http-client.ts` lines 81-88. Server emits `{ error: { code, message, details? } }`. Client turns it into `HttpError`. Never add per-route try/catch that reshapes errors; throw `ApiError` or let Zod throw.

### Contracts as single source
Import `Application`, `ApplicationInput`, `ApplicationQuery`, `StatusChange`, `TagSummary`, plus the schemas, from `@tfm/contracts`. Never redefine them. `applicationInputSchema` is a refined schema, so do not call `.pick` or `.partial` on it. Use `applicationFieldsSchema` for derived schemas (comment at application.schema.ts line 15).

### Test infrastructure
- API: Vitest node, `*.test.ts`; use `app.request()` rather than a live server.
- Web: `src/test/setup.ts` (jest-dom), `*.test.tsx` beside the code, `@/` alias.
- Quiet logs in API tests via the `console.error` spy.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `applications.service.ts` | service | No service layer exists. Use D-06 to D-09 and RESEARCH. |
| `applications.repository.ts` queries (`$all`, regex, null-last sort) | repository | Only index creation exists. Use RESEARCH and D-03/D-04. |
| `application-edit` form (TanStack Form) | component | No form in the codebase yet. Use RESEARCH. |
| `validateSearch` and navigate with search params | route | No analog. Use RESEARCH. |
| Optimistic status update with rollback | hook | No mutation hooks yet. |

## Metadata

**Analog search scope:** `apps/api/src`, `apps/web/src`, `packages/contracts/src`.
**Files scanned:** ~45 tracked source files, of which 20 read in detail.
**Pattern extraction date:** 2026-10-30
