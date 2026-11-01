---
status: complete
phase: 03-autocompletado-con-ia
source: [03-VERIFICATION.md]
started: 2026-11-01T12:36:08Z
updated: 2026-11-01T13:15:53.856Z
---

## Current Test

[testing complete]

## Tests

### 1. Re-analysis fix in the browser
expected: Fields and chips still marked «IA» are replaced or cleared by the second analysis; user edits and manual tags are kept; marks recomputed; nothing persisted before «Guardar».
result: pass

### 2. Real-model sanity with gemma4:e2b and the D-25 prompt on a quiet machine
expected: The three fixtures (or a pasted offer) answer without 504 or 502, with real tag labels (no group names) and the company filled.
result: issue
reported: \"C and Python are being labeled as languages rather than tech stack. Also, all labels example text is React rather than something relevant"
severity: major
note: tested with a real NVIDIA Senior SW & System Architect offer (C, Python, Linux, Docker, DPDK, OVS, OVN, Kubernetes, Calico, Flannel, OpenStack, OpenShift, Ansible); offer text not stored here

### 3. Mock plan-B demo path with docker compose up --build
expected: With LLM_PROVIDER=mock the draft appears in about 300 ms; on edit the panel is collapsed with offerText prefilled and no marks on load.
result: issue
reported: \"Auto completing works but the AI part does not collapse automatically"
severity: minor
note: user clarified the expectation is that the «Pegar oferta» panel folds after a successful analysis on the create screen (not covered by the current UI-SPEC); mock autofill itself works; the first attempt ran with a mistyped LLM_PROVIDER and hit Ollama while the model was still downloading

## Summary

total: 3
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-03-2
  truth: "AI tags put programming languages and technologies (C, Python) in the stack group; the language group holds only human languages with level (e.g. Inglés B2)"
  status: failed
  reason: "User reported: C and Python are being labeled as languages rather than tech stack"
  severity: major
  test: 2
  artifacts: []
  missing: []
- gap_id: G-03-2b
  truth: "Each tag group input shows a placeholder example relevant to that group (stack, se valora, idiomas), not the same «Ej.: React» everywhere"
  status: failed
  reason: "User reported: all labels example text is React rather than something relevant"
  severity: minor
  test: 2
  artifacts: []
  missing: []
- gap_id: G-03-3
  truth: "After a successful analysis the «Pegar oferta» panel collapses on its own so the filled form is in view (new behaviour requested at UAT 2026-11-01; UI-SPEC to be amended)"
  status: failed
  reason: "User reported: Auto completing works but the AI part does not collapse automatically"
  severity: minor
  test: 3
  artifacts: []
  missing: []
