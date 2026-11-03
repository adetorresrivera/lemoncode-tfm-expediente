---
phase: quick-261101-gpz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/pods/application-edit/application-edit.mapper.ts
  - apps/web/src/pods/application-edit/application-edit.hooks.ts
  - apps/web/src/pods/application-edit/application-edit.container.tsx
  - apps/web/src/pods/application-edit/application-edit.merge.test.ts
  - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
  - docs/AI-EXTRACTION.md
  - .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md
  - .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
  - .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md
autonomous: true
requirements: [AI-06, AI-07, AI-08]

estimate:
  tokens: 60000
  raw_tokens: 60000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On a second (or later) analysis, every scalar field still marked «IA» (title, company, location, workMode, seniority, contractType, salaryMin, salaryMax, currency) gets the new extraction's value and keeps an «IA» mark, or is reset to its empty value when the new extraction has none (\"\" for every field, the form default EUR for currency) and loses the mark (user decision 2026-11-01, amends D-11)"
    - "A field without an «IA» mark that holds a value (typed by the user, edited after an AI fill per D-13, or loaded in edit mode per D-17) is never changed by any analysis, also when the user edits it while the request is in flight and the response arrives afterwards (D-20)"
    - "AI chips still present in the tag list are replaced by the new extraction's tags; the user's chips stay first, win on a duplicate key (any group, their spelling) and are never marked; with no AI chip and no new tag the list is untouched (D-15)"
    - "After every analysis the «IA» field marks equal exactly the fields that analysis filled, the chip marks equal exactly the chips it added, and «Complétalo tú» equals the relevant fields still empty (recomputed per analysis, not accumulated)"
    - "With no «IA» marks (first analysis, edit mode right after load) the merge behaves exactly as before: only empty fields are filled, the salary inversion guard and the narrowed currency rule are unchanged, offerText is the analyzed text; every existing first-analysis merge test passes unmodified"
    - "docs/AI-EXTRACTION.md flow step 4, the two re-analysis rows of 03-UI-SPEC.md and D-11 in 03-CONTEXT.md state the new rule; the «Prompt de sistema» block is byte-identical (sha256 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a)"
    - "npm run typecheck && npm run lint && npm run test pass from the repo root"
  artifacts:
    - path: "apps/web/src/pods/application-edit/application-edit.mapper.ts"
      provides: "mergeExtractionIntoForm with an optional fourth parameter (the «IA» marks before the analysis) that treats marked fields and chips as replaceable"
      contains: "previous"
    - path: "apps/web/src/pods/application-edit/application-edit.hooks.ts"
      provides: "useAiMarks with a ref-backed stable getMarks and replace-on-merge semantics; useOfferExtraction reading the marks at response time and writing cleared fields"
      contains: "getMarks"
    - path: "apps/web/src/pods/application-edit/application-edit.container.tsx"
      provides: "Create and edit forms pass marks.getMarks and marks.setFromMerge to useOfferExtraction"
      contains: "getMarks"
    - path: "apps/web/src/pods/application-edit/application-edit.merge.test.ts"
      provides: "Unit tests for re-analysis of fields, salary, currency and tags"
      contains: "re-analysis"
    - path: "apps/web/src/pods/application-edit/application-edit.ai.test.tsx"
      provides: "Testing Library tests of the double-analysis flow through the container"
      contains: "second analysis"
    - path: "docs/AI-EXTRACTION.md"
      provides: "Flow step 4 with the rule for fields and chips still marked «IA»"
      contains: "sigue marcado «IA»"
  key_links:
    - from: "apps/web/src/pods/application-edit/application-edit.container.tsx"
      to: "apps/web/src/pods/application-edit/application-edit.hooks.ts useOfferExtraction"
      via: "getMarks: marks.getMarks and onMerged: marks.setFromMerge in both ApplicationCreate and ApplicationEditForm"
      pattern: "getMarks: marks.getMarks"
    - from: "apps/web/src/pods/application-edit/application-edit.hooks.ts useOfferExtraction"
      to: "apps/web/src/pods/application-edit/application-edit.mapper.ts mergeExtractionIntoForm"
      via: "the .then handler reads getMarks() once at response time and passes it as the fourth argument, then writes every field in the union of the previous aiFields and merge.aiFields"
      pattern: "mergeExtractionIntoForm\\("
    - from: "apps/web/src/pods/application-edit/application-edit.hooks.ts useAiMarks"
      to: "apps/web/src/pods/application-edit/application-edit.hooks.ts useOfferExtraction"
      via: "a ref is the source of truth of the marks, written synchronously in setFromMerge/onUserChange/clear, so an edit made while the request is in flight is seen by the merge"
      pattern: "useRef"
