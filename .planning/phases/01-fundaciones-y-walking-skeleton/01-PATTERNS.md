# Phase 1: Fundaciones y walking skeleton - Pattern Map

**Mapped:** 2026-10-28
**Files analyzed:** 60 (grouped into 34 rows below)
**Analogs found:** 8 in-repo (docs/config) + 26 RESEARCH.md code examples / 34 groups

Greenfield: no application code exists. Analog sources are (a) real in-repo files (`docs/*`, `.devcontainer/*`, `CLAUDE.md`) and (b) RESEARCH.md code blocks, which were copied from a working, executed prototype. `R:NNN` below means `01-RESEARCH.md` line NNN. All in-repo analogs are tracked (docs/, .devcontainer/). Nothing under `.claude/`, `.planning/`, `gsd/` was used as a code analog.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` (root), `.npmrc` | config | batch | R:400-425, R:173 | research-example |
| `tsconfig.base.json`, per-workspace `tsconfig*.json` | config | n/a | R:264-278 | research-example |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.husky/*` | config | batch | R:427-450, R:319-320 | research-example |
| `.gitignore`, `.gitattributes`, `.dockerignore` | config | n/a | R:450, R:658, Pitfall 14 (R:390) | research-example |
| `.env.example` | config | n/a | `docs/ARCHITECTURE.md:134-148` + R:719-741 | exact (docs) |
| `packages/contracts/package.json` | config | n/a | R:252-261 | research-example |
| `packages/contracts/src/enums.ts` | model | transform | `docs/DOMAIN.md:16-27` (quoted R:454-465) | exact (docs) |
| `packages/contracts/src/{tag,interview,application,document,offer-extraction}.schema.ts` | model | transform | `docs/ARCHITECTURE.md:32-44`, `docs/AI-EXTRACTION.md:15-29`, R:468-494 | role-match |
| `packages/contracts/src/error.schema.ts` (+ `healthSchema`) | model | request-response | R:495-497, `docs/ARCHITECTURE.md:93` | research-example |
| `packages/contracts/src/index.ts` + `*.test.ts` | utility / test | transform | R:499 (test pattern), R:262 (.js ext rule) | research-example |
| `apps/api/package.json`, `tsconfig*.json`, `vitest.config.ts` | config | n/a | R:425, R:249, R:272-273 | research-example |
| `apps/api/src/config.ts` + `config.test.ts` | config | transform | R:502-531 | research-example |
| `apps/api/src/errors.ts` (`ApiError`) | utility | request-response | R:288-291 (mapping) | research-example |
| `apps/api/src/app.ts` + `app.test.ts` | controller/route | request-response | R:281-296, R:562-563 | research-example |
| `apps/api/src/main.ts` | config (bootstrap) | event-driven | R:562-563 | research-example |
| `apps/api/src/db/mongo.ts` | service | CRUD | R:534-548, `docs/ARCHITECTURE.md:71` | research-example |
| `apps/api/src/storage/s3.ts` | service | file-I/O | R:549-559, `docs/ARCHITECTURE.md:53` | research-example |
| `apps/api/src/llm/{llm.client,mock.provider,ollama.provider,openai.provider}.ts` + tests | service | request-response | `docs/AI-EXTRACTION.md:34-38`, R:284, R:564 | role-match |
| `apps/api/src/scripts/seed.ts` (stub via script) | utility | batch | R:425 (stub seed script) | research-example |
| `apps/web/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `components.json`, `index.html` | config | n/a | R:275-277, R:566-578, R:306, R:585-594 | research-example |
| `apps/web/src/styles.css` | config (DS tokens) | n/a | `docs/design/expediente.css` (byte copy) | exact |
| `apps/web/src/test/setup.ts` | test | n/a | R:579-584 | research-example |
| `apps/web/src/main.tsx`, `app.tsx` | provider | request-response | R:595, R:302 | research-example |
| `apps/web/src/core/router/router.ts`, `routes/{__root,index}.tsx`, `routes/applications/index.tsx`, `routeTree.gen.ts` | route | request-response | R:298-302; `docs/ARCHITECTURE.md:120-128` | role-match |
| `apps/web/src/core/http/http-client.ts` + test | utility | request-response | R:615-616 | research-example |
| `apps/web/src/core/theme/theme.ts` + test | store | event-driven | R:310-313, R:587-593 | research-example |
| `apps/web/src/common/lib/{utils,format}.ts` + `format.test.ts` | utility | transform | R:307, R:600-613 | research-example |
| `apps/web/src/common/components/ui/*` (shadcn: button, sheet, toggle-group, toggle, separator, dropdown-menu?) | component | n/a | shadcn CLI output (Pitfall 4, R:360-361) | generated |
| `apps/web/src/layouts/app-layout.tsx` + test, `ThemeToggle` | component | request-response | `docs/DESIGN.md:27-29`, R:597-598 | role-match |
| `apps/web/src/scenes/application-list.scene.tsx` | component (scene) | request-response | `docs/ARCHITECTURE.md:111`, `CLAUDE.md` pod rules | role-match |
| `apps/web/src/pods/*/index.ts` (empty pods) | component (pod stub) | n/a | `CLAUDE.md` pod structure; `docs/ARCHITECTURE.md:115-119` | role-match |
| `Dockerfile` | config | batch | R:619-657 | research-example |
| `compose.yml` | config | event-driven | `.devcontainer/docker-compose.yml` + R:659-716 | exact (service names) |
| `README.md` | doc | n/a | R:381-382 (smoke command) | none |

## Pattern Assignments

### `package.json` (root) and `.npmrc` (config)

**Source:** R:400-425 (copy verbatim, exact pins). `.npmrc` is `legacy-peer-deps=true` and must exist BEFORE first `npm install` (R:173, Pitfall 1 at R:349-352). Copy `.npmrc` in every Dockerfile stage that runs `npm ci`.
```json
"workspaces": ["packages/*", "apps/*"],
"scripts": {
  "prepare": "husky",
  "dev": "concurrently -k -n api,web -c blue,green \"npm run dev -w @tfm/api\" \"npm run dev -w @tfm/web\"",
  "build": "npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run build -w @tfm/web",
  "test": "npm run test --workspaces --if-present",
  "lint": "eslint .",
  "typecheck": "npm run typecheck --workspaces --if-present",
  "seed": "npm run seed -w @tfm/api --if-present"
}
```
Pin `typescript@6.0.3` (not 7), `@types/node@22.20.5`. Exact versions in R:119-161.

### `tsconfig.base.json` and workspace tsconfigs (config)

**Source:** R:264-278. Key rules: `types` always explicit (TS 6 default `[]`), never `baseUrl`, `customConditions: ["@tfm/source"]` in every workspace tsconfig, NodeNext in contracts/api (relative imports need `.js`), Bundler/ESNext in web with `paths: {"@/*": ["./src/*"]}`.

### `eslint.config.js`, Prettier, lint-staged, Husky (config)

**Source:** R:427-450 (ESLint flat config, copy verbatim; globalIgnores MUST include `.claude/** .planning/** gsd/** .devcontainer/** docs/**` per Pitfall 9, R:375-376). Hooks: R:319-320 (`.husky/pre-commit` = `npx lint-staged`, `.husky/pre-push` = `npm run typecheck`; LF endings). `.lintstagedrc.json`:
```json
{ "*.{ts,tsx,js,mjs,cjs}": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{json,css,html,yml,yaml}": ["prettier --write"] }
```

### `.env.example` (config)

**Analog:** `docs/ARCHITECTURE.md:134-148` (variable table) and R:719-741 skeleton. Must include every key of `envSchema` incl. `NODE_ENV` and (commented) `WEB_DIST_DIR`. Dev values must match `.devcontainer/devcontainer.json` `remoteEnv` (lines 15-30): `PORT=3000`, `MONGO_URL=mongodb://mongo:27017/tfm`, `S3_ENDPOINT=http://s3:9000`, `S3_REGION=us-east-1`, `S3_BUCKET=tfm-assets`, `S3_ACCESS_KEY/S3_SECRET_KEY=minioadmin`, `S3_FORCE_PATH_STYLE=true`, `LLM_PROVIDER=ollama`, `LLM_BASE_URL=http://ollama:11434`, `LLM_MODEL=gemma4:e2b`, `LLM_TIMEOUT_MS=90000`. A unit test diffs `Object.keys(envSchema.shape)` against the file (R:824).

### `packages/contracts/*` (model, transform)

**Package manifest:** R:252-261 (`@tfm/source` export condition; `build: tsc -p tsconfig.build.json`; dep `zod: 4.6.7`).

**Enums (`enums.ts`):** values quoted from `docs/DOMAIN.md:16-27` (R:454-465). Export both zod schema and inferred type, e.g. `applicationStatusSchema`, `workModeSchema`, `senioritySchema` (names used in R:470-494). Do NOT redeclare enums elsewhere (verify: `! grep -rnE "z\.enum\(\[" apps`).

**File list (exact):** `docs/ARCHITECTURE.md:34-43`: `enums.ts tag.schema.ts interview.schema.ts application.schema.ts document.schema.ts offer-extraction.schema.ts error.schema.ts index.ts`. `applicationQuerySchema` and `statusChangeSchema` live in `application.schema.ts`. `offerExtractionSchema` fields from `docs/AI-EXTRACTION.md:15-29`.

**Core pattern, application.schema.ts (R:468-494):**
```ts
export const applicationFieldsSchema = z.object({ /* plain fields, .nullable().default(null) */ });
const salaryOrder = (v: { salaryMin: number | null; salaryMax: number | null }) =>
  v.salaryMin === null || v.salaryMax === null || v.salaryMin <= v.salaryMax;
