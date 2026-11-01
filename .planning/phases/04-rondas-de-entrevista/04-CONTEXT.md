# Phase 4: Rondas de entrevista - Context

**Gathered:** 2026-11-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Crear, editar y borrar rondas de entrevista (`Interview`, embebidas en `Application.interviews`) desde el detalle de la candidatura, con la regla 3 de `docs/DOMAIN.md`: añadir una ronda con estado `enviada` pasa la candidatura a `en_entrevistas` con entrada en el historial. Requisitos INT-01…INT-05 y la parte de rondas de APP-13 (`updatedAt`). Recordatorios, timeline y dashboard de entrevistas quedan fuera (DASH-01, v2).

</domain>

<decisions>
## Implementation Decisions

### API (decididas por el usuario al lanzar la fase)
- **D-01:** Endpoints `POST /api/applications/:id/interviews` (201), `PUT /api/applications/:id/interviews/:interviewId` y `DELETE /api/applications/:id/interviews/:interviewId`, montados en `applications.routes.ts`. Entrada validada con `interviewInputSchema` de `@tfm/contracts` (nunca redefinido). `:id` e `:interviewId` inválidos o inexistentes → 404 `NOT_FOUND` con el cuerpo de error estándar.
- **D-02:** El id de ronda se genera con `new ObjectId().toString()` y se guarda como string (el contrato expone `id: string`).
- **D-03:** `round` = máx. actual + 1 cuando no llega en el input (1 si no hay rondas); si llega, se respeta. Editable en PUT.
- **D-04:** Regla 3 solo al **crear**: si el estado es `enviada`, pasa a `en_entrevistas` y se añade `{ status: "en_entrevistas", at: now }` a `statusHistory`. En cualquier otro estado, el estado no cambia. Editar o borrar rondas nunca cambia el estado. La regla vive en `applications.service.ts`.
- **D-05:** Operaciones atómicas sobre el array: `$push` (crear, junto con el `$set` de status, el `$push` de historial cuando aplique y `updatedAt`), `$set` con `arrayFilters` por `id` (editar), `$pull` por `id` (borrar). Toda operación actualiza `updatedAt`. Se usa `findOneAndUpdate` con `returnDocument: "after"`.
- **D-06:** Las tres operaciones responden con la **candidatura completa** actualizada (`Application`), incluido el `DELETE` (200 con cuerpo, no 204), para que la web reemplace el VM con la respuesta.

### Número de ronda
- **D-07:** Se **permiten números repetidos** (no hay 409). Orden de la lista: `round` asc, desempate por `scheduledAt` asc (nulls al final) y después por `id`.
- **D-08:** Al borrar una ronda **no se renumeran** las demás: de 1-2-3, borrar la 2 deja 1 y 3, y la siguiente nueva será la 4.
- **D-09:** El diálogo «Añadir ronda» trae el campo «Ronda» **prerrellenado con máx. + 1**, calculado en el cliente a partir del VM, y el usuario lo puede cambiar. Si lo vacía, el campo se omite en el input y lo asigna la API (D-03).

### Fecha y zona horaria
- **D-10:** `scheduledAt` es **opcional y siempre con hora**: un único `<input type="datetime-local">`. Vacío → `null` y la lista muestra «Sin fecha». El valor local se convierte a ISO UTC en el mapper del pod y se convierte de vuelta a local al editar.
- **D-11:** En la lista, la fecha se muestra **con hora** en la zona local del navegador: «5 nov. 2026, 10:30». Se añade `formatDateTime(iso, timeZone?)` en `apps/web/src/common/lib/format.ts`, con el mismo estilo que `formatDate` (`es-ES`, mes corto con punto) y `timeZone` opcional para que los tests sean deterministas.
- **D-12:** Las fechas pasadas no se validan: registrar rondas ya celebradas es el caso normal.

### Feedback de mutaciones
- **D-13:** Crear y editar **esperan a la API** (sin optimismo). «Guardar ronda» muestra «Guardando…» y queda deshabilitado. Si sale bien, se cierra el diálogo y el VM se reemplaza con la respuesta (rondas, badge de estado e historial a la vez). Si falla, el diálogo sigue abierto con el error dentro y conserva lo escrito.
- **D-14:** Borrar: confirmación con el `AlertDialog` existente. Espera a la API: el botón muestra «Eliminando…» y el diálogo se cierra al terminar. Si falla, el error aparece dentro del diálogo, igual que en `delete-dialog.tsx`.
- **D-15:** Tras cada mutación se anuncia un mensaje en una región `aria-live="polite"` **propia de la sección** «Rondas de entrevista», siempre montada: «Ronda añadida.», «Ronda actualizada.» o «Ronda eliminada.». Si la creación cambió el estado, se añade « Estado cambiado a En entrevistas.». Desaparece a los 5 s, como el feedback de estado (`SUCCESS_VISIBLE_MS`).
- **D-16:** **Una mutación a la vez** en todo el detalle: un único guard de ocupado compartido por el cambio de estado y las mutaciones de ronda. Mientras hay una en vuelo, el selector de estado y los botones de ronda (añadir, editar y eliminar) se deshabilitan, para que una respuesta antigua nunca pise a una nueva. Las respuestas se escriben solo si el resultado sigue perteneciendo a la misma clave (patrón `replaceResult` del hook actual).

