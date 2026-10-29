# Phase 2: Candidaturas - Research

**Researched:** 2026-10-29
**Domain:** Application CRUD on Hono + MongoDB 8 (filters, tags, atomic status rules) and a TanStack Router / TanStack Form / hand-rolled-hooks React UI (list, detail, form) inside the Phase 1 skeleton
**Confidence:** HIGH for everything tagged `[VERIFIED]` (executed this session against the real Mongo 8.3.13, the pinned router/zod/vitest versions and the repo's own ESLint); MEDIUM where tagged `[CITED]`/`[ASSUMED]`

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API**
- **D-01:** Carpeta `apps/api/src/applications/` con `applications.repository.ts` (Mongo), `applications.service.ts` (reglas), `applications.routes.ts` y `applications.mapper.ts` (documento↔contrato: `_id`→`id` string, fechas ISO UTC). Más `tags/tags.routes.ts`.
- **D-02:** Endpoints de la tabla de `docs/ARCHITECTURE.md` salvo `interviews` (fase 4): GET lista, POST (201), GET :id (404), PUT :id, PATCH :id/status, DELETE :id (204), GET /api/tags. Toda entrada validada con esquemas de `@tfm/contracts`.
- **D-03:** Filtros: `status` y `tags` multi (clave repetida); `workMode`, `seniority` exactos; `q` = regex case-insensitive en `title` y `company` con la entrada escapada (no se usa el índice de texto). `sort`: `updatedAt` desc (defecto) o `appliedAt` desc con nulls al final.
- **D-04:** `tags` filtra con **AND** (`$all` sobre etiquetas de grupo `stack`); comparación case-insensitive coherente con la normalización.
- **D-05:** `GET /api/tags` agrega `tags.label` + `group` con `count`, orden count desc. La UI de filtro usa solo las de grupo `stack`.
- **D-06:** Reglas en el service: historial inicial al crear `[{status, at}]`; nueva entrada en cada cambio real de estado; `appliedAt` se fija al pasar a `enviada` por primera vez si está vacío; `updatedAt` en toda modificación.
- **D-07:** **POST** acepta `status` inicial (historial `[status]`, y `appliedAt` si es `enviada`). **PUT ignora `status`**: el estado solo cambia por `PATCH /:id/status`. El formulario de edición no muestra selector de estado (solo «estado inicial» en alta).
- **D-08:** `appliedAt` editado a mano en el formulario **prevalece** (PUT guarda lo recibido, incluido `null`); la regla automática solo rellena cuando está vacío al pasar a `enviada` por primera vez.
- **D-09:** Normalización de etiquetas (trim, espacios colapsados, dedupe case-insensitive con primera grafía, máx. 20) en el **service** como fuente de verdad. La función pura vive en `@tfm/contracts` y la reutiliza el formulario para feedback inmediato (sin duplicarla).
- **D-10:** Sin paginación en el listado (monousuario, decenas de registros).
- **D-11:** Tests del service con **Mongo real del devcontainer**, base `tfm_test`, colección limpiada en cada test. Justificación: Phase 1 ya depende de los servicios del devcontainer, no añade dependencia nueva (CLAUDE.md), es fiel a Mongo 8 (regex, `$all`, orden de nulls) y es la versión que usa el entregable. Fallback `mongodb-memory-server` solo si falla en CI (requeriría justificarlo en el SUMMARY).

**Web**
- **D-12:** Pods `application-list`, `application-detail`, `application-edit` con el conjunto completo de archivos del curso (`api/api.ts`, vm, mapper, hooks, container, component, `components/`, `index.ts` que solo exporta el container). View model propio, sin `extends`/`Omit` del API model; el mapper se aplica en el hook. Un pod nunca importa otro.
- **D-13:** Rutas: `/applications` (`validateSearch` con `applicationQuerySchema`), `/applications/new`, `/applications/$applicationId`, `/applications/$applicationId/edit`. Escenas `application-list`, `application-detail`, `application-edit` (alta si no hay id). La escena de edición navega al detalle tras guardar; cancelar vuelve al detalle (o al listado en alta).
- **D-14:** Listado: cambiar un filtro = `navigate` con search params; «Limpiar filtros» resetea. Tarjetas según DESIGN.md (3 etiquetas + «+N», salario, «Actualizada …»). Estados: carga (skeleton), error con reintento, vacío, vacío por filtros. **Eliminar solo desde el detalle.**
- **D-15:** Detalle: datos de oferta, etiquetas agrupadas, selector de estado (PATCH) con actualización optimista y rollback en error, historial de estados (timeline), notas, texto original plegable, eliminar con diálogo de confirmación. **Las secciones de rondas y documentos NO se renderizan** hasta las fases 4 y 5 (sin placeholders).
- **D-16:** Formulario TanStack Form + esquema de contracts; secciones Puesto y empresa, Condiciones, Etiquetas (input por grupo, Enter añade, chips removibles `aria-label="Quitar <label>"`), Seguimiento. Valores del formulario en el VM (strings vacíos, no `null`); el mapper convierte a input de API.
- **D-17:** Componentes comunes: `status-badge`, `tag-chip` (normal / soft / removible / seleccionado), `request-status` en `common/components/`.
- **D-18:** Tests: mappers de los tres pods, service de API, `StatusBadge`, filtro del listado (Testing Library).

### Claude's Discretion
- Estructura exacta de índices adicionales de Mongo (si `{ "tags.label": 1 }` basta para `$all`).
- Layout concreto de tarjetas en escritorio (1 vs 2 columnas) dentro de DESIGN.md.
- Debounce del campo `q` y detalles del skeleton.

### Deferred Ideas (OUT OF SCOPE)
- Borrar desde la tarjeta del listado — no necesario en MVP.
- Paginación del listado — fuera de alcance.
- Filtro por etiquetas de grupos `nice_to_have`/`language` — solo stack en esta fase.
- Roadmap follow-up: ROADMAP §Phase 2 SC4 y Cross-Phase Notes (APP-09) piden estados vacíos de rondas/documentos; se decidió no renderizarlas (ya alineado en ROADMAP por el orquestador).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | Create with title (2–120) + company (1–120) required, rest optional, validated by contracts | Form-level validator wrapper over `applicationInputSchema` (Q1); POST route validates with the same schema; `""`→`null` mapper rule (Pitfall 9) |
| APP-02 | Edit with the same form | One `application-edit` pod, scene passes optional id; PUT whitelist semantics (Q9) |
| APP-03 | Delete after confirmation dialog; documents not deleted | `AlertDialog` from `radix-ui` (Q7); `deleteOne` only touches `applications`; integration test with a seeded `documents` row |
| APP-04 | Cards: title, company · location, badge, ≤3 tags + `+N`, salary, last-updated | `StatusBadge`, `TagChip`, `formatSalaryRange` (new, tested) in `common/` |
| APP-05 | Loading / error-with-retry / empty / empty-by-filters | Keyed-result hook pattern (the only one that passes the repo's `react-hooks/set-state-in-effect` error) (Pitfall 1) |
| APP-06 | Filters: text, status multi, stack tags multi, workMode, seniority | Mongo filter recipe verified on 8.3.13 (Q4a, Q4e); `ToggleGroup` + native selects (Q7) |
| APP-07 | Filters + sort in URL, survive reload, «Limpiar filtros» | Custom `parseSearch`/`stringifySearch` + lenient per-field `.catch()` schema + `stripSearchParams` (Q2) |
| APP-08 | Sort by last update or applied date | `{ appliedAt: -1, updatedAt: -1, _id: -1 }` verified: nulls and missing last, deterministic (Q4b) |
| APP-09 | Detail: offer data, grouped tags, history, notes, collapsible offer text (documents clause completes in Phase 5) | Detail pod composition; `Collapsible` from `radix-ui`; no rounds/documents markup (D-15) |
| APP-10 | Change status to any of 7; each change appends `{status, at}`; unchanged adds nothing | Single pipeline-style `findOneAndUpdate` guarded by `status: { $ne }` (Q4d); hand-rolled optimistic hook (Q3) |
| APP-11 | First move to `enviada` sets `appliedAt` when empty | Same pipeline update: `$cond` on `appliedAt` null/missing (Q4d) |
| APP-12 | Tags by group with normalization | `normalizeTags`/`tagKey` pure functions in `@tfm/contracts` (D-09); stored `key` (Q4a) |
| APP-13 | `updatedAt` changes on any modification | Every write sets `updatedAt: now` (injected clock); no-op status change is not a modification |
| APP-14 | Stack filter options from `GET /api/tags` ordered by count | Aggregation verified (Q4c); JS-side final sort for locale-correct tie-break |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted from `/workspaces/TFM/CLAUDE.md` and `/workspaces/TFM/.claude/CLAUDE.md`; same authority as locked decisions:

- Stack is closed (changes need an ADR in `docs/decisiones.md`): React 19 + TS strict + Vite, TanStack Router (file routes) + **TanStack Form**, Zod 4, Tailwind v4 + shadcn/ui, lucide-react; Hono + `mongodb` driver + AWS SDK S3 + Zod 4; Vitest + Testing Library.
- Code, identifiers, commits, file names in **English**; UI strings in **Spanish** (tuteo, short sentences, no exclamations, no emojis).
- `packages/contracts` is the single source of truth for API models; web and API import from `@tfm/contracts`, never redefine.
- Frontend: `core/`, `common/`, `layouts/`, `scenes/`, `pods/`; pod = `api/api.ts`, `<pod>.vm.ts`, `<pod>.mapper.ts`, `<pod>.hooks.ts`, `<pod>.container.tsx`, `<pod>.component.tsx`, `components/`, `index.ts` (exports only the container). View model never derives from the API model (`extends`/`Omit` forbidden). Mapper applied in the hook. Container = data/state; component = props/presentation; scenes compose pod + header and decide navigation. A pod never imports another pod. Routes → scenes → pods.
- Tailwind classes live next to the JSX; DS tokens only (`bg-primary`, `text-status-offer`…); no hex, no `bg-blue-500`.
- API: validate every input with contracts schemas; errors `{ error: { code, message, details? } }`; expose `id` (string), never `_id`; ISO 8601 UTC dates.
- No `any`. No new dependency without justification in the plan SUMMARY. Secrets only in `.env`; `.env.example` current. Never log the full offer text.
- Every plan ends with a `<verify>` that runs at least `npm run typecheck && npm run test` plus task-specific checks. `LLM_PROVIDER=mock` in tests.
- Git: one branch per phase (`phase/02-candidaturas`), atomic Conventional Commits, never push to `main`.

## Summary

Phase 2 is a classic vertical CRUD slice, and almost all risk sits in six places that were each exercised for real this session: (1) **the router's default search serialization is JSON-based** (arrays become `status=%5B...%5D`, `q=123` becomes the *number* 123 and `z.string()` then throws a `SearchParamError`), and `useSearch()` returns `{...rawSearch, ...validated}` so invalid/hostile keys leak through unless the validator writes explicit `undefined`; (2) **the repo's ESLint config makes `react-hooks/set-state-in-effect` an error**, so the "obvious" `useEffect(() => { setLoading(true); fetch… })` hook fails the pre-commit gate; (3) **Mongo's `$toLower` is ASCII-only** (confirmed: `Éxito`/`éxito` do not merge) while regex `/i` and collation strength 2 are Unicode-correct, which is why a stored normalized `key` per tag (computed by the same pure JS function that dedupes) is the only approach that is exactly coherent with D-09 *and* index-servable; (4) **status change is one atomic `findOneAndUpdate` with a pipeline update** guarded by `status: { $ne: next }` (verified: history appended once, `appliedAt` only when empty, concurrent triple-click yields exactly one write); (5) **the web test suite is I/O-bound by the 9p-mounted `/workspaces`** (`require('jsdom')` = 42–46 s there vs 0.4 s on the container's overlay FS), which is the root cause of the cold-start `Failed to start forks worker` flake — no Vitest pool/worker/timeouts setting fixes it; (6) **TanStack Form 1.33.5 works with React 19.3.1 + Zod 4.6.7**, but its validators take the form-value shape, which per D-16 is the VM (strings), so the contracts schema is applied through a thin wrapper (`mapper → safeParse → issues → { fields }`), not passed directly.

Only **one** new runtime dependency is needed (`@tanstack/react-form@1.33.5`, already mandated by CLAUDE.md's stack). Every UI primitive (alert dialog, collapsible, label, toggle-group) exists in the installed monolithic `radix-ui@1.8.1`; selects should be **native `<select>`** (Radix Select is a jsdom/keyboard-test liability), and skeleton/input/textarea are 5-line wrappers.

**Primary recommendation:** Build the API first as three layers (contracts additions → repository/service with real-Mongo tests → routes), then the web in the order list → detail → form; use a custom URL-param serializer + lenient `.catch()` search schema, keyed-result data hooks, a hand-rolled serialized optimistic status hook, a stored per-tag `key` for filtering/aggregation, and treat the 9p test-runtime problem as a Wave-0 environment decision.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Input validation (body, query, id) | API / Backend | Browser (UX feedback only) | API validates with contracts on every route; the form runs the same schema for immediate feedback but is never trusted |
| Tag normalization (trim, collapse, dedupe, cap, key) | `@tfm/contracts` (pure fn) | API service (source of truth), Browser (immediate feedback) | D-09: one implementation, imported by both |
| Status history, `appliedAt`, `updatedAt` rules | API service + Mongo atomic update | — | Rules must hold for any client and under concurrent requests |
| Filtering, sorting, tag aggregation | Database (Mongo query/aggregation) | API repository builds the query | Done server-side so the UI stays dumb; dozens of docs, no pagination (D-10) |
| Filter/sort state | Browser URL (router search params) | Scene reads/writes, pod receives props | APP-07: survives reload; scene decides navigation |
| Optimistic status change + rollback | Browser (hook in detail pod) | API (authoritative) | D-15; server result replaces the optimistic VM |
| Form state and validation display | Browser (TanStack Form in edit pod) | API 400 `details` as fallback | D-16 |
| Rendering of user text (`offerText`, `notes`, title) | Browser (React text nodes) | — | React escapes; never `dangerouslySetInnerHTML` |
| Delete confirmation | Browser (AlertDialog) | API `DELETE` | APP-03; API never deletes documents |
| Persistence | MongoDB `applications` collection | — | `documents` collection untouched this phase |

## Standard Stack

### Core (already installed, verified in `package.json` files)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| react / react-dom | 19.3.1 | UI | [VERIFIED: apps/web/package.json:22-23] |
| @tanstack/react-router | 1.170.44 | file routes, search params | [VERIFIED: apps/web/package.json:16]; `router-core` resolves to 1.171.37 [VERIFIED: node_modules/@tanstack/router-core/package.json] |
| zod | 4.6.7 | schemas (shared via contracts) | [VERIFIED: packages/contracts/package.json] |
| radix-ui | 1.8.1 | monolithic primitives: `AlertDialog`, `Collapsible`, `Label`, `ToggleGroup`, `Dialog`, … | [VERIFIED: `import('radix-ui')` export list: AccessibleIcon Accordion AlertDialog AspectRatio Avatar Checkbox Collapsible ContextMenu Dialog Direction DropdownMenu Form HoverCard Label Menubar NavigationMenu Popover Portal Progress RadioGroup ScrollArea Select Separator Slider Slot Switch Tabs Toast Toggle ToggleGroup Toolbar Tooltip VisuallyHidden …] |
| hono | 4.13.13 | API | [VERIFIED: apps/api/package.json:18] |
| mongodb | 7.7.0 | driver (against server 8.3.13) | [VERIFIED: apps/api/package.json:19; `db.admin().serverInfo()` → `8.3.13`] |
| vitest | 5.0.4 + @testing-library/react 16.3.3, user-event 14.6.8, jest-dom 7.0.1, jsdom 30.1.2 | tests | [VERIFIED: root + apps/web package.json] |

### New (the only one)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @tanstack/react-form | **1.33.5** (pin exact, like every other dependency) | Form state, field-level errors, submit lifecycle | Mandated by CLAUDE.md/D-16; `latest` dist-tag is 1.33.5, published 2026-08-11 (>2 months old); peer `react ^17 \|\| ^18 \|\| ^19` [VERIFIED: `npm view @tanstack/react-form dist-tags peerDependencies time`]. Works with react 19.3.1 + zod 4.6.7 in a scratch install with the exact pins [VERIFIED: 3 form tests green]. Ignore `2.0.0-alpha.*`. |

Transitive: `@tanstack/form-core@1.33.5` → `@tanstack/store ^0.11.0` (0.11.2 already installed), `@tanstack/pacer-lite ^0.1.1`, `@tanstack/devtools-event-client ^0.4.1`; `@tanstack/react-store ^0.11.0` is already satisfied by the installed 0.11.2 [VERIFIED: `npm view @tanstack/form-core@1.33.5 dependencies`; installed versions].

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled form-state wrapper | `react-hook-form` | Not in the closed stack; rejected |
| `useOptimistic` | hand-rolled hook | See Q3: both revert on failure, but `useOptimistic` lets two PATCHes run concurrently |
| Stored tag `key` | regex `/i` or collation strength 2 | Both correct for Unicode, but neither is index-servable with the existing `tags.label_1` and both can drift from the JS `toLowerCase()` used to dedupe |
| Radix `Select` | native `<select>` | Native is keyboard/mobile/jsdom friendly; Radix Select needs pointer-capture stubs in jsdom |
| `mongodb-memory-server` | real Mongo (D-11) | Confirmed unnecessary: real Mongo 8.3.13 is reachable and tests run in ~6 s today; the memory server would add a dependency plus a binary download over the slow 9p mount |

**Installation:**
```bash
npm install --save-exact @tanstack/react-form@1.33.5 -w @tfm/web
# then confirm the transitive resolved to the older 0.4.x (see audit):
npm ls @tanstack/devtools-event-client   # expect 0.4.4, NOT 0.5.1
```

**Version verification:** `npm view @tanstack/react-form version` → `1.33.5` (2026-08-11). Scratch install with `--legacy-peer-deps` (the repo's `.npmrc` sets `legacy-peer-deps=true`) resolved `@tanstack/devtools-event-client@0.4.4` (published 2026-06-19) [VERIFIED: scratch `node_modules/@tanstack/devtools-event-client/package.json`].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @tanstack/react-form | npm | 1.33.5 published 2026-08-11 (series since 2023) | ~5.8M/wk | github.com/TanStack/form | OK | Approved |
| @tanstack/form-core | npm | 2026-08-11 | ~6.4M/wk | github.com/TanStack/form | OK | Approved (transitive) |
| @tanstack/pacer-lite | npm | 2026-09-28 | ~6.8M/wk | — | OK | Approved (transitive) |
| @tanstack/store | npm | 2026-09-29 (0.11.2 already installed) | ~35M/wk | — | OK | Already installed |
| @tanstack/devtools-event-client | npm | latest tag 0.5.1 published **2026-10-29** | ~14.3M/wk | github.com/TanStack/devtools | **SUS** (`too-new`) | Flagged — see note |

[VERIFIED: `gsd-tools query package-legitimacy check --ecosystem npm …`; `npm view … scripts.postinstall` is empty for react-form]

**Packages removed due to SLOP:** none.
**Packages flagged SUS:** `@tanstack/devtools-event-client` — the SUS reason is `too-new` for its *latest* dist-tag (0.5.1, published today). `@tanstack/form-core@1.33.5` depends on `^0.4.1`, which npm resolves to **0.4.4 (2026-06-19)**, not 0.5.x [VERIFIED: scratch install]. Planner: add one `checkpoint:human-verify` (or an automated `npm ls` assertion) right after install confirming the lockfile holds 0.4.x; if it ever resolves 0.5.1, add an `overrides` pin to 0.4.4.

## Architecture Patterns

### System Architecture Diagram

```
Browser URL  /applications?status=enviada&tags=React&tags=Node.js&q=acme&sort=appliedAt
   │  parseSearch (URLSearchParams, strings only)  ──►  listSearchSchema (per-field .catch(undefined))
   ▼
routes/applications/index.tsx  ──►  scenes/application-list.scene.tsx
   │   getRouteApi("/applications/").useSearch()  → query (validated, junk keys ignored)
   │   navigate({ search: next })  ← onQueryChange(next)           [scene owns navigation]
   ▼
pods/application-list  (container → hook → api.ts → mapper → component)
   │   api.ts: build "?status=a&status=b&tags=…" from KNOWN keys only
   ▼  fetch GET /api/applications?…        fetch GET /api/tags
Vite proxy (:5173 → :3000)   |   prod: same origin :8080
   ▼
apps/api  createApp({ …ping deps, db })
   ├─ secureHeaders ─ requireJson(POST|PUT|PATCH) ─ routes
   ├─ applications.routes   parse (contracts) ─► service ─► repository ─► Mongo `applications`
   │        └─ errors: ZodError→400, ApiError(404/…)→JSON, anything else→500 (existing onError)
   └─ tags.routes           aggregation by (tags.key, tags.group)
Detail:  PATCH /api/applications/:id/status ─► one findOneAndUpdate (pipeline update)
         ─► returns Application ─► mapper ─► optimistic VM replaced by server VM
```

### Recommended Project Structure

```
packages/contracts/src/
  tag.normalize.ts             NEW  normalizeTagLabel, tagKey, normalizeTags (+ tag.normalize.test.ts)
  application.schema.ts        EDIT query: q .max(100); tags item .trim().min(1).max(40); multi arrays .max(20)
  index.ts                     EDIT export * from "./tag.normalize.js"
apps/api/src/
  app.ts                       EDIT AppDeps gains `db?: Db`; mount routes BEFORE serveStatic
  db/mongo.ts                  EDIT extract `ensureIndexes(db)`; add { "tags.key": 1 } index
  test/mongo.ts                NEW  per-file unique test DB helper (not matched by *.test.ts)
  applications/
    applications.repository.ts   Mongo access only (filters, sort, atomic updates, aggregation)
    applications.service.ts      rules (history, appliedAt, normalization, whitelist), injected clock
    applications.routes.ts       Hono sub-app (parse → service → JSON)
    applications.mapper.ts       ApplicationDoc → Application (id, ISO dates, strips tag.key)
    object-id.ts                 parseObjectId (strict 24-hex) + escapeRegex  (or inline)
    *.test.ts                    service.test.ts (real Mongo), routes.test.ts, mapper.test.ts
  tags/tags.routes.ts            GET /api/tags
  http/require-json.ts           NEW  middleware (content-type guard)
apps/web/src/
  core/router/search-params.ts       parseSearch / stringifySearch (+ test)
  core/router/application-search.ts  listSearchSchema + DEFAULT_QUERY (+ test)
  core/router/router.ts              EDIT createRouter({ routeTree, history, parseSearch, stringifySearch })
  common/components/status-badge.tsx, tag-chip.tsx, request-status.tsx (+ tests)
  common/components/ui/  input.tsx label.tsx textarea.tsx native-select.tsx alert-dialog.tsx collapsible.tsx skeleton.tsx
  common/hooks/use-debounced-value.ts
  common/lib/format.ts               EDIT + formatSalaryRange (+ test)
  scenes/application-list.scene.tsx (EDIT), application-detail.scene.tsx, application-edit.scene.tsx
  routes/applications/index.tsx (EDIT: validateSearch + search middleware), new.tsx,
         $applicationId/index.tsx, $applicationId/edit.tsx;   routeTree.gen.ts REGENERATED
  pods/application-list/    api/api.ts; vm; mapper; hooks (useApplicationList, useStackTags); container; component;
                            components/{application-card,filter-bar,status-filter,tag-filter,list-skeleton,empty-state,empty-filtered-state}.tsx
  pods/application-detail/  api/api.ts (getApplication, patchApplicationStatus, deleteApplication); vm; mapper;
                            hooks (useApplicationDetail: load + changeStatus + remove); container; component;
                            components/{offer-data,tag-groups,status-select,status-history,notes-section,offer-text,delete-dialog}.tsx
  pods/application-edit/    api/api.ts (getApplication, createApplication, updateApplication); vm (form values);
                            mapper (API→form VM, form VM→API input draft, server details→fields, issue→Spanish);
                            hooks (useApplicationForm); container; component;
                            components/{job-section,conditions-section,tags-section,tag-group-input,tracking-section,form-field}.tsx
```

`application-detail` and `application-edit` both need `getApplication`; each pod keeps its own `api/api.ts` (a pod never imports another pod — a 3-line duplication is the rule, not a smell).

### Pattern 1 (Q2): Search params — custom serializer + lenient schema derived from contracts

**What:** The browser URL uses plain repeated keys (`?status=enviada&status=rechazada&q=123`), every value stays a string, and invalid or hostile values degrade to "filter not applied" instead of an error screen.

**Evidence** [VERIFIED: scratch Vitest runs on `@tanstack/react-router@1.170.44`, `zod@4.6.7`]:
- Default `defaultParseSearch("?status=guardada&status=enviada&q=123&tags=React&tags=2&flag=true")` → `{"status":["guardada","enviada"],"q":123,"tags":["React",2],"flag":true}` — repeated keys do become arrays (good) but numbers/booleans/null are coerced.
- Default `defaultStringifySearch({status:["guardada","enviada"], q:"123"})` → `?status=%5B%22guardada%22%2C%22enviada%22%5D&q=%22123%22` (JSON in the URL).
- With the strict schema and default parsing, `/applications?q=123` throws `SearchParamError … Invalid input: expected string, received number`.
- `router-core/dist/esm/router.js:683-690`: `preMatchSearch = { ...parentSearch, ...strictSearch }` — so `useSearch()` returns raw keys merged with validated ones; `?status=foo` survived as `"status":"foo"` when the validator merely *omitted* the key. Writing explicit `undefined` (what `.catch(undefined)` does) overrides it [VERIFIED: `/applications?status=foo` → `{"sort":"updatedAt"}` after the fix].
- Function validators make `sort` required in typed `navigate({ search })`; a Standard-Schema validator keeps input types permissive (`search: {}` compiles) [VERIFIED: tsc 6.0.3 on both variants]. `.catch()` widens the input type to `unknown`, so `status: 5` also compiles — acceptable, the output type stays exact.
- `stripSearchParams({ sort: "updatedAt" })` keeps the default out of the URL; without it `navigate({ search: {} })` yields `/applications?sort=updatedAt` [VERIFIED].

**Example:**
```ts
// apps/web/src/core/router/search-params.ts   (unit-tested; no `any`)
export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr);
  const out: Record<string, unknown> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    out[key] = values.length === 1 ? values[0] : values;
  }
  return out;
}
export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === "") continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

// apps/web/src/core/router/application-search.ts   (derived from contracts, per-field lenient)
import { applicationQuerySchema } from "@tfm/contracts";
import { z } from "zod";
const { status, tags, workMode, seniority, q, sort } = applicationQuerySchema.shape;
export const listSearchSchema = z.object({
  status: status.catch(undefined), tags: tags.catch(undefined),
  workMode: workMode.catch(undefined), seniority: seniority.catch(undefined),
  q: q.catch(undefined), sort: sort.catch("updatedAt"),
});
export const DEFAULT_QUERY = applicationQuerySchema.parse({});   // { sort: "updatedAt" }

// apps/web/src/routes/applications/index.tsx
export const Route = createFileRoute("/applications/")({
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams({ sort: "updatedAt" })] },
  component: ApplicationListScene,
});
// core/router/router.ts
createRouter({ routeTree, history, parseSearch, stringifySearch })
```
**Scene wiring** (avoids the route⇄scene import cycle): `const routeApi = getRouteApi("/applications/")` then `routeApi.useSearch()` / `routeApi.useNavigate()` [VERIFIED: compiles with `getRouteApi` on 1.170.44]. «Limpiar filtros» = `navigate({ search: {}, replace: true })`: runtime URL becomes `/applications` [VERIFIED]. Clear **also resets sort** (APP-07 says filters *and* sort can be cleared); the "empty-by-filters" state keys off `status/tags/workMode/seniority/q` only, not `sort`.

**API query string** (`pods/application-list/api/api.ts`): build from the known keys only, never spread `search` — junk keys (`status[$ne]`, `__proto__`) still pass through `useSearch()` [VERIFIED]:
```ts
const params = new URLSearchParams();
for (const s of query.status ?? []) params.append("status", s);
for (const t of query.tags ?? []) params.append("tags", t);
if (query.workMode) params.set("workMode", query.workMode);
if (query.seniority) params.set("seniority", query.seniority);
if (query.q) params.set("q", query.q);
params.set("sort", query.sort);
```
Use `replace: true` on every filter navigation so Back leaves the list instead of replaying keystrokes. Debounce `q` ≈ 300 ms with a local text state; to reset the input on «Limpiar filtros» remount the input with `key={clearCount}` — **do not** sync URL→text during render (it eats characters typed while the debounce is pending).

### Pattern 2 (Q1): TanStack Form 1.33.5 with the contracts schema

**Evidence** [VERIFIED: 5 green scratch tests on react 19.3.1 / zod 4.6.7 / @tanstack/react-form 1.33.5]:
- Form values are the VM (strings), so the contracts schema cannot be a direct Standard-Schema validator. Use a form-level validator function that maps VM→API draft, `safeParse`s with `applicationInputSchema`, and returns `{ fields: { [name]: message } }`; errors land on `field.state.meta.errors` as strings.
- A Standard Schema passed directly to `validators.onSubmit` also works when value shape = schema shape; errors are **issue objects** (`{code, path, minimum, message}`), and the cross-field refine reports on `salaryMax` (`path: ["salaryMax"]`) — i.e. the refine's path is honoured either way.
- `revalidateLogic({ mode: "submit", modeAfterSubmission: "change" })` + `validators.onDynamic` gives "errors appear on first submit, then update live while typing" [VERIFIED: before submit `[]`, after submit one error, after fixing `[]`].
- `onSubmitAsync` returning `{ fields: { company: "…" } }` sets a server-side field error; it clears when the user edits the field [VERIFIED]. Map HttpError `details.fieldErrors` (the API sends `z.flattenError`: `{formErrors, fieldErrors}`, top-level path keys only) onto fields there; a generic «Revisa este campo» is enough because the client already validated.
- `onSubmitInvalid` exists on `FormApi` (`form-core/dist/esm/FormApi.d.ts:163`) — use it to focus the first `[aria-invalid="true"]`.
- Enter inside a chip input: call `e.preventDefault()` in `onKeyDown`, otherwise the implicit form submit fires; with it, Enter adds the chip and the form is not submitted [VERIFIED with user-event].

**Messages:** Zod's built-in English text surfaced in the field. `z.locales.es()` exists on 4.6.7 but is robotic («Demasiado pequeño: se esperaba que texto tuviera >=2 caracteres», «Inválido URL») [VERIFIED]. Prefer a small pure `issueToMessage(issue)` in the edit mapper keyed by `issue.path[0]` + `issue.code` (`too_small`/`too_big` give `minimum`/`maximum`; `invalid_format`; `invalid_type`; `custom` on `salaryMax`) producing DS-voice Spanish («El puesto necesita al menos 2 caracteres», «El máximo no puede ser menor que el mínimo»), with `z.locales.es()` unused. Do not edit the contracts' message (`"salaryMax debe ser >= salaryMin"`, `application.schema.ts:53-56`); map it in the web.

**Form-VM rules (D-16):** every nullable string is `""` in the VM and `null` in the draft (`location`, `currency`, `sourceUrl`, `notes`, `offerText` — the schema does *not* turn `""` into `null`; `sourceUrl: ""` would fail URL validation and `currency: ""` fails the 3-letter regex). Salary inputs are `<input type="number">`; `""`→`null`. `tags` is ONE array field of `{label, group}` rendered by three `TagGroupInput`s (filter by group); adding calls `normalizeTags([...current, new])` and compares lengths to show «Ya está en la lista» / «Máximo 20 etiquetas» in an `aria-live="polite"` region. `offerText` is carried through the VM untouched (no input) so PUT does not wipe it (Q9).

**A11y wiring** (verified shape): `<label htmlFor>`; `aria-invalid={errors.length>0 || undefined}`; `aria-describedby="<id>-error"` pointing at `<p id="<id>-error">`; error text is the Spanish string; chips use `aria-label="Quitar <label>"`.

**Dates:** `appliedAt` in the VM is `yyyy-mm-dd` (local). VM→API: local noon `new Date(y, m-1, d, 12).toISOString()`; API→VM: local date of the instant. Local noon survives DST/time-zone display; only the date is ever shown.

### Pattern 3 (Q3): Optimistic status change — hand-rolled, serialized, snapshot-from-closure

**Recommendation: hand-rolled inside `application-detail.hooks.ts` (HIGH).**

**Evidence** [VERIFIED: scratch tests of both variants]: on a rejected PATCH both `useOptimistic` (inside `startTransition`) and the hand-rolled hook revert to `guardada` and show the error. On a double-click with two *different* statuses, `useOptimistic` fired **both** PATCHes (`enviada,rechazada`) concurrently — final server/UI order then depends on network ordering; the hand-rolled hook with a `busy` ref fired exactly one (`enviada`). `useOptimistic` also needs the error `setState` wrapped in a second `startTransition` after the `await` (state updates after an `await` leave the transition). The repo's ESLint (`react-hooks` v7 flat recommended) lints the hand-rolled version clean [VERIFIED: `eslint --stdin` with `apps/web/**` config].

```ts
// application-detail.hooks.ts (shape; lint-clean)
const changeStatus = useCallback(async (next: StatusVm) => {
  if (busy.current || vm === null || vm.status === next) return;   // serialize + no-op on same status
  busy.current = true;
  const snapshot = loaded;                                          // from closure, not from a state updater
  setStatusError(null); setPendingStatus(next);
  setLoaded({ ...loaded!, vm: withOptimisticStatus(vm, next, new Date().toISOString()) }); // VM→VM pure fn in the mapper
  try {
    const saved = await patchApplicationStatus(id, next);
    setLoaded({ key, outcome: "ok", vm: mapApplicationFromApiToVm(saved) });   // mapper applied on receipt
  } catch { setLoaded(snapshot); setStatusError("No se pudo cambiar el estado. Inténtalo de nuevo."); }
  finally { busy.current = false; setPendingStatus(null); }
}, [id, key, loaded, vm]);
```
- Disable the select while `pendingStatus !== null` and set `aria-busy`; announce the error in an `aria-live="polite"` region.
- Unmount: do **not** abort the PATCH (an aborted request may still have been applied); React 19 ignores `setState` after unmount, so no guard needed. The GET uses `AbortController` (cleanup aborts).
- Mapper rule preserved: API→VM only happens on receipt; the optimistic step is a pure VM→VM function. `new Date()` runs in the handler, never during render (`react-hooks/purity`).

### Pattern 4: Data hooks — keyed result (the only lint-clean shape)

**Evidence** [VERIFIED: `eslint --stdin --stdin-filename apps/web/src/pods/x/x.hooks.ts` with the repo config]: the classic `useEffect(() => { setState({status:"loading"}); fetch(...) … })` fails with `react-hooks/set-state-in-effect` (**error**), which blocks pre-commit (`eslint --max-warnings=0`). This passes:
```ts
type Result = { key: string; outcome: "ok"; items: CardVm[] } | { key: string; outcome: "error"; message: string };
const [result, setResult] = useState<Result | null>(null);
const [attempt, setAttempt] = useState(0);
const key = `${JSON.stringify(query)}#${attempt}`;
useEffect(() => {
  const controller = new AbortController();
  getApplications(query, controller.signal)
    .then((data) => setResult({ key, outcome: "ok", items: mapApplicationListFromApiToVm(data) }))
    .catch((error: unknown) => {
      if (controller.signal.aborted) return;                       // ignore abort; setState only in async callbacks
      setResult({ key, outcome: "error", message: errorMessage(error) });
    });
  return () => controller.abort();
}, [key]);                                                          // `query` is inside `key`
const current = result?.key === key ? result : null;               // null ⇒ loading (derived, no setState in effect)
// retry = () => setAttempt((n) => n + 1)
```
For «stale-while-refresh» keep the last `ok` result and expose `refreshing = current === null && last !== null` (render the old cards with `aria-busy="true"`, skeleton only on first load). Same pattern for `useStackTags`, detail and edit-load. The debounce hook (`setTimeout(() => setDebounced(v), ms)` inside an effect) is also lint-clean [VERIFIED].

### Pattern 5 (Q4): Mongo recipes (all executed on 8.3.13)

**Document shape** (repository type, not a contract): tags are stored `{ label, group, key }` where `key = tagKey(label)`; dates are BSON `Date`; `appliedAt: Date | null`; `interviews: []`; `ownerId: null`; `cvDocumentId/coverLetterDocumentId: string | null`. The mapper strips `key` and converts `_id`→`id`, `Date`→`toISOString()`.

**(a) Tag AND filter.** All three approaches returned identical, correct results, including non-ASCII (`Ñandú`/`ñandú`, `Éxito`/`éxito`) — i.e. regex `/i` and collation are Unicode-correct on Mongo 8. They differ in index use [VERIFIED `explain("executionStats")`]:

| Approach | Plan | keys/docs examined (8 docs) |
|----------|------|------------------------------|
| `$all` + `$elemMatch {label: /^react$/i, group}` | `IXSCAN(tags.label_1)` over the whole index (`["", {})` bound) | 13 / 8 |
| `$all` + `$elemMatch {label}` + collation strength 2, no collated index | `COLLSCAN` | 0 / 8 |
| same + index created with the same collation | `IXSCAN(tags.label_ci)` | 4 / 4 |
| `$all` + `$elemMatch {key, group}` + index `tags.key_1` | `IXSCAN(tags.key_1)` tight bounds | 2 / 2 |

**Recommendation: store `key` per tag and add index `{ "tags.key": 1 }`** (MEDIUM-HIGH). Reason: D-04 asks for comparison "coherente con la normalización"; the JS function that dedupes (`toLowerCase()` after trim/collapse/NFC) and the Mongo comparison must be the same function, otherwise "React"/"react" can dedupe in the form but not match in a filter (or vice versa) for exotic characters. A stored key makes both sides identical by construction, and is the only variant whose index bounds are tight. At "decenas de registros" the plan choice has no performance impact; the argument is correctness/coherence. Filter shape:
```ts
if (query.tags?.length) {            // $all: [] matches NOTHING — never add it when empty [VERIFIED: 0 of 2]
  filter.tags = { $all: query.tags.map((label) => ({ $elemMatch: { key: tagKey(label), group: "stack" } })) };
}
```
Fallback if the planner rejects the stored key: the regex variant works and needs no schema change (`new RegExp("^" + escapeRegex(label) + "$", "i")`), at the cost of the coherence argument. The existing `tags.label_1` index becomes unused by queries; leave it (no churn). The text index `title_company_text` stays unused (D-03).

**(b) Sort.** `{ appliedAt: -1, updatedAt: -1, _id: -1 }` returned `d-2026-05 > f-2026-03-same > a-2026-03 > b-null > c-missing > e-null-old`: dated rows first, then **null and missing together last**, ordered by the tiebreakers [VERIFIED]. Ascending would put them first (not used). Default sort `{ updatedAt: -1, _id: -1 }`.

**(c) `GET /api/tags`.** `$toLower` is **ASCII-only**: grouping on `{$toLower: "$tags.label"}` left `Éxito`, `éxito`, `Ñandú`, `ñandú` as four groups [VERIFIED] — do not use it. Grouping by the stored key merges variants:
```ts
[{ $sort: { createdAt: 1, _id: 1 } },          // oldest application's spelling wins, stable under edits
 { $unwind: "$tags" },
 { $group: { _id: { key: "$tags.key", group: "$tags.group" }, label: { $first: "$tags.label" }, count: { $sum: 1 } } },
 { $project: { _id: 0, label: 1, group: "$_id.group", count: 1, key: "$_id.key" } }]
```
Result on the fixture: `React/stack 3, TypeScript/stack 2, Éxito/stack 2, Ñandú/stack 2, Inglés/language 1, Node.js/stack 1, React/nice_to_have 1, Remix/nice_to_have 1` — same tag in two groups stays two rows. `count` = number of applications (normalization guarantees one occurrence per application, so `$sum:1` after `$unwind` is exact). Do the final order in JS: `count desc`, then `label.localeCompare(other, "es")` (Mongo's binary `$sort` puts `É` after `Z`), then `group`. A collation-based `$group` (strength 2) also merges variants [VERIFIED] but needs no key only if you accept the drift risk above. The UI filters to `group === "stack"` client-side (D-05); the endpoint returns all groups per the ARCHITECTURE table.

**(d) Atomic status change.** One round trip, pipeline-style update, guarded by `status: { $ne: next }` [VERIFIED]:
```ts
col.findOneAndUpdate(
  { _id, status: { $ne: status } },
  [{ $set: {
      status: { $literal: status },
      statusHistory: { $concatArrays: ["$statusHistory", [{ status: { $literal: status }, at: now }]] },
      appliedAt: status === "enviada"
        ? { $cond: [{ $eq: [{ $ifNull: ["$appliedAt", null] }, null] }, now, "$appliedAt"] }
        : "$appliedAt",
      updatedAt: now } }],
  { returnDocument: "after" })           // driver 7 returns the document directly (or null)
```
Observed: `guardada→enviada` ⇒ history `[guardada, enviada]`, `appliedAt = now`; same status again ⇒ `null` (nothing written, `updatedAt` untouched); `→guardada→enviada` ⇒ history grows, **`appliedAt` keeps the first value**; unknown id ⇒ `null`; three concurrent `enviada` PATCHes ⇒ exactly one non-null result and `statusHistory.length === 2`; a document with the `appliedAt` field *missing* is treated as empty. `null` means "not found OR no change": follow with `findOne` — absent ⇒ `ApiError(404, "NOT_FOUND", …)`, present ⇒ return it unchanged (idempotent 200). `now` is a JS `Date` from an injected clock (testability), not `$$NOW`. The `$literal` wrapper keeps a `$`-prefixed string from being parsed as a field path (status is enum-validated anyway).

**(e) `q`.** `{ $or: [{ title: { $regex: esc(q), $options: "i" } }, { company: … }] }` with `esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`: `c++`, `(test)`, `ÑU`, `ÉXITO` matched as literals; `.*` matched nothing; `(a+)+$` returned instantly (0 ms) [VERIFIED]. Unescaped `(a+` throws `Location51091`; an object passed as `$regex` throws `BadValue` — so the escaped string is mandatory and the value must be a string (Zod guarantees). Add `.max(100)` to `q` in the contracts query schema (currently only `.trim().min(1)`, `application.schema.ts:90`).

**(f) ids and dates.** `ObjectId.isValid` in driver 7.7.0 is strict (`"abc"`, `"aaaaaaaaaaaa"`, 23/25-char and padded strings all `false`) [VERIFIED], but use the explicit `/^[0-9a-f]{24}$/i` guard so the behaviour does not depend on a driver upgrade. **A malformed `:id` answers 404 `NOT_FOUND`** (it cannot identify anything; avoids a second branch and an oracle). Never call `new ObjectId(raw)` before the guard — `BSONError` would surface as 500. Mapper: `doc._id.toHexString()`, `Date#toISOString()` (UTC, ms, `Z` — accepted by `z.iso.datetime()`).

### Pattern 6 (Q5): API tests on real Mongo

- **Isolation.** Vitest runs test files in parallel forks, so two files sharing literally `tfm_test` would race on `deleteMany`. Use one **database per test file**: `tfm_test_<8 hex>` from `randomUUID()`, `deleteMany({})` on `applications`/`documents` in `beforeEach`, `dropDatabase()` in `afterAll`, `client.close()` in `afterAll`. This honours D-11 (real Mongo, `tfm_test…`, cleaned per test) without a race. [ASSUMED mechanism: standard Vitest forks behaviour; the 6-file web run confirms parallel forks — Mongo race itself not exercised]
- **Safety guard** in the helper: refuse any name that does not start with `tfm_test`, and never call `client.db()` without a name (the URL path is `/tfm` — real data).
- **Missing `MONGO_URL`:** throw a clear error (do not silently skip; DEMO-06 wants a green suite to mean something). The Dockerfile does not run tests (`grep` of `Dockerfile` shows only `npm ci` + `npm run build`).
- **Route tests:** `createApp({ ...allUp, db })` and `app.request(...)`; `db` must be optional in `AppDeps` so Phase 1's `app.test.ts` (`allUp` without `db`) keeps compiling. Services take an injectable clock (`now: () => Date`).
- `mongodb-memory-server` is **not needed** (real Mongo 8.3.13 reachable, API suite ≈ 6 s).
- Hono facts [VERIFIED on 4.13.13]: a sub-app mounted with `app.route("/api/applications", sub)` uses the parent's `onError` (a `ZodError` in the sub-app became the parent's 400 handler); `c.req.queries()` returns arrays for every key (including `status[$ne]`/`__proto__` as plain own keys) so build the Zod input with a helper that unwraps single values; `/api/applications/` (trailing slash) is 404 (strict routing); `hono/body-limit` exists.

### Anti-Patterns to Avoid
- `setState` synchronously in an effect body (lint error); reading refs during render.
- Spreading `search`/`prev` into API URLs or Mongo filters.
- Passing request objects, query objects or `c.req.json()` results into Mongo without a Zod parse; building `$regex` from unescaped input; `$toLower` for non-ASCII grouping.
- Re-fetching inside the optimistic handler; aborting a mutation on unmount.
- `extends`/`Omit` of API types in a VM; importing one pod from another.
- Letting the PUT body drive `status`, `statusHistory`, `interviews`, `createdAt`, `ownerId`, `id`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state, touched/dirty, submit lifecycle | custom `useReducer` form | `@tanstack/react-form` 1.33.5 | Mandated; submit/validation timing (`revalidateLogic`) is subtle |
| Accessible confirm dialog / focus trap | custom modal | `AlertDialog` from `radix-ui` wrapped as `ui/alert-dialog.tsx` | Focus trap, `role="alertdialog"`, Esc, portal; the Sheet already uses the same package |
| Collapsible with correct ARIA | custom toggle | `Collapsible` from `radix-ui` | `aria-expanded/controls`, content unmounted while closed (large `offerText` not rendered until opened) |
| Multi-select status filter | custom checkbox popover | `ToggleGroup type="multiple"` (already in `ui/toggle-group.tsx`) | `aria-pressed`, roving focus, jsdom-testable |
| Query-string encoding | manual `encodeURIComponent` joins | `URLSearchParams` (`append` for repeated keys) | Correct escaping of `C#`, `.NET 8`, `&` |
| Regex escaping | ad-hoc replace | one tested `escapeRegex` (the verified class above) | ReDoS/injection surface |
| ObjectId parsing | `new ObjectId(raw)` in handlers | `parseObjectId` (24-hex guard) | Garbage ids must be 404, not 500 |
| Tag dedupe/keys | per-site `toLowerCase` | `normalizeTags`/`tagKey` from `@tfm/contracts` | D-09: one implementation for form, service, filter, aggregation |
| Status rule under concurrency | read-modify-write in JS | single pipeline `findOneAndUpdate` | Verified atomic; no lost update |
| Currency/date formatting | string concat | `formatMoney`/`formatDate` (Phase 1) + new `formatSalaryRange` | `Intl` es-ES, `useGrouping: "always"` already handled |
| Skeleton | animation lib | a `div` with `animate-pulse bg-muted` (tw-animate-css installed) | 5 lines |

**Key insight:** every "custom" thing in this phase is a place where two layers must agree (form vs service vs Mongo on what a tag is; URL vs API on filter shape; client vs server on the status rule). Each is solved by one shared pure function or one atomic server operation, never by re-implementing on both sides.

## Common Pitfalls

### Pitfall 1: `react-hooks/set-state-in-effect` blocks the commit
**What goes wrong:** the textbook loading hook fails ESLint with an *error* (`Calling setState synchronously within an effect…`), and pre-commit runs `eslint --max-warnings=0`.
**Why:** `eslint-plugin-react-hooks@7.1.1` flat recommended includes the React-Compiler rules [VERIFIED: ran the repo config over a sample].
**Avoid:** the keyed-result pattern (Pattern 4); `setState` only inside async callbacks/timeouts. **Warning sign:** the first hook plan task fails `npm run lint`.

### Pitfall 2: Default router search serialization
**What goes wrong:** `q=123` → number → `SearchParamError`; arrays stored as JSON; URLs unreadable and unlike the API shape. **Avoid:** Pattern 1. **Warning sign:** a search for "2024" blanks the page.

### Pitfall 3: `useSearch()` leaks raw junk
**What goes wrong:** validator "drops" a bad key but the raw value is merged back (`status: "foo"`). **Avoid:** `.catch(undefined)` per field (explicit `undefined`), build API/navigation objects from known keys only.

### Pitfall 4: Phase 1 tests encode the Phase 1 stub
**What goes wrong:** `core/router/router.test.tsx` expects the empty-state text immediately at `/applications` and `application-list.test.tsx` uses a 4-field `ApplicationListItem` with `toStrictEqual`. After the list fetches, both break. **Avoid:** rewrite them in the list plan; add a small `mockFetch(routes)` helper in `src/test/`; `setup.ts` already `vi.unstubAllGlobals()` after each test.

### Pitfall 5: `applicationInputSchema.status` has a default
**What goes wrong:** PUT body without `status` parses to `status: "guardada"`; a naive `$set: input` would reset every edited application to `guardada`. **Avoid:** the repository `$set` is built from an explicit whitelist function (not destructure-and-spread, not `_unused` variables which ESLint flags); test: PUT with `status: "rechazada"` and PUT with no status both leave `status`/`statusHistory` untouched.

### Pitfall 6: `$all: []` matches nothing
Verified (0 of 2). Only add the tags condition when the list is non-empty. Same for `$in: []` on `status`.

### Pitfall 7: `$toLower` is ASCII-only
Verified (see Q4c). Never group tags on it.

### Pitfall 8: Pipeline update null result is ambiguous
`findOneAndUpdate` returns `null` for both "no such id" and "already in that status". Follow with `findOne` (Q4d).

### Pitfall 9: `""` is not `null`
The contracts accept `location: ""`, reject `sourceUrl: ""` and `currency: ""`. The edit mapper must convert every empty nullable string to `null` and test it.

### Pitfall 10: Dates in the form
Using `T00:00:00.000Z` for a date input shows the previous day in negative-offset zones and `toISOString().slice(0,10)` shows UTC dates for auto-set `appliedAt`. Use local noon one way and the local date the other (Pattern 2).

### Pitfall 11: Slow `/workspaces` (9p) makes every web check expensive
Measured on this devcontainer (14 CPUs): `npm run test -w @tfm/web` **52–63 s** (6 files, 41 tests; "environment 65–67 %"), `npm run typecheck` (all workspaces) **113 s**, contracts tests 24 s wall, API tests 10 s wall. The same Vitest/jsdom stack on the container overlay FS ran a router test file in **0.98 s**. See Q6. **Avoid:** budget web checks per wave, not per task; keep pure logic in contracts/API tests where feedback is seconds.

### Pitfall 12: New file routes need a regenerated `routeTree.gen.ts`
The route plugin runs in `vite dev`/`vite build`, not in Vitest. Add routes → run `npm run build -w @tfm/web` (or dev) to regenerate and **commit** `apps/web/src/routeTree.gen.ts` (ESLint- and Prettier-ignored). Typecheck before regeneration fails on unknown route ids.

### Pitfall 13: Radix `Select` in jsdom
Needs pointer-capture/scroll stubs and is awkward with user-event; use native `<select>` (`userEvent.selectOptions`). [ASSUMED: known Radix+jsdom behaviour, not exercised here]

### Pitfall 14: Mount order in `createApp`
Register `/api/applications` and `/api/tags` before `app.use("*", serveStatic(...))` and `notFound` (health already precedes static). Trailing slash is 404 — web never sends one.

### Pitfall 15: List payload carries `offerText`/`notes`
The list returns full `Application` documents (needed for `applicationSchema.array()` validation in `http-client`). At ≤ ~50 docs × ≤ 20 KB it is acceptable locally; do not project them away (the web's Zod defaults would turn a stored text into `null`).

## Code Examples

### Contracts additions (D-09)
```ts
// packages/contracts/src/tag.normalize.ts   [MAX_TAGS = 20 → tag.schema.ts:4; Tag → tag.schema.ts:16]
import { MAX_TAGS, type Tag } from "./tag.schema.js";

export const normalizeTagLabel = (label: string): string =>
  label.normalize("NFC").trim().replace(/\s+/g, " ");
export const tagKey = (label: string): string => normalizeTagLabel(label).toLowerCase();

/** trim + collapse + dedupe by key across ALL groups (first spelling and first group win) + cap at MAX_TAGS */
export function normalizeTags(tags: readonly Tag[]): Tag[] {
  const seen = new Set<string>();
  const out: Tag[] = [];
  for (const tag of tags) {
    const label = normalizeTagLabel(tag.label);
    if (label === "") continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, group: tag.group });
    if (out.length === MAX_TAGS) break;
  }
  return out;
}
```
Dedupe is by label across groups (literal reading of DOMAIN.md «sin duplicados por `label` normalizado»); see Open Question 1. Note the schema's `tags: z.array(tagSchema).max(MAX_TAGS)` runs *before* the service, so >20 raw tags is a 400 even if dedupe would shrink them; the form always sends normalized tags.

### Route handler skeleton (validation, id, mass-assignment)
```ts
// applications.routes.ts
const ID = /^[0-9a-f]{24}$/i;
export const parseObjectId = (raw: string): ObjectId => {
  if (!ID.test(raw)) throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
  return new ObjectId(raw);
};
const queryInput = (q: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v.length === 1 ? v[0] : v]));

routes.get("/", async (c) => c.json(await service.list(applicationQuerySchema.parse(queryInput(c.req.queries())))));
routes.post("/", async (c) => c.json(await service.create(applicationInputSchema.parse(await c.req.json())), 201));
routes.put("/:id", async (c) => c.json(await service.update(parseObjectId(c.req.param("id")), applicationInputSchema.parse(await c.req.json()))));
routes.patch("/:id/status", async (c) => c.json(await service.changeStatus(parseObjectId(c.req.param("id")), statusChangeSchema.parse(await c.req.json()).status)));
routes.delete("/:id", async (c) => { await service.remove(parseObjectId(c.req.param("id"))); return c.body(null, 204); });
```
`statusChangeSchema` is `z.strictObject({ status: applicationStatusSchema })` (`application.schema.ts:74-76`), so extra keys on PATCH are a 400.

### Content-type guard (CSRF-by-simple-request, ASVS)
```ts
// http/require-json.ts — Hono accepts text/plain bodies [VERIFIED: POST text/plain → 200 echoing JSON]
export const requireJson: MiddlewareHandler = async (c, next) => {
  if (["POST", "PUT", "PATCH"].includes(c.req.method) && !c.req.header("content-type")?.toLowerCase().startsWith("application/json"))
    throw new ApiError(400, "VALIDATION_ERROR", "Se esperaba application/json");
  await next();
};
```
PATCH with no body is never used by the UI (always `{status}`), so the guard is safe.

### API test helper
```ts
// apps/api/src/test/mongo.ts
export async function useTestDb() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error("MONGO_URL is required for API integration tests (devcontainer)");
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  const name = `tfm_test_${randomUUID().slice(0, 8)}`;
  if (!name.startsWith("tfm_test")) throw new Error("refusing non-test database");
  const db = client.db(name);
  await ensureIndexes(db);
  return { db, reset: () => Promise.all(["applications", "documents"].map((c) => db.collection(c).deleteMany({}))),
           close: async () => { await db.dropDatabase(); await client.close(); } };
}
```

## Runtime State Inventory

Not a rename/refactor/migration phase — omitted. (Greenfield collections; `applications` has no Phase 1 writes. The new `tags.key` field applies from the first insert; the seed in Phase 6 must go through the service/repository so it gets keys.)

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `validateSearch` via adapter packages | Standard Schema accepted directly by TanStack Router 1.170 (Zod 4 implements it) | No `@tanstack/zod-adapter` needed [VERIFIED: tsc + runtime with `validateSearch: schema`] |
| Effect-driven `setLoading(true)` | keyed-result derived loading | Required by react-hooks v7 lint |
| `findOneAndUpdate` returns `{ value }` | driver ≥ 6 returns the document/`null` | [VERIFIED on 7.7.0] |
| TanStack Form validators `onChange: zodSchema` w/ `zodValidator` adapter | Standard Schema directly | not needed; wrapper function used because of the VM |

**Deprecated/outdated:** `mongodb-memory-server` for this project (D-11), `@hono/zod-validator` (not installed, not needed: `schema.parse` + the global `onError`), `@tanstack/react-query` (out of scope per REQUIREMENTS).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Per-file unique DB name avoids cross-file races (Vitest forks run files in parallel; race itself not reproduced) | Pattern 6 | Low: worst case flaky test; `fileParallelism: false` for the API project as fallback |
| A2 | Radix `Select` is awkward in jsdom (pointer-capture) | Pitfall 13 | Low: native `<select>` is chosen anyway |
| A3 | A cross-site `text/plain` simple POST to `localhost:3000` is possible without preflight (only the Hono half was executed) | Security | Low impact (junk record creation); guard is 6 lines |
| A4 | Dedupe by normalized label across groups (not per group) is what the author wants | Contracts example, Open Q1 | Low: change `seen` key to `${group}:${key}` |
| A5 | `ObjectId.isValid` strictness may change in future driver versions (hence the explicit regex) | Q4f | None — regex is used |
| A6 | shadcn CLI availability offline is unknown; primitives can be hand-written following `sheet.tsx` | Q7 | Low |
| A7 | Moving `node_modules` to a Docker volume fixes the 9p cost (inferred from 42 s vs 0.4 s `require('jsdom')` and 0.98 s scratch suite; the full repo suite was not run on the volume) | Q6 | Medium: needs a devcontainer rebuild decision from the user |

## Open Questions

1. **Tag dedupe scope.** DOMAIN.md says «sin duplicados por `label` normalizado» (all groups). Should "React" be allowed in both Stack and Se valora? Recommendation: follow DOMAIN.md literally (one occurrence per application), and tell the user when a tag is dropped as duplicate.
2. **Does «Limpiar filtros» also reset sort?** APP-07 says "filters and sort … can be cleared". Recommendation: yes (URL back to `/applications`); the empty-by-filters state ignores sort.
3. **Devcontainer `node_modules` volume (Q6).** Decision for the user; see Decision Risks.
4. **Salary currency input.** Small native select (EUR / USD / GBP + «—» → `null`, shown as EUR by default) vs free 3-letter text. Discretion; select avoids regex errors.
5. **Back-to-list keeps filters?** Detail → list via a plain `<Link to="/applications">` loses filters; `history.back()`/`useCanGoBack()` keeps them. Nice-to-have for the scene.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v22.23.3 | — |
| npm | workspaces | ✓ | 10.9.9 | — |
| MongoDB server | API integration tests | ✓ | 8.3.13 (ping + `serverInfo`) | — (memory server only if CI lacks Mongo, needs SUMMARY justification) |
| `MONGO_URL` env | tests, API | ✓ | set in devcontainer (value never printed) | — |
| npm registry access | installing `@tanstack/react-form` | ✓ | — | — |
| S3 / Ollama | not needed this phase | n/a | — | — |

**Missing dependencies with no fallback:** none.

## Validation Architecture

> Nyquist validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 (+ Testing Library 16.3.3 / user-event 14.6.8 / jest-dom 7.0.1 / jsdom 30.1.2 for web) [VERIFIED: package.json files] |
| Config files | `packages/contracts` (defaults), `apps/api/vitest.config.ts` (node, `@tfm/source` conditions), `apps/web/vitest.config.ts` (jsdom, `src/test/setup.ts`) |
| Quick run (per task) | contracts: `npm run test -w @tfm/contracts -- src/<file>` (~10–24 s wall); API: `npm run test -w @tfm/api -- src/applications` (~6–10 s) |
| Web (per wave) | `npm run test -w @tfm/web -- src/pods/<pod>` — **still ~45–60 s** because each fork loads jsdom over 9p |
| Full suite | `npm run typecheck && npm run lint && npm run test && npm run build` (typecheck ≈ 113 s, web tests ≈ 55 s, API ≈ 10 s, contracts ≈ 24 s on this devcontainer) |
| Sampling | After each task: the touched workspace's targeted tests (API/contracts first). After each wave: full `npm run typecheck && npm run test` + `npm run lint`. Before verify-work: full suite + build + manual rows |
| Feedback latency | seconds for contracts/API; ~1 min for web; ~2 min for typecheck (shrinks to seconds if `node_modules` moves to a volume) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APP-01 | title 2–120 / company 1–120 required; others optional; invalid → field errors | unit (contracts, exists) + integration (POST 201/400) + component (form shows Spanish errors, focuses first invalid) | `npm run test -w @tfm/contracts`; `npm run test -w @tfm/api -- src/applications`; `npm run test -w @tfm/web -- src/pods/application-edit` | contracts ✅; others ❌ Wave 0 |
| APP-02 | edit uses same form, prefilled; PUT persists | unit (mapper API→form VM and back) + integration (PUT) + component (edit prefill) | same | ❌ |
| APP-03 | confirm dialog; DELETE 204/404; documents untouched | integration (insert a `documents` row, delete app, row remains) + component (AlertDialog cancel/confirm) | API + web detail | ❌ |
| APP-04 | card content (≤3 tags + `+N`, salary, date) | unit (mapper, `formatSalaryRange`) + component | `npm run test -w @tfm/web -- src/pods/application-list src/common` | ❌ |
| APP-05 | loading / error+retry / empty / empty-by-filters | component with mocked `fetch` (hook + container) | web list | ❌ |
| APP-06 | text, status multi, tags AND (case-insens.), workMode, seniority | integration (service on real Mongo, incl. `Ñandú`/`ñandú`, `C#`, regex metachar `q`, `$all` empty guard) + component (filter bar) | API + web list | ❌ |
| APP-07 | URL ⇄ filters, reload, hostile URL, «Limpiar filtros» | unit (`parseSearch`/`stringifySearch` round-trip with `q=123`, `tags=2`, `status=foo`, `status[$ne]`) + router test (new `createAppRouter` with same memory URL ⇒ same filters) + component | `npm run test -w @tfm/web -- src/core/router src/pods/application-list` | ❌ |
| APP-08 | sort by updatedAt / appliedAt, nulls last, deterministic | integration (service on real Mongo) + component (sort select) | API + web | ❌ |
| APP-09 | detail sections; **no** rounds/documents markup; collapsible offer text; safe `sourceUrl` | component (assert absence of those headings; `aria-expanded`; `javascript:` URL not rendered as link) + mapper | web detail | ❌ |
| APP-10 | PATCH appends once; same status no-op; optimistic + rollback; single in-flight | integration (service, concurrent triple PATCH) + route (404, strict body) + hook/component (rejected PATCH reverts, error announced; double click ⇒ 1 request) | API + web detail | ❌ |
| APP-11 | `appliedAt` set once on first `enviada` when empty; manual value prevails (PUT incl. `null`); POST with `enviada` sets it | integration | API | ❌ |
| APP-12 | normalization (trim, collapse, case-insens. dedupe, first spelling, cap 20); Enter adds; remove chip | unit (contracts `normalizeTags`/`tagKey`: NFC, `C#`, `.NET 8`, empty) + integration (service stores `key`, mapper strips it) + component (`TagGroupInput`) | contracts + API + web edit | ❌ |
| APP-13 | `updatedAt` bumps on PUT/PATCH (injected clock), not on no-op | integration | API | ❌ |
| APP-14 | `GET /api/tags`: merged case variants, oldest spelling, count desc then label (`es`), same tag in 2 groups = 2 rows; options ordered | integration + component (`TagFilter` only `stack`) | API + web list | ❌ |

Security/behavior extras (each is also a threat-model row): PUT forging `id/createdAt/statusHistory/interviews/ownerId/status` is ignored; `status[$ne]=x`, `q` with regex metacharacters, `q` > 100 chars → 400; malformed `:id` → 404; `text/plain` POST → 400; error response for a too-long `offerText` does not contain the text; hostile search URLs do not crash the list.

### Wave 0 Gaps
- [ ] `apps/api/src/test/mongo.ts` (per-file test DB helper) + `ensureIndexes(db)` extraction in `db/mongo.ts`
- [ ] `packages/contracts/src/tag.normalize.ts` + `tag.normalize.test.ts`; query-schema tightening + test updates in `application.schema.test.ts`
- [ ] `apps/web/src/test/mock-fetch.ts` helper; rewrite `core/router/router.test.tsx` and `pods/application-list/application-list.test.tsx` (Pitfall 4)
- [ ] Install `@tanstack/react-form@1.33.5` (+ lock check for `devtools-event-client` 0.4.x)
- [ ] shadcn-style primitives: `input`, `label`, `textarea`, `native-select`, `alert-dialog`, `collapsible`, `skeleton`
- [ ] Decision (user): devcontainer `node_modules` volume to fix web test/typecheck latency (Q6)

## Security Domain

`security_enforcement` is enabled (ASVS level 1, block on `high`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication / V3 Session | no | Single-user local app, no login (REQUIREMENTS out of scope) |
| V4 Access Control | minimal | `ownerId` reserved and always `null`; no per-user data. Mass-assignment whitelist is the relevant control |
| V5 Input Validation | **yes** | Zod contracts on body, query and path id; escaped regex; enum-only sort |
| V7 Error handling & logging | **yes** | Existing `onError` logs only `err.message`; Zod messages contain no input values [VERIFIED: a failing `offerText`/`workMode`/`url` input's `ZodError.message` did not contain the submitted strings] |
| V8 Data protection | yes | Never log request bodies/offer text; no secrets involved |
| V10/V13 API & web service | yes | Content-type guard on write methods; JSON-only responses; `secureHeaders` already on |
| V14 Config | yes | Test DB name guard (never the `tfm` DB) |

### Threat model inputs for each plan's `<threat_model>`

| ID | Threat | STRIDE | Standard mitigation | Test |
|----|--------|--------|---------------------|------|
| T-02-01 | NoSQL operator injection via query (`status[$ne]=x`, `tags[$gt]`) | Tampering | `c.req.queries()` → Zod `applicationQuerySchema` (non-strict object strips unknown keys; enums/strings only); filter built field-by-field, never `{...query}` | `GET ?status[$ne]=x` ignores key; `?status=foo` → 400 |
| T-02-02 | NoSQL injection via JSON body (`{"title":{"$ne":null}}`) | Tampering | `applicationInputSchema.parse`; `statusChangeSchema` strict | object-valued fields → 400 |
| T-02-03 | Regex injection / ReDoS via `q` | DoS/Tampering | `escapeRegex`, `.max(100)`, string-typed only | `q=(a+)+$`, `q=.*`, 101 chars [VERIFIED instant, literal] |
| T-02-04 | Mass assignment on POST/PUT (`id`, `createdAt`, `statusHistory`, `interviews`, `ownerId`, `status` on PUT, doc ids on PUT) | Tampering/EoP | Zod strips unknown keys; repository `$set` from an explicit whitelist; `status` ignored on PUT; `ownerId` forced `null` on insert | forged PUT leaves fields unchanged |
| T-02-05 | Malformed `:id` causing 500/stack leak | Info disclosure | 24-hex guard → 404 before `new ObjectId` | `/api/applications/abc` → 404 JSON |
| T-02-06 | Stored XSS via `title/company/notes/offerText/tag labels` | Tampering | React text nodes only; no `dangerouslySetInnerHTML`; `whitespace-pre-wrap` for notes/offer text | component test renders `<img onerror>` as text |
| T-02-07 | `sourceUrl` `javascript:`/`data:` link | Tampering | contracts enforce `http`/`https` (`application.schema.ts:36-39`); mapper re-checks `new URL(...).protocol` for legacy data; `rel="noopener noreferrer" target="_blank"` | mapper returns `null` for `javascript:` |
| T-02-08 | Offer text / request body logged | Info disclosure | Do not log bodies; keep `onError` message-only; no `console.log` of inputs | grep gate + test spying `console` |
| T-02-09 | Oversized body (memory) | DoS | optional `hono/body-limit` (~256 KB) on `/api/applications` with `onError` throwing the contract error | 413/400 JSON |
| T-02-10 | Cross-site `text/plain` POST creates records (JSON parsed regardless of content-type) | Tampering (CSRF-lite) | `requireJson` middleware on POST/PUT/PATCH | text/plain → 400 |
| T-02-11 | Tag-filter flood (huge `tags` array → giant `$all`) | DoS | `multi()` arrays `.max(20)`, item `.max(40)` | 21 tags → 400 |
| T-02-12 | Tests wiping real data | Tampering | per-file `tfm_test_*` DB, name guard, never `client.db()` unnamed | helper unit assertion |
| T-02-13 | Supply chain via new dependency | Tampering | single pinned package, legitimacy gate, lockfile check of transitive `devtools-event-client` | `npm ls` assertion |
| T-02-14 | Stale optimistic UI after failed PATCH shows a state the server never saved | Integrity | rollback to snapshot + error message, serialized requests | hook test |

No threat reaches `high` once the controls above are in the plans; T-02-04 and T-02-01/02 would be `high` if skipped.

## Decision Risks

No locked decision is infeasible. Items needing the planner's or user's attention:

1. **D-13 read literally ("`validateSearch` con `applicationQuerySchema`") is unsafe on 1.170.x.** Passing the contracts schema as-is works for well-formed URLs but (a) the default serializer turns `q=123` into a number and throws, and (b) any invalid value renders the router's error component instead of the list [VERIFIED]. *Smallest alternative (recommended):* keep D-13's intent by deriving a per-field-lenient schema from `applicationQuerySchema.shape` plus custom `parseSearch`/`stringifySearch` (Pattern 1). Still contracts-sourced.
2. **D-11 database name.** A single literal `tfm_test` shared by parallel test files races. *Alternative:* `tfm_test_<suffix>` per file (same real Mongo, same cleanup intent). 
3. **D-04 + current index.** `tags.label_1` cannot serve a case-insensitive `$all` (regex = full index scan; collation = COLLSCAN without a collated index) [VERIFIED]. D-04 is satisfiable (results correct) but the Claude's-discretion question "does `{ "tags.label": 1 }` suffice?" is answered **no for index use, yes for correctness at this scale**. *Recommended:* stored `tags.key` + index `{ "tags.key": 1 }`; *alternative:* regex on `label` with no new index.
4. **D-16 vs "pass the contracts schema to TanStack Form".** The VM (strings) cannot be validated by the API-shaped schema directly; the form uses a wrapper validator (Pattern 2). No contract is redefined.
5. **D-09 cap vs schema order.** `applicationInputSchema` rejects >20 raw tags before the service can dedupe; acceptable because the form submits normalized tags, but note the API behaves "reject" not "truncate" for raw >20.
6. **Environment (STATE blocker, Q6).** The web-test flake is not fixable by any Vitest option I measured. The real fix is a devcontainer change (user rebuild). If the user declines, accept ~1 min web test runs, keep the web test count modest, and consider a pre-push retry. Not a Phase 2 code risk, but it affects the Nyquist sampling plan.

### Q6 detail: the `Failed to start forks worker` flake

- **Reproduced once:** first cold run of `npm run test -w @tfm/web` → `Test Files no tests · Errors 6 errors · Duration 60.08s` (all 6 forks failed to start). Seven subsequent default-config runs all passed in 51–63 s (the flag experiments below were extra runs); I did not capture the underlying `cause` of the one failure (LOW confidence on the exact trigger).
- **Source of the message:** `vitest/dist/chunks/index.B8VfM7Mf.js:5899` — `runner.start(...)` rejected → `[vitest-pool]: Failed to start ${task.worker} worker for test files …`; a separate hard-coded `WORKER_START_TIMEOUT = 9e4` (line 5825) produces `Timeout starting … runner`; neither is configurable.
- **Root cause of the slowness (HIGH):** `/workspaces` is a **9p mount** (`df -T` → `9p`, `C:\`), `/tmp` is overlay. `require('jsdom')` takes **42.4–45.6 s** in the repo vs **0.42 s** from a fresh install on overlay; the module-load trace attributes 37 s to `jsdom/browser/Window.js → living/interfaces` (≈780 small files). Every isolated fork repeats it, six in parallel.
- **Vitest knobs measured (all worse or equal):** `--maxWorkers=2` 171 s; `--no-isolate --maxWorkers=2` 59 s; `--no-isolate --maxWorkers=1` 88 s; `--no-isolate` 48 s (≈ −10 %); `--pool=threads` 60 s; `--pool=vmThreads` 73 s; default 51–63 s. None removes the cost; none is recommended.
- **Smallest real fix:** put `node_modules` on a Docker named volume in `.devcontainer/docker-compose.yml` (e.g. `node-modules:/workspaces/TFM/node_modules` + `chown` in `postCreateCommand` + `npm ci`), which moves jsdom/tsc/eslint/vite reads off 9p. Expect web tests and typecheck to drop from ~1–2 min to seconds (evidence: same stack = 0.98 s in the scratch project). Requires a container rebuild → `checkpoint:human-action`. In-repo mitigation if declined: none worth adding; avoid growing the number of jsdom test files unnecessarily and keep pure logic in node-env packages (note: `src/test/setup.ts` touches `localStorage`/`document`, so a per-file `// @vitest-environment node` in the web workspace would first need that setup guarded).

## Q7: UI primitives (no new dependency)

| Need | Source | Notes |
|------|--------|-------|
| Confirm-delete dialog | `AlertDialog` from `radix-ui` → `ui/alert-dialog.tsx` (shadcn pattern: `data-slot`, `cn`, `buttonVariants`) | Cancel focused by default; Sheet already proves the package works in jsdom |
| Status select (detail) | native `<select>` → `ui/native-select.tsx` | label «Cambiar estado»; options in the order of `applicationStatusSchema` (`guardada, enviada, en_entrevistas, oferta_recibida, aceptada, rechazada, descartada`, `enums.ts:6-14`) |
| workMode / seniority / sort / contract / initial status / currency | same native select | |
| Inputs, labels, textarea | `ui/input.tsx`, `ui/label.tsx` (Radix `Label`), `ui/textarea.tsx` | 5–10 lines each, token classes only |
| Skeleton | `ui/skeleton.tsx` (`animate-pulse rounded-sm bg-muted`) | |
| Collapsible offer text | `Collapsible` from `radix-ui` → `ui/collapsible.tsx` | content unmounted while closed |
| Multi-select status filter | existing `ui/toggle-group.tsx` (`type="multiple"`) | text labels, `aria-pressed` |
| Stack-tag filter | `TagChip` variant "selected" rendered as `<button aria-pressed>` with `Check` icon | options from `GET /api/tags`, `group === "stack"` |
| Status badge / tag chip / request-status | custom in `common/components/` per DESIGN.md tokens | tokens exist: `--color-status-saved/-bg … -rejected/-bg` (`styles.css:154-163`); mapping in DOMAIN.md lines 76-85 |
Conventions: `components.json` style `new-york`, aliases `@/common/components/ui`, `@/common/lib/utils`; existing files import primitives as `import { Dialog as SheetPrimitive } from "radix-ui"` [VERIFIED: sheet.tsx:4]. The shadcn CLI needs network and may not be available; hand-writing from the `sheet.tsx` pattern is equivalent. ESLint already relaxes `react-refresh/only-export-components` for `ui/**` and allows `Route` exports in `routes/**`.

## Q9: PUT semantics (and the Phase 5 trap)

- After Zod defaults `cvDocumentId`/`coverLetterDocumentId` are `null` whether the client sent `null` or omitted them [VERIFIED by schema: `.nullable().default(null)`, `application.schema.ts:43-44`]; the same is true for `offerText` (`:40`). A PUT from a form that has no such inputs would silently unlink/wipe.
- **Phase 2 rule:** PUT writes exactly this whitelist: `title, company, location, workMode, seniority, contractType, salaryMin, salaryMax, currency, tags (normalized + key), sourceUrl, appliedAt, notes, updatedAt`. It does **not** write `status`, `statusHistory`, `interviews`, `ownerId`, `createdAt`, **`offerText`, `cvDocumentId`, `coverLetterDocumentId`**. POST writes `offerText` and the two ids as provided (defaults `null`).
- **Handing over:** Phase 3 (AI-09, `offerText` saved from the paste panel) and Phase 5 (DOC-03) must each move their field into the whitelist *and* make the form always send it (VM pass-through), with a test "PUT of `X` replaces; PUT without `X` is a 400/unchanged — decide explicitly". Document this in the Phase 2 SUMMARY so the later planners inherit the decision instead of the trap. (If the author prefers "present key wins", the route can pass `Object.hasOwn(raw, key)` flags — not needed now.)
- PUT does not change status (D-07) and `appliedAt` from the body prevails including `null` (D-08); `updatedAt` always bumps.

## Sources

### Primary (HIGH confidence — executed this session)
- Real MongoDB 8.3.13 in scratch DB `tfm_research_scratch` (dropped afterwards; `tfm`/`tfm_test` never touched): tag filters + `explain`, sort with null/missing, pipeline status update (incl. concurrency), tag aggregation, regex escaping, ObjectId validity, `$all: []`.
- Scratch Vitest/jsdom runs (react 19.3.1, @tanstack/react-router 1.170.44, @tanstack/react-form 1.33.5, zod 4.6.7, hono 4.13.13): router search behaviour, form behaviour, `useOptimistic` vs hand-rolled, Zod `es` locale, Hono sub-app/`queries()`/`body-limit`/text-plain.
- Repo files read: `packages/contracts/src/{application.schema,tag.schema,enums,error.schema,index}.ts`, `apps/api/src/{app,errors,main}.ts`, `apps/api/src/db/mongo.ts`, `apps/api/src/app.test.ts`, `apps/web/src/**` (router, http-client, format, list pod, scene, setup, ui/sheet, button), `vite.config.ts`, vitest configs, `eslint.config.js`, `.husky/*`, devcontainer compose, `docs/{ARCHITECTURE,DOMAIN,DESIGN}.md`, Phase 1 CONTEXT/RESEARCH/VALIDATION/PATTERNS.
- `node_modules/@tanstack/router-core/dist/esm/router.js:683-690` (search merge); `vitest/dist/chunks/index.B8VfM7Mf.js:5825,5899`; `@tanstack/form-core` types (`onSubmitInvalid`).
- The repo's own ESLint run over sample hooks; `df -T`, timed `require('jsdom')`, timed vitest runs with the flags listed.
- `gsd-tools query package-legitimacy check`, `npm view` for versions/peers/dependencies.

### Secondary (MEDIUM)
- None used beyond the above.

### Tertiary (LOW / assumed)
- Standard CORS "simple request" behaviour for `text/plain` POST (A3); Radix Select + jsdom (A2); Vitest fork parallelism w.r.t. a shared DB (A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — one new package, versions and peers checked; legitimacy gate run.
- Architecture / Mongo recipes / router / form / hooks: HIGH — each executed on the pinned versions.
- Test-runtime root cause: HIGH for the 9p slowness, LOW for the exact trigger of the single observed failure.
- Pitfalls: HIGH where marked VERIFIED.

**Research date:** 2026-10-29
**Valid until:** ~2026-11-05 (fast-moving TanStack minors; defense is 9 Nov — pin exact versions and do not upgrade during the phase)
