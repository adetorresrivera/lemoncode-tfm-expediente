---
status: testing
phase: 03-autocompletado-con-ia
source: [03-VERIFICATION.md]
started: 2026-11-01T17:37:13Z
updated: 2026-11-01T17:37:13Z
---

## Current Test

number: 1
name: Re-run UAT tests 2 and 3 after gap closure (03-10, 03-11, 03-12)
expected: |
  Test 2 (Ollama gemma4:e2b, NVIDIA Senior SW & System Architect offer): C, Python, Linux, Docker, Kubernetes and the rest of the stack land in «Stack tecnológico»; only spoken languages with level are in «Idiomas».
  Test 3 (LLM_PROVIDER=mock, create and edit screens): the three tag inputs show «Ej.: React», «Ej.: Docker» and «Ej.: Inglés B2». After a successful analysis that filled something the «Pegar oferta» panel folds, the summary stays announced below it, focus is not lost (it goes to the trigger only if it was lost or inside the panel), and the trigger reopens the panel with the pasted text.
awaiting: user response

## Tests

### 1. Re-run UAT tests 2 and 3 after gap closure (03-10, 03-11, 03-12)
expected: C, Python and the rest of the stack in «Stack tecnológico», only spoken languages in «Idiomas» (real model); per-group placeholders; the panel folds after a successful analysis on create and edit, summary visible, focus not stranded, reopen keeps the pasted text (mock).
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

Previous round (gaps G-03-2, G-03-2b, G-03-3, diagnosed 2026-11-01) is in git history of this file.
