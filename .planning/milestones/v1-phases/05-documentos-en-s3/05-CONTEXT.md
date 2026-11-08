# Phase 5: Documentos en S3 - Context

**Gathered:** 2026-11-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Subir CV y cartas de presentación (PDF o DOCX ≤ 5 MB) al bucket `tfm-assets` con tipo, nombre y versión; listarlos con filtro opcional por tipo; vincular un CV y una carta a cada candidatura desde el formulario (eligiendo uno existente o subiendo uno nuevo sin salir); mostrarlos y descargarlos desde el detalle; y rechazar con 409 `DOCUMENT_IN_USE` el borrado de un documento vinculado (regla 4 de `docs/DOMAIN.md`). Requisitos DOC-01…DOC-06 y la parte «documentos vinculados» de APP-09.

Incluye una pantalla `/documents` (decisión del usuario) con lista, filtro, subida, descarga, borrado y marca «En uso». Queda fuera la gestión de versiones de la biblioteca (LIB-01) y la sugerencia de CV por IA (LIB-02), ambas de v2.

</domain>

<decisions>
## Implementation Decisions

### API: subida y validación (decididas por el usuario al lanzar la fase)
- **D-01:** `POST /api/documents` multipart con `file`, `type`, `name` y `version`. Los campos de texto se validan con `documentInputSchema` de `@tfm/contracts`. Si falta `file`, 400 `VALIDATION_ERROR`. Si sale bien, 201 con el `Document` creado.
- **D-02:** El tipo se valida por **magic bytes y extensión, y las dos tienen que coincidir**. PDF: empieza por `%PDF-` y la extensión es `.pdf`. DOCX: firma ZIP `PK\x03\x04`, contiene la entrada `word/document.xml` y la extensión es `.docx`. Si no, 415 `UNSUPPORTED_FILE_TYPE`. El `mimeType` guardado sale de la firma detectada, nunca del `Content-Type` del navegador. No se añaden dependencias: basta con leer la cabecera y buscar la entrada en los local file headers del ZIP (el investigador confirma si es suficiente).
- **D-03:** Si el archivo pasa de `DOCUMENT_MAX_BYTES` (5 MB), 413 `FILE_TOO_LARGE`. Hay que cortar antes de cargar todo el cuerpo en memoria si Hono lo permite (`bodyLimit` con `onError` que lance `ApiError(413, "FILE_TOO_LARGE", …)`, con margen para la sobrecarga multipart, y después la comprobación exacta del tamaño del archivo). Si no se puede cortar en streaming, documentar el límite del cuerpo. Que lo verifique el investigador.
- **D-04:** El id del documento se genera antes de subir (`new ObjectId()`). El orden es: subir a S3 con la clave `documents/<id>/<filename-saneado>` y luego insertar los metadatos en `documents`. Si falla el insert, **compensación**: `DeleteObject` de la clave, sin que un fallo al borrar tape el error original, y la respuesta sigue siendo el error del insert.

### API: nombre original y clave S3
- **D-05:** Se añade **`fileName`** al contrato `documentSchema` (nombre original que mandó el navegador: basename sin ruta, sin caracteres de control, recortado, 1–255). Se actualiza el modelo Document en `docs/DOMAIN.md` y se justifica en el SUMMARY. — **Reversibility:** costly — es un campo nuevo del contrato que leen la API, la web, la semilla de la fase 6 y los documentos ya guardados en Mongo de desarrollo.
- **D-06:** La descarga usa `fileName` en `Content-Disposition: attachment; filename="<alternativa ASCII>"; filename*=UTF-8''<percent-encoded>`, así que los acentos y los espacios se conservan.
- **D-07:** Saneado de la clave S3: **slug ASCII**. Se quitan los acentos (NFD + quitar diacríticos), se pasa a minúsculas, todo lo que no sea `[a-z0-9._-]` se cambia por `-`, se colapsan y recortan los guiones, se limita a 100 caracteres y se fuerza la extensión del tipo detectado (`.pdf` o `.docx`). Si queda vacío, `document.pdf` o `document.docx`. No puede haber `/`, `..` ni caracteres de control.