---

<objective>
Fix the phase 03 UAT finding recorded in 03-09-SUMMARY.md «UI review (Task 3)»: a second analysis in the application form cannot replace the values a first analysis wrote, because `mergeExtractionIntoForm` fills only empty fields and does not know which fields are still marked «IA».

Implement the behaviour the user chose on 2026-11-01 (option «Replace AI fields»; locked decision, amends phase 03 D-11):
- Fields still marked «IA» (filled by an earlier analysis, never edited) get the new offer's values, or are cleared when the new offer lacks them.
- AI-proposed chips the user has not removed are replaced by the new AI tags.
- User-typed or user-edited fields and the user's own tags are never touched; the existing union-without-duplicates rule applies between user tags and new AI tags.
- The «IA» marks and «Complétalo tú» marks are recomputed from the new result.

Failing tests come first in each task (unit tests on the pure merge, plus Testing Library tests of the double-analysis flow through the container), then the fix. Then `docs/AI-EXTRACTION.md` flow step 4 and the re-analysis lines of `03-UI-SPEC.md` are clarified to match.

Purpose: the demo flow «pegar → guardar» must survive a user who analyses a second offer in the same form; today the first offer's values stick.
Output: the merge, marks and extraction hooks updated in `apps/web/src/pods/application-edit/`, new and updated tests, clarified spec docs.

## Design decisions (planner, within the user decision)

1. **One rule: a field still marked «IA» counts as empty for the merge.** Every existing rule that says «empty» now reads «empty or still marked «IA»» (call it *free*). A marked field the new analysis does not fill is reset to its value in `EMPTY_FORM_VALUES` (`""`; currency back to `EUR`), so no value of the previous offer survives. Reset fields are not listed in `aiFields` and do not count in «Hemos rellenado N campos».
2. **Salary pair.** salaryMin/salaryMax marked «IA» are free. The inversion guard compares only against a salary side that is *not* free (a user value): an AI fill that would put the minimum above a user-kept maximum (or the maximum below a user-kept minimum) is skipped and, since that side is AI-marked, reset to `""`.
3. **Currency (narrowed rule, D-25-era decision of 2026-10-31, generalised).** Currency is written when both salary sides are free, the analysis filled at least one side and returned a currency, **and** currency is still marked «IA» or both salary sides were blank. A marked currency that is not written is reset to `EUR`. Consequence, accepted and pinned by a test: a currency *without* a mark next to AI-marked salaries is kept, because the marks cannot tell a default `EUR` from a currency the user picked, and the user decision says user-edited fields are never touched. With no marks the rule is exactly today's rule.
4. **Tags.** Chips whose key (`tagKey`) is in the previous `aiTags` are dropped first; the remaining (user) chips are unioned with the new extraction through `normalizeTags`, user chips first. A re-proposed chip comes back in the new extraction's spelling and group and stays marked. Dropping old AI chips frees slots under the 20-tag cap.
5. **Marks are replaced, not added.** After a merge, `aiFields` = `merge.aiFields`, `aiTags` = `merge.aiTags`, `missingFields` = `merge.missingFields`. This is correct because every previously marked field or chip was either filled again (and is in the new lists) or cleared.
6. **Marks are read at response time.** `useAiMarks` keeps a ref as the source of truth, written synchronously in its callbacks, and exposes a stable `getMarks`. `useOfferExtraction` calls it in the response handler next to `form.state.values` (D-20), so an edit made while the request runs drops the mark before the merge reads it.
7. **Signature.** `mergeExtractionIntoForm(current, extraction, text, previous?)` with `previous: Pick<AiMarks, "aiFields" | "aiTags">` defaulting to a module constant with two empty sets. Optional on purpose: no marks is the first-analysis case, so the ~35 existing merge tests stay unmodified and document it; the Testing Library tests prove the hook passes the marks. `Pick` narrows a view-model type to another view-model shape; it does not derive the VM from the API model (CLAUDE.md rule untouched). `ExtractionMerge` and `application-edit.vm.ts` do not change: the hook knows the previous marks, so it writes the union of the previous `aiFields` and `merge.aiFields` without a new merge property.
8. **offerText** keeps its rule: always the analyzed text, never an AI-filled field. Edit mode: loaded values carry no marks (D-17), so a re-analysis in edit mode never replaces stored values.
9. **AI-06 wording.** REQUIREMENTS.md AI-06 («fills only empty fields») is not edited by this quick task; the SUMMARY records that it now reads «empty or still marked «IA»» per the user decision, for the orchestrator to reconcile at phase verification.
</objective>