export const applicationInputSchema = applicationFieldsSchema
  .extend({ status: applicationStatusSchema.default("guardada") })
  .refine(salaryOrder, { path: ["salaryMax"], error: "salaryMax debe ser >= salaryMin" }); // refine LAST
const multi = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]), z.array(item).optional());
```
Rule (Pitfall 8, R:372-373): derive pick/omit/partial from the un-refined field object; refine last. Use `z.iso.datetime()`.

**Error/health (`error.schema.ts`, R:495-497):** export `errorResponseSchema` (NOT `ApiError`, which is the API class), `errorCodeSchema` with codes from `docs/ARCHITECTURE.md:93`, and `healthSchema`.

**Internal imports:** `export * from "./enums.js"` (explicit `.js`, R:262).

**Tests:** `*.test.ts` next to schemas, pattern R:499 (`safeParse`, `error.issues[0].path`, defaults, single vs repeated query values, `details` optional).

### `apps/api/src/config.ts` (config, transform)

**Analog:** R:502-531, copy verbatim. Essentials: `export const envSchema`, `loadConfig(env = process.env)`, drop `undefined`/`""` before parse (Pitfall 6), error message lists variable names only, `superRefine` requiring `LLM_BASE_URL`/`LLM_MODEL` unless mock and `LLM_API_KEY` for openai. Test with plain objects (R:295, R:819).

### `apps/api/src/app.ts` (route, request-response)

**Analog:** R:281-296 and R:562-563 (prototype final; Pattern 3/4/5 describe it).
- Factory `createApp(deps: { pingMongo, pingS3, pingLlm, webDistDir })` so tests use `app.request("/api/health")` with fakes (R:295).
- `probe(fn, 2500)` = `Promise.race` + timer; `Promise.all` of three probes; always 200; shape `healthSchema` (R:284-285).
- One `app.onError`, one TOP-LEVEL `app.notFound` (sub-app notFound is ignored, R:289). Mapping order (R:290): `ApiError` -> code/status; `ZodError` -> 400 `VALIDATION_ERROR` with `z.flattenError(err)` as details; `SyntaxError` -> 400; `HTTPException` -> mapped; else 500 `INTERNAL_ERROR` generic message "Error interno", log `err.message` only, never body/stack.
- Static: `app.use("*", serveStatic({ root: absoluteDist }))`; `notFound` returns `index.html` for non-`/api` GET, JSON 404 for `/api/*` (R:291). Add `secureHeaders({ strictTransportSecurity: false })` (R:292). No CORS middleware (R:873).
- Error response shape must satisfy `errorResponseSchema` from `@tfm/contracts` (CLAUDE.md).

### `apps/api/src/main.ts` (bootstrap, event-driven)

**Analog:** R:563. Order: `loadConfig()` -> `connectMongo` -> `createS3Client` + `ensureBucket` -> `createLlmClient(config)` -> `createApp({...})` -> `serve({ fetch: app.fetch, port })`; SIGINT/SIGTERM close server and Mongo client. `webDistDir = config.WEB_DIST_DIR ?? (NODE_ENV === "production" ? resolve(here, "../../web/dist") : undefined)`. File roles per `docs/ARCHITECTURE.md:49`.

### `apps/api/src/db/mongo.ts` (service, CRUD)

**Analog:** R:534-548. Indexes from `docs/ARCHITECTURE.md:71`: `{status:1}`, `{updatedAt:-1}`, `{"tags.label":1}`, text `{title, company}`; every index with explicit `name`. Decide `default_language` now (Open Question 5, R:780: recommended `"none"`). `pingMongo(db)` returns boolean via `db.command({ ping: 1 })`. Client options `serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000`.

### `apps/api/src/storage/s3.ts` (service, file-I/O)

**Analog:** R:549-559. `S3Client` with `forcePathStyle`, `maxAttempts: 1`; `ensureBucket` = HeadBucket then CreateBucket tolerating `BucketAlreadyOwnedByYou|BucketAlreadyExists` (race with `s3-init`). Health probe = `HeadBucketCommand`, bounded by `probe()` since SDK `requestTimeout` only warns (R:283). put/get/delete are Phase 4; do not add now.

### `apps/api/src/llm/*` (service, request-response)

**Analog:** interface from `docs/AI-EXTRACTION.md:34-38` (`extractStructured<T>(system, input, schema): Promise<T>`, `ping(): Promise<boolean>`) and R:564. Files per `docs/ARCHITECTURE.md:54-58`. Phase 1: `mock` complete (fixed schema-valid `OfferExtraction` after 300 ms, `ping` true); `ollama` ping = `GET {base}/api/version`, `openai` ping = `GET {base}/models` with Bearer, both `AbortSignal.timeout(2000)`; their `extractStructured` throws `ApiError(502, "LLM_ERROR", "not implemented")` (R:284, R:564). Tests with stubbed `fetch`.

### `apps/api` package/vitest config (config)

**Analog:** R:425 (scripts: `dev: tsx watch --conditions=@tfm/source src/main.ts`, `build: tsc -p tsconfig.build.json`, `start`, `typecheck`, `test`, stub `seed`). Vitest must set `ssr: { resolve: { conditions: ["@tfm/source"], externalConditions: ["@tfm/source"] } }` (R:249; plain `resolve.conditions` fails). Fallback: `resolve.alias["@tfm/contracts"]`.

### `apps/web/vite.config.ts` / `vitest.config.ts` / `test/setup.ts` (config)

**Analog:** R:566-584, copy verbatim. Plugin order `tanstackRouter -> react -> tailwindcss`; `resolve.tsconfigPaths: true` (no `vite-tsconfig-paths`); proxy `/api` -> `http://localhost:3000`. Setup stubs `matchMedia` and `scrollTo` (Pitfall 13).

### `apps/web/src/styles.css` (config)

**Analog:** `docs/design/expediente.css` (header comment at line 1 states it is `apps/web/src/styles.css`). Copy byte-for-byte; do NOT run `shadcn init`. It already contains the `@import`s for tailwindcss, tw-animate-css and the three `@fontsource-variable/*` packages (lines 2-6), `@custom-variant dark (&:is(.dark *))` (line 8), `:root` palette (line 10+) and `.dark`. Dark mode = `dark` class on `<html>`. Verify: `diff docs/design/expediente.css apps/web/src/styles.css`.

### `apps/web/components.json` and `common/components/ui/*` (generated)

**Source:** R:306. Hand-written `components.json` (new-york, neutral, `tailwind.css: "src/styles.css"`, aliases `@/common/components`, `@/common/components/ui`, `@/common/lib/utils`...). Create `common/lib/utils.ts` (`cn = twMerge(clsx(inputs))`) BEFORE running `npx -y shadcn@4.21.5 add button sheet toggle-group separator --yes`. Mandatory post-steps (R:361): rewrite `from "cn"` to `from "@/common/lib/utils"`, remove `cn` dep from `package.json` + lockfile, rerun `npm install`, Prettier the generated files, ESLint override for `react-refresh/only-export-components` under `ui/**`. Verify: `! grep -rn 'from "cn"' apps/web/src && ! grep -n '"cn"' apps/web/package.json`.

### Routes and router (route, request-response)

**Analog:** R:298-302; file list `docs/ARCHITECTURE.md:120-128` (Phase 1 creates only `__root.tsx`, `index.tsx`, `applications/index.tsx`).
```ts
// routes/index.tsx
beforeLoad: () => { throw redirect({ to: "/applications", replace: true }) }
// routes/__root.tsx
createRootRoute({ component: AppLayout })   // layout renders <Outlet />
// core/router/router.ts
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
```
Commit `routeTree.gen.ts` (starts with `/* eslint-disable */` and `// @ts-nocheck`); ignore in ESLint and Prettier. Routes import scenes, scenes import pods (CLAUDE.md).

