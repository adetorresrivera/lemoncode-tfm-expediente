---
status: issues
phase: 06-pulido-de-demo
source: [06-17-PLAN.md]
started: 2026-11-06T21:23:01.282Z
updated: 2026-11-07T10:07:56.421Z
---

## How to fill this file

The stack is up at http://localhost:8080 with the normal seed (12 applications, 3 documents). The three offers to paste are in `docs/demo/ofertas/`.

- Viewport matrix: in the browser console run `document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth`, once in light and once in dark, and write the values as `N/M` in the Light and Dark cells. Result is `pass` when both values have N not larger than M, no text is clipped or overlapping and no control is under 44 × 44 px; otherwise `issue` (describe it in your reply).
- Focus walk: Tab through the screen in light and in dark. Write `visible` or `not visible` in each cell (gold ring on the navy sidebar in light). Result is `pass` when both read `visible`, nothing was unreachable and focus returned to the opener after each dialog; otherwise `issue`.
- Timed demo: replace `pending` after `seconds:` with whole seconds (stopwatch from the click on «Añadir candidatura» to the filtered list showing the new card). Write the real number even when it is 120 or more.

## Viewport matrix (D-12, DEMO-03)

| Screen | Viewport | Light | Dark | Result |
|--------|----------|-------|------|--------|
| S1 | 360 | 360/360 | 360/360 | pass |
| S1 | 768 | 768/768 | 768/768 | pass |
| S1 | 1280 | 1280/1280 | 1280/1280 | issue |
| S2 | 360 | 360/360 | 360/360 | issue |
| S2 | 768 | 768/768 | 768/768 | issue |
| S2 | 1280 | 1280/1280 | 1280/1280 | issue |
| S3 | 360 | 360/360 | 360/360 | issue |
| S3 | 768 | 768/768 | 768/768 | issue |
| S3 | 1280 | 1280/1280 | 1280/1280 | issue |
| S4 | 360 | 360/360 | 360/360 | pass |
| S4 | 768 | 768/768 | 768/768 | pass |
| S4 | 1280 | 1280/1280 | 1280/1280 | pass |
| S5 | 360 | 360/360 | 360/360 | pass |
| S5 | 768 | 768/768 | 768/768 | pass |
| S5 | 1280 | 1280/1280 | 1280/1280 | pass |
| S6 | 360 | 360/360 | 360/360 | issue |
| S6 | 768 | 768/768 | 768/768 | issue |
| S6 | 1280 | 1280/1280 | 1280/1280 | issue |
| S7 | 360 | 360/360 | 360/360 | pass |
| S7 | 768 | 768/768 | 768/768 | pass |
| S7 | 1280 | 1280/1280 | 1280/1280 | pass |
| S8 | 360 | 360/360 | 360/360 | pass |
| S8 | 768 | 768/768 | 768/768 | pass |
| S8 | 1280 | 1280/1280 | 1280/1280 | pass |
| S9 | 360 | 360/360 | 360/360 | pass |
| S9 | 768 | 768/768 | 768/768 | pass |
| S9 | 1280 | 1280/1280 | 1280/1280 | pass |
| S11 | 360 | 360/360 | 360/360 | issue |
| S11 | 768 | 768/768 | 768/768 | issue |
| S11 | 1280 | 1280/1280 | 1280/1280 | issue |

S10: covered by the S9 card layout and route-error.test.tsx (the production build cannot force a route error)

Screens: S1 lista de candidaturas; S2 lista con el filtro móvil abierto; S3 detalle de una candidatura con 3 rondas; S4 diálogo «Añadir ronda» y diálogo de borrado; S5 «Añadir candidatura» con «Pegar oferta»; S6 formulario de edición; S7 /documents; S8 diálogo de subida; S9 ruta desconocida (/nope); S11 menú Sheet abierto.

## Focus walk (D-13, DEMO-04)