<execution_context>
@/workspaces/TFM/.claude/gsd-core/workflows/execute-plan.md
@/workspaces/TFM/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/STATE.md
@.planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md
@.planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
@docs/AI-EXTRACTION.md
@apps/web/src/pods/application-edit/application-edit.mapper.ts
@apps/web/src/pods/application-edit/application-edit.hooks.ts
@apps/web/src/pods/application-edit/application-edit.vm.ts
@apps/web/src/pods/application-edit/application-edit.container.tsx
@apps/web/src/pods/application-edit/application-edit.merge.test.ts

<interfaces>
Current signatures (HEAD d310b5a), for the executor; read the files for bodies.

application-edit.vm.ts (unchanged by this plan):
- `type AiFillableField = "title" | "company" | "location" | "workMode" | "seniority" | "contractType" | "salaryMin" | "salaryMax" | "currency"`
- `interface ExtractionMerge { values: ApplicationFormValues; aiFields: AiFillableField[]; aiTags: string[]; missingFields: RelevantField[] }`
- `interface AiMarks { aiFields: ReadonlySet<AiFillableField>; aiTags: ReadonlySet<string>; missingFields: ReadonlySet<RelevantField> }`
- `EMPTY_FORM_VALUES.currency === "EUR"`, every other AI-fillable field `""`.

application-edit.mapper.ts:
- `mergeExtractionIntoForm(current: ApplicationFormValues, extraction: OfferExtraction, text: string): ExtractionMerge` — becomes `(current, extraction, text, previous?: Pick<AiMarks, "aiFields" | "aiTags">)`.
- Uses `normalizeTags` and `tagKey` from `@tfm/contracts` (normalizeTags: first spelling and group win on a key, order kept, cap MAX_TAGS = 20).

application-edit.hooks.ts:
- `interface AiMarksControl { marks: AiMarks; addFromMerge(merge: ExtractionMerge): void; onUserChange(name: FormFieldName, value: unknown): void; clear(): void }` — becomes `{ marks; getMarks(): AiMarks; setFromMerge(merge: ExtractionMerge): void; onUserChange; clear }`.
- `interface OfferExtractionOptions { form: ApplicationFormApi; initialDraft: string; onMerged?: (merge: ExtractionMerge) => void }` — gains required `getMarks: () => AiMarks`.
- Inside `analyze`, `.then(extraction => …)` calls the merge with `form.state.values`, then `applyField(field, merge.values)` for each `merge.aiFields`, writes offerText, writes tags only when `merge.aiTags.length > 0`, then `onMerged?.(merge)` and the success status (`filled: merge.aiFields.length`, `tagsAdded: merge.aiTags.length`).

