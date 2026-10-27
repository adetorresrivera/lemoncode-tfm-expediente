# Fase 4 — Rondas de entrevista

Uso: `/clear` → `/gsd-discuss-phase 4` → pega el bloque. Research: **No**.

```
Decisiones de implementación de la fase 4 (modelo Interview y regla 3 en docs/DOMAIN.md):

API
- POST /api/applications/:id/interviews, PUT y DELETE .../interviews/:interviewId.
- id de ronda generado con new ObjectId().toString(); round = max + 1 por defecto, editable.
- Regla 3: crear una ronda con estado enviada → pasa a en_entrevistas con entrada en el
  historial. Borrar rondas no cambia el estado.
- Operaciones atómicas sobre el array ($push, $set con arrayFilters, $pull) y updatedAt.
- Respuesta: la candidatura completa actualizada.

Web, pod application-detail
- Sección «Rondas de entrevista» en el detalle: lista ordenada por round, cada ítem con
  «Ronda N · Técnica», fecha formateada (o «Sin fecha»), modalidad, resultado como badge
  neutro (pendiente/superada/no superada con iconos Clock/Check/X), notas plegables.
- «Añadir ronda» y «Editar» abren un Dialog de shadcn con formulario TanStack Form
  (tipo, fecha y hora con input datetime-local, modalidad, resultado, notas).
- Borrar con confirmación.
- Tras crear una ronda que cambia el estado, el badge y el historial se actualizan
  con la respuesta de la API.
- Estado vacío: «Aún no hay rondas. Añade la primera cuando te convoquen.»

Tests: service (regla 3, round automático), mapper de rondas, diálogo con Testing Library.
```