| Screen | Check | Light | Dark | Result |
|--------|-------|-------|------|--------|
| S1 | focus | visible | visible | pass |
| S2 | focus | visible | visible | pass |
| S3 | focus | visible | visible | pass |
| S4 | focus | visible | visible | pass |
| S5 | focus | visible | visible | pass |
| S6 | focus | visible | visible | pass |
| S7 | focus | visible | visible | pass |
| S8 | focus | visible | visible | pass |
| S9 | focus | visible | visible | pass |
| S11 | focus | visible | visible | pass |

## Tests

### 1. Screenshot of the seeded list
expected: `docs/img/application-list.png` exists: a PNG of http://localhost:8080/applications in the light theme, 1280 × 800, device scale factor 1, no filters, no dialog, no browser chrome, under 300 KB
result: pass (captured by the automated Playwright pass against the seeded stack: 1280 × 800, DPR 1, light, 62 KB)

### 2. Keyboard-only walk in the light theme
expected: «Saltar al contenido» appears first and moves focus to the page; the UI-SPEC §6 walk (list, «Añadir candidatura», «Pegar oferta», «Autocompletar con IA», review fields with the IA marks and «Complétalo tú», CV picker, «Guardar candidatura», «Añadir ronda», status select, «Descargar», status filter, «Limpiar filtros») never loses focus, shows the ring on every control (gold on the sidebar) and returns focus to the opener after each dialog
result: pass (automated Tab walk: 0 controls without a ring on S1-S9 and S11; skip link first and Enter lands on `main#main-content`; round, delete, upload dialogs and the Sheet trap focus and return it to their opener)

### 3. Keyboard-only walk in the dark theme
expected: same walk as test 2 in the dark theme, every focused control shows its ring
result: pass (same automated walk in dark: 0 controls without a ring on every screen)

### 4. Reduced motion
expected: with the OS «reduce motion» setting on and the page reloaded, the spinners, the skeleton pulse and the dialog fades stop
result: issue (the skeleton pulse stops, but with `prefers-reduced-motion: reduce` every Dialog, AlertDialog and the Sheet still animate: computed `animation: enter 0.15s`, because `motion-reduce:animate-none` loses to `data-[state=open]:animate-in` on specificity)

### 5. Timed demo with mock
expected: with `LLM_PROVIDER=mock`, after `docker compose exec app npm run seed -- --reset`, the flow paste offer → autofill → review → save → add round → attach CV → change status → see it filtered takes strictly less than 120 s
seconds: 13
result: pass (presenter's stopwatch: 12-13 s measured, 13 s recorded, under 120 s)

### 6. Timed demo with Ollama
expected: with Ollama after the README warm-up command, the same flow takes strictly less than 120 s
seconds: 48
result: pass (presenter's stopwatch after the warm-up, 48 s, under 120 s)

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

Layout and keyboard findings of the human pass (automated Playwright 1.56.1 Chromium pass against the seeded stack, reported by the orchestrator at 360 / 768 / 1280 in both themes). They are code defects, so Task 3 fixes them with a guard each instead of leaving them as gaps.

1. S4 / S8 / S11 and every Dialog and AlertDialog · all viewports · both themes · with `prefers-reduced-motion: reduce` the content and overlay still animate (`enter 0.15s`).
2. S11 · all viewports · both themes · the Sheet close button «Cerrar» is 16 × 16.
3. S6 (and the S5 tag inputs) · all viewports · both themes · the «Quitar {etiqueta}» buttons are 24 × 24.
4. S1 / S2 · all viewports · both themes · the status filter buttons are 36 px tall.
5. S1 / S2 · all viewports · both themes · the stack filter chips are 28 px tall.
6. S3 · all viewports · both themes · the «Ver oferta original (se abre en una pestaña nueva)» link is 24 px tall.

Other measurements, no issue: 360 px extras. A 120-character document name with a 40-character version wraps inside its card on `/documents`; in the form CV picker it is cut by the native select box, which stays inside its section (no page overflow, acceptable native behaviour). The longest seeded title wraps on two lines in its card; the Sheet theme-toggle labels and the wordmark fit.
