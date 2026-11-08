---
status: complete
phase: 07-documentaci-n-y-defensa
source: [07-VERIFICATION.md]
started: 2026-11-07T00:00:00Z
updated: 2026-11-08T10:59:37.863Z
---

## Current Test

[testing complete]

## Tests

### 1. Timed rehearsal of the demo script, once with Ollama and once with mock
expected: The 10 steps fit in 5:00 including talking; the second warm-up extraction is under 20 s (otherwise start in mock, as the checklist says)
result: pass

### 2. Record the plan C video and keep it on the laptop and a USB
expected: A per-step video exists outside the repository (not committed by design, D-10); plan C points to «Vídeo, paso N» for steps 2, 8, 9, 10
result: pass

### 3. Mermaid renders on GitHub
expected: After /gsd-ship 7, the 3 diagrams of docs/presentacion/deck.md and the diagram(s) of docs/ia-en-el-proyecto.md render in the PR file view
result: pass

### 4. The deck's 15:00 excludes the examiners' questions
expected: Author confirms; otherwise shorten slides 4-10 and re-run `node scripts/check-docs.mjs --deck --deck-total=m:ss`
result: pass

### 5. Look at the five screenshots and read «Qué funcionó y qué no» as the author
expected: No personal data or wrong UI in docs/presentacion/capturas/*.png; the lessons in docs/ia-en-el-proyecto.md read as the author's own account
result: pass

### 6. Decide on review WR-01 (Ollama wording in the demo script)
expected: Either reword docs/presentacion/demo-script.md:44 («unos segundos») to match ADR-006 («decenas de segundos»), or accept the wording knowingly
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
