---
phase: 03-autocompletado-con-ia
plan: 09
subsystem: verification
tags: [compose-smoke, ollama, manual-model-test, d-24, d-25, phase-gate]
status: complete

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-02 callStructured and LLM clients, 03-03 try-extract and fixtures, 03-08 cancel and limits"
provides:
  - "compose smoke asserts POST /api/offers/extract answers 400 VALIDATION_ERROR inside the production image"
  - "D-24 evidence: gemma4:e2b on CPU against the three fixtures (two runs)"
  - "Prompt fingerprint equal to the approved sha256"
  - "D-25 decision recorded (2026-11-01): add the two Pitfall 7 rule lines to the prompt, keep gemma4:e2b"
  - "UI review finding: re-analysis does not replace AI-filled fields (follow-up fix and spec clarification)"
affects: [EXTRACTION_SYSTEM_PROMPT and docs/AI-EXTRACTION.md prompt block (follow-up), mergeExtractionIntoForm (follow-up), 03-UI-SPEC re-analysis line (follow-up)]

requirements-completed: [AI-01, AI-02, AI-04]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 016da0ab06ecedeef33561785b7a7930e57040d0
plan_head_after: 008f3e6fca1818a616dbd59ceb3f1d7f2671215d

tech-stack:
  added: []
  patterns:
    - "Smoke probes that need no model: a too-short text proves the route is mounted without calling Ollama"

key-files:
  created: []
  modified:
    - scripts/compose-smoke.sh

key-decisions:
  - "No dependency added; no prompt, docs block, LLM_MODEL, .env.example or compose.yml change (D-25)"

coverage:
  - id: D1
    description: "The production image serves POST /api/offers/extract with the project error contract and the smoke ends with SMOKE OK"
    requirement: AI-01
    verification:
      - kind: command
        ref: "bash scripts/compose-smoke.sh --down"
        status: pass
    human_judgment: false
  - id: D2
    description: "Repo gate: typecheck, lint, test and build pass with every Phase 3 plan in place"
    requirement: AI-04
    verification:
      - kind: command
        ref: "npm run typecheck && npm run lint && npm run test && npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Real-model quality and speed of gemma4:e2b on the three fixtures"
    requirement: AI-01
    verification:
      - kind: manual
        ref: "LLM_PROVIDER=ollama npm run try-extract -w @tfm/api (two runs) plus the user's UI pass"
        status: pass
    human_judgment: true
    rationale: "Non-deterministic CPU model. User judgment recorded 2026-11-01 at Task 3: result is 'prompt' (add the two Pitfall 7 rule lines, keep gemma4:e2b). The measurement is evidence for that decision, not a pass of tag quality; the prompt change is a follow-up"
---

# Phase 3 Plan 09: Phase gate, manual model test and D-25 evidence Summary

**The compose smoke now proves the extraction route is served by the production image, the whole suite is green, and gemma4:e2b was measured on CPU against the three fixtures: it timed out on remote-senior in both runs, answered the other two in 17 to 49 s but returned tag labels equal to group names (the Pitfall 7 pattern). The user decided D-25 on 2026-11-01: add the two Pitfall 7 rule lines to the prompt and keep gemma4:e2b. The UI pass also found that a second analysis does not replace fields filled by the first; the user chose the intended behaviour (follow-up fix).**

Status: complete. Tasks 1 and 2 done and committed; Task 3 (blocking-human checkpoint: UI pass and D-25 decision) resolved by the user on 2026-11-01 and recorded below. No source file changed in this plan; both resulting changes are follow-ups.

## Accomplishments

- `scripts/compose-smoke.sh` has an «== offers route ==» block after the applications round trip: `POST /api/offers/extract` with `{"text":"Oferta demasiado corta"}` must answer 400 and the body must contain `VALIDATION_ERROR`. `SMOKE OK` is still the last line.
- Phase gate: `npm run typecheck && npm run lint && npm run test && npm run build` exit 0 (contracts 55 tests, api 211, web 385); `bash scripts/compose-smoke.sh --down` ended with `SMOKE OK`.
- D-24 manual run against the devcontainer Ollama (below), prompt fingerprint and known deviation recorded.
- Dev stack left running for the user's UI pass: web http://localhost:5173, API http://localhost:3000, `LLM_PROVIDER=ollama`; `GET /api/health` answers `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`.

## Manual model test (D-24)

