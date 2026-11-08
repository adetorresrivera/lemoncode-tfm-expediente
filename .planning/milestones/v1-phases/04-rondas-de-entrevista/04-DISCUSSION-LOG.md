# Phase 4: Rondas de entrevista - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-01
**Phase:** 04-rondas-de-entrevista
**Areas discussed:** Número de ronda, Fecha y zona horaria, Feedback de mutaciones, Controles del diálogo

El usuario aportó por adelantado las decisiones de API (endpoints, id, round automático, regla 3, operaciones atómicas, respuesta completa), de la sección web (lista, diálogo, borrado, estado vacío) y de tests. Se registran como D-01…D-06 y D-21…D-27 en CONTEXT.md.

---

## Número de ronda

| Option | Description | Selected |
|--------|-------------|----------|
| Permitir | Números repetidos aceptados; desempate por fecha y luego id | ✓ |
| Rechazar con 409 | ROUND_TAKEN nuevo en contracts | |
| Desplazar las demás | Insertar en N desplaza a N+1 las siguientes | |

| Option | Description | Selected |
|--------|-------------|----------|
| Prerrellenado con máx+1 | Calculado en cliente, editable; vacío → lo asigna la API | ✓ |
| Vacío con placeholder | La API asigna si llega vacío | |

| Option | Description | Selected |
|--------|-------------|----------|
| No se renumeran | Quedan la 1 y la 3; `$pull` simple | ✓ |
| Renumerar | Reescribir el array | |

---

## Fecha y zona horaria

| Option | Description | Selected |
|--------|-------------|----------|
| Fecha y hora | «5 nov. 2026, 10:30», `formatDateTime` nuevo | ✓ |
| Solo fecha | Reutiliza `formatDate` | |

| Option | Description | Selected |
|--------|-------------|----------|
| Opcional, siempre con hora | Un `datetime-local`; vacío → null | ✓ |
| Opcional, hora aparte | Inputs date y time por separado | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sin validación | Las fechas pasadas son el caso normal | ✓ |
| Aviso suave | «Esta fecha ya ha pasado» | |

---

## Feedback de mutaciones

| Option | Description | Selected |
|--------|-------------|----------|
| Esperar a la API (guardar) | El diálogo sigue abierto con el error si falla | ✓ |
| Optimista | Duplicaría la regla 3 en el cliente | |

| Option | Description | Selected |
|--------|-------------|----------|
| Región polite de la sección | Mensajes propios de la sección, 5 s | ✓ |
| Reutilizar el slot del estado | Un único slot para todo el detalle | |

| Option | Description | Selected |
|--------|-------------|----------|
| Esperar a la API (borrar) | «Eliminando…», error dentro del diálogo | ✓ |
| Optimista | Vuelve si falla | |

| Option | Description | Selected |
|--------|-------------|----------|
| Una a la vez | Guard compartido entre estado y rondas | ✓ |
| Independientes | Riesgo de que una respuesta pise a otra | |

---

## Controles del diálogo

| Option | Description | Selected |
|--------|-------------|----------|
| Mixto | Tipo con native-select; modalidad y resultado con toggle-group | ✓ |
| Todo native-select | Uniforme | |
| Todo toggle-group | Tipo en 2 filas | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tipo vacío + online + pendiente | Tipo obligatorio | ✓ |
| Técnica + online + pendiente | Todo prerrellenado | |
| Todo vacío salvo resultado | Tipo y modalidad obligatorios | |

| Option | Description | Selected |
|--------|-------------|----------|
| Botones icono con aria-label | Pencil y Trash2 siempre visibles | ✓ |
| Menú de acciones | Requiere dropdown-menu nuevo | |

---

## Claude's Discretion

- Textos de error del diálogo, ubicación de la conversión local ↔ UTC, extracción del guard compartido y apilado de los toggle-group a 360 px.

## Deferred Ideas

Ninguna.
