---
status: diagnosed
trigger: "ai-tags-programming-languages-in-language-group — AI tags put programming languages and technologies (C, Python) in the stack group; the language group holds only human languages with level (e.g. Inglés B2)"
created: 2026-11-01T13:17:35Z
updated: 2026-11-01T13:50:00Z
goal: find_root_cause_only
audit_acknowledged:
  milestone: v1
  at: 2026-11-08
  status: diagnosed
---

## Current Focus

status_note: DIAGNOSED. Root cause confirmed (H2 + H3 under the AND-gate, see Resolution). No source file changed; throwaway probes were deleted.
reasoning_checkpoint:
  hypothesis: "gemma4:e2b puts C/Python/Java in group 'language' because the decoding target token for spoken languages is the English word 'language', which for a programming-language label is the closest allowed token in meaning, and the Spanish prompt rules are too weak to override it"
  confirming_evidence:
    - "Current prompt: 'Programming languages: C and Python' → C:language, Python:language 2/2; Java fixture → Java:language 2/2"
    - "Only the enum token renamed to 'idioma' (rest of prompt identical) → 6/6 correct, including Java"
    - "Prompt-only rules that name Java explicitly still → Java:language 2/2"
  falsification_test: "If renaming the token had NOT fixed Java/C/Python, the token hypothesis would be false and model capacity alone would be the cause"
  fix_rationale: "A deterministic group guard removes the dependence on the model's choice of token; a token alias removes the attractor itself"
  blind_spots: "The user's real NVIDIA offer was not run (not stored); its exact phrasing is assumed similar to synth_en_pl. Only gemma4:e2b was probed; the OpenAI provider shows the schema as text and may behave differently. Few runs per cell (1-2)."
  candidate_causes:
    - "code/contract: enum token 'language' (enums.ts) as the decode target"
    - "config/prompt: stack line says bare 'lenguajes', no negative rule (extract.service.ts:25-27)"
    - "environment/model: gemma4:e2b weak rule-following"
    - "data: offer phrasing 'Programming languages:' / canonical PL names"
    - "code: no group guard in normalizeExtraction"
  and_gate: "yes. Needs the token, the weak model and an input cue together; the short synth_en offer without the cue did not trigger it"
previous_hypothesis: H1 — The prompt's tag rules do not tell gemma4:e2b that programming languages belong in stack: the stack line says only "lenguajes" and the group a small model must emit is the English token "language" (lenguaje = idioma ambiguity), with no negative rule and no programming-language example. So C/Python/Java get group "language". Falsifiable: if a candidate wording that names "lenguajes de programación (C, Python, Java)" under stack and restricts language to spoken languages with an explicit "nunca" still yields language for C/Python, H1 is wrong (→ H3 model capacity / H2 enum token dominates).
competing: H2 enum token "language" in the decoding grammar dominates regardless of prompt text; H3 gemma4:e2b too small to follow any wording; H4 offer phrasing ("Programming languages: C and Python") drives it.
test: probe apps/api/src/scripts/_probe-groups.ts (throwaway, mirrors ollama.provider.ts body) — A_current vs B_candidate on synth_en, synth_en_pl ("Programming languages: C and Python") and onsite_junior fixture; 2 runs each.
expecting: A puts C/Python (and Java) in language on ≥1 input; B puts them in stack on all inputs while English stays language.
next_action: Return ROOT CAUSE FOUND to orchestrator; user to approve fix direction (guard in normalizeExtraction + docs line; optionally D-01/D-25 token alias)

## Symptoms

expected: With LLM_PROVIDER=ollama (gemma4:e2b) and the approved D-25 prompt, an offer requiring "Deep knowledge and experience with C, Python" yields tags {label:"C", group:"stack"}, {label:"Python", group:"stack"}; group "language" only for spoken languages (Inglés B2).
actual: User reported "C and Python are being labeled as languages rather than tech stack". Tested with a real English-language NVIDIA Senior SW & System Architect offer (C, Python, Linux, Docker, DPDK, OVS, OVN, Kubernetes, Calico, Flannel, OpenStack, OpenShift, Ansible). Offer text not stored.
errors: None reported
reproduction: Test 2 in UAT (.planning/phases/03-autocompletado-con-ia/03-UAT.md), gap G-03-2
started: Discovered during UAT 2026-11-01, after quick task 261101-gfe added the Pitfall 7 lines to the prompt