application-edit.ai.test.tsx helpers already present: `renderCreate`, `pasteOffer`, `analyzeButton`, `deferred`, `mockFetch`/`jsonResponse`, `NO_DATA`, `EXTRACTION`, `PARTIAL` (title «Desarrollador/a Frontend», company «Lumen Analytics», workMode «remoto»), `BADGE` = «Rellenado por la IA», `MISSING` = «Complétalo tú», `GOLD`, `describedBy`, `AI_NOTE` = «(propuesta por IA)», `STACK`, `NICE`, `groupOf`, `chip`, `chipOf`, `typeTag`, `withTags`, `TAGGED` (React, TypeScript stack; Inglés B2 language). Badge ids are `${controlId}-ai`, missing ids `${controlId}-missing` (see components/field-props.ts).
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Re-analysis replaces or clears scalar fields still marked «IA», end to end (merge, marks, extraction hook, container)</name>
  <files>apps/web/src/pods/application-edit/application-edit.merge.test.ts, apps/web/src/pods/application-edit/application-edit.ai.test.tsx, apps/web/src/pods/application-edit/application-edit.mapper.ts, apps/web/src/pods/application-edit/application-edit.hooks.ts, apps/web/src/pods/application-edit/application-edit.container.tsx</files>
  <read_first>apps/web/src/pods/application-edit/application-edit.mapper.ts (mergeExtractionIntoForm), apps/web/src/pods/application-edit/application-edit.hooks.ts (useAiMarks, useOfferExtraction), apps/web/src/pods/application-edit/application-edit.container.tsx, apps/web/src/pods/application-edit/application-edit.merge.test.ts, apps/web/src/pods/application-edit/application-edit.ai.test.tsx lines 1-110 (helpers) and 380-440 and 505-660 (marks tests), .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md D-11, D-13, D-16, D-17, D-20</read_first>
  <behavior>
    Merge unit tests, new describe «mergeExtractionIntoForm: re-analysis of fields» with a local helper that builds `{ aiFields: new Set(list), aiTags: new Set(keys) }` (import the AiFillableField type from the vm):
    - Replaces a field still marked «IA»: current title «Frontend» marked, extraction title «Backend» → values.title «Backend», aiFields ["title"].
    - Clears a marked field the new extraction lacks: current company «Acme» marked, extraction company null → values.company "", aiFields [], missingFields contains "company". Same for a marked select (workMode «remoto» marked, extraction null → "").
    - Keeps a filled field without the mark: current title «Mi puesto» unmarked, extraction title «Otro» → «Mi puesto», not listed.
    - Replaces the marked salary range and currency: current 45000 / 55000 / USD all marked, extraction 50000 / 60000 / GBP → "50000", "60000", "GBP", aiFields ["salaryMin", "salaryMax", "currency"].
    - Resets the marked salary range and currency when the new extraction has no salary: same current, extraction with all nulls → "", "", "EUR", aiFields [].
    - Keeps the inversion guard against a user maximum: current salaryMin "45000" marked, salaryMax "30000" unmarked, extraction 50000 / 60000 / GBP → salaryMin "" (skipped and reset), salaryMax "30000", currency unchanged, aiFields [].
    - Resets a marked currency when a salary side belongs to the user: current salaryMin "45000" marked, salaryMax "55000" unmarked, currency "GBP" marked, extraction salaryMin 40000, currency "USD" → salaryMin "40000", salaryMax "55000", currency "EUR", aiFields ["salaryMin"].
    - Keeps an unmarked currency next to marked salaries (design decision 3): current 45000 / 55000 marked, currency "EUR" unmarked, extraction 50000 / 60000 / "GBP" → salaries replaced, currency "EUR", aiFields ["salaryMin", "salaryMax"].
    - Does not mutate `current` nor the previous-marks sets (structuredClone snapshot, set sizes unchanged).
    Every existing merge test stays unmodified and green (no fourth argument = no marks).

    Testing Library tests in application-edit.ai.test.tsx, «ApplicationEditContainer AI marks» describe:
    - New: «replaces the fields still marked «IA» on a second analysis, clears the ones the new offer lacks and keeps the edited one»: call 1 answers PARTIAL; the user types "x" into «Empresa *»; call 2 answers NO_DATA with title «Backend Developer» and seniority «mid». Expect Puesto «Backend Developer» with its badge, Empresa «Lumen Analyticsx» without badge, Modalidad "" without badge and with «Complétalo tú» (`field-workMode-missing` in its aria-describedby), Seniority «mid» with badge, exactly 2 BADGE texts, status «Hemos rellenado 2 campos. Revísalos. Te falta completar: Modalidad.»
    - New: «replaces the AI salary range and currency on a second analysis and resets them when the next offer has none»: calls answer NO_DATA with 45000 / 55000 / USD, then 50000 / 60000 / GBP, then NO_DATA. After call 2: Salario mínimo 50000, Salario máximo 60000, Moneda «GBP», 3 BADGE texts. After call 3: both salaries null, Moneda «EUR», no BADGE text. Calls 1 and 2 read the same summary, so wait on the control values with `waitFor`, not on the status text.
    - New: «keeps a field the user edits while a second analysis runs (D-20)»: call 1 answers PARTIAL; call 2 is a `deferred()`; after «Analizando la oferta…» the user types "x" into «Empresa *»; release with PARTIAL plus company «Otra Empresa». Expect Empresa «Lumen Analyticsx» with no `field-company-ai`, Puesto still badged.
    - Update «drops the missing sentence on a second analysis once the user completed the field»: the second analysis now fills the 8 marked fields again, so wait for the exact text «Hemos rellenado 8 campos. Revísalos.» instead of the «No hemos encontrado datos nuevos…» sentence; keep the assertion that «Te falta completar» is gone.
    - Update «brings «Complétalo tú» back only when a later analysis leaves the field empty»: the second analysis reads the same summary as the first, so wait for `screen.findByText(MISSING)` instead of the «No hemos encontrado datos nuevos» text; the remaining assertions stay.
    - Rename «keeps earlier badges on a second analysis, adds the new ones and recalculates the missing list» to say the second analysis marks the fields it fills again and leaves the edited one unmarked; update its inline comment; assertions unchanged.
  </behavior>
  <action>
RED first: write the tests listed in behavior, run the verify test command and confirm the new merge tests and the three new component tests fail while the rest pass (the two updated component tests may already fail or pass; record which). Do not commit yet: the pre-commit hook runs the full suite, so RED and GREEN go in one commit and the SUMMARY records it under «TDD Gate Compliance» (Phase 2 convention in STATE.md).

