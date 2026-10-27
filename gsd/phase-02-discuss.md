# Fase 2 — Candidaturas

Uso: `/clear` → `/gsd-discuss-phase 2` → pega el bloque. Research: **No**.

```
Decisiones de implementación de la fase 2 (modelo y reglas en docs/DOMAIN.md, pantallas en
docs/DESIGN.md):

API
- applications.repository (Mongo) + applications.service (reglas) + routes + mapper
  documento↔contrato (id string, fechas ISO).
- Endpoints de la tabla de ARCHITECTURE.md salvo interviews (fase 4).
- Filtros: status y tags admiten varios valores (?status=enviada&status=en_entrevistas);
  q busca por regex case-insensitive en title y company (escapar la entrada); sort por
  updatedAt desc (defecto) o appliedAt desc con nulls al final.
- Reglas: historial al crear y en cada cambio real de estado; appliedAt al pasar a enviada
  por primera vez; updatedAt siempre.
- GET /api/tags agregando tags.label + group con count.
- Tests del service con Mongo real del devcontainer (base de datos tfm_test, limpiada por test)
  o mongodb-memory-server si da problemas en CI; elige y justifica.

Web (arquitectura del curso, sin excepciones)
- Pods: application-list, application-detail, application-edit (formulario, sin IA aún).
- Rutas: /applications (validateSearch con el esquema de query de contracts),
  /applications/new, /applications/$applicationId, /applications/$applicationId/edit.
- Escenas: list, detail, edit (alta si no hay id). La escena de edición navega al detalle
  tras guardar; cancelar vuelve al detalle o al listado.
- Listado: filtros sincronizados con search params (cambiar filtro = navigate con search),
  tarjetas según DESIGN.md (3 etiquetas + «+N»), estados de carga/error/vacío/vacío por filtros.
- Detalle: datos, etiquetas agrupadas, selector de estado (PATCH) con actualización optimista
  y rollback en error, historial de estados, notas, texto original plegable, eliminar con
  diálogo de confirmación. Las secciones de rondas y documentos no se renderizan hasta
  sus fases (sin placeholders).
- Formulario TanStack Form + esquema de contracts: secciones Puesto y empresa, Condiciones,
  Etiquetas (input por grupo con chips removibles, Enter añade), Seguimiento. Valores del
  formulario en el VM del pod (strings vacíos, no null); el mapper convierte a input de API.
- Componentes comunes: status-badge, tag-chip (normal/soft/removible/seleccionado),
  request-status.

Tests: mappers de los tres pods, service de API, StatusBadge y filtro de listado con
Testing Library.
```
