# Phase 2: Candidaturas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-10-29
**Phase:** 2-Candidaturas
**Areas discussed:** Secciones vacías vs sin placeholders, Filtro de etiquetas, Estado y fecha en alta/PUT, Normalización y listado

| Area | Options | Chosen |
|---|---|---|
| Secciones rondas/documentos | No renderizar / Estado vacío (ROADMAP) | No renderizar |
| Filtro tags | AND stack / OR stack / AND todos los grupos | AND, solo stack |
| status en POST/PUT | PUT lo ignora / PUT aplica reglas | POST sí, PUT ignora |
| appliedAt manual | Usuario manda / Solo lectura | Usuario manda |
| Normalización tags | Service + formulario / Solo service | Service + formulario |
| Listado | Sin paginación, borrar en detalle / también en tarjeta | Sin paginación, borrar en detalle |

## Claude's Discretion
Índices, layout de tarjetas, debounce de `q`. Tests con Mongo real `tfm_test` (justificado en D-11).

## Deferred Ideas
Borrar desde tarjeta; paginación; filtro por otros grupos de etiquetas.
