# Arquitectura

## Vista general
```
navegador ──► app (Hono, :8080 en prod)
               ├─ /            → build estático de apps/web (SPA, fallback a index.html)
               └─ /api/*       → API REST
                    ├─ MongoDB  (applications, documents)
                    ├─ Silo S3  (bucket tfm-assets)
                    └─ LLM      (Ollama | OpenAI-compatible | mock)
```
En desarrollo, Vite (5173) hace proxy de `/api` a la API (3000).

## Monorepo
```
/
├─ .devcontainer/
├─ apps/
│  ├─ web/          @tfm/web
│  └─ api/          @tfm/api
├─ packages/
│  └─ contracts/    @tfm/contracts  (esquemas Zod + tipos)
├─ docs/
├─ .planning/       (GSD, versionado)
├─ Dockerfile
├─ compose.yml
├─ .env.example
└─ package.json     (workspaces, scripts raíz)
```
`contracts` se compila a ESM con `tsc` y se consume como dependencia `workspace` (`"@tfm/contracts": "*"`).

## packages/contracts
```
src/
  enums.ts                 enumeraciones de DOMAIN.md
  tag.schema.ts
  interview.schema.ts      interviewSchema, interviewInputSchema
  application.schema.ts    applicationSchema, applicationInputSchema, applicationQuerySchema, statusChangeSchema
  document.schema.ts
  offer-extraction.schema.ts
  error.schema.ts          { error: { code, message, details? } }
  index.ts
```
`*InputSchema` = lo que acepta la API al crear/editar (sin `id`, fechas de sistema, historial). Los tipos se exportan con `z.infer`.

## apps/api
```
src/
  main.ts                  arranque, conexión Mongo, ensureBucket, serve
  app.ts                   Hono: rutas, middleware de errores, static en prod
  config.ts                lectura y validación de env con Zod
  db/mongo.ts              cliente + índices
  storage/s3.ts            cliente S3 (forcePathStyle), ensureBucket, put/get/delete
  llm/
    llm.client.ts          interfaz LlmClient + factory por LLM_PROVIDER
    ollama.provider.ts
    openai.provider.ts
    mock.provider.ts
  applications/
    applications.routes.ts
    applications.repository.ts
    applications.service.ts   reglas de negocio (historial, appliedAt, rondas)
    applications.mapper.ts    documento Mongo ↔ contrato
  documents/ …
  offers/
    extract.routes.ts
    extract.service.ts     prompt + normalización
  tags/tags.routes.ts
  scripts/seed.ts
```
Índices: `applications`: `{ status: 1 }`, `{ updatedAt: -1 }`, `{ "tags.label": 1 }`, texto en `{ title, company }`.

### Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | `{ status: "ok", mongo, s3, llm }` |
| GET | `/api/applications` | query: `status` (multi), `tags` (multi), `workMode`, `seniority`, `q`, `sort` = `updatedAt` \| `appliedAt` |
| POST | `/api/applications` | crea; 201 |
| GET | `/api/applications/:id` | 404 si no existe |
| PUT | `/api/applications/:id` | reemplaza campos editables |
| PATCH | `/api/applications/:id/status` | `{ status }` aplica reglas 1–2 |
| DELETE | `/api/applications/:id` | 204 |
| POST | `/api/applications/:id/interviews` | crea ronda (regla 3) |
| PUT | `/api/applications/:id/interviews/:interviewId` | |
| DELETE | `/api/applications/:id/interviews/:interviewId` | |
| GET | `/api/tags` | `{ label, group, count }[]` distintos, por count desc |
| POST | `/api/offers/extract` | `{ text }` → `OfferExtraction` (ver AI-EXTRACTION.md) |
| GET | `/api/documents` | lista, filtro opcional `type` |
| POST | `/api/documents` | multipart: `file`, `type`, `name`, `version`; PDF/DOCX ≤5 MB |
| GET | `/api/documents/:id/download` | stream con `Content-Disposition` |
| DELETE | `/api/documents/:id` | 409 si está vinculado |

Códigos: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`, 409 `DOCUMENT_IN_USE`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`, 502 `LLM_ERROR`, 504 `LLM_TIMEOUT`, 500 `INTERNAL_ERROR`.

## apps/web
```
src/
  main.tsx  app.tsx  styles.css (globals de Expediente)
  core/
    router/router.ts
    http/http-client.ts        fetch tipado, parsea errores al contrato
    theme/theme.ts             sistema / claro / oscuro + localStorage (try/catch)
  common/
    components/ui/             componentes shadcn generados
    components/request-status.tsx  Loading / ErrorMessage (aria-live)
    components/status-badge.tsx
    components/tag-chip.tsx    (+ variante soft y removible)
    components/ai-mark.tsx     marca «IA»
    lib/format.ts              Intl es-ES: fechas «12 oct. 2026», «52.000 €»
  layouts/app-layout.tsx       sidebar + sheet móvil + Outlet
  scenes/
    application-list.scene.tsx
    application-detail.scene.tsx
    application-edit.scene.tsx     alta (sin id) y edición (con id)
  pods/
    application-list/
    application-detail/          incluye rondas (components/interview-*.tsx) y cambio de estado
    application-edit/            formulario + panel «Pegar oferta» (IA)
    document-upload/             subir / elegir documento; usado como container embebible
  routes/
    __root.tsx
    index.tsx                    redirect → /applications
    applications/
      index.tsx                  validateSearch con applicationQuerySchema
      new.tsx
      $applicationId/index.tsx
      $applicationId/edit.tsx
  routeTree.gen.ts
```
Regla de composición: `application-edit` necesita elegir documentos → la escena de edición renderiza `DocumentUploadContainer` y pasa `onSelected` al formulario por props. Ningún pod importa otro.

Gestión de datos: hooks propios con `fetch` + `AbortController` como en el curso (sin React Query en el MVP).

## Variables de entorno
| Variable | Dev (devcontainer) | Compose (entregable) |
|---|---|---|
| `PORT` | 3000 | 8080 |
| `MONGO_URL` | `mongodb://mongo:27017/tfm` | igual |
| `S3_ENDPOINT` | `http://s3:9000` | igual |
| `S3_REGION` | `us-east-1` | igual |
| `S3_BUCKET` | `tfm-assets` | igual |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `minioadmin` | igual |
| `S3_FORCE_PATH_STYLE` | `true` | igual |
| `LLM_PROVIDER` | `ollama` | `ollama` (o `mock`, `openai`) |
| `LLM_BASE_URL` | `http://ollama:11434` | igual |
| `LLM_MODEL` | `gemma4:e2b` | igual |
| `LLM_API_KEY` | — | solo `openai`, vía `.env` |
| `LLM_TIMEOUT_MS` | 90000 | 90000 |

## Entregable Docker
- `Dockerfile` multi-stage: `deps` (npm ci) → `build` (contracts, api, web) → `runtime` (node:22-slim, solo `apps/api/dist`, `apps/web/dist` y deps de producción; usuario no root; `HEALTHCHECK` a `/api/health`).
- `compose.yml`: `app` (imagen `tfm-app`, puerto 8080), `mongo:8`, `s3` (`pgsty/minio`, consola 9001), `s3-init` (`pgsty/mc`, crea bucket), `ollama` + `ollama-init` (pull del modelo). Volúmenes con nombre. `app` espera a que mongo y s3 estén sanos.
- Fijar versiones de imágenes (nada de `latest`) en el entregable.
- `npm run seed` disponible dentro del contenedor: `docker compose exec app npm run seed`.