GREEN, mapper (application-edit.mapper.ts), per the user decision of 2026-11-01 amending D-11 and design decisions 1-3 and 7:
- Add the optional fourth parameter `previous` typed `Pick<AiMarks, "aiFields" | "aiTags">`, defaulting to a module-level constant with two empty sets (import the AiMarks type from the vm). Add a local helper that says whether a field is marked (`previous.aiFields.has`) and one that says whether it is free (blank per the existing `isBlank`, or marked).
- Six text and select fields: in the existing fill helper, replace the «existing value is blank» test with «field is free». When the extraction has no non-blank value and the field is marked, write `EMPTY_FORM_VALUES[field]` into `values` and do not list it in `aiFields`.
- Salary: compute the kept minimum and maximum only from sides that are not free (a free side is null for the guard). A side is filled when the extraction has a value, the side is free and the guard holds; otherwise, if that side is marked, write "" into it.
- Currency: write it when both salary sides are free, at least one side was filled, the extraction returned a currency, and currency is marked or both sides of `current` were blank. Otherwise, if currency is marked, write `EMPTY_FORM_VALUES.currency`.
- Leave the tag block and `missingFields` computation as they are in this task (tags are Task 2; missingFields already reads the merged values).
- Rewrite the doc comment above the function: «empty» now means empty or still marked «IA», marked fields the analysis does not fill are reset, the user's values are never touched (AI-06 as read per the 2026-11-01 decision, D-04), the inversion guard and currency rule with their new free/marked wording, and that it stays pure (neither `current` nor `previous` is mutated).

GREEN, hooks (application-edit.hooks.ts), per design decisions 5 and 6, D-13, D-16, D-17, D-20:
- useAiMarks: keep a `useRef<AiMarks>` initialised to EMPTY_MARKS as the source of truth next to the existing state. Add a small internal commit step used by every callback: compute the next marks from the ref, and when they differ by identity, write the ref and then call the state setter with the plain value (not an updater function, which React may run later). `onUserChange` keeps its exact current logic but reads from the ref. `clear` writes EMPTY_MARKS through the same step. Add a stable `getMarks` (useCallback, empty deps) returning the ref value. Do not read or write the ref during render and do not mirror the state into the ref with an effect (eslint-plugin-react-hooks 7 `refs` rule; the lint must stay at zero warnings).
- Rename `addFromMerge` to `setFromMerge` in AiMarksControl and the implementation. In this task it replaces `aiFields` with `merge.aiFields` and `missingFields` with `merge.missingFields`, and keeps `aiTags` as the union of the current and the merge's keys (the tag switch to replace happens in Task 2 together with the tag merge, so the existing chip tests stay green here). Update the doc comment above useAiMarks: a merge replaces the field marks (it filled them again or cleared them), and the D-13/D-16/D-17 sentences stay.
- useOfferExtraction: add required `getMarks: () => AiMarks` to OfferExtractionOptions. In the response handler, after the abort check, read `getMarks()` once into a local, pass it as the fourth argument of mergeExtractionIntoForm together with `form.state.values` (both read at response time, D-20), and call `applyField` for every field in a Set built from the previous `aiFields` plus `merge.aiFields` (a previously marked field was either filled again or reset, so it must be written either way; writing an unchanged value is harmless). offerText and the tag write stay as they are in this task. Update the hook's doc comment to say the marks are also read at response time.

GREEN, container (application-edit.container.tsx): in both ApplicationCreate and ApplicationEditForm pass `getMarks: marks.getMarks` and change `onMerged` to `marks.setFromMerge`. No other change: the pod still exports only the container, no pod-to-pod import, no `any`, no new dependency.

