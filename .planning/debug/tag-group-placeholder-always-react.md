---
status: diagnosed
trigger: "tag-group-placeholder-always-react: Each tag group input shows a placeholder example relevant to that group (stack, se valora, idiomas), not the same «Ej.: React» everywhere"
created: 2026-11-01T13:17:21Z
updated: 2026-11-01T13:19:30Z
---

## Current Focus

hypothesis: CONFIRMED. The phase-2 UI-SPEC copy contract specified one placeholder («Ej.: React») for every tag input; TagGroupInput implements it as a hardcoded literal with no per-group prop, TagsSection renders the same component three times, and a test locks the shared value in.
test: done (code read, spec grep, existing test run, alternative reading eliminated)
expecting: n/a
next_action: return ROOT CAUSE FOUND to the caller (goal: find_root_cause_only). Fix belongs to the phase-3 gap-closure plan.
bug_class: Bohrbug (deterministic; same output on every render)
reasoning_checkpoint:
  hypothesis: "Every tag group input shows «Ej.: React» because TagGroupInput hardcodes placeholder=\"Ej.: React\" (tag-group-input.tsx:100) and exposes no placeholder prop, so the three instances in TagsSection (stack, nice_to_have, language) cannot differ; the literal comes straight from 02-UI-SPEC.md, which specifies that single placeholder for each fieldset"
  confirming_evidence:
    - "tag-group-input.tsx:100 has the literal placeholder=\"Ej.: React\"; the Props interface has no placeholder field"
    - "tags-section.tsx:39-60 renders TagGroupInput three times, passing only group/legend/soft/tags/aiTags/onChange"
    - "02-UI-SPEC.md:271 says each fieldset gets placeholder «Ej.: React»; the copy table at 02-UI-SPEC.md:393 says «Tag: Ej.: React · URL: https:// (no other placeholders)»"
    - "application-edit.test.tsx:778 loops over all three legends and asserts placeholder «Ej.: React»; it passes (vitest run 2026-11-01 13:18)"
  falsification_test: "If any group's input had a different placeholder, the test at application-edit.test.tsx:778 would fail; it passes, so all three share the value"
  fix_rationale: "Make the placeholder per-group copy (prop from TagsSection, next to the legend) and amend the spec copy table so the contract and the code agree; that removes the shared literal at its source instead of patching one group"
  blind_spots: "Not checked in a real browser in this session (a jsdom render is equivalent for a static attribute). The exact example words for «Se valora» are a copy choice the spec has to settle"
  candidate_causes:
    - "code: hardcoded literal placeholder in a component reused for three groups, no prop"
    - "spec/config: 02-UI-SPEC copy contract defines a single tag placeholder for all groups and forbids others"
    - "test: application-edit.test.tsx:778 asserts the same placeholder for every group, so the gate encodes the defect"
    - "data (eliminated): AI model output producing «React» chips"
  and_gate: "yes. The symptom needs both the spec choosing one shared example and the implementation having no per-group input; the test then blocked it from being caught. The originating cause is the spec copy"

## Symptoms

expected: In the application form, the tag inputs for «Stack», «Se valora» and «Idiomas» each show a relevant example placeholder (e.g. «Ej.: React», «Ej.: Docker», «Ej.: Inglés B2»).
actual: User reported: "all labels example text is React rather than something relevant"
errors: None reported
reproduction: Test 2 in UAT (.planning/phases/03-autocompletado-con-ia/03-UAT.md)
started: Discovered during UAT 2026-11-01

## Eliminated

- hypothesis: "The user means the AI-proposed chip labels (model output) all say «React»"
  evidence: "In the same UAT report the user names the real chips the model produced («C and Python are being labeled as languages»), from an NVIDIA offer with no React in it (C, Python, Linux, Docker, DPDK, OVS...). «Example text» matches the «Ej.:» placeholder, and «Ej.: React» is the only per-group text repeated across all three groups. The mock provider returns React as just one of five chips, and test 2 used the real model, not mock. The prompt example «React» (extract.service.ts:29-30) did not make the model emit React for this offer. The model grouping problem is a separate gap (G-03-2)"
  timestamp: 2026-11-01T13:19:00Z

## Evidence

- timestamp: 2026-11-01T13:17:30Z
  checked: ".planning/debug/knowledge-base.md"
  found: "Does not exist (no prior sessions). MemPalace not used. No known-pattern candidate"
  implication: "Open-ended investigation"