## Eliminated

- hypothesis: normalizeExtraction / normalizeTags remap the group
  evidence: Both copy `tag.group` unchanged (extract.service.ts:99-104, tag.normalize.ts:25); the probe reads the raw model output and already shows C/Python/Java with "language".
  timestamp: 2026-11-01T13:23:00Z

- hypothesis: Web form or detail view shows a stack tag under «Idiomas» (display swap)
  evidence: application-edit.mapper.ts copies group as-is; TagGroupInput filters `tag.group === group`; "language" → «Idiomas» is correct.
  timestamp: 2026-11-01T13:24:00Z

- hypothesis: H1 alone. The prompt wording (bare "lenguajes", no negative rule) is the sole cause, so a clearer prompt fixes it
  evidence: B_candidate fixed 1/2 on synth_en_pl and 0/2 on Java; C_strong (names C, Python, Java explicitly, adds "Nunca un lenguaje de programación") still returned Java:language 2/2. The wording is a contributor, not the sole cause.
  timestamp: 2026-11-01T13:45:00Z

- hypothesis: H3 alone. gemma4:e2b cannot group programming languages correctly under any setup
  evidence: Same model, same prompt text, only the enum token renamed to "idioma" → 6/6 correct. The model can do it; the token is what misleads it.
  timestamp: 2026-11-01T13:45:00Z

## Evidence

- timestamp: 2026-11-01T13:18:00Z
  checked: Phase 0 knowledge base (.planning/debug/knowledge-base.md)
  found: File does not exist; no MemPalace index. No known-pattern candidate.
  implication: Open-ended investigation.

- timestamp: 2026-11-01T13:20:00Z
  checked: EXTRACTION_SYSTEM_PROMPT (apps/api/src/offers/extract.service.ts:14-31), identical to docs/AI-EXTRACTION.md:77-80
  found: The tag rules are "- stack: tecnologías, lenguajes, frameworks, cloud y herramientas requeridas." and "- language: idiomas con nivel si aparece (\"Inglés B2\")." The stack line uses the bare word "lenguajes" (never "lenguajes de programación"), and the group the model must emit for spoken languages is the English token "language". No line says that a programming language is never "language". No example of a programming language (C, Python, Java) appears anywhere in the prompt; the only stack example is "React" (a framework).
  implication: The prompt gives the model two lexical routes for "Python/C/Java": Spanish "lenguajes" → stack, and the English enum token "language" (= lenguaje AND idioma) → language. Nothing tips a small model to the first.

- timestamp: 2026-11-01T13:22:00Z
  checked: JSON Schema sent as Ollama `format` (z.toJSONSchema(offerExtractionSchema), printed with a throwaway probe)
  found: tags.items.properties.group = {"type":"string","enum":["stack","nice_to_have","language"]} — no description; label is generated before group (properties order label, group).
  implication: The enum token "language" is what the decoder must pick right after writing e.g. "Python"; English "language" is the natural continuation for a programming language. The schema carries no disambiguation.

- timestamp: 2026-11-01T13:23:00Z
  checked: normalizeExtraction (extract.service.ts:71-106) and normalizeTags (packages/contracts/src/tag.normalize.ts)
  found: group is passed through unchanged (`group: tag.group`); normalizeTags only dedupes by tagKey keeping the FIRST spelling and group. No remapping, no allow/deny list.
  implication: The API does not cause the mis-grouping but also has no guard. Minor contributor: if the model emits "Python" twice with language first, dedupe keeps "language".

- timestamp: 2026-11-01T13:24:00Z
  checked: Web path (application-edit.mapper.ts:86,260; tags-section.tsx; tag-group-input.tsx filter `tag.group === group`)
  found: group is copied as-is from the extraction into the form; the «Idiomas» input renders group "language". No swap.
  implication: Display mapping eliminated; the wrong group comes from the model output.

