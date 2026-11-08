# Phase 6: Pulido de demo - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-06
**Phase:** 6-Pulido de demo
**Areas discussed:** Contenido y reset del seed, Hallazgos abiertos a incluir, Proveedores y alcance de tests

---

## Contenido y reset del seed

| Option | Description | Selected |
|--------|-------------|----------|
| Fixtures: no, solo para pegar | Quedan en docs/demo; las 12 usan otras ofertas | ✓ |
| Fixtures: sí, 3 de las 12 | offerText de una fixture; duplicado al pegar en la demo | |
| Mover a docs/demo | Fuente única; fixtures.ts lee de ahí | ✓ |
| Copiar + test de igualdad | Dos copias vigiladas por test | |
| Fechas relativas al seed | Últimas 6 semanas desde la ejecución | ✓ |
| Fechas fijas | Deterministas, envejecen | |
| Reset: solo seed:true + --reset | Por defecto solo seed; --reset vacía todo | ✓ |
| Reset: solo seed:true | Tal cual el brief | |
| Reset: todo siempre | Vacía colecciones y bucket | |
| PDFs versionados en assets/ | Legibles, sin dependencias | ✓ |
| PDFs generados en el seed | Mínimos, byte a byte | |
| Vía: services de la API | Reglas del dominio + parche de fechas/seed | ✓ |
| Vía: inserción directa | Control total, reglas duplicadas | |
| Reparto: Claude decide, realista | — | ✓ |

**User's choice:** all recommended options.

---

## Hallazgos abiertos a incluir

| Option | Description | Selected |
|--------|-------------|----------|
| Arranque y fallos en vivo | Fase 1 startup/pingS3, 02 WR-04, 02 WR-03 | ✓ |
| Tests flaky | 05 WR-01, forks worker | ✓ |
| Pantallas en inglés / errores | 01 WR-07, 01 WR-08 | ✓ |
| Fixes de UI-review 05 | iconos, X durante subida, espaciados | ✓ |
| Resto: baratos sí, resto diferido | 02 WR-01 + 02 WR-02 dentro | ✓ |
| Resto: todos diferidos | — | |
| Resto: todos dentro | — | |
| Mecánica: planes de la fase 6 | Misma rama y PR, disposition → fixed | ✓ |
| Mecánica: code-review --fix por fase | — | |

**User's choice:** all four groups, cheap extras in, fixes as Phase 6 plans.

---

## Proveedores y alcance de tests

| Option | Description | Selected |
|--------|-------------|----------|
| Gemini/Groq vía openai-compatible | Sin código, research valida json_schema | |
| Proveedores nuevos gemini/groq | ADR + adaptadores | |
| Solo Ollama y mock | Gemini/Groq fuera del README | ✓ |
| Tests: gaps reglas/mappers + Nyquist | Incluye cerrar VALIDATION 02/03/05 | ✓ |
| Tests: solo reglas y mappers | — | |
| Test seed contra Mongo/Silo | Idempotencia + función pura | ✓ |
| Test seed solo función pura | — | |

**User's choice:** Solo Ollama y mock (overrides the brief's «Ollama / Gemini / Groq / mock»); tests incl. Nyquist; seed integration test.

---

## Claude's Discretion

- Accessibility tooling (axe-core vs vitest-axe), AA contrast verification outside jsdom, responsive/keyboard verification method, README screenshot, seed content details, image-size target, cold-start script.

## Deferred Ideas

- Gemini/Groq providers; remaining open review findings (04 WR-01/02, 01 WR-01..06, info items); remaining UI-review lists.