Re-run the verify command until green, then commit once with a Conventional Commit such as `fix(quick-261101-gpz): replace fields still marked IA on re-analysis`.
  </action>
  <reversibility rating="reversible">Pure merge function and session-only marks (D-17); nothing persisted or in contracts changes, and the tests pin each rule.</reversibility>
  <verify>
    <automated>npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts src/pods/application-edit/application-edit.ai.test.tsx && npm run typecheck -w @tfm/web && test "$(grep -c 'getMarks: marks.getMarks' apps/web/src/pods/application-edit/application-edit.container.tsx)" -ge 1 && test "$(grep -c 'onMerged: marks.setFromMerge' apps/web/src/pods/application-edit/application-edit.container.tsx)" -ge 1</automated>
  </verify>
  <done>The new merge tests and the three new Testing Library tests pass, the two updated and one renamed component tests pass, every existing merge test passes without a fourth argument, the web typecheck is clean and the container passes getMarks and setFromMerge (grep baselines at HEAD: 0 and 0; because `getMarks` is a required option, the typecheck fails if either ApplicationCreate or ApplicationEditForm omits it). RED was observed before GREEN and RED+GREEN are in one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Re-analysis replaces the AI chips still present and keeps the user's tags</name>
  <files>apps/web/src/pods/application-edit/application-edit.merge.test.ts, apps/web/src/pods/application-edit/application-edit.ai.test.tsx, apps/web/src/pods/application-edit/application-edit.mapper.ts, apps/web/src/pods/application-edit/application-edit.hooks.ts</files>
  <read_first>apps/web/src/pods/application-edit/application-edit.mapper.ts (tag block of mergeExtractionIntoForm as left by Task 1), apps/web/src/pods/application-edit/application-edit.hooks.ts (setFromMerge, keepPresentTags, the tag write in useOfferExtraction), apps/web/src/pods/application-edit/application-edit.ai.test.tsx lines 774-1010 (AI tags describe), packages/contracts/src/tag.normalize.ts</read_first>
  <behavior>
    Merge unit tests, new describe «mergeExtractionIntoForm: re-analysis of tags» (reuse the Task 1 helper for previous marks):
    - Replaces the marked chips and keeps the user's first: current [React stack (user), Vue stack (marked, key "vue")], extraction [Angular stack] → tags [React, Angular], aiTags ["angular"].
    - A re-proposed marked chip comes back in the new spelling and group, still marked: current [React stack marked], extraction [react nice_to_have] → tags [{ label "react", group "nice_to_have" }], aiTags ["react"].
    - Removes the marked chips when the new extraction has none: current [Node stack (user), Vue stack (marked)], extraction with no tags → tags [Node], aiTags [].
    - The user's chip wins on a duplicate key: current [Docker nice_to_have (user), Vue stack (marked)], extraction [docker stack, Go stack] → tags [Docker nice_to_have, Go stack], aiTags ["go"].
    - Dropped AI chips free slots under the cap: 19 user chips plus 1 marked chip, extraction [Uno, Dos, Tres] → 20 tags, the 19 user chips first and unchanged, then Uno; aiTags ["uno"].
    Existing tag tests stay unmodified and green (no marks).

    Testing Library tests, «ApplicationEditContainer AI tags» describe:
    - Update «keeps the marks of the chips still present when a second analysis adds only new tags» and rename it to say the second analysis replaces the AI chips: call 1 [React stack], call 2 [react stack, Docker nice_to_have]. Expect «2 de 20», no chip «React», chip «react» with AI_NOTE, chip «Docker» with AI_NOTE, one item in the «Se valora» group.
    - New: «replaces the AI chips on a second analysis, keeps the user's tag and removes the AI chips when the next offer has none»: the user types «Node» in the stack group first; call 1 answers TAGGED; call 2 answers [node stack, Vue stack]; call 3 answers NO_DATA. After call 2: chips Node (no AI_NOTE, user spelling) and Vue (AI_NOTE), no React, TypeScript or Inglés B2, «2 de 20», status «Hemos añadido 1 etiqueta. Revísala. Te falta completar: Puesto, Empresa, Modalidad y Seniority.» After call 3: only Node, «1 de 20», no AI_NOTE text.
    - «reads the tags-only sentences in the singular and the plural» keeps passing unchanged (React is replaced by Vue and Docker, still 2 added).
  </behavior>
  <action>
RED first: write the tests in behavior, run the verify test command and confirm the new and updated tag tests fail; RED and GREEN are committed together (pre-commit runs the full suite).