### `core/http/http-client.ts` (utility, request-response)

**Spec:** R:615-616. `request<T>(path, schema, { method?, body?, signal? })`; network failure -> `HttpError(0, "NETWORK_ERROR")`; rethrow `AbortError`; non-2xx parsed with `errorResponseSchema` from `@tfm/contracts` -> `HttpError(status, code, message, details)`, else `INVALID_RESPONSE`; 204 -> `schema.parse(undefined)`; success body validated with the contracts schema. Test with stubbed `fetch` using `healthSchema`. `any` is forbidden (CLAUDE.md).

### `core/theme/theme.ts` (store, event-driven)

**Spec:** R:310-313 and the inline script at R:587-593. Preference `"system"|"light"|"dark"` in `localStorage["expediente-theme"]`, read and write in try/catch; `applyTheme` toggles `dark` class + `style.colorScheme`; `initTheme()` subscribes to `matchMedia` change (acts only in `system`); `useTheme()` via `useSyncExternalStore` (server snapshot `"system"`). The `index.html` pre-hydration script uses the same key. `main.tsx` calls `initTheme()` once, imports `./styles.css` (R:595).

### `common/lib/format.ts` (utility, transform)

**Analog:** R:600-613, copy verbatim (`formatToParts` period fix, `useGrouping: "always"`). Tests assert with U+00A0 before `€`, pass `"UTC"` as `timeZone`: `"12 oct. 2026"`, `"5 sept. 2026"`, `"52.000 €"`, `"5.200 €"`.

