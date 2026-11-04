# Phase 5: Documentos en S3 - Research

**Researched:** 2026-11-04
**Domain:** Multipart file upload + object storage (Hono 4.13 / @hono/node-server 2.1 / @aws-sdk/client-s3 3.1152 against Silo) and a React 19 upload dialog nested in a TanStack Form page
**Confidence:** HIGH (every open question from CONTEXT.md was answered by running code against the installed packages and the devcontainer's real Silo and Mongo, not from memory)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### API: subida y validación (decididas por el usuario al lanzar la fase)
- **D-01:** `POST /api/documents` multipart con `file`, `type`, `name` y `version`. Los campos de texto se validan con `documentInputSchema` de `@tfm/contracts`. Si falta `file`, 400 `VALIDATION_ERROR`. Si sale bien, 201 con el `Document` creado.
- **D-02:** El tipo se valida por **magic bytes y extensión, y las dos tienen que coincidir**. PDF: empieza por `%PDF-` y la extensión es `.pdf`. DOCX: firma ZIP `PK\x03\x04`, contiene la entrada `word/document.xml` y la extensión es `.docx`. Si no, 415 `UNSUPPORTED_FILE_TYPE`. El `mimeType` guardado sale de la firma detectada, nunca del `Content-Type` del navegador. No se añaden dependencias: basta con leer la cabecera y buscar la entrada en los local file headers del ZIP (el investigador confirma si es suficiente).
- **D-03:** Si el archivo pasa de `DOCUMENT_MAX_BYTES` (5 MB), 413 `FILE_TOO_LARGE`. Hay que cortar antes de cargar todo el cuerpo en memoria si Hono lo permite (`bodyLimit` con `onError` que lance `ApiError(413, "FILE_TOO_LARGE", …)`, con margen para la sobrecarga multipart, y después la comprobación exacta del tamaño del archivo). Si no se puede cortar en streaming, documentar el límite del cuerpo. Que lo verifique el investigador.
- **D-04:** El id del documento se genera antes de subir (`new ObjectId()`). El orden es: subir a S3 con la clave `documents/<id>/<filename-saneado>` y luego insertar los metadatos en `documents`. Si falla el insert, **compensación**: `DeleteObject` de la clave, sin que un fallo al borrar tape el error original, y la respuesta sigue siendo el error del insert.

#### API: nombre original y clave S3
- **D-05:** Se añade **`fileName`** al contrato `documentSchema` (nombre original que mandó el navegador: basename sin ruta, sin caracteres de control, recortado, 1–255). Se actualiza el modelo Document en `docs/DOMAIN.md` y se justifica en el SUMMARY. — **Reversibility:** costly — es un campo nuevo del contrato que leen la API, la web, la semilla de la fase 6 y los documentos ya guardados en Mongo de desarrollo.
- **D-06:** La descarga usa `fileName` en `Content-Disposition: attachment; filename="<alternativa ASCII>"; filename*=UTF-8''<percent-encoded>`, así que los acentos y los espacios se conservan.
- **D-07:** Saneado de la clave S3: **slug ASCII**. Se quitan los acentos (NFD + quitar diacríticos), se pasa a minúsculas, todo lo que no sea `[a-z0-9._-]` se cambia por `-`, se colapsan y recortan los guiones, se limita a 100 caracteres y se fuerza la extensión del tipo detectado (`.pdf` o `.docx`). Si queda vacío, `document.pdf` o `document.docx`. No puede haber `/`, `..` ni caracteres de control.

#### API: lectura, descarga y borrado
- **D-08:** `GET /api/documents?type=` se valida con `documentQuerySchema` y se ordena por `createdAt` desc, sin paginación. Cada ítem lleva **`usedBy: number`**, el número de candidaturas cuyo `cvDocumentId` o `coverLetterDocumentId` apunta a él. Hace falta un esquema de ítem de lista en contracts (forma a criterio del planner, en `document.schema.ts`). — **Reversibility:** costly — cambia el contrato de la lista que consumen los pods `document-upload` y `document-list`.
- **D-09:** **Endpoint nuevo `GET /api/documents/:id`**, que devuelve el documento o 404 `NOT_FOUND` «Documento no encontrado» (un ObjectId mal formado también da 404, como en la fase 4). Se añade a la tabla de `docs/ARCHITECTURE.md`. Lo usan el detalle (D-21) y la validación de vínculos (D-11).
- **D-10:** `GET /api/documents/:id/download` hace stream del `Body` de `GetObject` con `Content-Type` = `mimeType` guardado, `Content-Length` = `size` y `Content-Disposition` (D-06). Si no existe el documento, 404 «Documento no encontrado». Si el objeto no está en S3 (`NoSuchKey`), 404 «Archivo no encontrado».
- **D-11:** `DELETE /api/documents/:id` responde 409 `DOCUMENT_IN_USE` si alguna candidatura lo referencia (regla 4), 404 si no existe y 204 si se borra. Se borran los metadatos y el objeto S3; el orden y el tratamiento de un fallo de S3 tras borrar en Mongo quedan a criterio de Claude, sin dejar metadatos que apunten a un objeto inexistente.

#### API: vínculos en la candidatura
- **D-12:** **POST y PUT** de candidatura validan los vínculos en el service. Si `cvDocumentId` no existe o no es de tipo `cv`, o si `coverLetterDocumentId` no existe o no es de tipo `carta`: 400 `VALIDATION_ERROR` con `details` por campo (p. ej. «El documento no es un CV»). `null` siempre es válido.
- **D-13:** Se cumple el aviso de la fase 2: `toEditableFields` (`apps/api/src/applications/applications.service.ts:51`) copia `cvDocumentId` y `coverLetterDocumentId`, y el formulario web los envía siempre con el valor cargado. Ahora el mapper web los fija a `null` (`apps/web/src/pods/application-edit/application-edit.mapper.ts:137-138`) y un guardado los borraría.

#### Web: picker en el formulario
- **D-14:** `ApplicationEditContainer` recibe un **slot `renderDocumentPicker({ type, selectedId, onSelected })`**, igual que `renderCancelLink`. El valor vive en los campos `cvDocumentId` y `coverLetterDocumentId` de TanStack Form (el VM del formulario los incluye). La escena `application-edit.scene.tsx` pinta `DocumentUploadContainer` en el hueco. Ningún pod importa otro.
- **D-15:** Sección «Documentos» del formulario, tras Seguimiento (`docs/DESIGN.md` §Alta/edición), con dos pickers: «CV» (`type="cv"`) y «Carta de presentación» (`type="carta"`). Está tanto en alta como en edición.
- **D-16:** El select es el **`native-select` existente**. Primera opción «Sin CV» o «Sin carta» (valor `null`, sirve para desvincular) y después los documentos de ese tipo, del más nuevo al más antiguo, con la etiqueta «CV Frontend · v3 · 12 oct. 2026» (`formatDate`). Si la lista está vacía: «Aún no has subido ningún CV.» o «Aún no has subido ninguna carta.» junto a «Subir nuevo». Tiene estados de carga y de error con reintento.
- **D-17:** «Subir nuevo» abre un **`Dialog`** (`common/components/ui/dialog.tsx`, ya existe) con su propio formulario: archivo, Nombre y Versión. Si sale bien, el documento nuevo entra en la lista y queda elegido (`onSelected(id)`), el diálogo se cierra, el foco vuelve al botón y se anuncia «Documento subido.» en `aria-live`. Pitfall que hay que verificar: el `submit` sintético de React atraviesa el portal y llegaría al `<form>` de la candidatura, así que hay que impedir que se propague.
- **D-18:** Nombre **prerrellenado desde el archivo** (sin extensión y recortado a 120) si el campo está vacío al elegirlo. Versión obligatoria, vacía, con el placeholder «Ej.: v3». Se valida con `documentInputSchema`.
- **D-19:** Validación en cliente antes de enviar: `accept=".pdf,.docx"`, extensión `.pdf` o `.docx` y tamaño ≤ `DOCUMENT_MAX_BYTES` (importado de contracts), con mensajes en español en el campo. Los 413 y 415 del servidor también se muestran dentro del diálogo, con un mensaje amable para cada código.
- **D-20:** Progreso con **estado «Subiendo…»**: `fetch` + `AbortController` como el resto de hooks, botón deshabilitado, `aria-live` y posibilidad de cancelar. Sin barra de progreso ni XHR.
- **D-21:** Lo subido **se queda en la biblioteca** aunque luego se descarten los cambios de la candidatura: la subida es independiente, como en la regla 5.
- **D-22:** `DocumentUploadContainer` tiene **dos modos con un único diálogo**. Con `type`, es el picker (select + «Subir nuevo», sin campo Tipo). Sin `type`, solo muestra el botón «Subir documento» y el diálogo añade un `toggle-group` CV/Carta preseleccionado (con el filtro activo que pase la escena, o CV), y avisa con `onUploaded`. La forma exacta de las props queda a criterio del planner.

#### Web: detalle
- **D-23:** El pod `application-detail` pide **`GET /api/documents/:id`** para cada id no nulo, en paralelo, después de cargar la candidatura. El mapper construye un VM de documento propio (sin `extends`/`Omit`).
- **D-24:** Sección «Documentos» en la **columna lateral**, bajo «Historial de estados», con **dos filas fijas**: «CV» y «Carta de presentación». Cada una muestra «CV Frontend · v3 · 12 oct. 2026», el tamaño legible («230 KB», helper nuevo en `common/lib/format.ts`) y un enlace «Descargar» con el icono `Download` (`aria-label="Descargar CV Frontend"`). El enlace es un `<a href="/api/documents/:id/download">` normal. Si no hay vínculo: «Sin CV vinculado.» o «Sin carta vinculada.».
- **D-25:** Si falla la petición del documento (404 o red), **solo se degrada esa fila**, que muestra «No hemos podido cargar este documento.» sin enlace, y el resto del detalle se carga con normalidad.

#### Web: pantalla /documents (decisión del usuario)
- **D-26:** Ruta nueva `/documents` (`routes/documents/index.tsx`, `validateSearch` con `documentQuerySchema`), escena `document-list.scene.tsx` y **pod nuevo `document-list`** con el juego completo de archivos del curso. Se activa «Documentos» en la navegación de `layouts/app-layout.tsx` (se quita «Próximamente»). Se actualizan `docs/DESIGN.md` y `docs/ARCHITECTURE.md`.
- **D-27:** Cabecera con el eyebrow «Expediente», h1 «Documentos», contador y botón «Subir documento». La escena renderiza `DocumentUploadContainer` en modo solo subida (D-22) y, con `onUploaded`, hace que `DocumentListContainer` vuelva a cargar (con una prop de refresco o similar que pasa la escena; ningún pod importa otro).
- **D-28:** Filtro Todos/CV/Carta con `toggle-group` en search params. Cada fila muestra el nombre, la versión, la fecha, el tipo, el tamaño, **«En uso en N candidaturas»** (singular con 1; nada con 0), «Descargar» y «Eliminar» (botón icono `Trash2` con `aria-label="Eliminar <nombre>"`).
- **D-29:** «Eliminar» **siempre habilitado**. Confirmación con el `AlertDialog`, que espera a la API («Eliminando…»). Si responde 409, el diálogo sigue abierto con «Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.». Si sale bien, se quita la fila y se anuncia «Documento eliminado.». Así la regla 4 se puede enseñar en directo en la defensa.

#### Tests
- **D-30:** API: firmas y extensiones (PDF válido, DOCX válido, PDF renombrado a `.docx` → 415, otro tipo → 415), tamaño (> 5 MB → 413), compensación (falla el insert → se borra el objeto, con un repositorio o cliente falso), regla 409, `usedBy`, validación de vínculos (no existe o tipo equivocado → 400; `null` vale), `Content-Disposition` con acentos, slug de la clave y 404 de `:id` y de la descarga. Mongo real `tfm_test` (D-11 de la fase 2).
- **D-31:** Web: mappers de `document-upload`, `document-list` y la parte de documentos de `application-detail` (etiqueta «nombre · versión · fecha», orden, «En uso en N»), validación en cliente del diálogo (tipo y tamaño, prerrelleno del nombre) y que el submit del diálogo no envíe la candidatura.

### Claude's Discretion
- Textos exactos de los errores 413/415 y de validación, siguiendo la voz del DS (p. ej. «El archivo supera 5 MB.», «Solo se admiten archivos PDF o DOCX.»).
- El orden del borrado (Mongo/S3) y su tratamiento de errores, dentro de D-11.
- Si los tests de API usan Silo real o un cliente S3 falso para los casos que no son de compensación.
- La forma de las props de `DocumentUploadContainer` y del esquema del ítem de lista con `usedBy`.
- Los estados vacíos de `/documents` (p. ej. «Aún no has subido ningún documento.»).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. La biblioteca con versiones (LIB-01) y la sugerencia de CV por IA (LIB-02) ya están en v2. La pantalla `/documents` se ha quedado en lista, filtro, subida y borrado, sin agrupar versiones.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | Upload PDF/DOCX ≤ 5 MB with type, name, version, stored in `tfm-assets` | Pattern 1 (route + `bodyLimit` + `parseBody`), Pattern 2 (`detectDocument`), Pattern 3 (S3 put with compensation); Q-D02/Q-D03 answers |
| DOC-02 | 413 `FILE_TOO_LARGE` / 415 `UNSUPPORTED_FILE_TYPE` with friendly UI message | Q-D03 (verified 413 on both Content-Length and chunked paths), Pattern 2; web: client validation + error-code→message map (Pattern 8) |
| DOC-03 | Link one CV and one cover letter from the form, choosing existing or uploading new | Pattern 6 (slot `renderDocumentPicker`), Pattern 7 (dialog submit isolation, verified), D-12/D-13 service changes |
| DOC-04 | Download linked documents from the detail | Pattern 4 (download stream + `Content-Disposition`), D-23/D-24 detail section |
| DOC-05 | Delete of linked document → 409 `DOCUMENT_IN_USE` | Pattern 5 (usage check + delete order), `usedBy` aggregation verified on real Mongo |
| DOC-06 | List documents, optional type filter | `GET /api/documents?type=` + `usedBy` aggregation (Pattern 5), `document-list` pod |
</phase_requirements>

## Summary

The phase needs **no new dependency**. Everything is already installed: `hono` 4.13.13 (`bodyLimit`, `parseBody`), `@hono/node-server` 2.1.5, `@aws-sdk/client-s3` 3.1152.0, `mongodb` 7.7.0, Vitest + Testing Library + user-event 14.6.8 on the web. The devcontainer exposes a reachable Silo (`S3_ENDPOINT=http://s3:9000`, bucket `tfm-assets` already created by `s3-init`) and Mongo, so API tests can hit real services. There is no CI workflow in the repo; the test setup assumes the devcontainer.

All seven open questions from CONTEXT.md were resolved by execution. The three that change the design the most: (1) **D-02's "walk the local file headers" is NOT sufficient** for DOCX: a ZIP written in streaming mode (data-descriptor flag, bit 3) has `compressedSize = 0` in the local header, so the walk cannot skip to the next entry and never reaches `word/document.xml`; the fix is to read the **central directory** through the End-Of-Central-Directory record (the file is already fully in memory, ≤ 5 MB), which is still dependency-free and ~35 lines. (2) **`bodyLimit` does stop early on Node** but not by streaming magic: with `Content-Length` it rejects before reading a single body byte; without it (chunked) it reads chunk by chunk and aborts the moment the running total exceeds `maxSize`, so memory is bounded by `maxSize`. After that, `parseBody()` buffers the (≤ limit) body fully; that is acceptable for 5 MB. (3) **`parseBody()` throws a raw `TypeError` on malformed multipart**, which `app.onError` turns into a 500 `INTERNAL_ERROR`; wrap it and rethrow as `ApiError(400, "VALIDATION_ERROR", …)`.

Web side, both Pitfalls from CONTEXT.md are real and verified in jsdom: the React synthetic `submit` of a form inside a Radix `Dialog` portal **does** reach the parent application form's `onSubmit` (outer handler called once on click and once on Enter) unless the inner handler calls `event.stopPropagation()`; and `userEvent.upload` silently drops files that do not match `accept` (default `applyAccept: true`), so the client-side-validation test must use `userEvent.setup({ applyAccept: false })`.

**Primary recommendation:** Build an API tracer first (contracts `fileName`/list item → storage adapter → `POST` + `GET` list + `GET :id` + `download`), exercised from a real `/documents` upload dialog, then add delete/409 and link validation, then the picker in the form and the detail section. Keep `detectDocument` (central-directory based), `buildS3Key`, `contentDisposition` as three small pure, unit-tested functions in `apps/api/src/documents/`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File type / size validation (authoritative) | API / Backend | Browser (UX pre-check) | Client checks are advisory (D-19); the API is the only trusted gate (magic bytes + exact size) |
| Body size cut-off before buffering | API / Backend (`bodyLimit`) | — | Node HTTP layer; verified behaviour in Q-D03 |
| Object persistence | Database / Storage (Silo via `storage/`) | API (orchestration + compensation) | The service owns S3-then-Mongo ordering (D-04) |
| Document metadata + `usedBy` | Database (Mongo `documents`, `applications`) | API (service) | `usedBy` is derived from `applications`, never stored |
| Link validation (type of target) | API service | — | Rule lives in the applications service (D-12), not in the form |
| Download streaming | API | Browser (plain `<a href>` navigation) | API streams the S3 body; browser handles `Content-Disposition: attachment` |
| Document pick / upload UX | Browser / Client (pod `document-upload`) | Scene (composition) | Slot pattern keeps pods independent (D-14) |
| Rendering linked docs in detail | Browser (pod `application-detail`) | API (`GET /api/documents/:id`) | Per-row degradation (D-25) is a client concern |

## Standard Stack

### Core (all already installed — zero new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | 4.13.13 | Routes, `bodyLimit`, `c.req.parseBody()`, `c.body(stream)` | Project stack; `bodyLimit` already used in `extract.routes.ts` [VERIFIED: apps/api/package.json] |
| @hono/node-server | 2.1.5 | Node adapter; drains unread request bodies | [VERIFIED: apps/api/package.json] |
| @aws-sdk/client-s3 | 3.1152.0 | `PutObjectCommand` / `GetObjectCommand` / `DeleteObjectCommand` | Already used by `storage/s3.ts`; works against Silo [VERIFIED: ran put/get/delete against `http://s3:9000`] |
| mongodb | 7.7.0 | `documents` collection, `usedBy` aggregation | [VERIFIED: apps/api/package.json] |
| zod | 4.6.7 | `documentInputSchema` for the multipart text fields | [VERIFIED: apps/api/package.json] |
| @tanstack/react-form | 1.33.5 | Dialog form (copy `interview-dialog.tsx` pattern) | [VERIFIED: apps/web/package.json] |
| radix-ui | 1.8.1 | `Dialog`, `AlertDialog`, `ToggleGroup` (already wrapped in `common/components/ui/`) | [VERIFIED: apps/web/package.json] |
| @testing-library/user-event | 14.6.8 | `upload()` for file inputs | [VERIFIED: apps/web/package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written ~35-line EOCD reader | `adm-zip` / `yauzl` / `jszip` | A dependency needs justification in the SUMMARY (CLAUDE.md); the detector never decompresses, so no library is warranted |
| `file-type` package for magic bytes | — | Same: two signatures only |
| `@aws-sdk/lib-storage` `Upload` (multipart upload) | — | Pointless for ≤ 5 MB buffers; plain `PutObjectCommand` with a `Uint8Array` is enough |
| `hono/csrf` middleware | custom Origin check | See Security Domain (optional) |

**Installation:** none. **Version verification:** versions read from `apps/api/package.json` and `node_modules/*/package.json` this session (hono 4.13.13, @hono/node-server 2.1.5, @aws-sdk/client-s3 3.1152.0).

## Package Legitimacy Audit

No external packages are installed by this phase; the audit gate is not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Browser (/documents or application form)
  │  FormData{file,type,name,version}   (fetch, no Content-Type set → boundary added by browser)
  ▼
Hono app ── secureHeaders (nosniff) ──► /api/documents  (NO requireJson: multipart)
  │
  ├─ bodyLimit(maxSize = DOCUMENT_MAX_BYTES + 64 KiB)
  │     Content-Length present ─► > max ? ApiError 413 FILE_TOO_LARGE (body never read)
  │     chunked ─► read chunks, abort at first byte over max, else replay stream
  ▼
POST handler
  parseBody()  ──(TypeError on malformed)──► ApiError 400 VALIDATION_ERROR
  file instanceof File ? else 400
  documentInputSchema.parse({type,name,version})        ─► ZodError → 400
  file.size > DOCUMENT_MAX_BYTES ? 413
  bytes = Uint8Array(await file.arrayBuffer())
  detectDocument(bytes, sanitizedFileName) ─► null → 415 UNSUPPORTED_FILE_TYPE
  id = new ObjectId(); key = documents/<id>/<slug>
  storage.put(key, bytes, mimeType) ─────────────► Silo bucket tfm-assets
  repository.insert(meta) ──fails──► storage.delete(key) (swallow its error) ─► rethrow insert error
  ▼ 201 Document

GET  /api/documents?type=   ─► repo.list(type) + applications $group → usedBy ─► DocumentListItem[]
GET  /api/documents/:id     ─► repo.findById ─► Document | 404
GET  /api/documents/:id/download ─► meta ─► storage.get(key) ─► Body.transformToWebStream() ─► c.body(stream, headers)
                                    NoSuchKey ─► 404 "Archivo no encontrado"
DELETE /api/documents/:id   ─► meta? ─► in use? 409 : repo.delete ─► storage.delete (best effort) ─► 204

POST/PUT /api/applications  ─► service: cvDocumentId/coverLetterDocumentId → documents.findById + type check ─► 400 details per field
```

### Recommended Project Structure
```
packages/contracts/src/document.schema.ts   # + fileName, documentListItemSchema (usedBy)
apps/api/src/
├── storage/
│   ├── s3.ts                  # + createDocumentStorage(s3, bucket): put/get/delete (keep existing fns)
│   └── storage.test.ts        # real Silo contract test against a test bucket
├── documents/
│   ├── documents.routes.ts
│   ├── documents.service.ts   # S3-then-Mongo, compensation, 409, usedBy
│   ├── documents.repository.ts
│   ├── documents.mapper.ts    # Mongo doc <-> contract Document
│   ├── file-type.ts           # detectDocument (pure)
│   ├── file-name.ts           # sanitizeFileName, buildS3Key, contentDisposition (pure)
│   └── documents.*.test.ts
├── test/storage.ts            # fake in-memory DocumentStorage + real-Silo helper
apps/web/src/
├── pods/document-upload/ (api/, .vm, .mapper, .hooks, .container, .component, components/, index.ts)
├── pods/document-list/   (same set of files)
├── scenes/document-list.scene.tsx
├── routes/documents/index.tsx
└── common/lib/format.ts   # + formatFileSize
```

### Pattern 1: Route with `bodyLimit` and defensive `parseBody` (answers Q-D03)
**What:** `bodyLimit` first, then parse, then validate. Verified end-to-end against `@hono/node-server` on a real port (1 MB and 5 MB → 200; 6 MB, 60 MB, 200 MB → 413 from `onError`; chunked 1 MB → 200, chunked 20 MB → 413).
**Margin:** multipart overhead is boundary + per-part headers ≈ a few hundred bytes per field; four fields ≈ 1 KiB. Use `DOCUMENT_MAX_BYTES + 64 * 1024` as the body cap; the exact 5 MB check is then `file.size > DOCUMENT_MAX_BYTES` after parsing (a body between 5 MB and 5 MB + 64 KiB passes the cap and is rejected by the exact check with the same 413). A file of exactly 5 MiB (5 242 880 bytes) passed in the experiment.
**Example:**
```typescript
// Source: verified by execution against hono 4.13.13 + @hono/node-server 2.1.5 (scratchpad exp1/exp2)
import { DOCUMENT_MAX_BYTES, documentInputSchema } from "@tfm/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ApiError } from "../errors.js";

const BODY_OVERHEAD_BYTES = 64 * 1024;
const tooLarge = () =>
  new ApiError(413, "FILE_TOO_LARGE", "El archivo supera 5 MB");

export function documentsRoutes(service: DocumentsService): Hono {
  const routes = new Hono(); // no requireJson: this router receives multipart
  routes.post(
    "/",
    bodyLimit({
      maxSize: DOCUMENT_MAX_BYTES + BODY_OVERHEAD_BYTES,
      onError: () => {
        throw tooLarge();
      },
    }),
    async (c) => {
      let form: Record<string, unknown>;
      try {
        form = await c.req.parseBody(); // TypeError "Failed to parse body as FormData." if malformed
      } catch {
        throw new ApiError(400, "VALIDATION_ERROR", "Formulario no válido");
      }
      const file = form["file"];
      if (!(file instanceof File)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Falta el archivo", {
          fieldErrors: { file: ["Elige un archivo"] },
        });
      }
      const input = documentInputSchema.parse({
        type: form["type"],
        name: form["name"],
        version: form["version"],
      });
      if (file.size > DOCUMENT_MAX_BYTES) throw tooLarge();
      return c.json(await service.upload(input, file), 201);
    },
  );
  return routes;
}
```
Notes: the first positional validation (missing `file` → 400) must run **before** the zod parse only if the planner wants `file` errors to win; combining both into one `details` object shaped like `z.flattenError` (`{ formErrors, fieldErrors }`) keeps the web error mapping uniform with existing endpoints.

### Pattern 2: `detectDocument` via the ZIP central directory (answers Q-D02)
**What:** PDF = `%PDF-` at offset 0. DOCX = `PK\x03\x04` at offset 0 **and** an entry named exactly `word/document.xml` in the central directory, located through the EOCD record (`PK\x05\x06`) searched backwards over the last `22 + 65535` bytes. No decompression, so there is no zip-bomb exposure. Return `null` on any structural inconsistency (so a hostile file ends as 415, never as a crash or 500).
**Why not the local-header walk:** executed against fixtures (Python `zipfile`): normal, comment-bearing, `force_zip64` and `word/document.xml`-not-first archives all work with both approaches, but a **streamed ZIP (data descriptor, flag bit 3 → local `compressedSize = 0`) fails the walk** (`["[Content_Types].xml","<<cannot skip>>"]`) and succeeds with the central directory (`["[Content_Types].xml","word/document.xml"]`). Streamed writers (.NET `System.IO.Packaging` in streaming mode, Java/`ZipOutputStream` generators, Google/online exporters) produce such files, so a real user's DOCX can be rejected by the walk. Verified negative cases: plain `.zip` without the entry, an `xl/workbook.xml` OOXML renamed to `.docx`, and a ZIP whose *content* merely contains the text `word/document.xml` all return "not DOCX" with the central-directory reader.
**ZIP64:** only needed past 4 GB / 65 535 entries; impossible within 5 MB. A `force_zip64` entry inside a small archive still has normal EOCD fields and works. If EOCD fields are the `0xFFFF`/`0xFFFFFFFF` sentinels, return `null` (415) — acceptable.
**Example:**
```typescript
// Source: logic verified on 7 fixture archives (scratchpad exp4); constants are the ZIP spec's
// local header "PK\x03\x04" = 0x04034b50, central entry 0x02014b50, EOCD 0x06054b50 (little-endian)
const EOCD_MIN = 22;

