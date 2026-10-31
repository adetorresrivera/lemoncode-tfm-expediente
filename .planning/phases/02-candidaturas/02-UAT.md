---
status: complete
phase: 02-candidaturas
source: [02-VERIFICATION.md]
started: 2026-10-31T13:30:00Z
updated: 2026-10-31T16:03:31.626Z
---

## Current Test

[testing complete]

## Tests

### 1. Layout at 360 px and 1024 px in light and dark on the list, the detail and the form (30-char and 120-char titles, 20 tag chips, 15-entry history, long company names)
expected: No horizontal scroll; titles wrap; full-width buttons below sm; timeline dots sit on the line; collapsible chevron rotates; header action wraps correctly
result: pass

### 2. Keyboard-only pass: create form (Enter in a tag input adds a tag and never submits, chip removal returns focus to a neighbour), status selector (arrow keys), delete dialog (initial focus on «Conservar candidatura», Tab/Enter/Esc, focus returns to «Eliminar»), landing on the list with focus on its h1
expected: Every control reachable and operable by keyboard with a visible focus ring; announcements arrive through the polite status regions
result: pass

### 3. Real-browser round trip of filters: pick a status, a stack tag and «Fecha de envío», reload, press Back
expected: Same URL, controls and results after reload; Back leaves the list instead of replaying filter clicks; «Limpiar filtros» returns to /applications
result: pass

### 4. Focus ring and DS look of Button, Toggle, ToggleGroup, filter panel and empty-by-filters card in light and dark
expected: Solid 2 px ring in the ring colour, semibold labels, spacing and hierarchy per 02-UI-SPEC
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