### API: lectura, descarga y borrado
- **D-08:** `GET /api/documents?type=` se valida con `documentQuerySchema` y se ordena por `createdAt` desc, sin paginación. Cada ítem lleva **`usedBy: number`**, el número de candidaturas cuyo `cvDocumentId` o `coverLetterDocumentId` apunta a él. Hace falta un esquema de ítem de lista en contracts (forma a criterio del planner, en `document.schema.ts`). — **Reversibility:** costly — cambia el contrato de la lista que consumen los pods `document-upload` y `document-list`.
- **D-09:** **Endpoint nuevo `GET /api/documents/:id`**, que devuelve el documento o 404 `NOT_FOUND` «Documento no encontrado» (un ObjectId mal formado también da 404, como en la fase 4). Se añade a la tabla de `docs/ARCHITECTURE.md`. Lo usan el detalle (D-21) y la validación de vínculos (D-11).
- **D-10:** `GET /api/documents/:id/download` hace stream del `Body` de `GetObject` con `Content-Type` = `mimeType` guardado, `Content-Length` = `size` y `Content-Disposition` (D-06). Si no existe el documento, 404 «Documento no encontrado». Si el objeto no está en S3 (`NoSuchKey`), 404 «Archivo no encontrado».
- **D-11:** `DELETE /api/documents/:id` responde 409 `DOCUMENT_IN_USE` si alguna candidatura lo referencia (regla 4), 404 si no existe y 204 si se borra. Se borran los metadatos y el objeto S3; el orden y el tratamiento de un fallo de S3 tras borrar en Mongo quedan a criterio de Claude, sin dejar metadatos que apunten a un objeto inexistente.

### API: vínculos en la candidatura
- **D-12:** **POST y PUT** de candidatura validan los vínculos en el service. Si `cvDocumentId` no existe o no es de tipo `cv`, o si `coverLetterDocumentId` no existe o no es de tipo `carta`: 400 `VALIDATION_ERROR` con `details` por campo (p. ej. «El documento no es un CV»). `null` siempre es válido.
- **D-13:** Se cumple el aviso de la fase 2: `toEditableFields` (`apps/api/src/applications/applications.service.ts:51`) copia `cvDocumentId` y `coverLetterDocumentId`, y el formulario web los envía siempre con el valor cargado. Ahora el mapper web los fija a `null` (`apps/web/src/pods/application-edit/application-edit.mapper.ts:137-138`) y un guardado los borraría.

### Web: picker en el formulario
- **D-14:** `ApplicationEditContainer` recibe un **slot `renderDocumentPicker({ type, selectedId, onSelected })`**, igual que `renderCancelLink`. El valor vive en los campos `cvDocumentId` y `coverLetterDocumentId` de TanStack Form (el VM del formulario los incluye). La escena `application-edit.scene.tsx` pinta `DocumentUploadContainer` en el hueco. Ningún pod importa otro.
- **D-15:** Sección «Documentos» del formulario, tras Seguimiento (`docs/DESIGN.md` §Alta/edición), con dos pickers: «CV» (`type="cv"`) y «Carta de presentación» (`type="carta"`). Está tanto en alta como en edición.
- **D-16:** El select es el **`native-select` existente**. Primera opción «Sin CV» o «Sin carta» (valor `null`, sirve para desvincular) y después los documentos de ese tipo, del más nuevo al más antiguo, con la etiqueta «CV Frontend · v3 · 12 oct. 2026» (`formatDate`). Si la lista está vacía: «Aún no has subido ningún CV.» o «Aún no has subido ninguna carta.» junto a «Subir nuevo». Tiene estados de carga y de error con reintento.
- **D-17:** «Subir nuevo» abre un **`Dialog`** (`common/components/ui/dialog.tsx`, ya existe) con su propio formulario: archivo, Nombre y Versión. Si sale bien, el documento nuevo entra en la lista y queda elegido (`onSelected(id)`), el diálogo se cierra, el foco vuelve al botón y se anuncia «Documento subido.» en `aria-live`. Pitfall que hay que verificar: el `submit` sintético de React atraviesa el portal y llegaría al `<form>` de la candidatura, así que hay que impedir que se propague.
- **D-18:** Nombre **prerrellenado desde el archivo** (sin extensión y recortado a 120) si el campo está vacío al elegirlo. Versión obligatoria, vacía, con el placeholder «Ej.: v3». Se valida con `documentInputSchema`.
- **D-19:** Validación en cliente antes de enviar: `accept=".pdf,.docx"`, extensión `.pdf` o `.docx` y tamaño ≤ `DOCUMENT_MAX_BYTES` (importado de contracts), con mensajes en español en el campo. Los 413 y 415 del servidor también se muestran dentro del diálogo, con un mensaje amable para cada código.
- **D-20:** Progreso con **estado «Subiendo…»**: `fetch` + `AbortController` como el resto de hooks, botón deshabilitado, `aria-live` y posibilidad de cancelar. Sin barra de progreso ni XHR.
- **D-21:** Lo subido **se queda en la biblioteca** aunque luego se descarten los cambios de la candidatura: la subida es independiente, como en la regla 5.
- **D-22:** `DocumentUploadContainer` tiene **dos modos con un único diálogo**. Con `type`, es el picker (select + «Subir nuevo», sin campo Tipo). Sin `type`, solo muestra el botón «Subir documento» y el diálogo añade un `toggle-group` CV/Carta preseleccionado (con el filtro activo que pase la escena, o CV), y avisa con `onUploaded`. La forma exacta de las props queda a criterio del planner.