function zipEntryNames(buf: Buffer): string[] | null {
  const lowest = Math.max(0, buf.length - EOCD_MIN - 0xffff);
  let eocd = -1;
  for (let i = buf.length - EOCD_MIN; i >= lowest; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const total = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdOffset === 0xffffffff) return null; // ZIP64 sentinel
  const names: string[] = [];
  let off = cdOffset;
  for (let n = 0; n < total; n++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) return null;
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    if (off + 46 + nameLen > buf.length) return null;
    names.push(buf.toString("utf8", off + 46, off + 46 + nameLen));
    off += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

export function detectDocument(bytes: Uint8Array, fileName: string) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") && buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { mimeType: "application/pdf", ext: ".pdf" } as const;
  }
  if (
    lower.endsWith(".docx") &&
    buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50 &&
    zipEntryNames(buf)?.includes("word/document.xml")
  ) {
    return {
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ext: ".docx",
    } as const;
  }
  return null;
}
```
Edge notes: strict `%PDF-` at byte 0 rejects the rare PDFs with leading junk (Acrobat tolerates up to 1024 bytes); acceptable and matches D-02. A 0-byte file never matches → 415 (contract `size.min(1)` is never violated). Case-insensitive extension (`CV.PDF` is valid). Return `mimeType` values must be exactly the two strings of `DOCUMENT_MIME_TYPES`; type them via `(typeof DOCUMENT_MIME_TYPES)[number]` so a typo fails `tsc`.
A DOCX that is macro-bearing (`.docm`) or a `.dotx` template is not accepted (extension) — correct.
I could not test a real Word/LibreOffice-produced file in this session (none on disk). Central-directory reading is independent of how the producer wrote the local headers, so the result does not depend on that; the residual risk is tagged in the Assumptions Log.

### Pattern 3: Storage adapter + upload with compensation (answers the S3 question)
**What:** a narrow `DocumentStorage` interface (`put/get/delete`) built on the existing `S3Client`; the service depends on the interface, tests inject a fake. Verified against Silo: `PutObjectCommand` with `Buffer`/`Uint8Array` body returns 200; `GetObjectCommand` returns `Body` (a `ChecksumStream`, i.e. a Node `Readable` with the SDK mixin) whose `transformToWebStream()` can be handed straight to a Web `Response`; `GetObject` on a deleted key throws a `NoSuchKey` (`err.name === "NoSuchKey"`, `err.$metadata.httpStatusCode === 404`, `err instanceof NoSuchKey` and `instanceof S3ServiceException` both true); `DeleteObject` on a missing key answers 204 (idempotent, no error). The client in `s3.ts` already sets `forcePathStyle` from config and `maxAttempts: 1`; no change needed.
**Example:**
```typescript
// Source: executed against Silo (scratchpad exp3). Types compile under apps/api tsconfig (tsc --noEmit).
import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";