- timestamp: 2026-11-01T13:25:00Z
  checked: 03-09-SUMMARY.md «Model rerun with the D-25 prompt» (2026-11-01, gemma4:e2b, current prompt fingerprint 8daeb5a2…)
  found: onsite-junior fixture (Spanish offer, "Conocimientos de Java y de Spring Boot") returned {"label":"Java","group":"language"} while Spring Boot/SQL went to stack. Scored as miss "tag:Java" and noted "probably the group", but not escalated.
  implication: The defect reproduces on an anonymized fixture in Spanish too, not only on the user's English offer. It existed already in the first run after quick task 261101-gfe (before that, D-24 labels were group names, so grouping could not be judged).

- timestamp: 2026-11-01T13:35:00Z
  checked: Probe run 1 (gemma4:e2b, exact provider body, temperature 0, num_ctx 8192, think false, format = offerExtractionSchema JSON Schema), 2 runs per cell. Inputs - synth_en (short synthetic English offer, "Deep knowledge and experience with C, Python."), synth_en_pl (same offer with that line as "Programming languages: C and Python."), onsite_junior fixture (Spanish, "Conocimientos de Java y de Spring Boot").
  found: |
    synth_en      A_current   2/2 C:stack, Python:stack (all groups correct; English → Inglés:language)
    synth_en      B_candidate 2/2 C:stack, Python:stack
    synth_en_pl   A_current   2/2 C:language, Python:language   <-- REPRODUCED
    synth_en_pl   B_candidate 1/2 C:language, Python:language; 1/2 correct
    onsite_junior A_current   2/2 Java:language                  <-- REPRODUCED
    onsite_junior B_candidate 2/2 Java:language
    (B_candidate = stack line "lenguajes de programación (p. ej. C, Python, Java)" + language line "solo idiomas para comunicarse (inglés, alemán…)… Un lenguaje de programación nunca va en language.")
    Times 4.4-31.1 s per call; no failures.
  implication: Deterministic at temperature 0 for a given prompt+input (Bohrbug). Trigger depends on the input. "Programming languages:" in the offer, or a well-known language name alone (Java), makes the decoder pick group "language". A clearer prompt (B) helps only partly, so H1 alone does not explain it. Points to the enum token "language" acting as a strong lexical attractor (H2) combined with the model's weak instruction-following (H3).

- timestamp: 2026-11-01T13:45:00Z
  checked: Probe run 2, discriminating H1 vs H2. C_strong = prompt-only (stack line "... lenguajes de programación, frameworks, cloud y herramientas requeridas. C, Python, Java, Go y cualquier otro lenguaje de programación van siempre en stack." + language line "solo idiomas humanos (inglés, francés, alemán…), con nivel si aparece (\"Inglés B2\"). Nunca un lenguaje de programación."). E_token_idioma = current prompt word for word, except the line "  - language:" reads "  - idioma:", and the `format` enum is ["stack","nice_to_have","idioma"] (discrimination only, not a proposal as is).
  found: |
    synth_en_pl   E_token_idioma 2/2 C:stack, Python:stack, Inglés:idioma
    onsite_junior E_token_idioma 2/2 Java:stack
    synth_en      E_token_idioma 1/1 all correct
    remote_senior E_token_idioma 1/1 all correct, and "Inglés B2" kept with its level (A_current returns "Inglés")
    synth_en_pl   C_strong       2/2 C:stack, Python:stack
    onsite_junior C_strong       2/2 Java:language   <-- still wrong although "Java" is named in the rule
    synth_en / remote_senior C_strong 1/1 correct (remote_senior still "Inglés" without level)
  implication: Changing ONLY the enum token the decoder must emit fixes every case (6/6), with no other prompt change. Explicit prompt rules, even ones that name Java, do not fix Java (0/2 for C_strong, 0/2 for B). The English enum value "language" is the dominant cause, and gemma4:e2b's weak rule-following is why prompt text cannot override it. H2 confirmed, H1 insufficient alone.

