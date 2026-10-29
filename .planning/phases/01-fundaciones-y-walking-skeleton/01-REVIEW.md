---
phase: 01-fundaciones-y-walking-skeleton
reviewed: 2026-10-29T16:10:00Z
depth: standard
files_reviewed: 90
files_reviewed_list:
  - .dockerignore
  - .env.example
  - .gitattributes
  - .gitignore
  - .husky/pre-commit
  - .husky/pre-push
  - .lintstagedrc.json
  - .npmrc
  - .prettierignore
  - .prettierrc.json
  - Dockerfile
  - README.md
  - apps/api/package.json
  - apps/api/src/app.test.ts
  - apps/api/src/app.ts
  - apps/api/src/config.test.ts
  - apps/api/src/config.ts
  - apps/api/src/db/mongo.ts
  - apps/api/src/errors.ts
  - apps/api/src/llm/llm.client.test.ts
  - apps/api/src/llm/llm.client.ts
  - apps/api/src/llm/mock.provider.ts
  - apps/api/src/llm/ollama.provider.ts
  - apps/api/src/llm/openai.provider.ts
  - apps/api/src/main.ts
  - apps/api/src/storage/s3.ts
  - apps/api/tsconfig.build.json
  - apps/api/tsconfig.json
  - apps/api/vitest.config.ts
  - apps/web/components.json
  - apps/web/index.html
  - apps/web/package.json
  - apps/web/src/app.tsx
  - apps/web/src/common/components/theme-toggle.tsx
  - apps/web/src/common/components/ui/button.tsx
  - apps/web/src/common/components/ui/separator.tsx
  - apps/web/src/common/components/ui/sheet.tsx
  - apps/web/src/common/components/ui/toggle-group.tsx
  - apps/web/src/common/components/ui/toggle.tsx
  - apps/web/src/common/lib/format.test.ts
  - apps/web/src/common/lib/format.ts
  - apps/web/src/common/lib/utils.ts
  - apps/web/src/core/http/http-client.test.ts
  - apps/web/src/core/http/http-client.ts
  - apps/web/src/core/router/router.test.tsx
  - apps/web/src/core/router/router.ts
  - apps/web/src/core/theme/theme.test.ts
  - apps/web/src/core/theme/theme.ts
  - apps/web/src/layouts/app-layout.test.tsx
  - apps/web/src/layouts/app-layout.tsx
  - apps/web/src/main.tsx
  - apps/web/src/pods/application-detail/index.ts
  - apps/web/src/pods/application-edit/index.ts
  - apps/web/src/pods/application-list/api/api.ts
  - apps/web/src/pods/application-list/application-list.component.tsx
  - apps/web/src/pods/application-list/application-list.container.tsx
  - apps/web/src/pods/application-list/application-list.hooks.ts
  - apps/web/src/pods/application-list/application-list.mapper.ts
  - apps/web/src/pods/application-list/application-list.test.tsx
  - apps/web/src/pods/application-list/application-list.vm.ts
  - apps/web/src/pods/application-list/components/empty-state.tsx
  - apps/web/src/pods/application-list/index.ts
  - apps/web/src/pods/document-upload/index.ts
  - apps/web/src/routes/__root.tsx
  - apps/web/src/routes/applications/index.tsx
  - apps/web/src/routes/index.tsx
  - apps/web/src/scenes/application-list.scene.tsx
  - apps/web/src/test/setup.ts
  - apps/web/tsconfig.json
  - apps/web/vite.config.ts
  - apps/web/vitest.config.ts
  - compose.yml
  - eslint.config.js
  - package.json
  - packages/contracts/package.json
  - packages/contracts/src/application.schema.test.ts
  - packages/contracts/src/application.schema.ts
  - packages/contracts/src/document.schema.ts
  - packages/contracts/src/enums.ts
  - packages/contracts/src/error.schema.test.ts
  - packages/contracts/src/error.schema.ts
  - packages/contracts/src/index.ts
  - packages/contracts/src/interview.schema.ts
  - packages/contracts/src/offer-extraction.schema.ts
  - packages/contracts/src/schemas.test.ts
  - packages/contracts/src/tag.schema.ts
  - packages/contracts/tsconfig.build.json
  - packages/contracts/tsconfig.json
  - scripts/compose-smoke.sh
  - tsconfig.base.json
findings:
  critical: 0
  warning: 8
  info: 7
  total: 15
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-29T16:10:00Z
**Depth:** standard
**Files Reviewed:** 90
**Status:** issues_found

## Summary

All 90 files in scope were read (the web test files and the pod/UI sources included). `npm run typecheck`, `npm run lint` and the api and contracts vitest suites pass. The web vitest suite was not run because of the known worker-start flakiness.

No blocker was found. These areas are sound:

- Static hosting is safe against path traversal. `@hono/node-server`'s `serveStatic` rejects `%`, `.`/`..` segments, repeated slashes and backslashes before joining the path.
- Env validation never echoes values.
- The health probes are time-bounded and swallow rejections.
- The contract schemas match docs/DOMAIN.md field by field (title 2..120, tags max 20, offerText 20000, notes 5000, salary ordering, http/https-only source URLs).
- The Dockerfile runs as non-root, and compose publishes only loopback ports.
- No `any`, hex colours or `bg-blue-500` style classes appear in hand-written code.
- Pod isolation and the mapper-in-hook rule are respected.

The 8 warnings are robustness and contract gaps that will bite in Phases 2 to 5:

- Startup is fragile when a dependency is slow or down.
- The theme store desynchronises from the DOM in two cases.
- The error mapping misclassifies some failures.
- The contracts miss the tag-normalisation rule the domain doc states.
- The SPA shell shows English default screens for unknown routes.

## Warnings

### WR-01: API process dies, or hangs, at startup when Mongo or S3 is slow or down, contradicting the health design

**File:** `apps/api/src/main.ts:18-20` (also `apps/api/src/storage/s3.ts:18-29`)
**Issue:** `connectMongo` and `ensureBucket` are top-level awaits with no handling. A Mongo outage rejects with a raw stack trace and the process exits. In `npm run dev` (`tsx watch`) it will not restart until a file changes, whereas `/api/health` is explicitly designed to report `mongo: "error"` / `s3: "error"` while the app stays up. In compose it works only because of `depends_on` plus `restart`. The S3 client also has no connect or request timeout (the AWS SDK default is none), so `ensureBucket` can hang forever against a black-holed endpoint, with no log line.
**Fix:**
```ts
// s3.ts
export async function ensureBucket(s3: S3Client, bucket: string): Promise<void> {
  const abortSignal = AbortSignal.timeout(5000);
  await s3.send(new HeadBucketCommand({ Bucket: bucket }), { abortSignal });
  // ...same 404 -> CreateBucketCommand path, also with an abortSignal
}
// main.ts: catch, log err.message only, exit(1) deliberately
try {
  ({ client: mongoClient, db } = await connectMongo(config.MONGO_URL));
  await ensureBucket(s3, config.S3_BUCKET);
} catch (err) {
  console.error("Startup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
```
Alternatively, start the server first and run `ensureBucket` lazily or in the background, so that health can report the degraded state.

### WR-02: `pingS3` has no abort, so every health call against a hung S3 leaves a pending socket

**File:** `apps/api/src/storage/s3.ts:58-65`, `apps/api/src/app.ts:19-33`
**Issue:** `probe()` only races the promise against a 2.5 s timer. The underlying `HeadBucket` request keeps running with no deadline. Docker's `HEALTHCHECK` hits `/api/health` every 15 s, so with a black-holed S3 the pending requests and sockets accumulate until the OS gives up. Ollama and OpenAI pings correctly use `AbortSignal.timeout(2000)`. Mongo is bounded by `serverSelectionTimeoutMS`.
**Fix:**
```ts
await s3.send(new HeadBucketCommand({ Bucket: bucket }), {
  abortSignal: AbortSignal.timeout(2000),
});
```

### WR-03: Theme store desynchronises from the DOM (cross-tab and blocked-storage cases)

**File:** `apps/web/src/core/theme/theme.ts:50-73`
**Issue:** Two cases leave `ThemeToggle` and the page disagreeing.
1. `subscribe` listens to `storage` events, so the toggle in tab B re-renders to "Oscuro" when tab A changes the theme. Nothing calls `applyTheme` in tab B, so its page keeps the old theme while its toggle shows the new one.
2. When `localStorage` throws, `setThemePreference("dark")` applies the dark class. The snapshot `readThemePreference()` still returns `"system"`, so the toggle stays on "Sistema" while the page is dark. The test at `theme.test.ts:97` only asserts the DOM class, never the toggle state.

**Fix:** Keep an in-memory `current` preference as the fallback source for `readThemePreference`/the snapshot, and apply the theme on `storage` events:
```ts
let memoryPreference: ThemePreference | null = null;
export function readThemePreference(): ThemePreference {
  try {
    const s = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(s)) return s;
  } catch { /* fall through */ }
  return memoryPreference ?? "system";
}
// setThemePreference: memoryPreference = preference
// initTheme: window.addEventListener("storage", e => { if (e.key === THEME_STORAGE_KEY) applyTheme(readThemePreference()); })
```

### WR-04: Contracts do not enforce tag normalisation or uniqueness that DOMAIN.md specifies

