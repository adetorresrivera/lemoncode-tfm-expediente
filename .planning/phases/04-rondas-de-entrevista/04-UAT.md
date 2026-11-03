---
status: testing
phase: 04-rondas-de-entrevista
source: [04-VERIFICATION.md]
started: 2026-11-03T06:48:13Z
updated: 2026-11-03T12:10:50Z
---

## Current Test

number: 1
name: Native datetime-local picker in Chrome, Firefox and Safari
expected: |
  The saved round shows the same local date and time that was picked in each browser.
awaiting: user response

## Tests

### 1. Native datetime-local picker in Chrome, Firefox and Safari
expected: The saved round shows the same local date and time that was picked.
result: [pending]

### 2. Add/edit dialog at 360 px with the soft keyboard open
expected: The dialog scrolls inside itself, the footer stays reachable, and the page never scrolls sideways.
result: [pending]

### 3. Keyboard-only add, edit and delete in light and dark theme
expected: Focus returns to the right control after each dialog closes, focus is always visible, and contrast meets AA in both themes.
result: [pending]

### 4. Edit only the outcome of a round whose stored date has seconds or falls in the autumn DST overlap
expected: After a reload, the round keeps its exact date and time (review fix 57aa1db).
result: [pending]

### 5. Confirm the judgment-tier prohibitions
expected: Status changes only from exactly enviada; no optimistic render; notes are never logged; delete never renumbers; no delete without confirmation; one mutation at a time.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