- timestamp: 2026-11-01T13:46:00Z
  checked: Ollama structured-outputs docs (docs.ollama.com/capabilities/structured-outputs)
  found: The docs advise also passing the JSON schema as text in the prompt to ground the model. That implies `format` constrains decoding but is not shown to the model as text (inferred, not stated).
  implication: Adding a `description` to `group` in the JSON Schema would likely do nothing on Ollama. The cue that matters is the enum token itself plus the prompt text.

## Resolution

root_cause: |
  The group the model must emit for spoken languages is the English enum token "language" (tagGroupSchema in packages/contracts/src/enums.ts:23). It reaches gemma4:e2b in two places: the Ollama `format` grammar (z.toJSONSchema(offerExtractionSchema), bare enum, no description) and the prompt line "  - language: idiomas …" (apps/api/src/offers/extract.service.ts:27). When the model has just written a programming-language label (C, Python, Java), "language" is the closest of the three allowed tokens in meaning (programming language). The Spanish prompt rules (stack: "lenguajes"; language: "idiomas") are too weak for this small model to override it. The pull is strongest when the offer says "Programming languages: …" or names a well-known language (Java). Nothing downstream checks the group: normalizeExtraction and normalizeTags pass it through unchanged.
  AND-gate (all three needed): (a) the English token "language" as decoding target; (b) gemma4:e2b's weak rule-following; (c) an input cue ("Programming languages:" phrasing or a canonical PL name). The short synthetic offer with only "experience with C, Python" did not trigger it.
fix: (not applied. goal find_root_cause_only; D-25 forbids prompt changes and D-01 pins the `format` schema without user approval)
suggested_fix_direction: |
  1. PRIMARY, deterministic guard in normalizeExtraction (API only, no prompt, model or contract change). Keep group "language" only when the label names a spoken language: compare its words, accent-stripped and lower-cased, against a closed allowlist (ingles/english, espanol/spanish/castellano, frances/french, aleman/german, italiano/italian, portugues/portuguese, catalan/catala, euskera, gallego, valenciano, neerlandes/holandes/dutch, chino/mandarin/chinese, japones/japanese, arabe/arabic, ruso/russian, polaco/polish, sueco/swedish, bilingue…). Anything else → "stack". Covered by a fake-LlmClient test ({C,language},{Python,language},{Java,language},{Inglés B2,language} → C/Python/Java stack, Inglés B2 language). Needs one line added to docs/AI-EXTRACTION.md §«Normalización en la API» (spec addition, user approval). Trade-off: a programming language that was "nice to have" lands in stack, not nice_to_have. Alternative: a programming-language denylist (never moves a real spoken language, but misses unlisted ones).
  2. OPTIONAL model-side fix (needs D-01 + D-25 approval). Show the model the token "idioma" instead of "language": provider-only response schema with enum ["stack","nice_to_have","idioma"] passed through the existing `responseSchema` option, prompt line "  - idioma: idiomas con nivel si aparece (\"Inglés B2\").", and map idioma → language before normalizing. Measured 6/6 correct, and it also kept "Inglés B2" with its level. Do NOT rename the contract enum (DB data, DOMAIN.md, web filters).
  3. Prompt-only (D-25) wording C_strong is NOT sufficient (Java still language 2/2); record it only as a complement if the user wants it. Stack line: "  - stack: tecnologías, lenguajes de programación, frameworks, cloud y herramientas requeridas. C, Python, Java, Go y cualquier otro lenguaje de programación van siempre en stack." Language line: "  - language: solo idiomas humanos (inglés, francés, alemán…), con nivel si aparece (\"Inglés B2\"). Nunca un lenguaje de programación."
  A JSON Schema `description` on `group` is unlikely to help on Ollama (format constrains decoding only).
verification: n/a (diagnose only). Reproduction recorded in Evidence. Re-run the probe matrix after a fix; the guard is unit-testable with a fake LlmClient.
files_changed: []
specialist_hint: typescript