**File:** `packages/contracts/src/tag.schema.ts:6-9`, `packages/contracts/src/application.schema.ts:34`
**Issue:** DOMAIN.md says tags have "sin duplicados por `label` normalizado" and normalisation is `trim`, collapsed whitespace and lower-case comparison. `tagSchema` only trims. `applicationInputSchema.tags` accepts `[{React},{react},{"a   b"}]` unchanged. If normalisation is left to the Phase 2 service, the web form (which validates with the same contract) will accept data the API then silently rewrites. Since `packages/contracts` is the declared single source of truth, the rule belongs there.
**Fix:**
```ts
label: z.string().trim().transform(s => s.replace(/\s+/g, " ")).pipe(z.string().min(1).max(40)),
// in applicationFieldsSchema.tags:
.refine(
  tags => new Set(tags.map(t => t.label.toLowerCase())).size === tags.length,
  { error: "Etiquetas duplicadas" },
)
```
Apply the refine last, per the file's own refine-after-derive comment, or on both derived schemas.

### WR-05: Error handler collapses non-400/404 `HTTPException` and every `SyntaxError` into misleading codes

**File:** `apps/api/src/app.ts:100-121`
**Issue:**
- Any `HTTPException` other than 400 or 404 is reported as `INTERNAL_ERROR` while keeping its 4xx status. The documented contract has 413 `FILE_TOO_LARGE`, and a body-limit or method error would be sent as `{status:413, code:"INTERNAL_ERROR"}`. The test at `app.test.ts:169` codifies this for 503, but 4xx should not carry `INTERNAL_ERROR`.
- The blanket `err instanceof SyntaxError` branch turns any `SyntaxError` thrown in server code (a `JSON.parse` of stored or LLM data, for example) into a client-blamed 400 `VALIDATION_ERROR`, hiding real 500s.

**Fix:** Map status codes explicitly (`413 -> FILE_TOO_LARGE`, `415 -> UNSUPPORTED_FILE_TYPE`, other 4xx -> `VALIDATION_ERROR`, 5xx -> `INTERNAL_ERROR`). Make malformed-JSON detection narrow, for example a small `readJson(c)` helper that wraps `c.req.json()` and throws `ApiError(400, "VALIDATION_ERROR", ...)`, and drop the generic `SyntaxError` branch.

### WR-06: A `ZodError` raised from LLM output would be reported as a 400 caused by the client

**File:** `apps/api/src/llm/mock.provider.ts:31` (and the generic mapping at `apps/api/src/app.ts:89-98`)
**Issue:** `extractStructured` ends with `schema.parse(...)`. If the result fails the schema (a contract drift in the mock, or later a malformed model answer in the Ollama and OpenAI providers following the same pattern), the thrown `ZodError` falls into the handler's `ZodError -> 400 VALIDATION_ERROR` branch. The user would see "Datos no válidos" for a server-side or model failure, instead of 502 `LLM_ERROR`. The `LlmClient` interface does not document that providers must translate this.
**Fix:**
```ts
const result = schema.safeParse(MOCK_OFFER_EXTRACTION);
if (!result.success) throw new ApiError(502, "LLM_ERROR", "Respuesta del modelo no válida");
return result.data;
```
Document the same rule on `LlmClient.extractStructured`, so Phase 3 providers follow it.

### WR-07: Unknown routes and route errors render TanStack's English default screens

**File:** `apps/web/src/core/router/router.ts:4-6`
**Issue:** `createRouter({ routeTree, history })` sets no `defaultNotFoundComponent` or `defaultErrorComponent`. The API deliberately serves `index.html` (200) for every non-`/api` GET, so any mistyped URL lands in the SPA and shows the library's English "Not Found" or error text inside the shell. This violates the CLAUDE.md rule that UI copy is Spanish with the DS voice.
**Fix:** Add `defaultNotFoundComponent` ("No encontramos esta página.", with a link to `/applications`) and `defaultErrorComponent` (Spanish, with a retry action) to `createAppRouter`.

### WR-08: SPA fallback answers missing static files with `200 text/html`, and a missing `index.html` is silent

**File:** `apps/api/src/app.ts:35-41, 65-69`
**Issue:**
- `notFound` returns `index.html` with 200 for any non-API GET. A missing `/assets/app-abc.js` (a stale cached shell after a redeploy), `/favicon.ico` or `/robots.txt` gets HTML. The browser then reports a confusing "Unexpected token <" or MIME error instead of a 404.
- `readIndexHtml` swallows every error. If `WEB_DIST_DIR` is wrong or the web build is absent, the server starts normally, `serveStatic` only logs a root warning, and every route silently becomes JSON 404 with no startup error.
- `HEAD` requests to client routes get 404.