- Provider `ollama`, model `gemma4:e2b`, CPU only (10 cores, 8 GB RAM shared with the devcontainer; free memory was about 85 MB during the runs), 2026-11-01, `LLM_PROVIDER=ollama npm run try-extract -w @tfm/api` in-process. Only the anonymized fixtures were run; the script never prints the offer text.
- Run 1: all three calls hit the 90 s limit (cold model load plus a loaded machine) and answered 504 `LLM_TIMEOUT`. Run 2 (the plan's single retry) is the table below. Both are kept.

Run 1:

| fixture | time (s) | correct / total | notes |
| --- | --- | --- | --- |
| remote-senior | 90.1 | - | HTTP 504 LLM_TIMEOUT |
| onsite-junior | 90.1 | - | HTTP 504 LLM_TIMEOUT |
| english-nice-to-have | 90.1 | - | HTTP 504 LLM_TIMEOUT |

Run 2 (model already loaded):

| fixture | time (s) | correct / total | notes |
| --- | --- | --- | --- |
| remote-senior | 90.0 | - | HTTP 504 LLM_TIMEOUT |
| onsite-junior | 48.9 | 8 / 10 | tag:Java, tag:Spring Boot |
| english-nice-to-have | 16.7 | 8 / 13 | location, tag:Node.js, tag:TypeScript, tag:GraphQL, tag:Kubernetes |

Returned extractions (run 2; remote-senior has none because it timed out twice):

```json
{
  "title": "Programador/a Backend Junior",
  "company": "Talleres Digitales del Sur",
  "location": "Sevilla",
  "workMode": "presencial",
  "seniority": "junior",
  "contractType": "temporal",
  "salaryMin": null,
  "salaryMax": null,
  "currency": null,
  "tags": [
    { "label": "stack", "group": "stack" },
    { "label": "language", "group": "language" }
  ]
}
```

```json
{
  "title": "Full Stack Engineer",
  "company": "Northwind Labs",
  "location": "London, UK",
  "workMode": "hibrido",
  "seniority": "mid",
  "contractType": "indefinido",
  "salaryMin": 50000,
  "salaryMax": 60000,
  "currency": "GBP",
  "tags": [
    { "label": "stack", "group": "stack" }
  ]
}
```

### Pitfall 7 comparison

- **remote-senior:** no answer in either run (504 both times, 90 s limit), so tags and company could not be compared. More than 60 s: yes.
- **onsite-junior:** tag labels equal to group names: yes, both tags (`stack`/stack and `language`/language); the expected labels `Java` and `Spring Boot` are missing. Company null although named: no (`Talleres Digitales del Sur`). More than 60 s: no (48.9 s), but 90 s timeout in run 1.
- **english-nice-to-have:** tag labels equal to group names: yes, the single tag is `stack`/stack; `Node.js`, `TypeScript`, `GraphQL` and `Kubernetes` are missing. Company null although named: no (`Northwind Labs`). `location` scored wrong (`London, UK` returned). More than 60 s: no (16.7 s).
- Other observations: the scalar fields (title, company, workMode, seniority, contractType, salary, currency) are mostly right when the model answers; the weak point is the tags, which reproduce the Pitfall 7 evidence for the verbatim prompt. The D-25 triggers are met on both axes: a fixture over 60 s (remote-senior timed out in both runs, run 1 timed out on all three) and the tag-label problem. No 502 `LLM_ERROR` appeared in either run.
- Reference: `LLM_PROVIDER=mock npm run try-extract -w @tfm/api` (the script itself, independent of the model) prints the header and the three rows in about 0.3 s each.

## Prompt fingerprint (D-25)

- Printed sha256 of the «Prompt de sistema» block of `docs/AI-EXTRACTION.md` (without its trailing newline): `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`
- Expected (literal prompt approved on 2026-10-31, block unchanged since commit a618764): `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`
- Equal: yes. The verbatim-prompt test in `apps/api/src/offers/extract.routes.test.ts` passes in `npm run test` (api 211 tests), so `EXTRACTION_SYSTEM_PROMPT` hashes to the same value. The manual run used the approved literal prompt.
- `git status` is clean for `apps/api/src/offers/extract.service.ts`, `docs/AI-EXTRACTION.md`, `.env.example` and `compose.yml`: prompt and model untouched.

## Known deviations

- **ROADMAP Phase 3 SC1 «tags … truncated»** is observable only with fake test clients. Real over-long model output (a label over 40 characters or more than `MAX_TAGS` tags) fails `offerExtractionSchema` (`label .max(40)`, `tags .max(MAX_TAGS)`) in `callStructured`, is retried once and answers 502 `LLM_ERROR` (RESEARCH Pitfall 8, Open Question 6 resolved 2026-10-31, accepted by the user; see the 03-03 SUMMARY). The ROADMAP is not reworded; `/gsd-verify-work` reads this as an accepted deviation, not a gap. The manual run showed no such 502.
- The plan's own assumption of 60 to 90 s per call on CPU was exceeded: three of six calls hit the 90 s timeout. The shared 8 GB memory (free memory about 85 MB) probably contributed; a second measurement on a quieter machine is advisable before the defence.

## D-25 decision

Decision (user, 2026-11-01): **«prompt»**. The user approves adding the two Pitfall 7 rule lines (RESEARCH Pitfall 7) to the literal system prompt:

- `- label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.`
- `- company: la empresa que publica la oferta.`

`gemma4:e2b` stays as `LLM_MODEL`. Not applied in this plan (plan prohibition: no prompt, docs block, model or merge-code change here). Follow-up for the orchestrator via `/gsd-quick`:

1. Edit `EXTRACTION_SYSTEM_PROMPT` in `apps/api/src/offers/extract.service.ts` and the «Prompt de sistema» block of `docs/AI-EXTRACTION.md` together, so the verbatim-prompt test in `extract.routes.test.ts` keeps passing.
2. Update the approved fingerprint (previous value `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`) to the sha256 of the new block, in the test and in the plan/summary references.
3. Rerun `LLM_PROVIDER=ollama npm run try-extract -w @tfm/api` and compare tag labels and times against the table above, ideally on a quieter machine (the CPU timeouts are a separate concern, see Known deviations).

### Applied (quick 261101-gfe)

- Applied on 2026-11-01 by quick task 261101-gfe, commit `63be8d8` (`feat(quick-261101-gfe): add Pitfall 7 rules to extraction prompt (D-25)`).
- Placement: the company rule sits right after the title rule. The label rule is an item of the tags sub-list, after the language item and before «Grafía canónica», indented like its siblings; its bullet text is verbatim as approved.
- New approved fingerprint of the «Prompt de sistema» block (without its trailing newline): `8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a`, as printed by the fingerprint command after the change. Previous value: `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`. From 2026-11-01 the new value is the approved one; the «Prompt fingerprint (D-25)» section above records the prompt used by the D-24 runs and stays as written.
- The verbatim-prompt test in `apps/api/src/offers/extract.routes.test.ts` passes, so `EXTRACTION_SYSTEM_PROMPT` hashes to the same value.
- Follow-up step 2 needed no test change: no test pins a hash (the route test compares the text byte for byte), and the only other files that hold the old hash are historical records (03-09-PLAN.md and this SUMMARY), left unchanged.
- `LLM_MODEL` stays `gemma4:e2b`; `.env.example` and `compose.yml` are unchanged.

## UI review (Task 3)

The user ran one UI pass against the dev stack (web 5173, API 3000, `LLM_PROVIDER=ollama`).

- **Finding:** «when scanning 2 different offers, fields are not being replaced».
- **Cause (orchestrator analysis):** `mergeExtractionIntoForm` fills only empty fields. Values written by the first analysis (still marked «IA», never edited by the user) therefore count as user values, and a second analysis cannot replace them. `docs/AI-EXTRACTION.md` flow step 4 is silent on AI-filled fields.
- **Intended behaviour (user decision, 2026-11-01):** on re-analysis, fields still marked «IA» and not edited by the user are replaced by the new offer's values, or cleared if the new offer lacks them. AI-proposed tags not edited by the user are replaced too. User-typed or user-edited fields and the user's own tags are never touched.
- **Status:** not a bug in this plan's scope; recorded as a follow-up fix to `mergeExtractionIntoForm` and its callers (via `/gsd-quick`, orchestrator).
- **Spec clarification needed (follow-up):** state the rule above in `docs/AI-EXTRACTION.md` flow step 4 and in the line of `.planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md` that describes re-analysing.

## Phase-wide spec additions (for the record)

- `LlmCallOptions` is the fourth parameter of the LLM client call (carries the abort signal and timeout).
- Ollama requests send `options.num_ctx: 8192`.
- OpenAI structured output uses `strict: true` with the JSON schema without `$schema`.
- `mergeExtractionIntoForm(current, extraction, text)` takes the analyzed text as a required third argument and writes `offerText`.
- Narrowed currency rule: currency is filled only when both salary fields were empty, the analysis filled at least one and returned a currency (user-accepted, 2026-10-31); a salary fill that would invert a user-kept pair is skipped.
- Pitfall 8 behaviour: over-long model output is 502 `LLM_ERROR`, not truncation (see Known deviations).
- Phase 6 hand-over: the fixture `.txt` files in `apps/api/src/offers/__fixtures__` are not copied by `tsc -p tsconfig.build.json`; the seed must read them from `src` or copy them into `dist`.

## Task Commits

1. Task 1: `ad1e684` test(03-09): add offers route to the compose smoke
2. Task 2: `e0ab9da` docs(03-09): record D-24 manual model test and prompt fingerprint (evidence only, no source file edited)
3. Task 3: checkpoint resolved by the user on 2026-11-01 (D-25 «prompt», UI finding recorded); committed as `docs(03-09): record D-25 decision and UI review findings`

## Deviations from Plan

None - plan executed exactly as written. (`npm ci` was run in the worktree to obtain `node_modules`; it is gitignored and changed no dependency.)

## Issues Encountered

- Ollama on CPU timed out (504) on 4 of 6 calls across two runs; recorded as results, not fixed (plan step 2).

## Known Stubs

None.

## Threat Flags

None. T-03-16: only anonymized fixtures run and recorded. T-03-17: no prompt, docs, `.env.example`, `compose.yml` or model change; fingerprint equals the approved hash.

## Self-Check: PASSED

- `scripts/compose-smoke.sh` contains `/api/offers/extract`; commit `ad1e684` is an ancestor of HEAD.
- `npm run typecheck && npm run lint && npm run test && npm run build` exit 0; `bash scripts/compose-smoke.sh --down` ended with `SMOKE OK`.
- Dev API health answers `"llm":"ok"`; `LLM_PROVIDER=mock npm run try-extract -w @tfm/api` exits 0 with the header and three rows.
- Task 3 resolved: D-25 decision and UI review findings recorded; no source file, STATE.md or ROADMAP.md modified in this continuation.