### Web: detalle
- **D-23:** El pod `application-detail` pide **`GET /api/documents/:id`** para cada id no nulo, en paralelo, después de cargar la candidatura. El mapper construye un VM de documento propio (sin `extends`/`Omit`).
- **D-24:** Sección «Documentos» en la **columna lateral**, bajo «Historial de estados», con **dos filas fijas**: «CV» y «Carta de presentación». Cada una muestra «CV Frontend · v3 · 12 oct. 2026», el tamaño legible («230 KB», helper nuevo en `common/lib/format.ts`) y un enlace «Descargar» con el icono `Download` (`aria-label="Descargar CV Frontend"`). El enlace es un `<a href="/api/documents/:id/download">` normal. Si no hay vínculo: «Sin CV vinculado.» o «Sin carta vinculada.».
- **D-25:** Si falla la petición del documento (404 o red), **solo se degrada esa fila**, que muestra «No hemos podido cargar este documento.» sin enlace, y el resto del detalle se carga con normalidad.

### Web: pantalla /documents (decisión del usuario)
- **D-26:** Ruta nueva `/documents` (`routes/documents/index.tsx`, `validateSearch` con `documentQuerySchema`), escena `document-list.scene.tsx` y **pod nuevo `document-list`** con el juego completo de archivos del curso. Se activa «Documentos» en la navegación de `layouts/app-layout.tsx` (se quita «Próximamente»). Se actualizan `docs/DESIGN.md` y `docs/ARCHITECTURE.md`.
- **D-27:** Cabecera con el eyebrow «Expediente», h1 «Documentos», contador y botón «Subir documento». La escena renderiza `DocumentUploadContainer` en modo solo subida (D-22) y, con `onUploaded`, hace que `DocumentListContainer` vuelva a cargar (con una prop de refresco o similar que pasa la escena; ningún pod importa otro).
- **D-28:** Filtro Todos/CV/Carta con `toggle-group` en search params. Cada fila muestra el nombre, la versión, la fecha, el tipo, el tamaño, **«En uso en N candidaturas»** (singular con 1; nada con 0), «Descargar» y «Eliminar» (botón icono `Trash2` con `aria-label="Eliminar <nombre>"`).
- **D-29:** «Eliminar» **siempre habilitado**. Confirmación con el `AlertDialog`, que espera a la API («Eliminando…»). Si responde 409, el diálogo sigue abierto con «Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.». Si sale bien, se quita la fila y se anuncia «Documento eliminado.». Así la regla 4 se puede enseñar en directo en la defensa.

### Tests
- **D-30:** API: firmas y extensiones (PDF válido, DOCX válido, PDF renombrado a `.docx` → 415, otro tipo → 415), tamaño (> 5 MB → 413), compensación (falla el insert → se borra el objeto, con un repositorio o cliente falso), regla 409, `usedBy`, validación de vínculos (no existe o tipo equivocado → 400; `null` vale), `Content-Disposition` con acentos, slug de la clave y 404 de `:id` y de la descarga. Mongo real `tfm_test` (D-11 de la fase 2).
- **D-31:** Web: mappers de `document-upload`, `document-list` y la parte de documentos de `application-detail` (etiqueta «nombre · versión · fecha», orden, «En uso en N»), validación en cliente del diálogo (tipo y tamaño, prerrelleno del nombre) y que el submit del diálogo no envíe la candidatura.

### Claude's Discretion
- Textos exactos de los errores 413/415 y de validación, siguiendo la voz del DS (p. ej. «El archivo supera 5 MB.», «Solo se admiten archivos PDF o DOCX.»).
- El orden del borrado (Mongo/S3) y su tratamiento de errores, dentro de D-11.
- Si los tests de API usan Silo real o un cliente S3 falso para los casos que no son de compensación.
- La forma de las props de `DocumentUploadContainer` y del esquema del ítem de lista con `usedBy`.
- Los estados vacíos de `/documents` (p. ej. «Aún no has subido ningún documento.»).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dominio y reglas
- `docs/DOMAIN.md` §Document y §Reglas de negocio — Modelo Document, clave `documents/<id>/<filename-saneado>` y reglas 4 y 5. Hay que actualizarlo con `fileName` (D-05).
- `.planning/REQUIREMENTS.md` — DOC-01…DOC-06, APP-09 (documentos vinculados) y LIB-01 (fuera de alcance).
- `.planning/ROADMAP.md` §Phase 5 — Objetivo y cinco criterios de éxito.

