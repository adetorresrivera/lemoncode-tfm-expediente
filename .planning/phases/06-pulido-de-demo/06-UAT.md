---
status: complete
phase: 06-pulido-de-demo
source: [06-17-PLAN.md]
started: 2026-11-06T21:23:01.282Z
updated: 2026-11-07T10:36:41.847Z
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
| S1 | 1280 | 1280/1280 | 1280/1280 | fixed bd6f63b |
| S2 | 360 | 360/360 | 360/360 | fixed bd6f63b |
| S2 | 768 | 768/768 | 768/768 | fixed bd6f63b |
| S2 | 1280 | 1280/1280 | 1280/1280 | fixed bd6f63b |
| S3 | 360 | 360/360 | 360/360 | fixed 98e5c63 |
| S3 | 768 | 768/768 | 768/768 | fixed 98e5c63 |
| S3 | 1280 | 1280/1280 | 1280/1280 | fixed 98e5c63 |
| S4 | 360 | 360/360 | 360/360 | pass |
| S4 | 768 | 768/768 | 768/768 | pass |
| S4 | 1280 | 1280/1280 | 1280/1280 | pass |
| S5 | 360 | 360/360 | 360/360 | pass |
| S5 | 768 | 768/768 | 768/768 | pass |
| S5 | 1280 | 1280/1280 | 1280/1280 | pass |
| S6 | 360 | 360/360 | 360/360 | fixed 98e5c63 |
| S6 | 768 | 768/768 | 768/768 | fixed 98e5c63 |
| S6 | 1280 | 1280/1280 | 1280/1280 | fixed 98e5c63 |
| S7 | 360 | 360/360 | 360/360 | pass |
| S7 | 768 | 768/768 | 768/768 | pass |
| S7 | 1280 | 1280/1280 | 1280/1280 | pass |
| S8 | 360 | 360/360 | 360/360 | pass |
| S8 | 768 | 768/768 | 768/768 | pass |
| S8 | 1280 | 1280/1280 | 1280/1280 | pass |
| S9 | 360 | 360/360 | 360/360 | pass |
| S9 | 768 | 768/768 | 768/768 | pass |
| S9 | 1280 | 1280/1280 | 1280/1280 | pass |
| S11 | 360 | 360/360 | 360/360 | fixed 98e5c63 |
| S11 | 768 | 768/768 | 768/768 | fixed 98e5c63 |
| S11 | 1280 | 1280/1280 | 1280/1280 | fixed bd6f63b |

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
result: pass (captured by the automated Playwright pass against the seeded stack, recaptured after the 44 px fixes so it shows the shipped UI: 1280 × 800, DPR 1, light, 62 KB)

### 2. Keyboard-only walk in the light theme
expected: «Saltar al contenido» appears first and moves focus to the page; the UI-SPEC §6 walk (list, «Añadir candidatura», «Pegar oferta», «Autocompletar con IA», review fields with the IA marks and «Complétalo tú», CV picker, «Guardar candidatura», «Añadir ronda», status select, «Descargar», status filter, «Limpiar filtros») never loses focus, shows the ring on every control (gold on the sidebar) and returns focus to the opener after each dialog
result: pass (automated Tab walk: 0 controls without a ring on S1-S9 and S11; skip link first and Enter lands on `main#main-content`; round, delete, upload dialogs and the Sheet trap focus and return it to their opener)

### 3. Keyboard-only walk in the dark theme
expected: same walk as test 2 in the dark theme, every focused control shows its ring
result: pass (same automated walk in dark: 0 controls without a ring on every screen)

### 4. Reduced motion
expected: with the OS «reduce motion» setting on and the page reloaded, the spinners, the skeleton pulse and the dialog fades stop
result: issue → fixed in 98e5c63 (the dialog, alert-dialog and Sheet fades now live under `motion-safe:`; guards «S4 · … do not animate under reduced motion» and «S11 · … do not animate under reduced motion»; re-check 20)