export interface StoredObject { stream: ReadableStream<Uint8Array>; }
export interface DocumentStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>; // null = NoSuchKey
  delete(key: string): Promise<void>;
}

export function createDocumentStorage(s3: S3Client, bucket: string): DocumentStorage {
  return {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key) {
      try {
        const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!out.Body) return null;
        return { stream: out.Body.transformToWebStream() };
      } catch (err) {
        if (err instanceof NoSuchKey) return null;
        throw err;
      }
    },
    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
```
Service upload (D-04):
```typescript
const id = new ObjectId();
const s3Key = buildS3Key(id.toHexString(), fileName, detected.ext);
await storage.put(s3Key, bytes, detected.mimeType);
try {
  return mapDocumentDocToApi(await repository.insert({ _id: id, /* …fields… */ }));
} catch (err) {
  await storage.delete(s3Key).catch(() => undefined); // never mask the insert error
  throw err;
}
```
Wiring: add `storage?: DocumentStorage` to `AppDeps` and mount `app.route("/api/documents", documentsRoutes(...))` inside the `if (deps.db)` branch only when `deps.storage` is also present (as `llm` is handled). `main.ts` builds `createDocumentStorage(s3, config.S3_BUCKET)`.

### Pattern 4: Download stream and `Content-Disposition` (answers the RFC 5987/6266 question)
**What:** `c.body(stream, 200, headers)` with the Web stream from `transformToWebStream()`. The `Content-Disposition` helper **must** produce an ASCII-only value: executed on Node 22, `new Headers({ "content-disposition": 'attachment; filename="CV “x”.pdf"' })` throws `Cannot convert argument to a ByteString because the character at index 25 has a value of 8220 which is greater than 255` (the same for CJK), i.e. the response would become a 500. `é/ñ/ú` (≤ 255) pass but are Latin-1 byte-mangled, so do not rely on that. A CR/LF in the value throws "invalid header value" (the sanitizer in D-05 strips control characters first).
MDN: include both `filename` and `filename*`; `filename*` wins when understood; avoid percent-encoding in `filename` (Safari does not decode it); the fallback is the ASCII transliteration [CITED: developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition].
**Example (output verified for 4 awkward names):**
```typescript
// Source: scratchpad exp5; encoding per RFC 5987 §3.2 (attr-char excludes ' ( ) * and %)
const asciiFallback = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\x20-\x7e]|["\\%]/g, "_");
const rfc5987 = (s: string) =>
  encodeURIComponent(s).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export const contentDisposition = (fileName: string) =>
  `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${rfc5987(fileName)}`;
// "CV Frontend Ñandú (v3).pdf" →
// attachment; filename="CV Frontend Nandu (v3).pdf"; filename*=UTF-8''CV%20Frontend%20%C3%91and%C3%BA%20%28v3%29.pdf
```
Handler:
```typescript
routes.get("/:id/download", async (c) => {
  const meta = await service.get(parseDocumentId(c.req.param("id"))); // 404 "Documento no encontrado"
  const object = await service.open(meta);                              // null → 404 "Archivo no encontrado"
  return c.body(object.stream, 200, {
    "Content-Type": meta.mimeType,
    "Content-Length": String(meta.size),
    "Content-Disposition": contentDisposition(meta.fileName),
  });
});
```
`secureHeaders()` (already global) adds `X-Content-Type-Options: nosniff` [VERIFIED: node_modules/hono/dist/middleware/secure-headers/secure-headers.js:10]. Because `Content-Length` is set from Mongo `size` (a lie would corrupt the stream), the stored `size` must be `file.size` of the uploaded bytes — it is.
`parseObjectId` currently throws the message «Candidatura no encontrada»; the documents routes need their own `parseDocumentId` (or give `parseObjectId` a message parameter) so a malformed id answers «Documento no encontrado» (D-09).

### Pattern 5: Repository, `usedBy`, delete order
- `documents` Mongo shape: `_id: ObjectId`, `type`, `name`, `version`, `fileName`, `s3Key`, `mimeType`, `size`, `createdAt: Date`; the mapper (like `applications.mapper.ts`) writes `id: _id.toHexString()` and ISO dates field by field. `applications.cvDocumentId` stores the **hex string** [VERIFIED: apps/api/src/applications/applications.repository.ts:49-50 `cvDocumentId: string | null;`], so compare with `id.toHexString()`.
- `usedBy` in one extra query (executed on real Mongo; correct counts `a:2, b:1` for a fixture with nulls and missing fields):
```typescript
const rows = await db.collection("applications").aggregate<{ _id: string; n: number }>([
  { $project: { ids: ["$cvDocumentId", "$coverLetterDocumentId"] } },
  { $unwind: "$ids" },
  { $match: { ids: { $type: "string" } } },
  { $group: { _id: "$ids", n: { $sum: 1 } } },
]).toArray();
```
Then `usedBy = counts.get(doc.id) ?? 0`. Single-document check for DELETE: `findOne({ $or: [{ cvDocumentId: id }, { coverLetterDocumentId: id }] }, { projection: { _id: 1 } })`.
- **Delete order (recommended):** 404 check → 409 check → `repository.deleteById` → `storage.delete(s3Key).catch(log)`. Rationale: the forbidden state is "metadata pointing to a missing object"; the reverse (an orphan object) is invisible and harmless, and `DeleteObject` is idempotent. Log only `err.message`, never the file name or full key. A concurrent link/delete race is not guarded (single-user app); accept and note.
- Indexes: add `{ createdAt: -1 }` (list) in `ensureIndexes` for `documents`; optionally `cvDocumentId_1` / `coverLetterDocumentId_1` on `applications` for the in-use check. `apps/api/src/test/mongo.ts` already lists `documents` in `TEST_COLLECTIONS`, so `reset()` already clears it [VERIFIED: apps/api/src/test/mongo.ts:6 `const TEST_COLLECTIONS = ["applications", "documents"] as const;`].

### Pattern 6: Application link validation (D-12/D-13)
`createApplicationsService` needs read access to documents: give it a narrow `findDocumentTypes(ids: string[]): Promise<Map<string, DocumentType>>` dependency (or the documents repository) rather than importing the documents service. Validate for both POST and PUT before writing; on failure throw `ApiError(400, "VALIDATION_ERROR", "Datos no válidos", { fieldErrors: { cvDocumentId: ["El documento no es un CV"] } })` (same `z.flattenError` shape as the global ZodError handler so the web reuses its mapping). A malformed id (not 24 hex) is "does not exist". Copy both fields in `toEditableFields` and remove the stale comment above it.
**Existing test that must be rewritten in the same commit:** `apps/api/src/applications/applications.update.test.ts:211-246` ("keeps the document links, whether the body omits them, sends null or sends other values") asserts the opposite of D-13 (links immutable through PUT, writes `"cv-1"` straight into Mongo). It becomes: omitted/`null` → clears or keeps per the contract default (`null`) and the web always sends the loaded value; real documents of the right type are required.
Note `applicationInputSchema` defaults both fields to `null` [VERIFIED: packages/contracts/src/application.schema.ts:43-44 `cvDocumentId: z.string().min(1).nullable().default(null),`], so an API client that omits them on PUT will **clear** the links; the web must always send them (D-13) — add a web test for it.

### Pattern 7: Dialog inside the application `<form>` (answers D-17, verified)
**Verified in jsdom** (temp test, since deleted): a Radix `Dialog` rendered inside an outer `<form onSubmit>`, with an inner `<form>` in `DialogContent` — clicking the inner submit button calls the outer handler once **unless** the inner `onSubmit` calls `event.stopPropagation()` (result: `NO STOP click: outer=1 inner=1`, `STOP click: outer=0 inner=1`; pressing Enter in an inner text input behaves the same: `ENTER NO STOP: outer=1 inner=1`). The React synthetic event follows the React tree through the portal, not the DOM tree.
**Rule for the planner:**
- Inner form `onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); … }}` (the outer form already does the same, `application-edit.component.tsx:42-48`).
- Every other button the picker renders inside the outer form (`Subir nuevo`, retry) must be `type="button"`.
- Radix also bubbles `keydown`/`click` synthetic events through the portal; only `submit` matters here.
- Remount the dialog form on open (render it inside `DialogContent`, as `InterviewForm` does) so each opening starts empty.
- Test (D-31): render the picker inside a `<form onSubmit={outer}>`, upload, submit, assert `outer` not called and the fetch mock received exactly one `POST /api/documents`.

### Pattern 8: Web `FormData` through `http-client` and file tests
- `request()` currently does `init.headers = { "content-type": "application/json" }; init.body = JSON.stringify(body)` whenever `body !== undefined` [VERIFIED: apps/web/src/core/http/http-client.ts:66-70]. Add a branch: `if (body instanceof FormData) { init.body = body; }` (no `headers`, so the browser writes `multipart/form-data; boundary=…` and `Content-Length`). Keep `RequestOptions.body?: unknown`.
- Tests: `mockFetch` handlers receive `init`; assert `init.body instanceof FormData`, `(init.body as FormData).get("file")` is a `File` with the expected name/size, and that `new Headers(init.headers).has("content-type")` is false.
- jsdom provides `File`/`FormData`; `new File([new Uint8Array(6 * 1024 * 1024)], "big.pdf")` has `size === 6291456` and round-trips through `FormData` (verified). For the size test just build such a `File`; do not mock `size`.
- `userEvent.upload` **drops files that do not match the input's `accept`** by default (`applyAccept: true` in `@testing-library/user-event` setup, verified: uploading `a.txt` to `accept=".pdf,.docx"` leaves `input.files.length === 0`; with `userEvent.setup({ applyAccept: false })` it is 1). Use `applyAccept: false` in the tests of the extension validation.
- Error mapping: `HttpError.code` is already `ErrorCode`; map `FILE_TOO_LARGE` → «El archivo supera 5 MB.» and `UNSUPPORTED_FILE_TYPE` → «Solo se admiten archivos PDF o DOCX.» and keep a generic fallback.
- Download: `<a href={`/api/documents/${id}/download`}>`; the Vite dev proxy forwards `/api` to :3000 [VERIFIED: apps/web/vite.config.ts `proxy: { "/api": { target: "http://localhost:3000" } }`]; encode the id with `encodeURIComponent`. A 404 on a plain link navigates the tab to the JSON error body. Adding the `download` attribute makes the browser treat the failure as a failed download without leaving the SPA — [ASSUMED] browser behaviour, cheap to add (planner's choice; D-24 only says "normal").

### Pattern 9: Picker slot and VM (D-14, D-16)
- Form VM: add `cvDocumentId: string` and `coverLetterDocumentId: string` to `ApplicationFormValues` (`""` = none, the file's existing convention "every control holds a string"); mapper in: `application.cvDocumentId ?? ""`; mapper out (`application-edit.mapper.ts:137-138`): `values.cvDocumentId === "" ? null : values.cvDocumentId`. `EMPTY_FORM_VALUES` gets `""`.
- Type for the slot lives in `application-edit.vm.ts` next to `RenderCancelLink`: `RenderDocumentPicker = (args: { type: "cv" | "carta"; selectedId: string; onSelected: (id: string) => void }) => ReactElement`. Use `DocumentType` from contracts for `type`.
- Each picker option label: `${name} · ${version} · ${formatDate(createdAt)}` (list already comes newest first from the API).
- Where it is declared mounts: the new «Documentos» section goes after `tracking-section.tsx` inside the existing `<form>`; the container passes the slot down like `renderCancelLink`.

### Pattern 10: Detail documents (D-23..D-25)
`useApplicationDetail` keeps the keyed-result pattern; add a second effect/result for documents keyed by `${applicationId}:${cvId}:${coverId}` (so changing a link or id never shows stale rows), `Promise.allSettled`-style per id so one failure degrades only its row. The mapper builds `DetailDocumentVm { id, label, sizeLabel, downloadHref, ariaLabel }` field by field. `formatFileSize(bytes)`: «230 KB» (es-ES) — pick base 1024 with `Intl.NumberFormat("es-ES", { maximumFractionDigits: 0|1 })`, units `B`, `KB`, `MB` (document the choice; 5 MB ceiling means no larger unit).

### Anti-Patterns to Avoid
- **Trusting `file.type` or the browser extension alone** for the stored `mimeType` (D-02).
- **`requireJson` on the documents router** — it rejects everything that is not `application/json` (`apps/api/src/http/require-json.ts`).
- **Walking local file headers to find `word/document.xml`** (fails on streamed ZIPs).
- **Putting the raw `fileName` in a header or S3 key** (ByteString `TypeError` → 500; path characters). Only the slug goes in the key; only the `contentDisposition()` helper output goes in the header.
- **Reading the S3 body into memory for download** — stream it.
- **Letting the compensation `DeleteObject` error replace the insert error**.
- **A `useEffect` in the container to push the uploaded document into a sibling pod** — the scene passes a refresh signal / `onUploaded` callback.
- **Logging the file name, file bytes or full S3 key** (CLAUDE.md privacy rule for offer text; apply the same discipline). `app.onError` only logs `err.message`, and AWS SDK messages do not include bodies.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart parsing | A boundary parser | `c.req.parseBody()` (undici `formData`) | Handles UTF-8 filenames (verified: `CV Ñandú “x”.pdf` round-trips) and quoting |
| Body size cut-off | A stream byte counter | `hono/body-limit` | Verified early reject on `Content-Length` and incremental abort when chunked |
| S3 protocol | Signed HTTP calls | `@aws-sdk/client-s3` commands | Already in the project |
| Web stream from S3 body | Manual `Readable` → `ReadableStream` piping | `Body.transformToWebStream()` | One call, verified end-to-end with `new Response(stream)` |
| Percent-encoding for `filename*` | Custom escaper | `encodeURIComponent` + the 4-char patch (`'()*`) | Exactly RFC 5987 attr-char |
| File inputs in tests | Hand-dispatched `change` events | `userEvent.upload` (+ `applyAccept: false`) | Respects `multiple`, sets `input.files` |
| Dialog focus/aria | Custom modal | existing `Dialog` / `AlertDialog` wrappers in `common/components/ui` | Already styled and tested |

