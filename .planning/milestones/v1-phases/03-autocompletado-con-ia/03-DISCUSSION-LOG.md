# Phase 3: Autocompletado con IA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-31
**Phase:** 03-autocompletado-con-ia
**Areas discussed:** Panel en edición y re-análisis, Ciclo de vida de las marcas, Errores, progreso y cancelar, Fixtures y prueba manual

---

## Panel en edición y re-análisis

| Question | Options | Selected |
|---|---|---|
| Textarea en edición con offerText guardado | Precargado / Vacío | Precargado |
| Cuándo se asigna offerText | Solo al analizar / Siempre el textarea | Solo al analizar |
| Re-análisis | Sí, marcas se acumulan / Sí, se reinician / Solo una vez | Sí, se acumulan |
| Panel tras éxito | Se queda abierto / Se pliega | Se queda abierto |

**Notes:** The summary of filled fields goes to the aria-live region; focus does not move.

---

## Ciclo de vida de las marcas

| Question | Options | Selected |
|---|---|---|
| Cuándo se quita «IA» | Al primer cambio / Si el valor difiere | Al primer cambio |
| Marca de etiquetas IA | Por grupo / Por chip / Sin marca | Por chip |
| Aspecto de la marca en chip (follow-up) | Icono Sparkles / Mini badge «IA» | Icono Sparkles |
| Cuándo pierde la marca un chip (follow-up) | Nunca en la sesión / Al tocar el grupo | Nunca en la sesión |
| Cuándo deja de resaltarse «Complétalo tú» | Cuando deja de estar vacío / Al primer cambio | Cuando deja de estar vacío |
| Persistencia de marcas | Sesión / Se guardan | Sesión |

**Notes:** Per-chip marks require an extra `aiTags` set in the mapper result, added next to `{ values, aiFields, missingFields }`.

---

## Errores, progreso y cancelar

| Question | Options | Selected |
|---|---|---|
| Mensajes de error | Uno por código / Genérico | Uno por código |
| Validación de longitud en cliente | Contador + botón desactivado / Validar al pulsar | Contador + botón desactivado |
| Edición durante el análisis | Fusión con valores de la llegada / Bloquear formulario | Valores de la llegada |
| Timeout con reintento | Presupuesto total / Por intento | Presupuesto total |

---

## Fixtures y prueba manual

| Question | Options | Selected |
|---|---|---|
| Formato | .txt + expected.ts / Solo .ts / Solo .txt | .txt + expected.ts |
| Uso en tests automáticos | Sí, con LlmClient falso / Solo demo y seed | Sí, con LlmClient falso |
| Prueba manual | Script con tabla / Solo por la UI | Script con tabla |
| Si gemma4:e2b falla | Anotar y preguntar / Ajustar el prompt | Anotar y preguntar |

---

## Claude's Discretion

- Propagating a client cancel to the server (`AbortSignal.any`), file layout in `apps/api/src/offers/`, order of merged tags, exact VM names and mark-state storage, `Collapsible` vs `<details>`.

## Deferred Ideas

- Existing tags in the prompt (future iteration per the spec).
- Persisting AI marks.
- Fixtures in the seed (Phase 6).