### Arquitectura y API
- `docs/ARCHITECTURE.md` — Tabla de endpoints `/api/documents`, códigos de error, `storage/s3.ts` y regla de composición del pod `document-upload`. Hay que actualizarlo con `GET /api/documents/:id`, la escena y el pod `document-list` y la ruta `/documents`.
- `packages/contracts/src/document.schema.ts` — `documentSchema`, `documentInputSchema`, `documentQuerySchema`, `DOCUMENT_MAX_BYTES` y `DOCUMENT_MIME_TYPES`. Hay que extenderlo (D-05, D-08).
- `packages/contracts/src/application.schema.ts:43-44` — `cvDocumentId` y `coverLetterDocumentId`, nullable con valor por defecto `null`.
- `packages/contracts/src/error.schema.ts` — Códigos `DOCUMENT_IN_USE`, `FILE_TOO_LARGE` y `UNSUPPORTED_FILE_TYPE`.

### UI
- `docs/DESIGN.md` — Voz («Subir documento»), sección Documentos del formulario, columna lateral del detalle y navegación (hay que actualizar «Documentos», que deja de ser «Próximamente»).
- `docs/PRODUCT.md` — Flujo de la demo (pegar → guardar → ronda → **CV** → estado → filtrar).

### Decisiones previas
- `.planning/phases/02-candidaturas/02-CONTEXT.md` — D-11 (tests con Mongo real), D-12 (pods) y aviso sobre `toEditableFields`.
- `.planning/phases/04-rondas-de-entrevista/04-CONTEXT.md` — D-14 (borrado con `AlertDialog` y error dentro), D-17 (`Dialog` y TanStack Form) y 404 con ObjectId mal formado.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/storage/s3.ts` — `createS3Client`, `ensureBucket` y `pingS3`. Faltan `put`, `get` y `delete` (ARCHITECTURE.md los prevé aquí).
- `apps/api/src/offers/extract.routes.ts:13-25` — Patrón `bodyLimit` de `hono/body-limit` con `onError` que lanza `ApiError`, el modelo para el 413.
- `apps/api/src/errors.ts` — `ApiError(status, code, message, details?)`.
- `apps/api/src/http/object-id.ts` — Parseo de `:id`.
- `apps/api/src/test/mongo.ts` — Helper de Mongo de test (`tfm_test`).
- `apps/web/src/common/components/ui/` — `dialog`, `alert-dialog`, `native-select`, `toggle-group`, `input` y `label`.
- `apps/web/src/common/lib/format.ts` — `formatDate`. Falta el formateo de tamaños.
- `apps/web/src/pods/application-detail/components/delete-dialog.tsx` e `interview-delete-dialog.tsx` — Patrón de confirmación con error dentro.
- `apps/web/src/pods/application-detail/components/interview-dialog.tsx` — Patrón de `Dialog` con TanStack Form (copiar, no importar).
- `apps/web/src/pods/document-upload/index.ts` — Ahora es un stub vacío (`export {}`).

### Established Patterns
- La escena compone y el pod recibe seams por props (`renderCancelLink`, `renderListLink`, `onSaved`). `renderDocumentPicker` sigue este patrón.
- Hooks propios con `fetch` + `AbortController`, resultado por clave y `replaceResult`. Sin React Query.
- La respuesta de una mutación es la nueva verdad.
- TDD: RED y GREEN en el mismo commit (el pre-commit ejecuta la suite).

### Integration Points
- `apps/web/src/core/http/http-client.ts:66-70` — Ahora hace siempre `JSON.stringify(body)`. Hace falta soportar `FormData` (sin fijar `Content-Type`, para que el navegador ponga el boundary).
- `apps/api/src/app.ts:78-84` — Montar `app.route("/api/documents", …)`.
- `apps/api/src/applications/applications.service.ts:51` — `toEditableFields` y la validación de vínculos (D-12, D-13).
- `apps/web/src/pods/application-edit/application-edit.mapper.ts:135-138` — Hay que mapear los ids en vez de `null`.
- `apps/web/src/pods/application-detail/application-detail.component.tsx:154-155` — La columna lateral, donde va la sección Documentos bajo `StatusHistory`.
- `apps/web/src/layouts/app-layout.tsx:52-64` — El ítem «Documentos», que ahora está desactivado.
- `apps/web/src/scenes/application-edit.scene.tsx` — Pasar `renderDocumentPicker`.

</code_context>

<specifics>
## Specific Ideas

- Etiqueta de documento: «CV Frontend · v3 · 12 oct. 2026».
- Mensaje del 409: «Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.»
- Regla 4 en directo en la defensa: intentar borrar desde `/documents` un CV marcado «En uso en 1 candidatura».
- Rama de la fase: `phase/05-documentos-s3` (ROADMAP).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. La biblioteca con versiones (LIB-01) y la sugerencia de CV por IA (LIB-02) ya están en v2. La pantalla `/documents` se ha quedado en lista, filtro, subida y borrado, sin agrupar versiones.

</deferred>

---

*Phase: 05-documentos-en-s3*
*Context gathered: 2026-11-03*