### 5. Timed demo with mock
expected: with `LLM_PROVIDER=mock`, after `docker compose exec app npm run seed -- --reset`, the flow paste offer → autofill → review → save → add round → attach CV → change status → see it filtered takes strictly less than 120 s
seconds: 13
result: pass (presenter's stopwatch: 12-13 s measured, 13 s recorded, under 120 s)

### 6. Timed demo with Ollama
expected: with Ollama after the README warm-up command, the same flow takes strictly less than 120 s
seconds: 48
result: pass (presenter's stopwatch after the warm-up, 48 s, under 120 s)

### 7. Re-check S1 · 1280 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: status filter buttons and stack chips); guard: responsive.test.tsx «S1 · all viewports · both themes · the status filter buttons have a 44 px hit area» and «S2 · … the stack filter chips have a 44 × 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 8. Re-check S2 · 360 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: status filter buttons and stack chips); guard: responsive.test.tsx «S1 · … the status filter buttons have a 44 px hit area» and «S2 · … the stack filter chips have a 44 × 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 9. Re-check S2 · 768 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: status filter buttons and stack chips); guard: responsive.test.tsx «S1 · … the status filter buttons have a 44 px hit area» and «S2 · … the stack filter chips have a 44 × 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 10. Re-check S2 · 1280 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: status filter buttons and stack chips); guard: responsive.test.tsx «S1 · … the status filter buttons have a 44 px hit area» and «S2 · … the stack filter chips have a 44 × 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 11. Re-check S3 · 360 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: «Ver oferta original» link); guard: responsive.test.tsx «S3 · … the «Ver oferta original» link has a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 12. Re-check S3 · 768 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: «Ver oferta original» link); guard: responsive.test.tsx «S3 · … the «Ver oferta original» link has a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 13. Re-check S3 · 1280 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: «Ver oferta original» link); guard: responsive.test.tsx «S3 · … the «Ver oferta original» link has a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 14. Re-check S6 · 360 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: «Quitar {etiqueta}» tag buttons); guard: responsive.test.tsx «S6 · … the «Quitar {etiqueta}» tag buttons have a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 15. Re-check S6 · 768 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: «Quitar {etiqueta}» tag buttons); guard: responsive.test.tsx «S6 · … the «Quitar {etiqueta}» tag buttons have a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 16. Re-check S6 · 1280 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: «Quitar {etiqueta}» tag buttons); guard: responsive.test.tsx «S6 · … the «Quitar {etiqueta}» tag buttons have a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 17. Re-check S11 · 360 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: Sheet close button «Cerrar»); guard: responsive.test.tsx «S11 · … the Sheet close button «Cerrar» has a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 18. Re-check S11 · 768 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: Sheet close button «Cerrar»); guard: responsive.test.tsx «S11 · … the Sheet close button «Cerrar» has a 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 19. Re-check S11 · 1280 · light and dark
expected: the console prints N/M with N not larger than M, no text clipped, every control at least 44 × 44 px (finding: list behind the closed Sheet (filter buttons and chips)); guard: responsive.test.tsx «S1 · … the status filter buttons have a 44 px hit area» and «S2 · … the stack filter chips have a 44 × 44 px hit area»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 20. Re-check reduced motion
expected: with `prefers-reduced-motion: reduce` the round dialog, the delete dialog, the upload dialog, the Sheet and their overlays report `animation-name: none`; guards: responsive.test.tsx «S4 · … the round dialog and its overlay do not animate under reduced motion», «S4 · … the delete dialog …», «S11 · … the Sheet and its overlay …»
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

### 21. Re-check focus after the fixes
expected: every focused control shows its ring and focus returns to the opener after the round, delete and upload dialogs and the Sheet (the fixes change the size of the Sheet close button, the tag remove buttons and the chips)
result: pass (automated Playwright re-run on the rebuilt stack, see the Gaps section)

## Summary

total: 21
passed: 20
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

No gap is left open: every finding of the human pass was a layout or keyboard defect, so it was fixed (D-12, D-13) with a guard each, and the timed runs are 13 s with mock and 48 s with Ollama (both under 120 s).

Findings of the pass (automated Playwright 1.56.1 Chromium against the seeded stack, 360 / 768 / 1280 in light and dark), all fixed:

1. S4 / S8 / S11 and every Dialog and AlertDialog, all viewports, both themes: with `prefers-reduced-motion: reduce` the content and overlay still animated (`enter 0.15s`). Fixed in 98e5c63: the animate-in and animate-out classes now sit behind `motion-safe:` (the reduce variant lost to the `data-state` selector on specificity).
2. S11, all viewports, both themes: the Sheet close button «Cerrar» was 16 × 16. Fixed in 98e5c63 (`size-11`).
3. S6 (and the S5 tag inputs), all viewports, both themes: the «Quitar {etiqueta}» buttons were 24 × 24. Fixed in 98e5c63 (`size-11`; a removable chip is now 44 px tall).
4. S1 / S2, all viewports, both themes: the status filter buttons were 36 px tall. Fixed in 98e5c63 (`h-11`).
5. S1 / S2, all viewports, both themes: the stack filter chips were 28 px tall. Fixed in 98e5c63 (`h-11`) and bd6f63b (`min-w-11`: the re-run after the first fix still measured the CSS chip at 42 × 44).
6. S3, all viewports, both themes: the «Ver oferta original (se abre en una pestaña nueva)» link was 24 px tall. Fixed in 98e5c63 (`min-h-11`).

Re-checks (tests 7-21): the Playwright run was repeated against the rebuilt stack after the last fix (66 matrix cells, 0 with a control under 44 × 44 px, 0 with horizontal overflow, 0 focused controls without a ring, dialogs and Sheet still trap focus and return it to their opener, `animation-name: none` on every dialog, alert dialog, Sheet and overlay under `reduce`, errors 0). It was run by an automated browser, not by the presenter, so the presenter can still repeat any of the re-checks by hand.

Other measurements, no issue: 360 px extras. A 120-character document name with a 40-character version wraps inside its card on `/documents`; in the form CV picker it is cut by the native select box, which stays inside its section (no page overflow, acceptable native behaviour). The longest seeded title wraps on two lines in its card; the Sheet theme-toggle labels and the wordmark fit.
