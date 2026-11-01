---
phase: 03-autocompletado-con-ia
plan: 10
subsystem: api
tags: [llm, extraction, tags, normalization, zod, gap-closure]
gap_ids: [G-03-2]
requires:
  - phase: 03-autocompletado-con-ia
    provides: extract service, providers, AI-EXTRACTION.md spec
provides:
  - deterministic tag group guard (language only for spoken languages, otherwise stack)
  - provider-facing modelOfferExtractionSchema (tag group «idioma» instead of «language»)
  - approved prompt line and new prompt fingerprint
affects: [03-11, 03-12, docs/AI-EXTRACTION.md]
tech-stack:
  added: []
  patterns: [provider-facing schema separate from contract and raw parse, one-directional pure group guard]
key-files:
  created: []
  modified:
    - apps/api/src/offers/extract.service.ts
    - apps/api/src/offers/extract.service.test.ts
    - apps/api/src/offers/extract.pipeline.test.ts
    - apps/api/src/offers/extract.routes.test.ts
    - docs/AI-EXTRACTION.md
    - .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
key-decisions:
  - "D-26: tag group «language»/«idioma» kept only when a whole word of the label (lower-case, no accents) is in SPOKEN_LANGUAGE_WORDS; otherwise «stack»"
  - "D-01 amended: the model is shown modelOfferExtractionSchema (enum stack, nice_to_have, idioma); the raw parse maps idioma back to language"
  - "D-25 amended: language item of the prompt reads «idioma: idiomas con nivel si aparece (\"Inglés B2\").»"
patterns-established:
  - "Provider-facing schema passed through LlmCallOptions.responseSchema, never parsing an answer"
requirements-completed: [AI-01, AI-02, AI-04]
status: complete
duration: 35min
completed: 2026-11-01
commits: 3
plan_head_before: 04399bc9f5d026377185c909a310cb3d3c7a19ff
plan_head_after: 1515337bb4b469f64f1fc83019918d184f8efca2
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase 3 Plan 10: Tag group guard and idioma alias (G-03-2) Summary

**Programming languages the model files under «language» now reach the form in «stack»: the model is shown «idioma» instead of «language», and the API keeps the group only for labels that name a spoken language from a closed list.**

`commits: 3` is the count of task commits when the SUMMARY was written (`plan_head_after` is HEAD at that moment); the commit of this file follows it.

## Accomplishments

- `normalizeExtraction` resolves each tag group before `normalizeTags`: «language» or «idioma» becomes «language» only if a whole word of the label, lower-cased and accent-stripped after NFD, is in `SPOKEN_LANGUAGE_WORDS`; otherwise «stack». Deduplication and the 20-tag cap run on the moved groups. The function stays pure.
- The lenient raw parse accepts «idioma» besides every contract group (the mock provider and fake clients still return «language»).
- `modelOfferExtractionSchema` (contract schema with tag group enum `["stack","nice_to_have","idioma"]`) is passed as `responseSchema`; Ollama `format` and OpenAI `response_format.json_schema.schema` carry it. Neither the schema nor the system message contains the word «language».
- The prompt's language item is the single approved line `  - idioma: idiomas con nivel si aparece ("Inglés B2").`, in code and in docs/AI-EXTRACTION.md together.
- docs/AI-EXTRACTION.md (§Contrato, §LlmClient, §Prompt de sistema, §Normalización «lista cerrada de idiomas») and 03-CONTEXT.md (D-01 and D-25 amendments, D-26) agree with the code.

## Task Commits

1. Task 1 (tracer): `ad333e8` fix(03-10): keep tag group language only for spoken languages, move the rest to stack
2. Task 2: `784f881` feat(03-10): show the model idioma instead of language through a provider-facing schema
3. Task 3: `1515337` docs(03-10): record D-01 and D-25 amendments and D-26 in phase context

RED tests were written and seen failing before each implementation (35 failures for Task 1, 5 for Task 2); RED and GREEN are committed together because the pre-commit hook runs typecheck and the suite.

## Prompt fingerprint

New approved sha256 of the «Prompt de sistema» block: `48ec58d3ef14b9c7dda4e461bca258916ed57ac3941a84d9e821ae6f2dd7f5c9` (previous `8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a`). The fingerprint command printed exactly the approved value.

## Closed word list, guard direction and trade-off