### `layouts/app-layout.tsx` (component, request-response)

**Analog:** `docs/DESIGN.md:27-29` (shell spec) + R:597-598 (implementation notes). Desktop `aside` `hidden lg:flex bg-sidebar text-sidebar-foreground`, brand «Expediente» `font-serif`, `<nav aria-label="Principal">` with active «Mis candidaturas» (`Link to="/applications"`), «Tablero» and «Documentos» as `aria-disabled` spans with «Próximamente», `ThemeToggle` at bottom (shadcn `ToggleGroup type="single"`, guard `if (v)` in `onValueChange`; labels Sistema / Claro / Oscuro). Mobile `header lg:hidden` with `Sheet` + `SheetTitle` + `SheetDescription className="sr-only"`, close on link click. Icons `strokeWidth={1.5}`, `size-5`. Only DS tokens in classes (no hex, no `bg-blue-500`; accepted exception `bg-black/50` in generated Sheet or change to `bg-foreground/50`). UI copy in Spanish, tuteo, no emojis.

### `scenes/application-list.scene.tsx` and `pods/*` (Phase 1: empty state + stubs)

**Analog:** `CLAUDE.md` frontend rules and `docs/ARCHITECTURE.md:111,115-119`. Scene composes pod + header and decides navigation; `pods/<pod>/index.ts` exports only the container (Phase 1 stubs: empty or minimal). Empty state text: «Aún no has guardado ninguna oferta…» (D-18 / `docs/DESIGN.md:31+`). Never import a pod from another pod.

