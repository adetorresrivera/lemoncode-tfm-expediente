---
status: complete
phase: 04-rondas-de-entrevista
source: [04-VERIFICATION.md]
started: 2026-11-03T06:48:13Z
updated: 2026-11-03T20:48:31.453Z
---

## Current Test

[testing complete]

## Tests

### 1. Native datetime-local picker in Chrome, Firefox and Safari
expected: The saved round shows the same local date and time that was picked.
result: pass

### 2. Add/edit dialog at 360 px with the soft keyboard open
expected: The dialog scrolls inside itself, the footer stays reachable, and the page never scrolls sideways.
result: pass

### 3. Keyboard-only add, edit and delete in light and dark theme
expected: Focus returns to the right control after each dialog closes, focus is always visible, and contrast meets AA in both themes.
result: pass

### 4. Edit only the outcome of a round whose stored date has seconds or falls in the autumn DST overlap
expected: After a reload, the round keeps its exact date and time (review fix 57aa1db).
result: pass

### 5. Confirm the judgment-tier prohibitions
expected: Status changes only from exactly enviada; no optimistic render; notes are never logged; delete never renumbers; no delete without confirmation; one mutation at a time.
result: pass

### 6. Status change and round save on two applications close together
expected: Each application shows its own «Guardando…» and its own success message; one finishing never clears or replaces the other's message (review fix 2ea14e0).
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