**Key insight:** the only genuinely custom code this phase is three tiny pure functions (`detectDocument`, `buildS3Key`, `contentDisposition`) — each small enough to unit test exhaustively, and each protecting a boundary (content trust, storage path, HTTP header).

## Runtime State Inventory

> Not a rename/refactor phase, but D-05 adds a required contract field. Existing-data check only.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `documents` collection and bucket `documents/` prefix are empty today: no application has a document id (grep of `src` found only `null` and test literals) and S3 listing of `documents/` returned `KeyCount: 0` | None — `fileName` can be required in `documentSchema`; no migration. A developer who already inserted a document by hand would fail the mapper, so make the mapper fall back (`fileName ?? name`) only if the planner wants tolerance |
| Live service config | None — no external service holds the field | None |
| OS-registered state | None | None |
| Secrets/env vars | No new variables: `S3_*` already read by `config.ts` | None; `.env.example` unchanged |
| Build artifacts | `packages/contracts/dist` is stale after the contract change, but API/web tests resolve the `@tfm/source` condition (`apps/api/vitest.config.ts`) so source is used | Run `npm run build` (contracts → api → web) before the final verify |

## Common Pitfalls

### Pitfall 1: Malformed multipart returns 500
**What goes wrong:** `parseBody()` throws `TypeError: Failed to parse body as FormData.` (verified for garbage body and for a `multipart/form-data` header without boundary); `app.onError` maps unknown errors to 500 `INTERNAL_ERROR`.
**How to avoid:** `try/catch` around `parseBody` → `ApiError(400, "VALIDATION_ERROR", …)`. Add a test with `body: "garbage"`.
**Warning signs:** a curl without `-F` returning 500.