### `Dockerfile` (config, batch)

**Analog:** R:619-657, copy verbatim. Stages `deps -> build -> prod-deps -> runtime`, `node:22.23.2-slim`, `npm ci --ignore-scripts`, `.npmrc` copied in each stage, `USER node`, `HEALTHCHECK` via `node -e fetch(...)`, `CMD ["node","apps/api/dist/main.js"]`. Matches `docs/ARCHITECTURE.md:151` stage description. Companion `.dockerignore`: R:658.

### `compose.yml` (config, event-driven)

**Analog:** `.devcontainer/docker-compose.yml` (service names `mongo`, `s3`, `s3-init`, `ollama`, `ollama-init`; bucket `tfm-assets`; `s3-init` creates it; `ollama-init` pulls `gemma4:e2b`; `minioadmin` credentials; volumes `mongo-data`, `s3-data`, `ollama-data`) hardened per R:659-716 (pinned tags instead of `:latest`/`mongo:8`, healthchecks, `depends_on` with `condition`). Excerpt of what to keep from the devcontainer:
```yaml
s3:
  image: pgsty/minio:...
  command: server /data --console-address ":9001"
s3-init:
  entrypoint: ... mc mb --ignore-existing local/tfm-assets
ollama-init:
  environment: { OLLAMA_HOST: ollama:11434 }  # ollama pull gemma4:e2b
```
Deltas to apply: add `app` (image `tfm-app`, port 8080, env block R:666-679 with `${VAR:-default}`), healthchecks (R:688, 696, 707), `$$` escapes in entrypoints, `app` must NOT depend on `ollama`/`ollama-init` (R:680), Silo console on `127.0.0.1:9001` (Open Question 4). Verify no `:latest` (`! grep -nE "image:.*:latest" compose.yml`). Smoke test must use `docker compose exec -T app node -e "fetch(...)"` not host curl (Pitfall 11, R:381-382).

