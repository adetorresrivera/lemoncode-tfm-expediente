---
phase: quick-261101-qh3
plan: 01
subsystem: api, web
tags: [llm-extraction, idiomas, ui-review, lucide, contrast]
status: complete
requirements: [AI-02, AI-04, AI-05, AI-06, AI-08]
key-files:
  modified:
    - apps/api/src/offers/extract.service.ts
    - apps/api/src/offers/extract.service.test.ts
    - apps/api/src/offers/extract.pipeline.test.ts
    - docs/AI-EXTRACTION.md
    - docs/DESIGN.md
    - apps/web/src/pods/application-edit/components/field-props.ts
    - apps/web/src/pods/application-edit/components/offer-panel.tsx
    - apps/web/src/pods/application-edit/components/form-field.tsx
    - apps/web/src/common/components/request-status.tsx
    - apps/web/src/common/components/tag-chip.tsx
    - .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md
    - .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
    - .planning/phases/03-autocompletado-con-ia/03-REVIEW-DISPOSITION.md
decisions:
  - "Spoken languages get a model-facing `idiomas` field; the spoken-language guard stays as backstop for tags (WR-01)"
  - "Missing-field border uses border-brand-gold-ink; lucide icons at strokeWidth 1.5"
actuals:
  tasks: 3
  commits: 3
plan_head_before: f2155e68d78b98f3ea762dfb65a443ebbd272ad4
plan_head_after: d9a55847bb492d71c0cfecc56850fb4d143c0c22
completed: 2026-11-01
---

# Quick 261101-qh3: Phase 03 UI-review fixes Summary

`idiomas` model-facing field turns «Coreano B1» and «Hindi» into «language» tags outside the closed word list, icons are at stroke 1.5, and the missing-field border is gold-ink (6.27:1 light / 7.79:1 dark).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 378300b | `idiomas` field, prompt change, docs (red-first tests committed together with the implementation) |
| 2 | f90db3e | 7 icons to strokeWidth 1.5, gold-ink border, UI-SPEC and DESIGN.md |
| 3 | d9a5584 | D-01/D-25/D-26 amendments, WR-01 fixed (open: 5) |

## What changed

- **Key name `idiomas`.** Spanish on purpose, like the «idioma» alias: gemma4:e2b reads the English «language» as programming language (G-03-2). It is model-facing only and never leaves the API; the contract keeps `tags` with group «language» and the web app is unchanged.
- **Schemas.** `modelOfferExtractionSchema` gets a required `idiomas` (array of the contract label schema, max 20, so the model sees minLength 1 / maxLength 40). `rawOfferExtractionSchema` accepts `idiomas` absent, null or a string array.
- **Merge order.** `idiomas` entries become «language» tags, trusted (no word list), placed before the model's tags and then passed to the unchanged `normalizeTags`. They win a duplicate and the 20-tag cap never drops a language. Side effect: language tags come first in the response array; the web groups chips by group so nothing visible changes.
- **Guard kept.** `SPOKEN_LANGUAGE_WORDS` (35 words) and `isSpokenLanguageLabel` unchanged; C and Python filed as «idioma» still go to «stack».
- **Prompt.** Three line edits (removed the `idioma:` tags item, label item keeps only the technology example, new last rule for `idiomas`). New fingerprint of the «Prompt de sistema» block: `deeed8088ec0f8480e34124b85a98e1e02db6169e3411c1b30ab92bab23ad526` (previous `48ec58d3ef14b9c7dda4e461bca258916ed57ac3941a84d9e821ae6f2dd7f5c9`). Verified by the plan's command; the verbatim route test passes unchanged.
- **Mock unchanged.** It stays plan B and the expected output of the route test; the raw schema accepts a missing `idiomas` and «Inglés B2»/language passes the guard, so `LLM_PROVIDER=mock` still shows «Inglés B2» in «language» (checked with try-extract).
- **Invariance.** `packages/contracts`, `apps/api/src/llm`, `extract.routes.test.ts`, `.env.example`, `compose.yml`, `package-lock.json` and both `package.json` are identical to 7e075cc (`git diff --quiet` passes). No dependency added. COVERAGE.md unchanged (no capability change).
- **Icons.** The 9 lucide icons of the phase-03 surface are all at `strokeWidth={1.5}` (7 changed). Plan icon check prints «9 lucide icons; missing strokeWidth: []».
- **Border.** `border-brand-gold-ink bg-ai-missing-bg` in field-props.ts, its tests, DESIGN.md and UI-SPEC (color table, rules, contrast table, amendment line).

## Model rerun with the idiomas field (WR-01)

Ollama reachable at http://ollama:11434, model `gemma4:e2b` listed; 11.9 GB RAM total, ~5 GB free. Prompt fingerprint deeed8088ec0f8480e34124b85a98e1e02db6169e3411c1b30ab92bab23ad526.

`LLM_PROVIDER=ollama npm run try-extract -w @tfm/api` (second of three runs shown whole; times were 6.4–10.5 s across runs, no timeout):

| fixture | time (s) | correct / total | notes |
| --- | --- | --- | --- |
| remote-senior | 10.5 | 11 / 12 | tag:GraphQL |
| onsite-junior | 6.4 | 10 / 10 | |
| english-nice-to-have | 8.6 | 10 / 13 | location, tag:GraphQL, tag:Kubernetes |

The third run gave the same tags (remote-senior 9.1 s, 11/12).

Tags with groups (last run):
- remote-senior: Inglés B2/language, React, TypeScript, Vite, Vitest, Testing Library, AWS (all stack).
- onsite-junior: Java/stack, Spring Boot/stack, SQL/stack (Java stays in stack).
- english-nice-to-have: Inglés/language, Node.js, TypeScript, React, PostgreSQL (stack).

Fictional NVIDIA-style offer (anonymous, Quasar Compute Ltd; body kept in the scratchpad and deleted; temporary API on port 3107, stopped by PID), 15.3 s via POST /api/offers/extract:

Tags: Inglés C1/language, Coreano B1/language, Hindi/language, C/stack, Python/stack, Linux/stack, Docker/stack, DPDK/stack, Kubernetes/stack, Ansible/nice_to_have.

Reading: Coreano B1 and Hindi are not in `SPOKEN_LANGUAGE_WORDS`, yet they reached «language», so the model used `idiomas` (before this change they fell to «stack»). C and Python are in «stack», «Inglés B2» keeps its level in remote-senior, Java is in «stack» in onsite-junior, same as the 03-10 rerun. The prompt was not changed further.

## Deviations from Plan

- **[Note] Raw-parse test.** The plan says to "extend the raw-parse test" and also "do not modify existing tests"; I kept the existing test untouched and covered absent, null and array `idiomas` in a new test inside the new describe.

## Verification

`npm run typecheck`, `npm run test` (api 55, contracts-level and web 271 + 407 passed) and `npm run lint` pass from the repo root; `LLM_PROVIDER=mock npm run try-extract` shows «Inglés B2» in «language».

## Known Stubs

None.

## Threat Flags

None. `idiomas` entries are bounded like tags (trim, NFC, 40-unit cut, blanks dropped, 20 cap, strict re-parse); no real offer text stored or logged.

## Self-Check: PASSED

Commits 378300b, f90db3e, d9a5584 exist on the branch; fingerprint, icon check and invariance gates pass.
