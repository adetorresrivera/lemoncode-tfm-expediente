---
status: diagnosed
phase: 03-autocompletado-con-ia
source: [03-VERIFICATION.md]
started: 2026-11-01T12:36:08Z
updated: 2026-11-01T13:33:24Z
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
  root_cause: "The tag group value the model must emit for spoken languages is the English word \"language\" (packages/contracts/src/enums.ts tagGroupSchema), seen by gemma4:e2b in the Ollama format grammar and in the prompt line; after writing C/Python/Java it reads it as programming language. normalizeExtraction never checks the group. Reproduced 2/2 with a 'Programming languages: C and Python' offer and 2/2 with the onsite-junior fixture (Java)."
  artifacts:
    - path: "apps/api/src/offers/extract.service.ts"
      issue: "prompt group lines 25-27 give no rule against programming languages; normalizeExtraction (71-106) copies the group unchecked"
    - path: "packages/contracts/src/enums.ts"
      issue: "group value 'language' is misleading for the model (do not rename in the contract: stored data, DOMAIN.md, web filters)"
    - path: "docs/AI-EXTRACTION.md"
      issue: "prompt block 77-80 and Normalización 85-89 need the new rule"
  missing:
    - "Deterministic guard in normalizeExtraction: keep group language only when the label names a spoken language from a closed list; otherwise stack (spec line approval needed)"
    - "Optional: show the model 'idioma' instead of 'language' via the responseSchema option and map back (6/6 correct in probes; needs D-01/D-25 approval)"
  debug_session: .planning/debug/ai-tags-programming-languages-in-language-group.md
- gap_id: G-03-2b
  truth: "Each tag group input shows a placeholder example relevant to that group (stack, se valora, idiomas), not the same «Ej.: React» everywhere"
  status: failed
  reason: "User reported: all labels example text is React rather than something relevant"
  severity: minor
  test: 2
  root_cause: "02-UI-SPEC.md (line 271 and copy table line 393) defines one shared tag placeholder «Ej.: React»; TagGroupInput hardcodes it (tag-group-input.tsx:100) with no prop, TagsSection renders it for all three groups, and application-edit.test.tsx:778 asserts it for every group. Present since phase 2."
  artifacts:
    - path: "apps/web/src/pods/application-edit/components/tag-group-input.tsx"
      issue: "hardcoded placeholder, no prop"
    - path: "apps/web/src/pods/application-edit/components/tags-section.tsx"
      issue: "cannot pass a per-group placeholder"
    - path: "apps/web/src/pods/application-edit/application-edit.test.tsx"
      issue: "line 778 asserts the shared placeholder"
    - path: ".planning/phases/02-candidaturas/02-UI-SPEC.md"
      issue: "lines 271 and 393 define a single placeholder"
  missing:
    - "Required placeholder prop on TagGroupInput; per-group copy in TagsSection: Stack «Ej.: React», Se valora «Ej.: Docker», Idiomas «Ej.: Inglés B2»"
    - "Update the test and the UI-SPEC copy"
  debug_session: .planning/debug/tag-group-placeholder-always-react.md
- gap_id: G-03-3
  truth: "After a successful analysis the «Pegar oferta» panel collapses on its own so the filled form is in view (new behaviour requested at UAT 2026-11-01; UI-SPEC to be amended)"
  status: failed
  reason: "User reported: Auto completing works but the AI part does not collapse automatically"
  severity: minor
  test: 3
  root_cause: "Missing behaviour, not a bug: D-12 (03-CONTEXT.md:34, chosen by the user in 03-DISCUSSION-LOG.md:19 «Se queda abierto») and 03-UI-SPEC.md:217/:256 require the panel to stay open after success; OfferPanel uses an uncontrolled defaultOpen and the success path in useOfferExtraction never touches it. Tests lock the stays-open contract (application-edit.ai.test.tsx:143-144, :1577)."
  artifacts:
    - path: "apps/web/src/pods/application-edit/components/offer-panel.tsx"
      issue: "uncontrolled Collapsible defaultOpen; Radix unmounts content, so collapsing with focus on the AI button drops focus to body"
    - path: "apps/web/src/pods/application-edit/application-edit.vm.ts"
      issue: "OfferPanelModel has defaultOpen only (needs open + onOpenChange)"
    - path: "apps/web/src/pods/application-edit/application-edit.hooks.ts"
      issue: "success branch (336-399) is where the close belongs; error and cancel must not close"
    - path: "apps/web/src/pods/application-edit/application-edit.container.tsx"
      issue: "hardcoded defaultOpen true/false (lines 65, 123)"
  missing:
    - "Controlled open state owned by useOfferExtraction; collapse on success; move focus to the trigger only when focus was lost or inside the panel; status region stays outside CollapsibleContent"
    - "Amend D-12 and 03-UI-SPEC lines 181/185/202/204/217/244/256; update ~12 tests and add new ones"
  debug_session: .planning/debug/offer-panel-collapse-after-analysis.md