### Controles del diálogo
- **D-17:** Un `Dialog` de shadcn (nuevo en `common/components/ui/dialog.tsx`, sobre `radix-ui` ya instalado, sin dependencia nueva) con un formulario TanStack Form validado con el esquema de contracts.
- **D-18:** Controles: **tipo** con `native-select` (6 opciones, cabe a 360 px); **modalidad** y **resultado** con `toggle-group` (se ven de un vistazo y se manejan con flechas); fecha con `datetime-local`, notas con `textarea` (máx. 5.000), ronda con input numérico (mín. 1).
- **D-19:** Valores por defecto al añadir: tipo **vacío** con la opción «Elige un tipo», obligatorio y con error en el campo si falta; modalidad `online`; resultado `pendiente`; ronda máx. + 1 (D-09); fecha y notas vacías. Al editar, el diálogo trae los valores de la ronda.
- **D-20:** Acciones por ronda: botones icono `ghost` siempre visibles, `Pencil` y `Trash2` de lucide, con `aria-label` «Editar ronda N» y «Eliminar ronda N». Al cerrar el diálogo, el foco vuelve al botón que lo abrió.

### Web: sección en el detalle (decididas por el usuario al lanzar la fase)
- **D-21:** Sección «Rondas de entrevista» en el pod `application-detail`, entre Etiquetas y Notas (`docs/DESIGN.md` §detalle), con componentes `components/interview-*.tsx` (`docs/ARCHITECTURE.md`). Botón «Añadir ronda» en la cabecera de la sección.
- **D-22:** Cada ítem muestra «Ronda N · <Tipo>», la fecha formateada o «Sin fecha», la modalidad, el resultado como **badge neutro** con icono (`Clock` pendiente, `Check` superada, `X` no superada; solo tokens del DS, sin colores de estado) y las notas **plegables** (`collapsible` existente) si hay.
- **D-23:** Estado vacío: «Aún no hay rondas. Añade la primera cuando te convoquen.»
- **D-24:** El VM de ronda es propio del pod (sin `extends` ni `Omit` del API model). Lo construye `application-detail.mapper.ts` dentro de `ApplicationDetailVm`, ya ordenado (D-07), con etiquetas en español. El mapper del formulario convierte entre VM (strings, `""` = vacío) e `InterviewInput`. Las etiquetas de los enums (`INTERVIEW_TYPE_LABELS`, `INTERVIEW_MODE_LABELS`, `INTERVIEW_OUTCOME_LABELS`) se añaden a `common/lib/enum-labels.ts`.

### Tests
- **D-25:** Service de API con Mongo real (`tfm_test`, D-11 de la fase 2): regla 3 (`enviada` → `en_entrevistas` con historial; otro estado sin cambio; editar y borrar no cambian el estado), round automático (máx. + 1, 1 si está vacío, respeta el round enviado, no se renumera tras borrar), `updatedAt` en las tres operaciones y 404 de candidatura o ronda inexistentes.
- **D-26:** Mapper de rondas: orden y desempate, etiquetas, «Sin fecha», conversión `datetime-local` ↔ ISO UTC con zona fija, y vacío → omitir `round`.
- **D-27:** Diálogo con Testing Library: prerrelleno de ronda, tipo obligatorio, envío del input correcto, error que mantiene abierto el diálogo y edición con valores cargados.

### Claude's Discretion
- Contenido exacto de los textos de error del diálogo (tono del DS: tuteo, frases cortas, sin exclamaciones).
- Si la conversión local ↔ UTC vive en `common/lib/format.ts` o en el mapper del pod.
- Extraer o no el guard compartido a un hook interno del pod.
- Si el toggle-group de modalidad o resultado necesita apilarse a 360 px.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dominio y reglas
- `docs/DOMAIN.md` — Modelo `Interview` (embebida), enums `InterviewType`, `InterviewMode` e `InterviewOutcome`, regla 3 (ronda con `enviada` → `en_entrevistas`) y regla 7 (`updatedAt`).
- `.planning/REQUIREMENTS.md` — INT-01…INT-05 y APP-13.
- `.planning/ROADMAP.md` §Phase 4 — Objetivo y criterios de éxito.