GREEN, mapper, per the user decision of 2026-11-01 and design decision 4, D-15: in the tag block of mergeExtractionIntoForm, first keep only the current chips whose `tagKey(label)` is not in `previous.aiTags` (the user's chips), then build the merged list with `normalizeTags` over the user chips followed by `extraction.tags`, and compute `aiTags` as the merged keys not present among the user chips. Keep the output mapping to `{ label, group }`. Update the tag comment: the user's chips come first and win on a repeated key, chips still marked «IA» are replaced by the new proposal, the cap keeps the user's chips.

GREEN, hooks, per design decision 5: in `setFromMerge` replace `aiTags` with the merge's keys (no union any more), so after this task all three mark sets are replaced by the merge's lists; update the useAiMarks comment accordingly (D-15 sentence about removed chips stays true through keepPresentTags). In useOfferExtraction write the tag list when the merge added chips or when the previous marks held at least one chip key (an AI chip was replaced or removed); otherwise leave the list untouched as today. Update the comment on that write.

Re-run until green and commit, for example `fix(quick-261101-gpz): replace AI-proposed tags on re-analysis`.
  </action>
  <verify>
    <automated>npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts src/pods/application-edit/application-edit.ai.test.tsx && npm run typecheck -w @tfm/web</automated>
  </verify>
  <done>The five new merge tag tests, the updated and the new chip component tests pass; existing tag tests pass unmodified; after any analysis the chip marks equal exactly the chips that analysis added; the web typecheck is clean.</done>
</task>

<task type="auto">
  <name>Task 3: State the re-analysis rule in the spec docs and run the repo gate</name>
  <files>docs/AI-EXTRACTION.md, .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md, .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md, .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md</files>
  <read_first>docs/AI-EXTRACTION.md «## Flujo» (step 4), .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md lines 165-172 and 280-286, .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md line 33 (D-11), .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md «## UI review (Task 3)»</read_first>
  <action>
docs/AI-EXTRACTION.md, flow step 4 only (Spanish, project voice: short sentences, no exclamations, no emojis; do not touch the «Prompt de sistema» block or any other section). Keep the existing bullets and add, right after «Campo vacío … se marca «IA».», a bullet that says: Campo que sigue marcado «IA» (lo rellenó un análisis anterior y el usuario no lo ha editado) → cuenta como vacío: se sustituye por el valor nuevo, o se vacía si la nueva extracción no lo trae (la moneda vuelve a EUR). The literal fragment «sigue marcado «IA»» must appear. Extend the user bullet to «Campo con valor del usuario (escrito o editado por él) → no se toca.» Add a salary and currency bullet stating design decisions 2 and 3 in one or two sentences (the fill never inverts the range against a user salary; currency is filled only when no salary side is the user's, the analysis filled one and returned a currency, and the currency was marked «IA» or both salaries were empty). Replace the tag bullet with: the chips proposed by the AI that are still in the list are replaced by the new ones; with the user's chips the union is without duplicates (lower-case comparison), the user's never change and win on a duplicate. Add a bullet: Marcas «IA» y «faltan» → se recalculan con el resultado del análisis nuevo. Keep the «faltan» and offerText bullets.

.planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md, two rows only:
- Line 170, row «Destructive confirmation»: keep «none in this phase.» and the closing «Cancelar análisis» sentence; replace the middle sentence with: Re-analysing never overwrites user values: it fills empty fields and replaces, or clears when the new offer lacks them, the fields and chips still marked «IA», which the user has not touched (user decision 2026-11-01, quick 261101-gpz), so no confirmation exists or is needed.
- Line 284, row «populated / Re-analysis on a partly filled form»: replace the description cell with: Empty fields are filled; fields and chips still marked «IA» are replaced or cleared; marks are recomputed from the new result; `missingFields` recalculated; user-typed or edited values and user tags untouched (D-11 as amended 2026-11-01).
The English phrase «still marked «IA»» must appear in both rows.

.planning/phases/03-autocompletado-con-ia/03-CONTEXT.md: leave the D-11 text as written and append to the same bullet: **Amended 2026-11-01 (user, 03-09 UI review; quick 261101-gpz):** fields and chips still marked «IA» count as empty, so a later analysis replaces them or clears them when the new offer lacks them, and the marks are recomputed from the new result instead of being added to the earlier ones. User-typed or edited values and user tags are still never touched.

.planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md, under «## UI review (Task 3)» only: append a bullet «**Applied:** 2026-11-01 by quick task 261101-gpz (commits in its SUMMARY); spec clarified in docs/AI-EXTRACTION.md flow step 4, 03-UI-SPEC.md and D-11 in 03-CONTEXT.md.» No other section of that file changes.

Then run the full gate from the repo root and commit the docs, for example `docs(quick-261101-gpz): state the re-analysis rule for fields still marked IA`.
  </action>
  <verify>
    <automated>test "$(grep -c 'sigue marcado «IA»' docs/AI-EXTRACTION.md)" -ge 1 && test "$(grep -c 'se recalculan' docs/AI-EXTRACTION.md)" -ge 1 && test "$(grep -c 'still marked «IA»' .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md)" -ge 2 && test "$(grep -v '^#' .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md | grep -c 'fills only empty fields')" -eq 0 && test "$(grep -v '^#' .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md | grep -ci 'marks accumulate')" -eq 0 && test "$(grep -c '261101-gpz' .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md)" -ge 1 && test "$(awk '/^## UI review/{f=1} /^## Phase-wide/{f=0} f' .planning/phases/03-autocompletado-con-ia/03-09-SUMMARY.md | grep -c '261101-gpz')" -ge 1 && node -e "const t=require('fs').readFileSync('docs/AI-EXTRACTION.md','utf8');const f='\x60'.repeat(3);const s=t.slice(t.indexOf('\n',t.indexOf('## Prompt de sistema')));const a=s.indexOf(f);const p=s.slice(s.indexOf('\n',a)+1,s.indexOf('\n'+f,a+3));const h=require('crypto').createHash('sha256').update(p,'utf8').digest('hex');console.log(h);process.exit(h==='8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a'?0:1)" && npm run typecheck && npm run lint && npm run test</automated>
    <human-check>With the dev stack (`npm run dev`, LLM_PROVIDER=ollama or mock), on /applications/new paste one fixture from apps/api/src/offers/__fixtures__, analyse, edit one filled field, then paste a different fixture and analyse again: the untouched «IA» fields and chips show the second offer's values (or are empty), the edited field and any hand-typed tag stay, and the badges match what the second analysis filled.</human-check>
  </verify>
  <done>Baselines at HEAD: «sigue marcado «IA»» 0, «se recalculan» 0, «still marked «IA»» 0, the old UI-SPEC merge sentence 1, the accumulation clause 1, «261101-gpz» 0 in CONTEXT and 03-09-SUMMARY. After the task the positive gates pass, the two old UI-SPEC phrases are gone, the prompt block still hashes to 8daeb5a2… (preservation gate, passes at HEAD by design), and `npm run typecheck && npm run lint && npm run test` exit 0 from the repo root.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| LLM output → web form | The extraction is model output, validated by `offerExtractionSchema` and normalized in the API (unchanged); the web merge decides which form values it may overwrite |
| User input → session marks | User edits drop «IA» marks; the marks decide which values a later analysis may replace |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261101-gpz-01 | Tampering | `mergeExtractionIntoForm` re-analysis branch | medium | mitigate | A model answer can only replace or clear fields and chips still marked «IA»; values without a mark (typed, edited, loaded in edit mode) are never written. Pinned by the Task 1 and Task 2 unit tests (keeps unmarked field, keeps user chip and its spelling, unmarked currency kept) and by the D-20 component test. Nothing is persisted until the user saves (AI-06) |
| T-261101-gpz-02 | Tampering | `useAiMarks` / `useOfferExtraction` race | low | mitigate | Marks are read from a synchronously written ref at response time, so an edit made while the request runs is honoured (D-20); covered by the new in-flight component test |
| T-261101-gpz-03 | Information Disclosure | offer text | low | accept | No logging is added; offerText handling is unchanged (always the analyzed text, sent only on save) |
| T-261101-gpz-SC | Tampering | npm/pip/cargo installs | low | accept | No package is added or upgraded; the package-legitimacy gate does not apply. A worktree without node_modules is restored with `npm ci` from the committed lockfile |
</threat_model>

<verification>
- `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts src/pods/application-edit/application-edit.ai.test.tsx` passes (baseline at HEAD: 2 files, 89 tests passing).
- `git diff --stat $PLAN_BASE..HEAD` (PLAN_BASE = `git rev-parse HEAD` recorded before Task 1) touches only the nine files in `files_modified`; `apps/web/src/pods/application-edit/application-edit.vm.ts`, `packages/contracts` and `apps/api` are unchanged.
- The prompt block fingerprint is still 8daeb5a2e47707e34c2149aa4810ea090ee8de6c859a63039614baa75661cf8a.
- `npm run typecheck && npm run lint && npm run test` exit 0 from the repo root.
</verification>

<success_criteria>
- Analysing a second offer replaces or clears every field and chip still marked «IA», keeps every user value and user tag, and recomputes the «IA» and «Complétalo tú» marks.
- First-analysis behaviour, the salary inversion guard, the narrowed currency rule (with no marks) and offerText are unchanged; all pre-existing first-analysis tests pass unmodified.
- The rule is written in docs/AI-EXTRACTION.md step 4, 03-UI-SPEC.md and D-11, consistent with the code.
- No new dependency, no `any`, no pod-to-pod import, pod structure intact. Typecheck, lint and tests are green.
</success_criteria>

<output>
Create `.planning/quick/261101-gpz-fix-re-analysis-merge-replace-fields-sti/261101-gpz-SUMMARY.md` with `status: complete` in its frontmatter when done. Include: the commit hashes; a «TDD Gate Compliance» section (which tests were seen failing before GREEN, RED+GREEN committed together because of the pre-commit hook); the design decisions as applied (free rule, reset values, currency rule and its accepted consequence, tag replacement, marks replaced and read at response time); the note that REQUIREMENTS.md AI-06 («fills only empty fields») now reads «empty or still marked «IA»» and was not edited; the existing tests whose expectations or names changed and why; and whether `npm ci` was run in the worktree.
</output>
