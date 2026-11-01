---
status: testing
phase: 03-autocompletado-con-ia
source: [03-VERIFICATION.md]
started: 2026-11-01T12:36:08Z
updated: 2026-11-01T12:36:08Z
---

## Current Test

number: 1
name: Re-analysis fix in the browser
expected: |
  Analyse offer A, edit one filled field and add one manual tag, then analyse a different offer B. Fields and chips still marked «IA» are replaced by B's values or cleared; the edited field and the manual tag stay; «IA» and «Complétalo tú» marks are recomputed; nothing is saved before «Guardar».
awaiting: user response

## Tests

### 1. Re-analysis fix in the browser
expected: Fields and chips still marked «IA» are replaced or cleared by the second analysis; user edits and manual tags are kept; marks recomputed; nothing persisted before «Guardar».
result: [pending]

### 2. Real-model sanity with gemma4:e2b and the D-25 prompt on a quiet machine
expected: The three fixtures (or a pasted offer) answer without 504 or 502, with real tag labels (no group names) and the company filled.
result: [pending]

### 3. Mock plan-B demo path with docker compose up --build
expected: With LLM_PROVIDER=mock the draft appears in about 300 ms; on edit the panel is collapsed with offerText prefilled and no marks on load.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