**Fix:**
```ts
const looksLikeFile = /\.[a-z0-9]{1,8}$/i.test(c.req.path);
if (!isApiPath && !looksLikeFile && (c.req.method === "GET" || c.req.method === "HEAD") && indexHtml !== undefined) { ... }
```
Also `console.error` once at startup when `webDistDir` is set but `indexHtml` is `undefined`.

## Info

### IN-01: Inline theme script and `initTheme` disagree on unknown values and skip `color-scheme`

**File:** `apps/web/index.html:7-18`
**Issue:** The inline script treats an unknown stored value (`"purple"`) as light. `readThemePreference` treats it as `"system"`, so a dark-OS user gets a light first paint and then flips dark once JS loads. The script also never sets `documentElement.style.colorScheme`, which `applyTheme` sets later, so scrollbars and native controls flash light before hydration.
**Fix:** Mirror the logic exactly: treat only `"light"` as light, otherwise follow the media query unless `"dark"`, and set `document.documentElement.style.colorScheme`.

### IN-02: Disabled nav entries are `span aria-disabled` with no role

**File:** `apps/web/src/layouts/app-layout.tsx:41-66`
**Issue:** `aria-disabled` on a generic `span` is not exposed meaningfully to assistive tech, and the "Próximamente" label is the only cue. There is also no skip-to-content link and no `id` on `<main>`, so keyboard users tab through the whole sidebar and theme switch on every page (DESIGN.md requires keyboard-only usability).
**Fix:** Drop `aria-disabled` and keep plain text with "Próximamente" (or use a disabled `button`). Add a visually hidden "Saltar al contenido" link as the first focusable element, targeting `<main id="contenido" tabIndex={-1}>`.

### IN-03: `probe()` rejects if the probe function throws synchronously

**File:** `apps/api/src/app.ts:19-33`
**Issue:** `fn()` is evaluated inside the `try` without a `catch`. A synchronous throw (a future dep that is not `async`) propagates, so `/api/health` returns 500 instead of `"error"`. All current deps are async, so this is latent only.
**Fix:** Call `Promise.resolve().then(fn)` or wrap in `(async () => fn())()`.

### IN-04: Response schema `applicationSchema` re-applies input constraints and defaults

**File:** `packages/contracts/src/application.schema.ts:62-72`
**Issue:** The entity schema is derived from the input fields (`trim`, `min(2)` title, `.default(null)`). The web client validates every list response with it (`api/api.ts`), so one legacy or seeded document with a 1-character title fails the whole list as `INVALID_RESPONSE`. `.default(null)` also silently masks fields the API forgot to send.
**Fix:** Keep strict bounds on input only. For the entity use the same fields without `.default()` and with relaxed string checks, or accept this knowingly and make the Phase 6 seed obey the input schema.

### IN-05: `offerExtractionSchema` is stricter than useful for LLM output and looser than the form it feeds

**File:** `packages/contracts/src/offer-extraction.schema.ts:11-20`
**Issue:**
- `currency: z.string().length(3)` rejects the whole draft for `"€"` or `"EUR "`. It is also not upper-cased (the input schema does `.trim().toUpperCase().regex`).
- `title`/`company`/`location` are unbounded (the form allows 120) and may be empty strings rather than null, so the draft can pass here and then fail `applicationInputSchema` on save.

**Fix:** Use `.catch(null)` per field, or normalise in the extract service (Phase 3). Mirror the input schema bounds and transforms.

### IN-06: Minor robustness gaps in contracts and formatting

**File:** `packages/contracts/src/application.schema.ts:36-39, 85-92`; `apps/web/src/common/lib/format.ts:1-15`
**Issue:**
- `sourceUrl` has no `.max()`.
- `applicationQuerySchema.q` and `tags` are unbounded, so a huge `$text` search string is accepted.
- `formatDate` throws `RangeError` on an invalid ISO string, which would crash the render of a list row.

**Fix:** Add `.max(2048)` to `sourceUrl`, `.max(200)` to `q` and `.max(20)` to `tags`, and guard `formatDate` with `Number.isNaN(date.getTime())`.

### IN-07: Duplicated base-URL normalisation and repo-wide `legacy-peer-deps`

**File:** `apps/api/src/llm/llm.client.ts:26-30`, `ollama.provider.ts:5`, `openai.provider.ts:5`; `.npmrc:1`
**Issue:** The factory strips one trailing slash and then each provider strips `/\/+$/` again. The two code paths can drift. `legacy-peer-deps=true` disables npm's peer-dependency resolution for the whole monorepo, hiding real conflicts (React 19 against Radix or TanStack majors) until runtime.
**Fix:** Normalise once in the factory with `/\/+$/` and let providers trust it. Try removing `legacy-peer-deps` and, if it is still needed, record the reason in a comment or the SUMMARY.

---

_Reviewed: 2026-10-29T16:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