### Pitfall 2: DOCX rejected because the ZIP is streamed
**What goes wrong:** local-header walking stops at the first data-descriptor entry.
**How to avoid:** central directory (Pattern 2). Include a streamed-ZIP fixture built in the test (see Validation Architecture).

### Pitfall 3: Non-ASCII file name crashes the download
**What goes wrong:** `Headers` throws a `ByteString` `TypeError` for characters > 255 (curly quotes, CJK).
**How to avoid:** ASCII fallback with every non-printable-ASCII, `"`, `\` and `%` replaced; test with `“x”` and `日本`.

### Pitfall 4: Browser sees a network error instead of the 413
**What goes wrong:** a server that answers before the client finished uploading can reset the socket. `@hono/node-server` drains the unread request body (up to 64 MB or 500 ms, then destroys the socket) [VERIFIED: node_modules/@hono/node-server/dist/index.mjs `DRAIN_TIMEOUT_MS = 500`, `MAX_DRAIN_BYTES = 64 * 1024 * 1024`]. In the experiment a 200 MB upload still received a clean 413 (took ~2 s); 6 MB and 60 MB answered in ms. The client-side size check (D-19) means real users rarely reach this path, but the UI must also handle `HttpError` code `NETWORK_ERROR` in the dialog with a generic retry message.
**Warning signs:** a 413 test that passes with `app.request` but fails in the browser with «No se pudo conectar con el servidor».

### Pitfall 5: `app.request()` tests do not exercise the `Content-Length` branch
**What goes wrong:** `new Request(url, { body: FormData })` carries **no** `content-length` header (verified `null`), so tests through `app.request` go through the chunk-reading branch of `bodyLimit`; the early-reject branch is only hit by a real HTTP client. Both end in the same `onError` → 413.
**How to avoid:** one test through `app.request` (chunk path) is enough for the contract; optionally one `serve()` test on port 0 with `fetch` (as the experiment) for the `Content-Length` path. Do not claim the early reject is covered by `app.request`.

### Pitfall 6: Old PUT test and the `null` default wipe links
Covered in Pattern 6: `applicationInputSchema` defaults the two ids to `null`, and PUT replaces editable fields, so any client omitting them clears the links.

### Pitfall 7: Radix `Dialog` focus return without a `Trigger`
Phase 4's Pitfall 1 applies if the dialog is controlled without `DialogTrigger`: focus lands on `<body>` on close. Reuse the `onCloseAutoFocus` approach of `interview-dialog.tsx` (focus the opener button ref) to satisfy D-17 «el foco vuelve al botón».

### Pitfall 8: Abort mid-upload leaves a stored document the client never heard about
`AbortController.abort()` cancels the browser upload, but if the server had already finished S3 + insert the document exists. D-21 already says uploads live in the library; the next list load shows it. Do not try to roll back from the client.

### Pitfall 9: TypeScript `File` identity
`File` in API code is the Node global (typings from `@types/node`); a test creating `new File([...], "a.pdf")` works with `FormData` and `app.request` (verified compiles under the API tsconfig `lib: ["ES2023"]`, `types: ["node"]`). `noUncheckedIndexedAccess` is on: `form["file"]` is `string | File | (string|File)[] | undefined`-ish, so narrow with `instanceof File`.

## Code Examples

### Test: fake storage + failing repository for the compensation case (D-30)
```typescript
// Source: pattern from the Phase 2/4 test style; DocumentStorage as defined in Pattern 3
export function fakeStorage() {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();
  const storage: DocumentStorage = {
    async put(key, body, contentType) { objects.set(key, { body, contentType }); },
    async get(key) {
      const o = objects.get(key);
      return o ? { stream: new Blob([o.body]).stream() } : null;
    },
    async delete(key) { objects.delete(key); },
  };
  return { storage, objects };
}
// compensation: wrap the real repository so insert() rejects, then expect objects.size === 0
// and the response to be the insert error (500 INTERNAL_ERROR), not a delete error.
```

### Test: building a streamed DOCX fixture without a dependency
Generate fixtures once with Python (`zipfile` over a non-seekable writer → data descriptors; seekable writer → normal; entry order with `word/document.xml` last) and commit the few-hundred-byte files under `apps/api/src/documents/__fixtures__/`, or build the bytes in the test. Fixtures used in this research: `normal.docx`, `streamed.docx` (flag bit 3), `zip64.docx`, `comment.docx` (EOCD comment), `other.zip`, `xlsx.docx` (entry `xl/workbook.xml`), `trick.docx` (content contains the string). PDF fixture: `"%PDF-1.4\n%%EOF"` bytes.

### Web: dialog form submit isolation
```tsx
// Source: verified by a temp jsdom test (see Pattern 7)
<form
  noValidate
  onSubmit={(event) => {
    event.preventDefault();
    event.stopPropagation(); // the React tree crosses the Radix portal into the application <form>
    if (form.state.isSubmitting) return;
    void form.handleSubmit();
  }}
