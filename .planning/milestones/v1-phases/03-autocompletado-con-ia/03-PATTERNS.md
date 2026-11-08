# Phase 3: Autocompletado con IA - Pattern Map

**Mapped:** 2026-10-31
**Files analyzed:** 22 (new + modified)
**Analogs found:** 21 / 22
All analog paths verified as git-tracked (they appeared in `git ls-files apps packages`).

Names follow docs/ARCHITECTURE.md as RESEARCH Open Question 4 recommends: `extract.routes.ts`, `ai-mark.tsx`, `apps/api/src/scripts/try-extract.ts`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/contracts/src/offer-extraction.schema.ts` (MOD: export `OFFER_TEXT_MIN/MAX`) | contract | transform | same file + `tag.schema.ts` (`MAX_TAGS`) | exact |
| `apps/api/src/llm/llm.client.ts` (MOD: optional 4th param `{ signal }`) | service interface | request-response | itself | exact |
| `apps/api/src/llm/structured-call.ts` (NEW) | utility | request-response + retry | `llm/ollama.provider.ts` ping (AbortSignal.timeout) | partial |
| `apps/api/src/llm/ollama.provider.ts` (MOD) | provider | request-response | itself (ping) + `llm.client.test.ts` fetch stubs | role-match |
| `apps/api/src/llm/openai.provider.ts` (MOD) | provider | request-response | itself (ping) | role-match |
| `apps/api/src/llm/mock.provider.ts` | provider | request-response | unchanged (optionally honour signal) | exact |
| `apps/api/src/offers/extract.routes.ts` (NEW) | route | request-response | `applications/applications.routes.ts` | exact |
| `apps/api/src/offers/extract.service.ts` (NEW) | service | transform | `applications/applications.service.ts` (`toEditableFields` + `normalizeTags`) | role-match |
| `apps/api/src/offers/extract.service.test.ts`, `extract.routes.test.ts` (NEW) | test | request-response | `tags/tags.test.ts` (route via `createApp`); `llm/llm.client.test.ts` (fake fetch) | role-match |
| `apps/api/src/offers/__fixtures__/*.txt`, `fixtures.ts` (NEW) | fixture | file-I/O | none | no analog |
| `apps/api/src/scripts/try-extract.ts` (NEW) | script | batch | `apps/api/src/main.ts` (config + tsx entry) | partial |
| `apps/api/src/app.ts` (MOD: `AppDeps.llm?`, mount `/api/offers`) | config/wiring | request-response | itself, `if (deps.db)` block | exact |
| `apps/api/src/main.ts` (MOD: pass `llm`) | wiring | n/a | itself (`pingLlm: () => llm.ping()`) | exact |
| `apps/api/src/applications/applications.service.ts` + `.repository.ts` + `applications.update.test.ts` (MOD: persist `offerText`) | service/repo/test | CRUD | itself (`toEditableFields`, `updateEditable $set`) | exact |
| `apps/web/src/common/components/ai-mark.tsx` (NEW) | component | presentational | `common/components/status-badge.tsx` | role-match |
| `apps/web/src/common/components/tag-chip.tsx` (MOD: `aiSuggested`) | component | presentational | itself | exact |
| `apps/web/src/pods/application-edit/api/api.ts` (MOD: `extractOffer`) | api | request-response | itself (`getApplication` with signal) | exact |
| `application-edit.vm.ts` (MOD: `offerText`, status/mark types) | vm | n/a | itself | exact |
| `application-edit.mapper.ts` (MOD: `mergeExtractionIntoForm`, offerText round trip) | mapper | transform | itself (`mapFormValuesToApiInput`, line 128) | exact |
| `application-edit.hooks.ts` (MOD: marks, listener, `useOfferExtraction`) | hook | event-driven | itself (`useApplicationForm`, `useApplicationEditLoad` abort pattern) | exact |
| `application-edit.container.tsx` / `.component.tsx` (MOD) | container/component | request-response | itself | exact |
| `components/offer-panel.tsx` (NEW) | component | event-driven | `components/job-section.tsx` + `ui/collapsible.tsx`, `ui/textarea.tsx` | role-match |
| `components/form-field.tsx` + sections (MOD: badge, missing) | component | presentational | itself | exact |
| Web tests (`application-edit.test.tsx`) | test | request-response | itself + `src/test/mock-fetch.ts` | exact |

## Pattern Assignments

### `apps/api/src/offers/extract.routes.ts` (route, request-response)
**Analog:** `apps/api/src/applications/applications.routes.ts`

Imports and shape (lines 1-17): contracts schema, `Hono`, `requireJson`, service type.
```typescript
import { Hono } from "hono";
import { requireJson } from "../http/require-json.js";
// No try/catch and no logging: ZodError, SyntaxError and ApiError reach the parent onError.
export function applicationsRoutes(service: ApplicationsService): Hono {
  const routes = new Hono();
  routes.use("*", requireJson);
```
Core (POST):
```typescript
routes.post("/", async (c) => {
  const input = applicationInputSchema.parse(await c.req.json());
  return c.json(await service.create(input), 201);
});
```
Copy as `offerExtractRequestSchema.parse(await c.req.json())` then `service.extract(text, { signal: c.req.raw.signal })`. Add `bodyLimit` (RESEARCH Pattern 1; confirm option names in `node_modules/hono/dist/middleware/body-limit`; `onError` must throw `ApiError`).

### `apps/api/src/app.ts` (wiring)
Mount inside/next to the `if (deps.db)` block, before `serveStatic` (lines 62-72):
```typescript
if (deps.db) {
  ...
  app.route("/api/applications", applicationsRoutes(service));
  app.route("/api/tags", tagsRoutes(service));
}
```
Add `llm?: LlmClient` to `AppDeps` (lines 14-21) and `if (deps.llm) app.route("/api/offers", offersRoutes(createExtractService(deps.llm)))` so existing `createApp({ping*})` tests keep working. Do not log inside routes: `app.onError` logs only `err.message` (line ~93), so all LLM errors must be `ApiError` with fixed messages. `main.ts` already builds `const llm = createLlmClient(config)`; pass `llm` into `createApp({... pingLlm: () => llm.ping(), llm, db })`.

### `apps/api/src/llm/{ollama,openai}.provider.ts` + `structured-call.ts`
**Analog:** current providers (ping, `AbortSignal.timeout(2000)`, `ApiError` import).
```typescript
const baseUrl = (config.LLM_BASE_URL ?? "").replace(/\/+$/, "");
return {
  async extractStructured() { throw new ApiError(502, "LLM_ERROR", "Extracción no disponible todavía"); },
  async ping() { try { const res = await fetch(`${baseUrl}/api/version`, { signal: AbortSignal.timeout(2000) }); return res.ok; } catch { return false; } },
};
```
Replace the placeholder `extractStructured` with `callStructured({ timeoutMs: config.LLM_TIMEOUT_MS, signal, schema, send })` (RESEARCH Pattern 3 sketch; decide timeout by `timeout.aborted`, never by `error.name`). Ollama body: `{ model, stream:false, think:false, options:{temperature:0,num_ctx:8192}, format: z.toJSONSchema(schema), messages }`, content at `message.content`. OpenAI: `Authorization: Bearer`, `response_format.json_schema`, content at `choices[0].message.content`; never put key or upstream body in errors. `LlmClient.extractStructured` interface (llm.client.ts lines 8-14) gets an optional 4th param; 3-arg fakes remain valid. Mock provider (`mock.provider.ts`) already does `schema.parse(MOCK_OFFER_EXTRACTION)` after 300 ms.

### `apps/api/src/offers/extract.service.ts` (service, transform)
**Analog:** `applications.service.ts` lines 30-50 (field-by-field copy plus `normalizeTags`/`tagKey` from contracts):
```typescript
tags: normalizeTags(input.tags).map((tag) => ({ ...tag, key: tagKey(tag.label) })),
```
Reuse `normalizeTags`, `normalizeTagLabel` (packages/contracts/src/tag.normalize.ts lines 4-31). Use RESEARCH "Normalization" example. Inject `LlmClient` via factory param (like `pingLlm` in `AppDeps`). Log only `{ length, durationMs }`. System prompt is verbatim from docs/AI-EXTRACTION.md (do not edit; D-25).

### `apps/api/src/applications/*` (persist `offerText`)
`applications.service.ts:30-33` comment says Phase 3 must add `offerText` to `toEditableFields`; add it to `EditableFields` and the `$set` in `applications.repository.ts:160-175`. Rewrite the test at `applications.update.test.ts:212-252` to keep only document-link assertions plus offerText write/clear.

### API tests
**Analog:** `tags/tags.test.ts` lines 1-45: `createApp({ ...allUp, db, now })`, `app.request(path, { method, headers: JSON_HEADERS, body })`. For offers use `createApp({...allUp, llm: fakeClient})` without a DB. Fetch-stubbing for provider body tests: `llm.client.test.ts` lines 28-41:
```typescript
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status }));
vi.stubGlobal("fetch", fetchMock);
// afterEach: vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks();
```
Add a console-spy test asserting no sentinel from the offer text is logged (RESEARCH Pitfall 4).

### `apps/api/src/scripts/try-extract.ts` (script, batch)
**Analog:** `apps/api/src/main.ts` for ESM + `loadConfig` entry style; run with `tsx` (already a devDependency, script style as `"dev": "tsx watch ..."`). Posts each fixture with `fetch` to `/api/offers/extract`, times it, compares against `fixtures.ts`.

### `apps/web/.../api/api.ts` `extractOffer`
**Analog:** same file, `getApplication` (signal forwarded):
```typescript
export const getApplication = (id: string, signal?: AbortSignal): Promise<Application> =>
  request(`/api/applications/${encodeURIComponent(id)}`, applicationSchema, { signal });
```
New: `request("/api/offers/extract", offerExtractionSchema, { method: "POST", body: { text }, signal })`.

### `application-edit.mapper.ts`
Line 128 `offerText: null,` becomes `offerText: values.offerText === "" ? null : values.offerText` (the VM field is separate from textarea draft, D-10). Add `offerText` to `mapApplicationFromApiToFormValues` and `EMPTY_FORM_VALUES` (vm.ts). `mergeExtractionIntoForm(current, extraction, text)` is a pure function beside `mapFormValuesToApiInput`; use `normalizeTags`/`tagKey` from `@tfm/contracts`; VM types written field by field (no `extends`/`Omit` from API model, per vm.ts header comment).

### `application-edit.hooks.ts`
**Analog:** same file. `useApplicationForm` options (`useForm({ defaultValues, validationLogic: revalidateLogic(...), validators, onSubmitInvalid })`): add `listeners: { onChange: ({ fieldApi }) => ... }` additive, keep return `{ form, formMessage }` extended. Abort/keyed-result pattern in `useApplicationEditLoad`:
```typescript
const controller = new AbortController();
getApplication(applicationId, controller.signal).then((a) => { if (controller.signal.aborted) return; ... })
  .catch((error: unknown) => { if (controller.signal.aborted) return; ... error instanceof HttpError ... });
return () => controller.abort();
```
Reuse for `useOfferExtraction` (store controller in a ref, abort on unmount, map `HttpError.code` to the four D-18 messages). Apply merge via `form.setFieldValue(key, value, { dontRunListeners: true })`.

### `components/form-field.tsx` and sections
**Analog:** `form-field.tsx` (props `id,label,required,hint,error,children`; `Label` then control then hint then error). Add optional `aiFilled?: boolean` (renders `<AiMark/>` inside the label row) and `missing?: boolean` (help text «Complétalo tú» with id `${id}-hint` so `controlProps` can reference it; control gets `border-brand-gold bg-ai-missing-bg`). Sections pass flags per `form.Field` as in `job-section.tsx`:
```tsx
<form.Field name="title">{(field) => { const error = firstFieldError(field.state.meta.errors);
  return (<FormField id="field-title" label="Puesto" required error={error}>
    <Input {...controlProps({ id: "field-title", error, required: true })} name={field.name} value={field.state.value}
      onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} /></FormField>); }}</form.Field>
```

### `common/components/tag-chip.tsx` (add `aiSuggested`)
Add optional prop; in the non-toggle branch render before the label `<Sparkles aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />` and `<span className="sr-only">(propuesta por IA)</span>`. Existing branches (`BASE`, `soft`, `onToggle`, `onRemove`) unchanged. Import from `lucide-react` as the existing `Check, X`.

### `common/components/ai-mark.tsx`
**Analog:** `common/components/status-badge.tsx` (small DS-token badge; not read in detail, planner should read it before writing). Use only DS tokens, no hex.

### `components/offer-panel.tsx`
**Analog:** `job-section.tsx` for section/heading structure (`aria-labelledby={headingId}`, `useId`, card classes `rounded-md border border-border bg-card p-4 lg:p-6`); `ui/collapsible.tsx`, `ui/textarea.tsx`, `ui/button.tsx` for primitives. Follow 03-UI-SPEC for layout and copy.

## Shared Patterns

### Error contract
**Source:** `apps/api/src/errors.ts` (`ApiError(status, code, message, details?)`) plus `app.onError` in `app.ts`. Throw `ApiError(504,"LLM_TIMEOUT",...)` / `ApiError(502,"LLM_ERROR",...)` with fixed Spanish messages; never include model output, upstream body, text or API key. Check `ErrorCode` in contracts includes both codes.

### Validation
Zod schemas from `@tfm/contracts` only (`offerExtractRequestSchema`, `offerExtractionSchema`); web gets limits from exported `OFFER_TEXT_MIN/MAX` (do not hard-code 50/20000).

### Logging
Only `{ length, durationMs }`. Never the text or LLM output.

### Web HTTP
`request()` from `@/core/http/http-client` with `HttpError.code`; abort distinguished through `controller.signal.aborted`.

### Web tests
`src/test/mock-fetch.ts` `mockFetch({ "POST /api/offers/extract": handler })`, `jsonResponse`; `useApplicationForm` is imported directly in `application-edit.test.tsx`, keep its options/return additive.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `apps/api/src/offers/__fixtures__/*.txt`, `fixtures.ts` | fixture | No fixture assets exist; follow docs/AI-EXTRACTION.md descriptions and D-22 |
| `structured-call.ts` (retry/total-budget logic) | utility | Only `ping()` uses `AbortSignal.timeout`; use RESEARCH Pattern 3 |

## Metadata

**Analog search scope:** `apps/api/src`, `apps/web/src`, `packages/contracts/src`
**Files scanned:** ~25 read in full or in part; remaining from `git ls-files` listing. Not read: `status-badge.tsx`, `ui/*`, RESEARCH.md lines 523-645, UI-SPEC.
**Pattern extraction date:** 2026-10-31
