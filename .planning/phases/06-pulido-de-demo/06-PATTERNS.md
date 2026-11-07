# Phase 6: Pulido de demo - Pattern Map

**Mapped:** 2026-11-06
**Files analyzed:** 24 (new/modified groups)
**Analogs found:** 22 / 24 (all analogs verified as git-tracked source under `apps/`, `scripts/`, `packages/`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `apps/api/src/scripts/seed.ts` | script entry | batch | `apps/api/src/main.ts` (wiring) + `scripts/try-extract.ts` (script style) | role-match |
| `apps/api/src/scripts/seed/seed.plan.ts` | utility (pure) | transform | `apps/api/src/offers/__fixtures__/fixtures.ts` (static data + pure scoring) | partial |
| `apps/api/src/scripts/seed/seed.run.ts` | service | batch / CRUD | `apps/api/src/applications/applications.service.ts`, `documents.service.ts` (injected `now`) | role-match |
| `apps/api/src/scripts/seed/seed.plan.test.ts` | test (unit) | transform | `apps/api/src/offers/__fixtures__/fixtures.test.ts` | role-match |
| `apps/api/src/scripts/seed/seed.run.test.ts` | test (integration) | CRUD | `apps/api/src/test/mongo.ts` + `test/documents.ts` helpers (`useTestDb`, `useTestStorage`) | exact (helpers) |
| `apps/api/src/scripts/assets/*.pdf` | asset | file-I/O | `pdfBytes()` in `test/documents.ts` (magic-byte shape) | partial |
| `apps/api/package.json` (build, seed scripts) / root `package.json` | config | n/a | existing `try-extract` script entry | exact |
| `apps/api/src/offers/__fixtures__/fixtures.ts` (+ test, `try-extract.ts`) path change to `docs/demo/ofertas` | utility | file-I/O | itself (line 98 `new URL(fixture.file, import.meta.url)`) | exact |
| `apps/api/src/main.ts` (startup retry) | entry | event-driven | itself (lines 19-23) | exact |
| `apps/api/src/storage/s3.ts` (abort on `pingS3`/`ensureBucket`) | service | request-response | itself (`ensureBucket` lines 33-60) | exact |
| `apps/api/src/app.ts` (SPA fallback, 404 for missing assets) | route/middleware | request-response | itself (`app.notFound`, lines 107-114) | exact |
| `apps/api/src/applications/applications.routes.ts`, `offers/extract.routes.ts` (body limit) | route | request-response | `apps/api/src/documents/documents.routes.ts` lines 7, 27-34 (`bodyLimit`) | exact |
| `packages/contracts/src/application.schema.ts` (`.max()`) | model (schema) | transform | itself lines 36-44 | exact |
| `apps/web/src/common/components/route-not-found.tsx`, `route-error.tsx` | component | request-response | `apps/web/src/common/components/request-status.tsx` (+ UI-SPEC section 1) | role-match |
| `apps/web/src/core/router/router.ts`, `routes/__root.tsx` | config | n/a | themselves | exact |
| `apps/web/src/common/components/request-status.tsx`, `ui/dialog.tsx`, `ui/alert-dialog.tsx` (token sweep, `closeDisabled`) | component | event-driven | themselves; `document-upload/components/upload-dialog.tsx` lines 65-67 (lock) | exact |
| `application-list.component.tsx`, `application-detail.hooks.ts` (refetch, delete reset) | component/hook | request-response | themselves (see research "List refetch", "Delete-dialog reset") | exact |
| `apps/web/src/test/axe.ts` + axe tests | test util | transform | `apps/web/src/layouts/app-layout.test.tsx` (router render helper) | role-match |
| `apps/web/src/common/lib/contrast.ts` + test | utility | transform | `common/lib/format.ts` (pure helper) | partial |
| `apps/web/src/pods/*/*.mapper.test.ts` (new) | test | transform | `document-list.mapper.ts` (target); no mapper test exists | no analog |
| `apps/api/src/applications/applications.mapper.test.ts`, `documents.mapper.test.ts` (new) | test | transform | `applications.mapper.ts` (field whitelist) | no analog |
| `scripts/compose-smoke.sh` (`--cold`, trap) | script | request-response | itself (`http_get`/`http_send`/`http_upload`) | exact |
| `README.md`, `docs/demo/ofertas/*.txt`, `docs/*.md` write-backs | docs | n/a | existing README / fixtures (git mv) | n/a |
| `.gitattributes` (`*.pdf binary`) | config | n/a | existing `* text=auto eol=lf` | exact |

## Pattern Assignments

### `apps/api/src/scripts/seed.ts` (script entry, batch)

**Analog:** `apps/api/src/main.ts` for wiring; `apps/api/src/scripts/try-extract.ts` for script header/comment style.

**Wiring pattern** (`main.ts` lines 1-24):
```typescript
import { loadConfig, type Config } from "./config.js";
import { connectMongo, pingMongo } from "./db/mongo.js";
import { createDocumentStorage, createS3Client, ensureBucket } from "./storage/s3.js";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err instanceof Error ? err.message : "Invalid environment");
  process.exit(1);
}
const { client: mongoClient, db } = await connectMongo(config.MONGO_URL);
const s3 = createS3Client(config);
await ensureBucket(s3, config.S3_BUCKET);
```
Seed variant (from RESEARCH "Entry script skeleton"): `loadConfig({ ...process.env, LLM_PROVIDER: "mock" })`, `argv.includes("--reset")`, `try/finally { s3.destroy(); await client.close(); }`. Imports use `.js` suffixes (ESM). Log counts and db/bucket names only, never offer text or keys. Use `createDocumentStorage(s3, bucket)` for the storage object. `connectMongo` also runs `ensureIndexes` (needed on fresh volumes).

**Script header style** (`try-extract.ts` lines 1-3): leading `//` comment describing purpose and that it is not part of `npm run test`.

---

### `apps/api/src/scripts/seed/seed.run.ts` (service, batch/CRUD)

**Analog:** `applications.service.ts` line 84-87 and `documents.service.ts` line 43-46 (both take `now: () => Date` last).

```typescript
export function createApplicationsService(
  repository, findDocumentTypes, now: () => Date = () => new Date(),
)
export function createDocumentsService(repository, storage, now: () => Date = () => new Date())
```
Core pattern (RESEARCH Pattern 1): a mutable `clock = { set, now }`; build services with `clock.now`; `clock.set(step.at)` before each `create` / `changeStatus` / `addInterview` / `upload`; mark `seed: true` with an untyped `db.collection("applications").updateOne({_id: new ObjectId(id)}, {$set:{seed:true}})`. Walk history (guardada -> enviada -> addInterview auto-moves to en_entrevistas). Delete step: `find({seed:true})`, `storage.delete(s3Key)` each, `deleteMany({seed:true})`. `--reset`: print counts, `deleteMany({})` on both collections, `ListObjectsV2` + `DeleteObjects` for the bucket.
Do NOT add `seed` to `ApplicationDoc` or contracts.

---

### `apps/api/src/scripts/seed/seed.run.test.ts` (integration test)

**Analog:** `apps/api/src/test/mongo.ts` (`useTestDb`, db `tfm_test`, `reset()`, `close()`) and `apps/api/src/test/documents.ts` (`useTestStorage`, `TEST_BUCKET = "tfm-assets-test"`, `cleanup()`, `readStream`).
```typescript
const testDb = await useTestDb();      // refuses any db other than tfm_test
const testStorage = await useTestStorage();   // bucket tfm-assets-test
// afterEach: await testDb.reset(); afterAll: await testStorage.cleanup(); await testDb.close();
```
`fileParallelism: false` is already configured. Never point at `tfm`/`tfm-assets`. Use `readStream` to assert downloaded bytes start with `%PDF-`. Note `useTestStorage` only tracks keys written through it; `--reset` bucket wipe needs the raw S3 client list, so `runSeed` should accept `s3 + bucket` as well as `storage`.

### `seed.plan.test.ts` (unit)
**Analog:** `apps/api/src/offers/__fixtures__/fixtures.test.ts` (node env, pure assertions, no services). Assert targets are listed in RESEARCH "Pure plan test targets".

---

### `apps/api/src/scripts/assets/*.pdf` (asset)

**Analog:** `pdfBytes()` in `test/documents.ts` (header `%PDF-1.4\n`, trailer `\n%%EOF`) is the shape `detectDocument` accepts. Real readable PDF generator is in RESEARCH "Minimal readable PDF" (Latin-1, `\n` only, computed xref). Add `*.pdf binary` to `.gitattributes` (currently `* text=auto eol=lf`). Check each with `detectDocument(bytes, "x.pdf")`.

---

### `apps/api/package.json` / root `package.json` (config)

**Analog:** current scripts block:
```json
"build": "tsc -p tsconfig.build.json",
"try-extract": "tsx --conditions=@tfm/source src/scripts/try-extract.ts",
"seed": "node -e \"console.log('seed: pendiente (fase 6)')\""
```
Replace per RESEARCH "Root and API scripts": build adds `&& node -e "require('node:fs').cpSync('src/scripts/assets','dist/scripts/assets',{recursive:true})"`; `seed` = `node dist/scripts/seed.js`; `seed:dev` = `tsx --conditions=@tfm/source src/scripts/seed.ts`; root seed gets trailing `--` to forward `--reset`.

---

### `apps/api/src/offers/__fixtures__/fixtures.ts` (re-point to `docs/demo/ofertas`)

**Current** (line 1, 98): `readFileSync(new URL(fixture.file, import.meta.url), "utf8")`. Change the base to the repo-root `docs/demo/ofertas/` (`new URL("../../../../../docs/demo/ofertas/" + fixture.file, import.meta.url)`, computed from `apps/api/src/offers/__fixtures__`). `git mv` the three `.txt` files. Note `docs/` is in `.dockerignore`: nothing used by `main.ts`/`seed.ts` at runtime may read from there; optionally exclude `src/offers/__fixtures__` and `src/scripts/try-extract.ts` from `tsconfig.build.json`.

---

### `apps/api/src/main.ts` (startup retry)

**Analog:** itself, lines 19-23 (currently unbounded `await connectMongo` / `ensureBucket`). Replace with the bounded loop in RESEARCH "S3 abort and startup" (10 attempts, 2 s apart, log `err.message` only, `process.exit(1)` at the end). Keep top-level await style.

### `apps/api/src/storage/s3.ts` (abort)

**Analog:** itself `ensureBucket` (`s3.send(new HeadBucketCommand({ Bucket: bucket }))`). Add second arg `{ abortSignal: AbortSignal.timeout(ms) }` (2000 for `pingS3`, 5000 for `ensureBucket` Head/Create). Keep the existing 404/`BucketAlreadyOwnedByYou` tolerance logic (lines 36-58).

### `apps/api/src/app.ts` (SPA fallback)

**Analog:** itself, lines 107-114:
```typescript
app.notFound((c) => {
  const isApiPath = c.req.path === "/api" || c.req.path.startsWith("/api/");
  if (!isApiPath && c.req.method === "GET" && indexHtml !== undefined) {
    return c.html(indexHtml, 200);
  }
  const body: ErrorResponse = { error: { code: "NOT_FOUND", message: "Recurso no encontrado" } };
  return c.json(body, 404);
});
```
Add `&& !/\.[A-Za-z0-9]+$/.test(c.req.path)` to the fallback condition; log one warning when `webDistDir` is set but `indexHtml === undefined`. Extend the existing `app.test.ts` describe "static hosting with SPA fallback".

### Body limit (`applications.routes.ts`, `offers/extract.routes.ts`)

**Analog:** `documents.routes.ts` lines 7, 29-34:
```typescript
import { bodyLimit } from "hono/body-limit";
bodyLimit({ maxSize: UPLOAD_BODY_LIMIT_BYTES, onError: () => { throw tooLarge(); } }),
```
Apply as `routes.use("*", bodyLimit({ maxSize: 256 * 1024, onError: () => { throw new ApiError(413, "VALIDATION_ERROR", "Solicitud demasiado grande"); } }))` placed next to `routes.use("*", requireJson)` (applications.routes.ts line 17). `ApiError` from `../errors.js`. Per-router only, never global `/api/*`.

### `packages/contracts/src/application.schema.ts`
Lines 36-44 hold `sourceUrl`, `cvDocumentId: z.string().min(1).nullable().default(null)`. Add `.max(2048)` to `sourceUrl` and `.max(64)` to both document ids; keep them strings.

---

### Web: `route-not-found.tsx`, `route-error.tsx`, router wiring

**Analog (markup/tokens):** `common/components/request-status.tsx` (lucide icon `aria-hidden strokeWidth={1.5}`, token classes only, `Button` from `@/common/components/ui/button`). Copy and layout are exact in `06-UI-SPEC.md` section 1; error screens render fixed copy, never `error.message`.

**Router wiring** (`core/router/router.ts` line 5, `routes/__root.tsx`):
```typescript
return createRouter({ routeTree, history, parseSearch, stringifySearch });
export const Route = createRootRoute({ component: AppLayout });
```
Add `defaultNotFoundComponent: RouteNotFound, defaultErrorComponent: RouteError` to `createRouter`, and `errorComponent: RootError` to `createRootRoute`. Components live in `common/components/` (pods must not import pods).

### Web: token sweep and dialog lock
`request-status.tsx` lines 27-45 currently `mt-0.5 ... text-destructive` (error icon already `text-destructive` here; check loading/success branches and `file:mr-3` in upload input). Pitfall 10: update `common-components.test.tsx` (line 180, 217-219) and `app-layout.test.tsx` (lines 53, 58) in the same commit. Dialog lock: `upload-dialog.tsx` lines 65-67 already swallows close during upload; add `closeDisabled` prop to `ui/dialog.tsx` / `ui/alert-dialog.tsx` and write the sentence into the existing `role="status" aria-live="polite"` line.

### Web: axe helper (`src/test/axe.ts`)
**Analog for render harness** (`layouts/app-layout.test.tsx` lines 1-16):
```typescript
const router = createAppRouter(createMemoryHistory({ initialEntries: ["/applications"] }));
render(<RouterProvider router={router} />);
await screen.findByRole("heading", { level: 1, name: "Mis candidaturas" });
```
Helper body is in RESEARCH "axe helper" (set `document.documentElement.lang = "es"`, disable `color-contrast`). Contrast helper: parse `apps/web/src/styles.css` per RESEARCH "Contrast helper"; put in `common/lib/contrast.ts`, alongside `format.ts`.

### Web and API mapper tests (new)
No existing mapper test to copy. Targets for direct tests: `document-list.mapper.ts` (`usageLabel`, `countLabel`, `deleteErrorMessage`, `mapDocumentFromApiToVm`), `document-upload.mapper`, `application-detail.mapper` (`mapInterviewFromApiToVm`, `nextInterviewRound`, `newInterviewFormValues`). API: `mapApplicationDocToApi` is a field-by-field whitelist (comment on line 4), so test that an extra stored `seed: true` is not mapped. Co-locate as `<name>.mapper.test.ts`.

### `scripts/compose-smoke.sh` (`--cold`, cleanup trap)
**Analog:** itself. Arg parsing (lines 14-24) `case "$arg" in --down) ...; --with-model) ...; *) usage exit 2`. Add `--cold`. Reuse `http_get`/`http_send`/`http_upload` (file-polling idiom, output written to `/tmp/smoke.out` inside the container, lines 38-100) and `fail()`. For WR-02, add `trap cleanup_app EXIT` right after `app_id=` (line 181) and `doc_app_id=` (line 258). Cold mode must use `docker compose -p expediente-cold` and `LLM_PROVIDER=mock`, never `down -v` on the default project (Ollama volume).

## Shared Patterns

### ESM imports with `.js` suffix and `@tfm/contracts`
**Apply to:** all API files (`import { x } from "./y.js"`; contracts via `@tfm/contracts`). Web uses `@/` alias.

### Error responses
**Source:** `app.ts` `ErrorResponse` shape `{ error: { code, message } }`; `ApiError` in `apps/api/src/errors.ts`. Codes limited to the contracts enum (VALIDATION_ERROR reused for 413).

### Logging
**Apply to:** seed, startup retry, SPA warning. Log `err.message` only; never offer text, file names, keys, or Mongo URL.

### Test DB isolation
**Source:** `apps/api/src/test/mongo.ts` (`tfm_test`), `test/documents.ts` (`tfm-assets-test`). Every integration test uses these helpers.

### Field whitelist mappers
**Source:** `applications.mapper.ts` (and `documents.mapper.ts`). Storage-only fields like `seed` stay out of API output by construction.

### DS tokens and voice
**Source:** `request-status.tsx` plus `docs/design/expediente.css`: token classes only (`text-destructive`, `bg-primary`), Spanish copy, tuteo, no emojis.

### Every plan `<verify>`
`npm run typecheck && npm run test` plus task-specific commands (CLAUDE.md).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/pods/*/*.mapper.test.ts` | test | transform | No dedicated mapper tests exist; mappers are covered only through component tests |
| `apps/api/src/applications/applications.mapper.test.ts`, `documents.mapper.test.ts` | test | transform | Same; covered through route tests only |
| `apps/web/src/common/lib/contrast.ts` | utility | transform | No colour utility exists; use RESEARCH recipe |
| Forks-worker retry wrapper for `@tfm/web` `test` script (Open Question Q4a) | script | batch | No Node wrapper scripts exist in repo; follow RESEARCH Q4 |

## Metadata

**Analog search scope:** `apps/api/src`, `apps/web/src`, `packages/contracts/src`, `scripts/`
**Files scanned:** about 30 read or grepped
**Pattern extraction date:** 2026-11-06
**Tracked-source check:** all analog paths come from `git ls-files` output (none from `.gsd/capabilities` mirrors).
