---
status: testing
phase: 07-documentaci-n-y-defensa
source: [07-VERIFICATION.md]
started: 2026-11-07T00:00:00Z
updated: 2026-11-07T00:00:00Z
---

## Current Test

number: 1
name: Timed rehearsal of the demo script, once with Ollama and once with mock
expected: |
  Over a fresh `docker compose exec app npm run seed -- --reset`, the 10 steps of
  docs/presentacion/demo-script.md fit in 5:00 including talking; the second warm-up
  extraction is under 20 s (otherwise start in mock, as the checklist says).
awaiting: user response

## Tests

### 1. Timed rehearsal of the demo script, once with Ollama and once with mock
expected: The 10 steps fit in 5:00 including talking; the second warm-up extraction is under 20 s (otherwise start in mock, as the checklist says)
result: [pending]

### 2. Record the plan C video and keep it on the laptop and a USB
expected: A per-step video exists outside the repository (not committed by design, D-10); plan C points to «Vídeo, paso N» for steps 2, 8, 9, 10
result: [pending]

### 3. Mermaid renders on GitHub
expected: After /gsd-ship 7, the 3 diagrams of docs/presentacion/deck.md and the diagram(s) of docs/ia-en-el-proyecto.md render in the PR file view
result: [pending]

### 4. The deck's 15:00 excludes the examiners' questions
expected: Author confirms; otherwise shorten slides 4-10 and re-run `node scripts/check-docs.mjs --deck --deck-total=m:ss`
result: [pending]

### 5. Look at the five screenshots and read «Qué funcionó y qué no» as the author
expected: No personal data or wrong UI in docs/presentacion/capturas/*.png; the lessons in docs/ia-en-el-proyecto.md read as the author's own account
result: [pending]

### 6. Decide on review WR-01 (Ollama wording in the demo script)
expected: Either reword docs/presentacion/demo-script.md:44 («unos segundos») to match ADR-006 («decenas de segundos»), or accept the wording knowingly
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
