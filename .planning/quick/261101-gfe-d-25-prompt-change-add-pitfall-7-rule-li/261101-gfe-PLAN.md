---
phase: quick-261101-gfe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/AI-EXTRACTION.md
  - apps/api/src/offers/extract.service.ts
  - .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md
autonomous: true
requirements: [AI-01]

estimate:
  tokens: 25000
  raw_tokens: 25000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The system prompt handed to the model contains the two Pitfall 7 rule lines the user approved on 2026-11-01 (D-25 «prompt»): «- company: la empresa que publica la oferta.» as a top-level rule right after the title rule, and «- label es el nombre de la tecnología o idioma (p. ej. \"React\", \"Inglés B2\"), nunca el nombre del grupo.» as an item of the tags sub-list, after the language item and before the «Grafía canónica» item. No other prompt line changes"
    - "EXTRACTION_SYSTEM_PROMPT and the fenced block under «## Prompt de sistema» in docs/AI-EXTRACTION.md are byte-identical, so the verbatim-prompt test in apps/api/src/offers/extract.routes.test.ts passes"
    - "The sha256 of the new docs block (fingerprint command, block without its trailing newline) is 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a (was 7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3), and 03-09-SUMMARY.md records it under «## D-25 decision» as the approved fingerprint from 2026-11-01"
    - "LLM_MODEL stays gemma4:e2b: .env.example and compose.yml are unchanged (D-25 keeps the model)"
    - "A fresh LLM_PROVIDER=ollama try-extract run with the new prompt is appended under «## D-25 decision» in 03-09-SUMMARY.md: the printed table, the returned extractions and a Pitfall 7 comparison against run 2. A 504 row is a recorded result, and a run with any 504 gets exactly one more run, both kept"
    - "Historical records stay as written: 03-09-PLAN.md and the «## Prompt fingerprint (D-25)» and «## Manual model test (D-24)» sections of 03-09-SUMMARY.md still show the old hash and the old runs"
  artifacts:
    - path: "docs/AI-EXTRACTION.md"
      provides: "Approved literal system prompt with the two Pitfall 7 rules"
      contains: "- company: la empresa que publica la oferta."
    - path: "apps/api/src/offers/extract.service.ts"
      provides: "EXTRACTION_SYSTEM_PROMPT, byte-identical to the docs block"
      contains: "nunca el nombre del grupo."
    - path: ".planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md"
      provides: "New approved fingerprint and the rerun evidence under «D-25 decision»"
      contains: "8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a"
  key_links:
    - from: "docs/AI-EXTRACTION.md «## Prompt de sistema» fenced block"
      to: "apps/api/src/offers/extract.service.ts EXTRACTION_SYSTEM_PROMPT"
      via: "promptFromDoc() in extract.routes.test.ts reads the block and asserts toBe against the constant and against the first argument of llm.extractStructured"
      pattern: "expect\\(EXTRACTION_SYSTEM_PROMPT\\)\\.toBe\\(promptDoc\\)"
    - from: "apps/api/src/offers/extract.service.ts"
      to: "apps/api/src/scripts/try-extract.ts"
      via: "the script builds createApp with the configured LlmClient, so POST /api/offers/extract runs the new constant in-process"
      pattern: "EXTRACTION_SYSTEM_PROMPT"
---

<objective>
Apply the D-25 decision the user took on 2026-11-01 at the 03-09 checkpoint (result «prompt»): add the two Pitfall 7 rule lines to the literal extraction system prompt, keep `gemma4:e2b`, record the new approved fingerprint and measure the model again with the new prompt.

The two approved lines (03-RESEARCH.md Pitfall 7; 03-09-SUMMARY.md «## D-25 decision»):
- `- label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.`
- `- company: la empresa que publica la oferta.`

Placement (planner's choice, the orchestrator asked for a sensible spot in the existing rule list):
- The company line goes as a top-level rule right after `- title: el nombre del puesto tal como aparece, sin la empresa.`, so the field rules follow the schema order (title, company, salary, …).
- The label line goes inside the `- tags:` sub-list, indented with two spaces like its siblings, after `  - language: idiomas con nivel si aparece ("Inglés B2").` and before `  - Grafía canónica (React, TypeScript, C#, .NET 8, AWS). Sin duplicados. Máximo 20.`. «label» and «grupo» only make sense for tags, and this keeps the two rules about label form (what a label is, canonical spelling) next to each other. The bullet text after the indent is byte-identical to the approved line.

With that placement the block hashes to `8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a` (computed at planning time on a scratch copy; HEAD hashes to the old `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`).

Out of scope: no other prompt line, no `LLM_MODEL`, `.env.example` or `compose.yml` change, no change to `mergeExtractionIntoForm` (the re-analysis UI finding is a separate follow-up), no new dependency. The model results are recorded, never acted on: if labels still equal group names, record it for the user and do not edit the prompt again.

Live references to the old hash or prompt text, checked at planning time with a repo-wide grep (node_modules and .git excluded): the prompt text lives only in `docs/AI-EXTRACTION.md` and `apps/api/src/offers/extract.service.ts`. The old hash appears only in historical records (`.planning/phases/03-autocompletado-con-ia/03-09-PLAN.md`, 4 lines, and the 03-09 SUMMARY's «Prompt fingerprint (D-25)» and «D-25 decision» sections). No test pins a hash: `extract.routes.test.ts` compares the text byte for byte. So step 2 of the 03-09 follow-up list («update the fingerprint in the test») has nothing to change, and the SUMMARY must say so.

Purpose: the demo's «tags proposed» step stops showing group names as labels (Pitfall 7 evidence), with the change approved, traceable and measured.
Output: updated prompt in docs and code (one commit), plus the new fingerprint and rerun evidence in 03-09-SUMMARY.md.
</objective>

<execution_context>
@/workspaces/TFM/.claude/gsd-core/workflows/execute-plan.md
@/workspaces/TFM/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md
@docs/AI-EXTRACTION.md
@apps/api/src/offers/extract.service.ts
@apps/api/src/offers/extract.routes.test.ts
@apps/api/src/scripts/try-extract.ts

Pitfall 7 evidence: .planning/phases/03-autocompletado-con-ia/03-RESEARCH.md around line 391 («Pitfall 7: Model quality with the verbatim prompt»). D-24 and D-25: .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md lines 58-59.

Environment facts (checked at planning time):
- The shell has `LLM_PROVIDER=ollama`, `LLM_BASE_URL=http://ollama:11434`, `LLM_MODEL=gemma4:e2b`, `LLM_TIMEOUT_MS=90000`. `npm run test` already passed with these set (03-09), so tests do not depend on `LLM_PROVIDER=mock` in the shell.
- `.lintstagedrc.json` runs eslint and prettier only on code and json/yml files; `.prettierignore` ignores `docs` and `*.md`. The pre-commit hook runs `npx lint-staged` and `npm run typecheck`. Prettier will rewrite a TS string that contains double quotes to single quotes, so write the label line with single quotes, as the sibling lines that contain double quotes already are.
- `npm run try-extract -w @tfm/api` runs in-process (no server or database), prints a header, a markdown table and the returned extractions, never the offer text, and exits 1 when any row is not a 200. Exit 1 is a result here, not a failure. Each call can take up to 90 s, so one run can take about 4.5 minutes.
- The executor works in a git worktree: if `node_modules` is missing, run `npm ci` first (gitignored, changes no dependency).

Fingerprint command (from 03-09-PLAN.md, run from the repo root; prints the sha256 of the block under «## Prompt de sistema» without its trailing newline):
node -e "const t=require('fs').readFileSync('docs/AI-EXTRACTION.md','utf8');const f='\x60'.repeat(3);const s=t.slice(t.indexOf('\n',t.indexOf('## Prompt de sistema')));const a=s.indexOf(f);const p=s.slice(s.indexOf('\n',a)+1,s.indexOf('\n'+f,a+3));console.log(require('crypto').createHash('sha256').update(p,'utf8').digest('hex'))"
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Add the two Pitfall 7 rules to the docs prompt block and EXTRACTION_SYSTEM_PROMPT together (D-25)</name>
  <files>docs/AI-EXTRACTION.md, apps/api/src/offers/extract.service.ts</files>
  <read_first>docs/AI-EXTRACTION.md (lines 53-70, the «## Prompt de sistema» block), apps/api/src/offers/extract.service.ts (lines 10-27, the constant and its comment), apps/api/src/offers/extract.routes.test.ts (promptFromDoc at line 57 and the verbatim test at line 116)</read_first>
  <behavior>
    - The verbatim-prompt route test («hands the model the system prompt of docs/AI-EXTRACTION.md byte for byte») fails after the docs edit alone (RED) and passes once the constant matches (GREEN).
    - The fingerprint of the new docs block is exactly 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a.
    - Each new line appears exactly once in each file; the block grows from 15 to 17 lines and no existing line changes.
  </behavior>
  <action>
Per D-25 (user decision 2026-11-01, «prompt»), change the literal prompt in its two homes, docs first so the existing verbatim test proves the link.

Before editing, record PLAN_BASE as the output of `git rev-parse HEAD`; the range checks of this plan use it.

RED: in docs/AI-EXTRACTION.md, inside the fenced block under «## Prompt de sistema (`offers/extract.service.ts`)», insert two lines and touch nothing else in the file:
1. Right after the line `- title: el nombre del puesto tal como aparece, sin la empresa.` insert the top-level line `- company: la empresa que publica la oferta.` (no indent).
2. Right after the line `  - language: idiomas con nivel si aparece ("Inglés B2").` and before `  - Grafía canónica (React, TypeScript, C#, .NET 8, AWS). Sin duplicados. Máximo 20.` insert two spaces followed by the approved line, i.e. `  - label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.`
Copy the characters exactly: straight ASCII double quotes, the accented «í» in «tecnología» and «Inglés», «p. ej.» with a space after the first dot, a final period, no trailing spaces, LF line endings. Then run `npm run test -w @tfm/api -- src/offers/extract.routes.test.ts` and confirm the verbatim test fails on the `toBe` comparison (expected RED).

GREEN: in apps/api/src/offers/extract.service.ts, add the same two strings to the `EXTRACTION_SYSTEM_PROMPT` array at the matching positions: `"- company: la empresa que publica la oferta.",` right after the title element, and the label element (with its two leading spaces) right after the language element and before the «Grafía canónica» element. Write the label element as a single-quoted string because it contains double quotes, as its siblings do (prettier would convert it anyway). Keep `.join("\n")` and the existing comment above the constant (it already says to edit both together, with approval; D-25 is that approval). Run the targeted tests again: both files must pass.

Commit the two files together in one commit, so no commit has the docs and the constant out of step.

Do not change any other prompt line, the «Iteración futura» line, `LLM_MODEL`, `.env.example` or `compose.yml`.
  </action>
  <verify>
    <automated>node -e "const t=require('fs').readFileSync('docs/AI-EXTRACTION.md','utf8');const f='\x60'.repeat(3);const s=t.slice(t.indexOf('\n',t.indexOf('## Prompt de sistema')));const a=s.indexOf(f);const p=s.slice(s.indexOf('\n',a)+1,s.indexOf('\n'+f,a+3));const h=require('crypto').createHash('sha256').update(p,'utf8').digest('hex');console.log(h);process.exit(h==='8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a'?0:1)" && test "$(grep -cxF -- '- company: la empresa que publica la oferta.' docs/AI-EXTRACTION.md)" -ge 1 && test "$(grep -cxF -- '  - label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.' docs/AI-EXTRACTION.md)" -ge 1 && test "$(grep -cF -- '- company: la empresa que publica la oferta.' apps/api/src/offers/extract.service.ts)" -ge 1 && test "$(grep -cF -- '  - label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.' apps/api/src/offers/extract.service.ts)" -ge 1 && npm run test -w @tfm/api -- src/offers/extract.routes.test.ts src/offers/extract.service.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - The fingerprint gate exits 0 and prints 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a (baseline at HEAD: prints 7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3 and exits 1).
    - Each of the four grep counts is at least 1 (baseline: 0 for all four); reading the block shows each new line once, at the planned position.
    - `npm run test -w @tfm/api -- src/offers/extract.routes.test.ts src/offers/extract.service.test.ts` passes (41 tests at HEAD; same count after, no test added or removed).
    - `git show --numstat <Task 1 commit>` lists `2\t0` for docs/AI-EXTRACTION.md and for apps/api/src/offers/extract.service.ts, and no other file.
    - Invariance gates (pass at HEAD by design): `grep -qx 'LLM_MODEL=gemma4:e2b' .env.example` and `grep -q 'LLM_MODEL:-gemma4:e2b' compose.yml` both exit 0, and `git diff --quiet $PLAN_BASE..HEAD -- .env.example compose.yml` exits 0 after the commits.
  </acceptance_criteria>
  <done>Docs block and constant carry the two approved lines at the planned positions, hash to 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a, the verbatim test passes, and both files are committed together.</done>
</task>

<task type="auto">
  <name>Task 2: Record the new approved fingerprint under «D-25 decision» in the 03-09 SUMMARY</name>
  <files>.planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md</files>
  <read_first>.planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md (sections «## Prompt fingerprint (D-25)» at line 148 and «## D-25 decision» at line 160)</read_first>
  <action>
Per D-25, append a subsection at the end of «## D-25 decision» (after its numbered follow-up list, before «## UI review (Task 3)»). Its heading line is exactly `### Applied (quick 261101-gfe)`. It states, in short English sentences matching the SUMMARY's style:
- Date 2026-11-01, quick task 261101-gfe, and the commit hash of Task 1.
- Placement: the company rule right after the title rule; the label rule as an item of the tags sub-list after the language item and before «Grafía canónica», indented like its siblings, bullet text verbatim as approved.
- New approved fingerprint of the «Prompt de sistema» block (without its trailing newline): `8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a`, as printed by the fingerprint command after Task 1. Previous value: `7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3`. From 2026-11-01 the new value is the approved one; the «Prompt fingerprint (D-25)» section above records the prompt used by the D-24 runs and stays as written.
- The verbatim-prompt test in `apps/api/src/offers/extract.routes.test.ts` passes, so `EXTRACTION_SYSTEM_PROMPT` hashes to the same value.
- Follow-up step 2 needed no test change: no test pins a hash (the route test compares the text byte for byte), and the only other files that hold the old hash are historical records (03-09-PLAN.md and this SUMMARY), left unchanged.
- `LLM_MODEL` stays `gemma4:e2b`; `.env.example` and `compose.yml` are unchanged.

Do not edit the frontmatter, «## Manual model test (D-24)», «## Prompt fingerprint (D-25)», the follow-up list or any other section, and do not edit 03-09-PLAN.md.
  </action>
  <verify>
    <automated>test "$(awk '/^## D-25 decision$/{f=1} /^## UI review/{f=0} f' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md | grep -c '8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a')" -ge 1 && test "$(awk '/^## D-25 decision$/{f=1} /^## UI review/{f=0} f' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md | grep -cx '### Applied (quick 261101-gfe)')" -ge 1 && test "$(grep -c '7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md)" -ge 3 && test "$(grep -c '7b74659be41dcee556f8e566e2d5dc6b9fd58641bdf11d0e18003a2c7ea098c3' .planning/phases/03-autocompletado-con-ia/03-09-PLAN.md)" -ge 4</automated>
  </verify>
  <acceptance_criteria>
    - Inside the «## D-25 decision» region, the new hash appears at least once (baseline 0) and the heading `### Applied (quick 261101-gfe)` is present (baseline 0).
    - The old hash still appears on at least 3 lines of the SUMMARY (baseline 3: the historical lines are kept) and on at least 4 lines of 03-09-PLAN.md (baseline 4); `git diff --quiet $PLAN_BASE..HEAD -- .planning/phases/03-autocompletado-con-ia/03-09-PLAN.md` exits 0 (plan untouched).
  </acceptance_criteria>
  <done>The 03-09 SUMMARY names 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a as the approved fingerprint from 2026-11-01, explains placement and why no test needed a hash update, and leaves every historical section as written.</done>
</task>

<task type="auto">
  <name>Task 3: Rerun try-extract against gemma4:e2b with the new prompt and append the evidence to the SUMMARY</name>
  <files>.planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md</files>
  <read_first>apps/api/src/scripts/try-extract.ts (output format and exit code), .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md (the run 2 table at line 95 and «### Pitfall 7 comparison» at line 140, the baseline to compare against)</read_first>
  <precondition>The devcontainer Ollama answers `curl -s -m 5 "$LLM_BASE_URL/api/tags"` with a model list that includes gemma4:e2b, and `node_modules` exists in the checkout (run `npm ci` first if it does not).</precondition>
  <action>
Per D-24 and D-25, measure the new prompt on the three anonymized fixtures. Record results; do not fix anything based on them.

1. Before running, record the machine state in one line: `free -m` available memory and whether another try-extract or model-heavy process is running (`ps aux`). If one is running, wait for it to end; do not start a second concurrent run.
2. From the repo root run `LLM_PROVIDER=ollama npm run try-extract -w @tfm/api` with a 10-minute (600000 ms) tool timeout. `LLM_MODEL` is already `gemma4:e2b` in the shell; do not override it. Capture the full stdout. Exit 1 only means some row was not a 200.
3. If any row says `HTTP 504`, run the same command once more (one retry, same timeout) and keep both runs. Do not run a third time.
4. Append a subsection to the end of «## D-25 decision», after `### Applied (quick 261101-gfe)` and before «## UI review (Task 3)», with the heading line exactly `### Model rerun with the D-25 prompt`. It contains:
   - One line with date, provider, model, target (from the script's header line), the machine-state line from step 1, and the fingerprint 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a of the prompt used.
   - Each run's markdown table exactly as printed (label them «Rerun 1» and, if it happened, «Rerun 2»).
   - The returned extractions of the last run that has them, as `json` fenced blocks copied from the script output. Never paste fixture or offer text; the script does not print it.
   - A Pitfall 7 comparison as a bullet per fixture against run 2 of the D-24 test above: tag labels equal to group names (yes/no, list them); expected tag labels now present or missing; company null although named (yes/no); time and whether it exceeded 60 s; any 502 `LLM_ERROR`.
   - One closing line stating the outcome for the user: whether the label problem is gone on the fixtures that answered, and whether the CPU timeouts remain (a separate concern per «Known deviations»). If labels still equal group names, say so and leave the decision to the user; do not change the prompt or the model.
5. Leave every other section of the SUMMARY unchanged.
  </action>
  <verify>
    <automated>test "$(grep -cF '| fixture | time (s) | correct / total | notes |' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md)" -ge 3 && test "$(awk '/^## D-25 decision$/{f=1} /^## UI review/{f=0} f' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md | grep -cx '### Model rerun with the D-25 prompt')" -ge 1 && test "$(awk '/^## D-25 decision$/{f=1} /^## UI review/{f=0} f' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md | grep -cF '| fixture | time (s) | correct / total | notes |')" -ge 1 && npm run typecheck && npm run test</automated>
  </verify>
  <acceptance_criteria>
    - The SUMMARY has at least 3 table header lines `| fixture | time (s) | correct / total | notes |` (baseline 2, the two D-24 runs), and at least one of them is inside the «## D-25 decision» region (baseline 0).
    - The heading `### Model rerun with the D-25 prompt` is present inside the «## D-25 decision» region (baseline 0).
    - When rerun 1 has a 504 row, a «Rerun 2» table exists too; there is never a third run.
    - The recorded extractions contain only the script's JSON output; no fixture text appears in the SUMMARY.
    - `npm run typecheck && npm run test` exit 0 from the repo root.
  </acceptance_criteria>
  <done>The 03-09 SUMMARY holds the rerun tables, returned extractions and a per-fixture Pitfall 7 comparison for the new prompt under «D-25 decision», with 504s recorded as results, and the repo gate is green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| API → LLM provider (Ollama) | The system prompt and the offer text cross to the model; the model's JSON comes back and is validated with offerExtractionSchema before normalization |
| dev script → planning record | try-extract output is copied by hand into a committed SUMMARY |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261101-gfe-01 | Tampering | `EXTRACTION_SYSTEM_PROMPT` and the docs «Prompt de sistema» block | low | mitigate | Only the two lines the user approved on 2026-11-01 (D-25 «prompt») are added. The verbatim-prompt route test keeps docs and code byte-identical, and the new sha256 is gated in Task 1 and recorded in the 03-09 SUMMARY, so any later unapproved edit changes a recorded value. The model's output is still validated by `offerExtractionSchema` and normalized (unchanged code) |
| T-261101-gfe-02 | Information Disclosure | try-extract output pasted into 03-09-SUMMARY.md | low | mitigate | Only the three anonymized fixtures run; the script prints timings, scores and extracted fields, never the offer text (AI-04, T-03-16). Task 3 copies only the script's table and JSON |
| T-261101-gfe-03 | Denial of Service | Ollama on a shared 8 GB CPU devcontainer | low | accept | Dev-only manual measurement. Calls are capped by `LLM_TIMEOUT_MS` (90 s, 504), the run has a 10-minute tool timeout, and there is at most one retry run. No concurrent run is started |
| T-261101-gfe-SC | Tampering | npm/pip/cargo installs | low | accept | No package is added. A missing `node_modules` in the worktree is restored with `npm ci` from the committed lockfile, so the package-legitimacy gate does not apply |
</threat_model>

<verification>
- The fingerprint command prints 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a, and `npm run test -w @tfm/api -- src/offers/extract.routes.test.ts src/offers/extract.service.test.ts` passes.
- `git diff --stat $PLAN_BASE..HEAD` (PLAN_BASE = the output of `git rev-parse HEAD` recorded before Task 1) touches only docs/AI-EXTRACTION.md and apps/api/src/offers/extract.service.ts (2 insertions each, 0 deletions) and .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md (additions inside «## D-25 decision» only).
- `git diff --quiet $PLAN_BASE..HEAD -- .env.example compose.yml .planning/phases/03-autocompletado-con-ia/03-09-PLAN.md` exits 0.
- `npm run typecheck && npm run test` pass from the repo root.
</verification>

<success_criteria>
- D-25 «prompt» is applied: the extraction prompt carries the two Pitfall 7 rules, in docs and code, byte-identical, and `gemma4:e2b` is still the model.
- The new approved fingerprint is recorded in the 03-09 SUMMARY with the previous value and the reason no test needed a hash update.
- The rerun evidence (tables, extractions, Pitfall 7 comparison) sits next to the D-24 runs so the user can judge the effect of the change.
- No new dependency, no `any`, no other prompt or model change. Typecheck and tests are green.
</success_criteria>

<output>
Create `.planning/quick/261101-gfe-d-25-prompt-change-add-pitfall-7-rule-li/261101-gfe-SUMMARY.md` with `status: complete` in its frontmatter when done. Include the new fingerprint, the commit hashes, a one-line rerun outcome (labels fixed or not on the fixtures that answered, timeouts or not), and note that `npm ci` was run in the worktree if it was.
</output>