## Shared Patterns

### Contracts as single source of truth
**Source:** `CLAUDE.md` (rules de código); R:249 (resolution matrix).
**Apply to:** every `apps/api` and `apps/web` file touching a model. Import only from `@tfm/contracts`; no local enum or schema redefinition. Dev-time resolution via `@tfm/source` condition in tsconfig, tsx, Vite/Vitest.

### Error contract
**Source:** R:288-291, R:495-496, `docs/ARCHITECTURE.md:93`.
**Apply to:** `app.ts`, `errors.ts`, `http-client.ts`. Server emits `{ error: { code, message, details? } }`; client parses with `errorResponseSchema`. Never leak stack or request body; never log offer text.

### Env/config and secrets
**Source:** R:502-531, R:719-741.
**Apply to:** `config.ts`, `.env.example`, `compose.yml`. Single `envSchema`; names not values in errors; `.env.example` mirrors schema keys (test enforces).

### Bounded probes
**Source:** R:283-285. **Apply to:** `/api/health` mongo, s3, llm. 2.5 s cap, parallel, no retries, HTTP 200 always.

### TypeScript hygiene
**Source:** R:264-278, R:378-379. **Apply to:** all workspaces. strict, no `any` (ESLint `no-explicit-any: error`), `verbatimModuleSyntax` -> `import { type X }` (inline-type-imports), explicit `types`, `.js` extensions in NodeNext packages.

### Design tokens only
**Source:** `docs/design/expediente.css`, `docs/DESIGN.md`. **Apply to:** all web JSX. Verify: `! grep -rnE "#[0-9a-fA-F]{3,8}\b|bg-(red|blue|green|gray)-" apps/web/src --include=*.tsx` (R:829).

### Test conventions
**Source:** R:295, R:579-584, R:388. **Apply to:** all tests. Vitest; `LLM_PROVIDER=mock`; API tested via `app.request()` with fake deps (no mocking libs); web via Testing Library + `createMemoryHistory`, `findBy*` async queries.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `README.md` | doc | n/a | No existing README; write minimal start instructions (D-22), include `compose exec` smoke command R:382 |
| `.husky/*`, `.lintstagedrc.json` | config | batch | No hooks exist; use R:319-320 |
| All `apps/**` and `packages/**` source | various | various | Greenfield; planner should use the RESEARCH.md blocks cited above as the pattern source |
| `.devcontainer/docker-compose.yml` unpinned `:latest` | n/a | n/a | Out of scope to edit (Pitfall 12); do not copy its tags |

## Metadata

**Analog search scope:** `/workspaces/TFM/docs/`, `/workspaces/TFM/.devcontainer/`, `/workspaces/TFM/CLAUDE.md`, and the RESEARCH.md/CONTEXT.md of this phase. No application code exists to scan.
**Files scanned:** 8 (ARCHITECTURE.md, DESIGN.md, expediente.css head, devcontainer.json, devcontainer docker-compose.yml, CLAUDE.md, CONTEXT.md, RESEARCH.md)
**Pattern extraction date:** 2026-10-28
