# Phase 2: Candidaturas - Context

**Gathered:** 2026-10-29
**Status:** Ready for planning

<domain>
## Phase Boundary

CRUD manual de candidaturas con listado filtrable (filtros en URL), detalle, formulario de alta/edición (sin IA), cambio de estado con historial, `GET /api/tags` y borrado con confirmación. Sin rondas (fase 4), documentos (fase 5) ni IA (fase 3).

Requisitos: APP-01 … APP-14. Rama `phase/02-candidaturas`, objetivo 31 oct.

</domain>

<decisions>
## Implementation Decisions

### API
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

### Web
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto
- `CLAUDE.md` — reglas de código, arquitectura frontend, comandos.
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (APP-01…14), `.planning/ROADMAP.md` §Phase 2.
- `.planning/phases/01-fundaciones-y-walking-skeleton/01-CONTEXT.md` — decisiones heredadas.

### Documentación de producto
- `docs/DOMAIN.md` — entidades, reglas de negocio 1, 2, 5, 7, mapeo estado→DS.
- `docs/ARCHITECTURE.md` — estructura, endpoints, índices, composición de pods.
- `docs/DESIGN.md` — tarjetas, badge, chips, pantallas de listado/detalle/formulario.
- `docs/design/expediente.css` — tokens.

### Código existente
- `packages/contracts/src/application.schema.ts`, `tag.schema.ts`, `enums.ts` — esquemas y query.
- `apps/api/src/app.ts`, `errors.ts`, `db/mongo.ts` — middleware de errores e índices.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `contracts`: `applicationInputSchema`, `applicationSchema`, `applicationQuerySchema`, `statusChangeSchema`, `tagSummarySchema`, `MAX_TAGS`.
- `apps/api/src/errors.ts` (`ApiError`) y manejador global de errores; `db/mongo.ts` ya crea índices de `applications`.
- Web: `core/http/http-client.ts`, `common/lib/format.ts` (`formatDate`, `formatMoney`), shadcn en `common/components/ui`, `pods/application-list` (esqueleto con empty-state), `scenes/application-list.scene.tsx`, `routes/applications/index.tsx`.

### Established Patterns
- Route → scene → pod; pods vacíos (`application-detail`, `application-edit`) solo con `index.ts`.
- `createApp(deps)` inyecta dependencias; tests con Vitest.

### Integration Points
- `createApp` debe recibir el repositorio/`db` y montar las rutas de applications y tags.
- Rutas nuevas en `apps/web/src/routes/applications/` regeneran `routeTree.gen.ts`.

</code_context>

<specifics>
## Specific Ideas

- Voz del DS: tuteo, frases cortas, sin exclamaciones ni emojis. Vacío por filtros: «Ninguna candidatura coincide con los filtros».

</specifics>

<deferred>
## Deferred Ideas

- Borrar desde la tarjeta del listado — no necesario en MVP.
- Paginación del listado — fuera de alcance.
- Filtro por etiquetas de grupos `nice_to_have`/`language` — solo stack en esta fase.

### Roadmap follow-up
- ROADMAP §Phase 2 SC4 y Cross-Phase Notes (APP-09) piden estados vacíos de rondas/documentos; se decidió no renderizarlas. Actualizar esos textos al planificar para que no contradigan.

</deferred>

---

*Phase: 2-Candidaturas*
*Context gathered: 2026-10-29*