### Arquitectura y API
- `docs/ARCHITECTURE.md` — Tabla de endpoints (`/interviews`), estructura del pod `application-detail` con `components/interview-*.tsx` y reglas en `applications.service.ts`.
- `packages/contracts/src/interview.schema.ts` — `interviewSchema`, `interviewInputSchema` (round opcional) e `interviewFieldsSchema`, ya definidos.
- `packages/contracts/src/error.schema.ts` — Códigos de error disponibles (`NOT_FOUND`).

### UI
- `docs/DESIGN.md` — Posición de la sección en el detalle, tokens, voz del DS y patrón de diálogos.
- `.planning/phases/02-candidaturas/02-UI-SPEC.md` — Contrato visual del detalle que ya existe (feedback de estado, diálogo de borrado).
- `docs/PRODUCT.md` — Flujo de demo «… → añadir ronda → …» en menos de 2 minutos.

### Decisiones previas
- `.planning/phases/02-candidaturas/02-CONTEXT.md` — D-06/D-07 (historial y estado solo por PATCH), D-11 (tests con Mongo real), D-12 (arquitectura de pods) y D-15 (detalle, optimismo del estado, secciones de rondas aplazadas a esta fase).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/contracts/src/interview.schema.ts` — Esquemas de ronda listos; `applicationSchema.interviews` ya es `z.array(interviewSchema)`.
- `apps/api/src/applications/applications.{repository,service,routes,mapper}.ts` — `interviews` ya está en el documento (siempre `[]` hasta ahora, `applications.repository.ts:52`) y en el mapper. PUT y POST ignoran `interviews` del cliente, y eso se mantiene.
- `apps/api/src/http/object-id.ts` — Parseo y validación de `:id` (reutilizar para `:interviewId` si aplica, aunque se guarde como string).
- `apps/api/src/test/mongo.ts` — Helper de Mongo de test.
- `apps/web/src/common/components/ui/` — `alert-dialog`, `collapsible`, `native-select`, `toggle-group`, `textarea`, `input`, `label` y `button` existen. Falta `dialog` (D-17).
- `apps/web/src/common/lib/format.ts` — `formatDate(iso, timeZone?)`: modelo para `formatDateTime`.
- `apps/web/src/common/lib/enum-labels.ts` — Patrón `Record<Enum, string>`; faltan las etiquetas de ronda.
- `apps/web/src/pods/application-detail/components/delete-dialog.tsx` — Patrón de confirmación con estado deleting/error.
- `apps/web/src/pods/application-edit/components/form-field.tsx` — Patrón de campo TanStack Form con error en el campo, para el formulario del diálogo (copiar el patrón, no importar del otro pod).

### Established Patterns
- Hook de detalle con resultado por clave (`applicationId#attempt`), `replaceResult` que solo escribe si la clave coincide, `busyRef` para una mutación a la vez, y feedback `{ kind, message }` con temporizador de 5 s. Las mutaciones de ronda se suman a este hook (D-16).
- La respuesta de la mutación es la nueva verdad; no se hace refetch.
- La escena compone pod + cabecera; el pod no importa el router (seams `RenderListLink`).
- TDD: RED y GREEN en el mismo commit (el pre-commit ejecuta la suite).

### Integration Points
- `apps/web/src/pods/application-detail/application-detail.component.tsx:140-141` — Insertar la sección de rondas entre `<TagsSection>` y `<NotesSection>`.
- `apps/web/src/pods/application-detail/api/api.ts` — Añadir `createInterview`, `updateInterview` y `deleteInterview`, que devuelven `Application`.
- `apps/web/src/pods/application-detail/application-detail.vm.ts` — Añadir `interviews: InterviewVm[]` y el VM del formulario.
- `apps/api/src/applications/applications.routes.ts` — Las tres rutas nuevas.

</code_context>

<specifics>
## Specific Ideas

- Texto literal del estado vacío: «Aún no hay rondas. Añade la primera cuando te convoquen.»
- Formato del ítem: «Ronda N · Técnica».
- El cambio de estado provocado por la regla 3 debe verse en la demo: badge e historial se actualizan a la vez con la respuesta.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Recordatorios y timeline de entrevistas ya figuran como DASH-01 (v2).

</deferred>

---

*Phase: 04-rondas-de-entrevista*
*Context gathered: 2026-11-01*
