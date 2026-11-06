---
status: testing
phase: 06-pulido-de-demo
source: [06-17-PLAN.md]
started: 2026-11-06T21:23:01.282Z
updated: 2026-11-06T21:23:01.282Z
---

## Current Test

number: 1
name: Screenshot of the seeded list
awaiting: user response

## How to fill this file

The stack is up at http://localhost:8080 with the normal seed (12 applications, 3 documents). The three offers to paste are in `docs/demo/ofertas/`.

- Viewport matrix: in the browser console run `document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth`, once in light and once in dark, and write the values as `N/M` in the Light and Dark cells. Result is `pass` when both values have N not larger than M, no text is clipped or overlapping and no control is under 44 × 44 px; otherwise `issue` (describe it in your reply).
- Focus walk: Tab through the screen in light and in dark. Write `visible` or `not visible` in each cell (gold ring on the navy sidebar in light). Result is `pass` when both read `visible`, nothing was unreachable and focus returned to the opener after each dialog; otherwise `issue`.
- Timed demo: replace `pending` after `seconds:` with whole seconds (stopwatch from the click on «Añadir candidatura» to the filtered list showing the new card). Write the real number even when it is 120 or more.

## Viewport matrix (D-12, DEMO-03)

| Screen | Viewport | Light | Dark | Result |
|--------|----------|-------|------|--------|
| S1 | 360 | pending | pending | pending |
| S1 | 768 | pending | pending | pending |
| S1 | 1280 | pending | pending | pending |
| S2 | 360 | pending | pending | pending |
| S2 | 768 | pending | pending | pending |
| S2 | 1280 | pending | pending | pending |
| S3 | 360 | pending | pending | pending |
| S3 | 768 | pending | pending | pending |
| S3 | 1280 | pending | pending | pending |
| S4 | 360 | pending | pending | pending |
| S4 | 768 | pending | pending | pending |
| S4 | 1280 | pending | pending | pending |
| S5 | 360 | pending | pending | pending |
| S5 | 768 | pending | pending | pending |
| S5 | 1280 | pending | pending | pending |
| S6 | 360 | pending | pending | pending |
| S6 | 768 | pending | pending | pending |
| S6 | 1280 | pending | pending | pending |
| S7 | 360 | pending | pending | pending |
| S7 | 768 | pending | pending | pending |
| S7 | 1280 | pending | pending | pending |
| S8 | 360 | pending | pending | pending |
| S8 | 768 | pending | pending | pending |
| S8 | 1280 | pending | pending | pending |
| S9 | 360 | pending | pending | pending |
| S9 | 768 | pending | pending | pending |
| S9 | 1280 | pending | pending | pending |
| S11 | 360 | pending | pending | pending |
| S11 | 768 | pending | pending | pending |
| S11 | 1280 | pending | pending | pending |

S10: covered by the S9 card layout and route-error.test.tsx (the production build cannot force a route error)

Screens: S1 lista de candidaturas; S2 lista con el filtro móvil abierto; S3 detalle de una candidatura con 3 rondas; S4 diálogo «Añadir ronda» y diálogo de borrado; S5 «Añadir candidatura» con «Pegar oferta»; S6 formulario de edición; S7 /documents; S8 diálogo de subida; S9 ruta desconocida (/nope); S11 menú Sheet abierto.

## Focus walk (D-13, DEMO-04)

| Screen | Check | Light | Dark | Result |
|--------|-------|-------|------|--------|
| S1 | focus | pending | pending | pending |
| S2 | focus | pending | pending | pending |
| S3 | focus | pending | pending | pending |
| S4 | focus | pending | pending | pending |
| S5 | focus | pending | pending | pending |
| S6 | focus | pending | pending | pending |
| S7 | focus | pending | pending | pending |
| S8 | focus | pending | pending | pending |
| S9 | focus | pending | pending | pending |
| S11 | focus | pending | pending | pending |

## Tests

### 1. Screenshot of the seeded list
expected: `docs/img/application-list.png` exists: a PNG of http://localhost:8080/applications in the light theme, 1280 × 800, device scale factor 1, no filters, no dialog, no browser chrome, under 300 KB
result: [pending]

### 2. Keyboard-only walk in the light theme
expected: «Saltar al contenido» appears first and moves focus to the page; the UI-SPEC §6 walk (list, «Añadir candidatura», «Pegar oferta», «Autocompletar con IA», review fields with the IA marks and «Complétalo tú», CV picker, «Guardar candidatura», «Añadir ronda», status select, «Descargar», status filter, «Limpiar filtros») never loses focus, shows the ring on every control (gold on the sidebar) and returns focus to the opener after each dialog
result: [pending]

### 3. Keyboard-only walk in the dark theme
expected: same walk as test 2 in the dark theme, every focused control shows its ring
result: [pending]

### 4. Reduced motion
expected: with the OS «reduce motion» setting on and the page reloaded, the spinners, the skeleton pulse and the dialog fades stop
result: [pending]

### 5. Timed demo with mock
expected: with `LLM_PROVIDER=mock`, after `docker compose exec app npm run seed -- --reset`, the flow paste offer → autofill → review → save → add round → attach CV → change status → see it filtered takes strictly less than 120 s
seconds: pending
result: [pending]

### 6. Timed demo with Ollama
expected: with Ollama after the README warm-up command, the same flow takes strictly less than 120 s
seconds: pending
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

[none yet]
