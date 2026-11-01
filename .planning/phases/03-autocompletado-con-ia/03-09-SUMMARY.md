---
phase: 03-autocompletado-con-ia
plan: 09
subsystem: verification
tags: [compose-smoke, ollama, manual-model-test, d-24, d-25, phase-gate]
status: partial

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-02 callStructured and LLM clients, 03-03 try-extract and fixtures, 03-08 cancel and limits"
provides:
  - "compose smoke asserts POST /api/offers/extract answers 400 VALIDATION_ERROR inside the production image"
  - "D-24 evidence: gemma4:e2b on CPU against the three fixtures (two runs)"
  - "Prompt fingerprint equal to the approved sha256"
affects: [D-25 decision (pending the user at the Task 3 checkpoint)]

requirements-completed: [AI-01, AI-02, AI-04]

actuals:
  tokens: 14000
  tasks: 2
  commits: 1
plan_head_before: 016da0ab06ecedeef33561785b7a7930e57040d0
plan_head_after: ad1e68450f570d740cc545aa169ad79910f431ba

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
    verification: []
    human_judgment: true
    rationale: "Non-deterministic CPU model; the D-25 judgment (keep the literal prompt and gemma4:e2b or change them) is the user's, pending at Task 3"
---

# Phase 3 Plan 09: Phase gate, manual model test and D-25 evidence Summary

**The compose smoke now proves the extraction route is served by the production image, the whole suite is green, and gemma4:e2b was measured on CPU against the three fixtures: it timed out on remote-senior in both runs, answered the other two in 17 to 49 s but returned tag labels equal to group names (the Pitfall 7 pattern). The D-25 decision is pending the user.**

Status: Tasks 1 and 2 done and committed; Task 3 (blocking-human checkpoint: UI pass and D-25 decision) is awaiting the user. This SUMMARY is marked `status: partial` until the decision is recorded under «D-25 decision».

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

Pending. The user decides at Task 3 (blocking-human checkpoint) among: keep the literal prompt and `gemma4:e2b` («approved»), approve adding the two Pitfall 7 rule lines («prompt»), or switch `LLM_MODEL` («model: NAME»). Any approved change is applied afterwards as a `/gsd-quick` follow-up, never inside this plan.

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
2. Task 2: evidence only (this SUMMARY, committed in the plan metadata commit); no source file edited
3. Task 3: checkpoint, awaiting the user

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
- Task 3 is intentionally open (human checkpoint).