35 accent-free lower-case words: ingles, english, espanol, spanish, castellano, frances, french, aleman, german, italiano, italian, portugues, portuguese, catalan, catala, euskera, gallego, valenciano, neerlandes, holandes, dutch, chino, mandarin, chinese, japones, japanese, arabe, arabic, ruso, russian, polaco, polish, sueco, swedish, bilingue.

The guard is one-directional: «language» to «stack» only. It never moves a spoken language out of «stack» or «nice_to_have», and a programming language filed under «language» lands in «stack», not «nice_to_have». A label like «Lengua inglesa» (not in the list) would move to «stack»; accepted, since the prompt example is «Inglés B2».

## Packages and contracts

No dependency added; `apps/api/package.json` and the lockfile are unchanged. `packages/contracts`, `apps/api/src/llm`, `.env.example` and `compose.yml` are unchanged (verified by `git diff` against f036977; `LLM_MODEL` stays gemma4:e2b).

## Model rerun with the idioma alias (G-03-2)

Machine state: 11.9 GB total, 5.4 GB free at start; Ollama reachable at `http://ollama:11434`, `gemma4:e2b` listed. Caveat: a `vitest run -w apps/api` process belonging to another session in the main checkout (and an unrelated `tsx watch`) was alive during the run and could not be stopped from here, so times may be slightly inflated. Prompt fingerprint used: 48ec58d3ef14b9c7dda4e461bca258916ed57ac3941a84d9e821ae6f2dd7f5c9.

`LLM_PROVIDER=ollama npm run try-extract -w @tfm/api` (provider ollama, model gemma4:e2b, in-process):

| fixture | time (s) | correct / total | notes |
| --- | --- | --- | --- |
| remote-senior | 9.2 | 12 / 12 |  |
| onsite-junior | 9.3 | 10 / 10 |  |
| english-nice-to-have | 7.9 | 12 / 13 | location |

Returned tags (label/group):

- remote-senior: React/stack, TypeScript/stack, Vite/stack, Vitest/stack, Testing Library/stack, AWS/stack, GraphQL/nice_to_have, Storybook/nice_to_have, Inglés B2/language
- onsite-junior: Java/stack, Spring Boot/stack, SQL/stack, Bases de datos relacionales/stack, Docker/nice_to_have
- english-nice-to-have: Node.js/stack, TypeScript/stack, React/stack, PostgreSQL/stack, GraphQL/nice_to_have, Kubernetes/nice_to_have, Inglés/language

Synthetic English offer (fictional, kept in the scratchpad and deleted; quoted here): «Senior Systems Engineer at Tessera Works (fictional). Remote within Europe, permanent contract. We are looking for a Senior Systems Engineer to run our internal platform. Programming languages: C and Python. You will work with Linux, Docker and Kubernetes every day. Nice to have: Ansible. Fluent English (C1) required. Salary 70-85k EUR per year.» Posted to a temporary API (`PORT=3107 LLM_PROVIDER=ollama`, stopped afterwards) through `POST /api/offers/extract`: 10.6 s, tags C/stack, Python/stack, Linux/stack, Docker/stack, Kubernetes/stack, Ansible/nice_to_have, Inglés/language. The model's raw group choice is not logged (by design), so this run cannot tell whether the model itself picked «idioma» or «stack» for C and Python; it shows that the result is correct either way.

Comparison with the 03-09 rerun: Java (onsite-junior) is in «stack»; «Inglés B2» (remote-senior) keeps its level and is in «language»; no programming language appears in «language» in any of the four runs. The `location` miss in english-nice-to-have is the one already known from earlier reruns and unrelated to this plan.

Gate: `LLM_PROVIDER=mock npm run try-extract -w @tfm/api` ran offline at about 0.3 s per row (the mock returns fixed data, so its correctness column is not meaningful); `npm run typecheck` 0 errors, `npm run test` 55 api + 260 + 403 tests passed, `npm run lint` clean.

## Deviations from Plan

None - plan executed exactly as written. Minor test-only note: the service test file no longer imports `offerExtractionSchema` (it became unused after the call-argument assertion moved to `modelOfferExtractionSchema`).

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or trust boundary; the model's tag group (T-03-18) is now mitigated by the guard, no offer text is stored or logged (T-03-19), and only the approved prompt line, contracts and providers are unchanged (T-03-20).

## Self-Check: PASSED

- Commits `ad333e8`, `784f881`, `1515337` are ancestors of HEAD.
- Files modified exist; no untracked files under `apps/` or `docs/`.