- timestamp: 2026-11-01T13:17:40Z
  checked: "apps/web/src/pods/application-edit/components/tag-group-input.tsx"
  found: "Line 100: placeholder=\"Ej.: React\" as a literal on the Input. Props are group, legend, soft, tags, aiTags, onChange; no placeholder prop"
  implication: "Every instance of the component renders the same placeholder whatever its group"

- timestamp: 2026-11-01T13:17:45Z
  checked: "apps/web/src/pods/application-edit/components/tags-section.tsx"
  found: "Renders TagGroupInput three times: group=stack legend «Stack tecnológico»; group=nice_to_have legend «Se valora» soft; group=language legend «Idiomas». No placeholder passed (none can be). Per-group copy (legend) already lives here"
  implication: "All three groups show «Ej.: React». TagsSection is the natural place to set per-group copy next to the legend"

- timestamp: 2026-11-01T13:17:50Z
  checked: ".planning/phases/02-candidaturas/02-UI-SPEC.md (lines 271, 393) and 03-UI-SPEC.md"
  found: "02-UI-SPEC.md:271 (Etiquetas section): each fieldset has an Input with sr-only Label «Añadir etiqueta a {group}», placeholder «Ej.: React». Copy table 02-UI-SPEC.md:393: «Placeholders | Tag: Ej.: React · URL: https:// (no other placeholders)». 03-UI-SPEC.md only defines the offer textarea placeholder («Pega aquí la descripción completa de la oferta») and does not touch the tag inputs"
  implication: "The implementation matches the spec. The defect is in the copy contract: it defines one shared example and explicitly rules out others. The fix has to amend the spec"

- timestamp: 2026-11-01T13:18:00Z
  checked: "docs/AI-EXTRACTION.md:78-80, docs/DESIGN.md:18, apps/api/src/llm/mock.provider.ts"
  found: "AI-EXTRACTION.md uses «React» for stack and «Inglés B2» for language as examples, and says nice_to_have is what the offer marks as «se valora», «plus», «deseable». The mock returns Testing Library as nice_to_have and Inglés B2 as language. DESIGN.md lists group titles only, no placeholder copy"
  implication: "The project already has consistent per-group examples to reuse: stack «React», language «Inglés B2». nice_to_have needs a chosen tool-type example (e.g. «Docker», «Testing Library»)"

- timestamp: 2026-11-01T13:18:14Z
  checked: "Ran vitest: application-edit.test.tsx -t 'shows three labelled groups' (temporarily symlinked main checkout node_modules into the worktree, removed afterwards)"
  found: "1 passed. The test (line 778) loops over all three group legends and asserts placeholder «Ej.: React» for each"
  implication: "Direct observation that all three inputs render «Ej.: React». The test encodes the defect, so it must change with the fix (assert a different placeholder per group)"

- timestamp: 2026-11-01T13:18:20Z
  checked: "git log -S for the literal in code and spec"
  found: "Spec introduced in a94b429 docs(02): UI design contract; code in 9c3fa91 feat(02-11): add tags by group with Enter-to-add and normalization feedback"
  implication: "Present since phase 2; not a phase-3 regression. It came up in phase-3 UAT because AI-filled groups get closer attention"

## Resolution

root_cause: "Spec-level copy defect implemented faithfully. 02-UI-SPEC.md (line 271 and copy table line 393) defines one placeholder, «Ej.: React», for all three tag inputs and forbids other placeholders. TagGroupInput (apps/web/src/pods/application-edit/components/tag-group-input.tsx:100) hardcodes that literal with no placeholder prop, TagsSection renders the component for stack, nice_to_have and language without being able to vary it, and application-edit.test.tsx:778 asserts the same placeholder for every group, so no gate could catch it"
fix: "(not applied: goal find_root_cause_only) Direction: add a required `placeholder: string` prop to TagGroupInput, pass per-group copy from TagsSection next to each legend (Stack tecnológico «Ej.: React»; Se valora «Ej.: Docker»; Idiomas «Ej.: Inglés B2»), update the test at application-edit.test.tsx:778 to assert each group's own placeholder, and amend the 02-UI-SPEC copy table (and line 271), or record the change in the phase-3 gap-closure UI-SPEC amendment"
verification: "n/a (diagnose-only)"
files_changed: []