>
```

### Web: `FormData` branch in `request()`
```typescript
if (body instanceof FormData) {
  init.body = body; // no content-type: the browser adds multipart/form-data; boundary=…
} else if (body !== undefined) {
  init.headers = { "content-type": "application/json" };
  init.body = JSON.stringify(body);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Buffer `Body` with `streamToString`/`getObject().promise()` | `Body.transformToWebStream()` / `transformToByteArray()` (SDK v3 `SdkStreamMixin`) | SDK v3 | Stream directly into a Web `Response` |
| `sec-fetch`-less CSRF reasoning | `hono/csrf` checks Origin and `Sec-Fetch-Site` for form content types | Hono 4.x | Optional hardening for the multipart endpoint |

**Deprecated/outdated:** none relevant.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Real Word/LibreOffice-produced `.docx` files have `word/document.xml` in the central directory (the OOXML main-document part name) | Pattern 2 | Valid DOCX rejected as 415; mitigated by reading the central directory regardless of producer; confirm manually with one real Word file during UAT |
| A2 | The `download` attribute on `<a>` keeps the SPA in place when the download endpoint returns an error | Pattern 8 | Cosmetic: a JSON error page replaces the tab; remove the attribute if undesired |
| A3 | `Origin`/`Sec-Fetch-Site` are sent by the target browsers and Vite's proxy keeps the original `Host`, so `hono/csrf` defaults would pass in dev and compose | Security Domain | Only matters if the planner adopts the optional CSRF middleware; test in browser before enabling |
| A4 | The 64 KiB multipart margin is enough for four short text fields and a normal browser filename | Pattern 1 | A legitimate 5 MB file with an extreme name could be rejected by the cap with the same 413; the user-visible effect is identical to oversize |

## Open Questions

1. **Does the user want `fileName` tolerance for documents inserted before this phase?**
   - What we know: no documents exist anywhere (Mongo `documents`/S3 prefix empty; no code writes them).
   - Recommendation: no tolerance, `fileName` required (D-05 is already "costly" but there is no data to migrate).
2. **Adopt `hono/csrf` for `POST /api/documents`?**
   - What we know: the multipart POST is a CORS "simple" request, so a hostile page can post a file to a local instance without preflight; JSON endpoints are protected by `requireJson`. Impact is low (junk upload into a single-user local library).
   - Recommendation: out of CONTEXT scope; if adopted, apply `csrf()` to the documents router only, map the resulting `HTTPException(403)` in `app.onError` (currently any status other than 400/404 becomes `INTERNAL_ERROR`) and send `sec-fetch-site: same-origin` in tests. Otherwise record it as an accepted risk in the SUMMARY/SECURITY.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | v22.23.4 | — |
| Silo (S3) | storage tests, download | ✓ | `GET http://s3:9000/minio/health/live` → 200; put/get/delete executed; bucket `tfm-assets` exists | `fakeStorage()` for non-compensation cases |
| Mongo | repository/service tests | ✓ | reachable (`mongo:27017`); aggregation executed | — |
| Python 3 (`zipfile`) | optional: generating DOCX fixtures | ✓ | /usr/bin/python3 | build ZIP bytes in the test |
| CI workflow | — | ✗ | no `.github/workflows` | tests assume the devcontainer |

**Missing dependencies with no fallback:** none. **Bucket creation:** `CreateBucket`/`DeleteBucket` for a scratch bucket (`tfm-assets-exp`) succeeded with the dev credentials, so a dedicated test bucket is possible.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 (web, jsdom + Testing Library + user-event 14.6.8); Vitest in `apps/api` (node env, `fileParallelism: false`, shared `tfm_test` DB) |
| Config file | `apps/api/vitest.config.ts`, `apps/web/vite.config.ts` (`vitest.config` block; setup `src/test/setup.ts`) |
| Quick run command | `npm run test -w @tfm/api -- documents` / `npm run test -w @tfm/web -- document` |
| Full suite command | `npm run typecheck && npm run test` |

### Decision on Silo vs fake (Claude's discretion): **both, split by purpose**
- Route/service tests (415/413/409/usedBy/link validation/Content-Disposition/404s/slug) use `fakeStorage()` + real Mongo `tfm_test`: deterministic, no network, and the compensation case needs a controllable failure anyway.
- **One** storage contract test (`apps/api/src/storage/storage.test.ts`) runs the real `createDocumentStorage` against Silo in a dedicated bucket `tfm-assets-test` created with the existing `ensureBucket` (mirrors the `tfm_test` Mongo convention and never touches dev data in `tfm-assets`): put → get stream equals bytes → delete → get is `null` → delete again does not throw. Clean up with `DeleteObject` in `afterAll`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | PDF and DOCX upload stored, 201 `Document` with `fileName`, key `documents/<id>/<slug>` | integration (fake storage + Mongo) | `npm run test -w @tfm/api -- documents.upload` | ❌ Wave 0 |
| DOC-01 | Real Silo put/get/delete | integration | `npm run test -w @tfm/api -- storage` | ❌ Wave 0 |
| DOC-02 | > 5 MB → 413 `FILE_TOO_LARGE`; PDF renamed `.docx`, `.txt`, empty file → 415; streamed DOCX accepted | integration + unit | `npm run test -w @tfm/api -- file-type documents.upload` | ❌ Wave 0 |
| DOC-02 | Web friendly messages for 413/415/network | component | `npm run test -w @tfm/web -- document-upload` | ❌ Wave 0 |
| DOC-03 | Form links ids; POST/PUT validate type (400 details); `null` ok; save keeps loaded ids; dialog submit does not submit the application | integration + component | `npm run test -w @tfm/api -- applications.documents`; `npm run test -w @tfm/web -- application-edit document-upload` | ❌ Wave 0 |
| DOC-04 | Download headers, accents, 404 doc / 404 object; detail section rows, per-row degradation | integration + component | `npm run test -w @tfm/api -- documents.download`; `npm run test -w @tfm/web -- application-detail` | ❌ / ✅ extend |
| DOC-05 | DELETE 409 when linked (cv and carta), 404, 204 removes object | integration | `npm run test -w @tfm/api -- documents.delete` | ❌ Wave 0 |
| DOC-06 | List newest first, `?type=` filter, `usedBy`; list pod filter/«En uso en N» | integration + component | `npm run test -w @tfm/api -- documents.list`; `npm run test -w @tfm/web -- document-list` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the affected workspace's targeted `-- <name>` command (pre-commit already runs the suite)
- **Per wave merge:** `npm run typecheck && npm run test`
- **Phase gate:** full suite green + `npm run lint` + `npm run build` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/test/storage.ts` — `fakeStorage()` and the real-Silo helper (test bucket)
- [ ] `apps/api/src/documents/__fixtures__/` (or in-test builders) — PDF, normal DOCX, streamed DOCX, ZIP-without-entry, OOXML-xlsx-as-docx
- [ ] Rewrite `applications.update.test.ts:211-246` (D-13 inverts it)
- [ ] `apps/web/src/test/mock-fetch.ts` — add default `GET /api/documents` → `[]` if `application-edit` tests start fetching lists (same reason as the `/api/tags` default); otherwise every existing `application-edit` test gets a 404 for the picker lists
- [ ] Web test helper `makeFile(name, size, type)` for 6 MB files

## Security Domain

### Applicable ASVS Categories (level 1, `security_enforcement: true`)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | single-user local app, no login (out of scope) |
| V3 Session Management | no | none |
| V4 Access Control | no (single user) | — |
| V5 Input Validation | yes | `documentInputSchema` (Zod) for text fields; magic-byte + extension + exact size for the file; slugged S3 key; sanitised `fileName`; 24-hex id check |
| V6 Cryptography | no | none hand-rolled |
| V12 Files and Resources | yes | size cap before buffering, content sniffing by signature, stored outside web root (S3), download as `attachment` + `nosniff`, no execution of uploaded content, no decompression |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in object key (`../`, `/`) | Tampering | `buildS3Key` slug (verified: `../../etc/passwd.pdf` → `etc-passwd.pdf`, `..pdf` → `document.pdf`); id is a server-generated ObjectId |
| Header injection / response splitting via filename | Tampering | control chars stripped (D-05) + ASCII fallback + percent-encoded `filename*`; `Headers` also rejects CR/LF |
| Content-type spoofing (HTML/SVG renamed `.pdf`) | Spoofing / XSS | signature check, stored `mimeType` from detection, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` (global `secureHeaders`) |
| Zip bomb / decompression | DoS | never decompress; only read central directory bytes of an already size-capped buffer |
| Memory exhaustion by huge upload | DoS | `bodyLimit` early reject / incremental abort (verified), 5 MB + 64 KiB cap |
| Hostile multipart (malformed) | DoS | wrapped `parseBody` → 400 instead of 500 |
| Cross-site multipart POST (no preflight) | CSRF | optional `hono/csrf` (Open Question 2) |
| Information disclosure in logs | Information disclosure | `app.onError` logs only `err.message`; do not add logging of file names or keys |
| Orphan objects | Repudiation / hygiene | compensation on insert failure; delete Mongo before S3 |

## Suggested MVP tracer ordering (mode: mvp)

1. **Plan 01 — API tracer: contracts + storage + upload/list/get/download.** `fileName` and `documentListItemSchema` in contracts (+ schema tests), `DocumentStorage`, `file-type.ts`, `file-name.ts`, repository/service/routes for POST, GET list, GET `:id`, GET download; wire `app.ts`/`main.ts`; Wave 0 test helpers. Gate: upload a PDF with curl and download it back.
2. **Plan 02 — API rules: DELETE with 409, link validation in applications service (POST/PUT), `toEditableFields`, rewrite the old PUT test, `usedBy` tests, compensation test, malformed multipart, 413 tests.**
3. **Plan 03 — Web tracer: `http-client` FormData, `document-upload` pod (dialog, unified modes), `document-list` pod, scene, route `/documents`, nav activation, `formatFileSize`.** Gate: in the browser, upload → appears in list → download → delete (409 teachable).
4. **Plan 04 — Web integration: picker slot in `application-edit` (VM, mapper `null` → ids, section «Documentos», scene `renderDocumentPicker`), detail «Documentos» section (per-row degradation).**
5. **Docs/closing (can ride in Plan 01/03/04):** `docs/DOMAIN.md` (`fileName`), `docs/ARCHITECTURE.md` (`GET /api/documents/:id`, pod `document-list`, route `/documents`, `documents/` API folder), `docs/DESIGN.md` («Documentos» nav active, section in form/detail, `/documents` screen), SUMMARY justification of D-05 and "no new dependencies".

Every plan ends with `<verify>` running at least `npm run typecheck && npm run test` (CLAUDE.md).

## Project Constraints (from CLAUDE.md)

- English identifiers/commits/filenames; Spanish UI copy (tuteo, short sentences, no emojis/exclamations).
- `@tfm/contracts` is the single source of API models; web/API import, never redefine. Web VMs are their own types: **no `extends`/`Omit` from API models**; mapper applied in the hook; `index.ts` of a pod exports only the container; a pod never imports another pod; routes → scenes → pods.
- Tailwind classes next to JSX, design-system tokens only (`bg-primary`, `text-status-*`), no hex colours or `bg-blue-500`.
- API: validate every input with contracts schemas; error shape `{ error: { code, message, details? } }`; expose `id` (string) never `_id`; ISO 8601 UTC dates.
- No `any`; no new dependency without SUMMARY justification (this research recommends none).
- Secrets only in `.env`; `.env.example` current (no new variables).
- Every GSD plan ends with `<verify>` including `npm run typecheck && npm run test`.
- Git: branch `phase/05-documentos-s3`, Conventional Commits, one PR per phase, never push to `main`; TDD with RED and GREEN in the same commit (pre-commit runs the suite).
- Accessibility: keyboard operable, visible focus, contrast AA, `aria-live="polite"` for upload/delete results; responsive from 360 px.
- Never log the offer text; extended here to file names and bytes.

## Sources

### Primary (HIGH confidence — executed this session)
- `node_modules/hono/dist/middleware/body-limit/index.js` and `utils/body.js` (read): `bodyLimit` Content-Length early reject vs chunk loop; `parseBody` buffers via `arrayBuffer()`.
- `node_modules/@hono/node-server/dist/index.mjs` (read): request body wrapped from `Readable`, drained up to 64 MB / 500 ms.
- Real runs against `@hono/node-server` (port 0), Silo (`http://s3:9000`), Mongo (`mongo:27017`), Node 22.23.4 `Headers`, jsdom 30 + Testing Library + user-event 14.6.8: scratch scripts `exp1`–`exp8` in the session scratchpad (not committed).
- Repo files read: `apps/api/src/{app.ts,errors.ts,main.ts,storage/s3.ts,offers/extract.routes.ts,http/*,test/mongo.ts,applications/*}`, `packages/contracts/src/{document,error,application,enums}.schema.ts`, `apps/web/src/{core/http/http-client.ts,test/*,pods/application-edit/*,pods/application-detail/*,layouts/app-layout.tsx,common/lib/format.ts}`, `docs/{DOMAIN,ARCHITECTURE,DESIGN}.md`.

### Secondary (MEDIUM confidence)
- MDN Content-Disposition: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition (both `filename` and `filename*`, precedence, Safari percent-encoding caveat).

### Tertiary (LOW confidence)
- None used for decisions; behaviour of `download` attribute and CSRF headers in browsers is `[ASSUMED]` (A2, A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions read from the repo.
- Architecture: HIGH — each pattern was executed or compiled against the installed versions.
- Pitfalls: HIGH — Pitfalls 1, 2, 3, 5, 7 reproduced; 4 observed (200 MB → clean 413) but browser behaviour not tested in a real browser.

**Research date:** 2026-11-04
**Valid until:** 2026-12-04 (versions are pinned in `package.json`; the defense is 2026-11-09)
