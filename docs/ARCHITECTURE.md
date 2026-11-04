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
  document.schema.ts       documentSchema, documentListItemSchema (usedBy), documentInputSchema, documentQuerySchema, DOCUMENT_MAX_BYTES
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
  storage/s3.ts            cliente S3 (forcePathStyle), ensureBucket, createDocumentStorage (put/get/delete)
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
  documents/
    documents.routes.ts       multipart, lista, lectura, descarga (stream) y borrado
    documents.service.ts      S3 primero y Mongo después, con compensación si falla el insert; regla 4 al borrar
    documents.repository.ts
    documents.mapper.ts       documento Mongo ↔ contrato
    file-type.ts              firma real (PDF, DOCX) y coherencia con la extensión
    file-name.ts              nombre saneado, slug de la clave S3 y Content-Disposition
  offers/
    extract.routes.ts
    extract.service.ts     prompt + normalización
  tags/tags.routes.ts
  scripts/seed.ts
```
Índices: `applications`: `{ status: 1 }`, `{ updatedAt: -1 }`, `{ "tags.label": 1 }`, texto en `{ title, company }`, `{ cvDocumentId: 1 }`, `{ coverLetterDocumentId: 1 }` (comprobación de uso). `documents`: `{ createdAt: -1 }`.

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
| POST | `/api/applications/:id/interviews` | crea ronda (regla 3); 201 con la candidatura completa |
| PUT | `/api/applications/:id/interviews/:interviewId` | edita la ronda; 200 con la candidatura completa |
| DELETE | `/api/applications/:id/interviews/:interviewId` | borra la ronda sin renumerar; 200 con la candidatura completa |
| GET | `/api/tags` | `{ label, group, count }[]` distintos, por count desc |
| POST | `/api/offers/extract` | `{ text }` → `OfferExtraction` (ver AI-EXTRACTION.md) |
| GET | `/api/documents` | query: `type` opcional (`cv` \| `carta`); items con `usedBy`, del más reciente al más antiguo |
| POST | `/api/documents` | multipart: `file`, `type`, `name`, `version`; PDF/DOCX ≤5 MB; 201 con el `Document`; 400, 413, 415 |
| GET | `/api/documents/:id` | el `Document`; 404 «Documento no encontrado» |
| GET | `/api/documents/:id/download` | stream; `Content-Disposition` con `filename*` (nombre original); 404 |
| DELETE | `/api/documents/:id` | 204; 404; 409 si está vinculado a alguna candidatura |

Códigos: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`, 409 `DOCUMENT_IN_USE`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`, 502 `LLM_ERROR`, 504 `LLM_TIMEOUT`, 500 `INTERNAL_ERROR`. Las rutas de rondas responden 404 `NOT_FOUND` con «Candidatura no encontrada» o «Ronda no encontrada». Las rutas de documentos responden 404 `NOT_FOUND` con «Documento no encontrado» (id desconocido o mal formado) o «Archivo no encontrado» (el registro existe pero el objeto ya no está en S3). `POST`/`PUT /api/applications` validan `cvDocumentId` y `coverLetterDocumentId` (deben existir y ser del tipo `cv` / `carta`; si no, 400 `VALIDATION_ERROR` con el error en el campo).

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
    document-list.scene.tsx        biblioteca de documentos: cabecera, subida, lista y filtro en la URL
  pods/
    application-list/
    application-detail/          incluye rondas (components/interview-*.tsx) y cambio de estado
    application-edit/            formulario + panel «Pegar oferta» (IA)
    document-upload/             subida genérica (botón + diálogo) y selector de documento del formulario (modo picker)
    document-list/               biblioteca: filas, filtro por tipo, descarga y borrado con diálogo
  routes/
    __root.tsx
    index.tsx                    redirect → /applications
    applications/
      index.tsx                  validateSearch con applicationQuerySchema
      new.tsx
      $applicationId/index.tsx
      $applicationId/edit.tsx
    documents/
      index.tsx                  validateSearch con documentQuerySchema
  routeTree.gen.ts
```
Reglas de composición (ningún pod importa otro):
- `application-edit` necesita elegir documentos: la escena de edición le pasa el slot `renderDocumentPicker`, que renderiza `DocumentUploadContainer` en modo picker (`type`, valor, `onSelected`); el formulario solo guarda el id elegido.
- La escena `document-list` compone `DocumentUploadContainer` (subir) y `DocumentListContainer` (lista). La cabecera la pinta la escena, pero el contador es dato del pod, así que pasa por el slot `renderHeader({ counter })`. Tras subir, `onUploaded` de la subida incrementa una señal de refresco que la escena entrega a la lista como `refreshToken`; el filtro de tipo vive en la URL (`?type=`).

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
