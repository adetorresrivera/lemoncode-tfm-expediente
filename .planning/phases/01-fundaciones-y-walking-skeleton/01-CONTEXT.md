# Phase 1: Fundaciones y walking skeleton - Context

**Gathered:** 2026-10-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Al terminar, `docker compose up --build` levanta app + mongo + s3 + ollama y `http://localhost:8080` muestra el shell de Expediente con la ruta `/applications` vacía («Aún no has guardado ninguna oferta…») y `/api/health` responde con el estado de mongo, s3 y llm. En el devcontainer, `npm run dev` levanta web (5173, proxy `/api`) y api (3000).

Requisitos: FND-01 … FND-10. Sin funcionalidad de negocio (CRUD, IA, rondas, documentos): solo esqueleto, contracts, infraestructura y shell.

</domain>

<decisions>
## Implementation Decisions

### Monorepo y tooling
- **D-01:** npm workspaces: `apps/web` (`@tfm/web`), `apps/api` (`@tfm/api`), `packages/contracts` (`@tfm/contracts`).
- **D-02:** TypeScript strict con `tsconfig.base.json` en la raíz; project references o build en orden contracts → api → web.
- **D-03:** Scripts raíz: `dev` (concurrently), `build`, `test`, `lint`, `typecheck`, `format`, `seed` (stub en esta fase).
- **D-04:** ESLint flat config + Prettier + Husky + lint-staged (lint + prettier en staged; `typecheck` en pre-push).
  (Overridden 2026-10-28 by user at plan-check: typecheck runs at pre-commit, per FND-09/SC1.)
- **D-05:** `.env.example` con todas las variables de `docs/ARCHITECTURE.md`; `.gitignore` con `.env`, `dist`, `node_modules`.

### contracts
- **D-06:** Todas las enumeraciones de `docs/DOMAIN.md` y los esquemas Zod de `docs/ARCHITECTURE.md` desde ya: application, interview, tag, document, offer-extraction, error, query. Con tests de esquemas.

### api
- **D-07:** Hono con `@hono/node-server`. `config.ts` valida el entorno con Zod y falla al arrancar si falta algo.
- **D-08:** Conexión Mongo con creación de índices; `storage/s3.ts` con `ensureBucket` al arrancar.
- **D-09:** `LlmClient` con los tres providers: `mock` completo; `ollama` y `openai` pueden ser stubs con `ping`.
- **D-10:** Middleware de errores que produce `{ error: { code, message } }` (`details?` opcional según CLAUDE.md).
- **D-11:** En producción sirve `apps/web/dist` con fallback a `index.html` para rutas que no sean `/api`.
- **D-12:** `GET /api/health` → `{ status, mongo, s3, llm }`, cada uno `"ok" | "error"`; responde 200 aunque `llm` falle.

### web
- **D-13:** Vite + React 19 + TanStack Router con plugin de generación de rutas.
- **D-14:** Estructura completa de carpetas de `docs/ARCHITECTURE.md` (pods vacíos con `index.ts` donde toque).
- **D-15:** Tailwind v4 + shadcn (base neutral); copiar `docs/design/expediente.css` a `src/styles.css`; fuentes con `@fontsource-variable` (eb-garamond, source-sans-3, jetbrains-mono).
- **D-16:** `core/http/http-client.ts` tipado; `core/theme` con sistema/claro/oscuro en `localStorage` con try/catch.
- **D-17:** `layouts/app-layout.tsx`: sidebar de escritorio (≥1024 px) + Sheet en móvil + toggle de tema, según `docs/DESIGN.md`.
- **D-18:** Ruta `/` redirige a `/applications`; `/applications` muestra el estado vacío.
- **D-19:** `common/lib/format.ts` con `formatDate` («12 oct. 2026») y `formatMoney` («52.000 €») + tests.

### Docker
- **D-20:** Dockerfile multi-stage (deps → build → runtime `node:22-slim`, usuario `node`, `HEALTHCHECK`).
- **D-21:** `compose.yml` en la raíz: `app`, `mongo:8`, `s3` (pgsty/minio, consola 9001), `s3-init` (pgsty/mc crea `tfm-assets`), `ollama` + `ollama-init` (pull de `LLM_MODEL`). Healthchecks y `depends_on` con `condition: service_healthy`. Versiones de imagen fijadas.
- **D-22:** README mínimo con cómo arrancar (se completa en la fase 6).

### Verificación de la fase
- **D-23:** `npm run typecheck && npm run lint && npm run test && npm run build`, y `docker compose up --build` con `curl` a `/api/health`.

### Claude's Discretion
- Elección entre project references y build ordenado (D-02).
- Sonda de alcance del `llm` en `/api/health` en esta fase: mínima y consciente del provider; la fase 3 la sustituye por `LlmClient.ping()` (ver ROADMAP).
- Elección de versiones concretas de imágenes y dependencias (fijadas, ≥2 semanas de antigüedad); sin dependencias nuevas fuera del stack sin justificarlas en el SUMMARY del plan.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto
- `CLAUDE.md` — reglas de código, stack cerrado, arquitectura frontend, comandos, git.
- `.planning/PROJECT.md` — valor central, restricciones.
- `.planning/REQUIREMENTS.md` — FND-01 … FND-10.
- `.planning/ROADMAP.md` §Phase 1 — objetivo y criterios de éxito.

### Documentación de producto
- `docs/ARCHITECTURE.md` — estructura de carpetas, API, esquemas de contracts, variables de entorno, health.
- `docs/DOMAIN.md` — enumeraciones y reglas de dominio.
- `docs/DESIGN.md` — shell, sidebar/Sheet, tema, tokens.
- `docs/PRODUCT.md` — alcance.
- `docs/AI-EXTRACTION.md` — contrato de `LlmClient` y providers.
- `docs/design/expediente.css` — tokens del design system, a copiar a `apps/web/src/styles.css`.

</canonical_refs>

<code_context>
## Existing Code Insights

Repo sin código de aplicación todavía (solo `docs/`, `.planning/`, `.claude/`); no hay mapas en `.planning/codebase/`.

### Reusable Assets
- `docs/design/expediente.css`: tokens y estilos del DS listos para copiar.

### Established Patterns
- Arquitectura frontend del curso (`core/`, `common/`, `layouts/`, `scenes/`, `pods/`) fijada en `CLAUDE.md`.
- Contracts como única fuente de verdad de los modelos de API.

### Integration Points
- Devcontainer con servicios `mongo`, `s3`, `ollama` y variables `MONGO_URL`, `S3_*`, `LLM_*` ya definidas.
- Proxy `/api` de Vite (5173) → api (3000); en producción la api sirve `apps/web/dist` en 8080.

</code_context>

<specifics>
## Specific Ideas

- Estado vacío de `/applications`: «Aún no has guardado ninguna oferta…».
- Formatos: fecha «12 oct. 2026», dinero «52.000 €».

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Fundaciones y walking skeleton*
*Context gathered: 2026-10-28*
