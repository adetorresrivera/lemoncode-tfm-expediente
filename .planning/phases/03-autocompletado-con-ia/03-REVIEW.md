---
phase: 03-autocompletado-con-ia
reviewed: 2026-11-01T17:40:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - apps/api/src/offers/extract.pipeline.test.ts
  - apps/api/src/offers/extract.routes.test.ts
  - apps/api/src/offers/extract.service.test.ts
  - apps/api/src/offers/extract.service.ts
  - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
  - apps/web/src/pods/application-edit/application-edit.container.tsx
  - apps/web/src/pods/application-edit/application-edit.hooks.ts
  - apps/web/src/pods/application-edit/application-edit.test.tsx
  - apps/web/src/pods/application-edit/application-edit.vm.ts
  - apps/web/src/pods/application-edit/components/offer-panel.tsx
  - apps/web/src/pods/application-edit/components/tag-group-input.tsx
  - apps/web/src/pods/application-edit/components/tags-section.tsx
  - docs/AI-EXTRACTION.md
  - docs/DESIGN.md
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-01
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Scope: gap-closure plans 03-10, 03-11 and 03-12 (diff base b7e6945). They add:

- The model-facing `idioma` alias.
- A spoken-language guard that moves non-spoken `language` tags to `stack`.
- The panel fold after a successful analysis, with its focus handling.
- Per-group tag placeholders.

I ran the offers tests (102) and the application-edit tests (185); all pass. `npm run typecheck` and ESLint are clean on the reviewed paths. No `any`, no contract redefinition, no hex colours, UI copy in Spanish. The offer text is still not logged. The API pipeline is sound: the alias is accepted only in the lenient raw parse and is never emitted. `normalizeExtraction` remains pure, and deduplication correctly runs after the group change. The fold logic is correct: the hook sets status and open in one batch, the status region sits outside the collapsible content, and the focus effect covers the unmount-on-close case. One real quality defect: the closed language list silently reclassifies legitimate spoken languages.

## Warnings

### WR-01: Spoken languages outside the closed list are silently demoted to `stack`

**File:** `apps/api/src/offers/extract.service.ts:71-129`
**Issue:** `resolveTagGroup` keeps a `language`/`idioma` tag only if one of its words is in `SPOKEN_LANGUAGE_WORDS`; anything else becomes `stack`. The list omits many languages that offers routinely name:

- Korean and Hindi
- Turkish and Hebrew
- Greek and Danish
- Norwegian and Finnish
- Romanian, Czech, Ukrainian and Hungarian
- Basque and Galician (English forms)
- The English word "bilingual" (only "bilingue" is listed)

So `{ label: "Coreano B1", group: "idioma" }`, which the model classified correctly, ends up as a stack chip. Before this change that tag stayed in «Idiomas». The guard fixes C, Python and Java but introduces a false-negative class with no signal to the user. The doc says "lista cerrada", so this is by design, but the failure mode is silent misclassification of correct model output, and "closed list" will not hold for a demo with an arbitrary offer.
**Fix:** Either widen the list (add `coreano/korean`, `hindi`, `turco/turkish`, `hebreo/hebrew`, `griego/greek`, `danes/danish`, `noruego/norwegian`, `fines/finnish`, `rumano/romanian`, `checo/czech`, `ucraniano/ukrainian`, `hungaro/hungarian`, `vasco/basque`, `galician`, `bilingual`, `nativo`/`native` with `fluent`), or invert the guard so only labels in a small deny list of programming languages move to stack. In both cases update `docs/AI-EXTRACTION.md` §Normalización and the `isSpokenLanguageLabel` table test. A cheap middle path is to keep the tag in `language` when the label carries a CEFR level (`/\b[ABC][12]\b/i`), since "Python B2" is not realistic.

## Info

### IN-01: Exports with no consumer outside their module

**File:** `apps/api/src/offers/extract.service.ts:56` and `:71`
**Issue:** `MODEL_TAG_GROUPS` and `SPOKEN_LANGUAGE_WORDS` are exported but nothing in `apps/` imports them. Only the file itself uses them. This widens the module's public surface for no reason.
**Fix:** Drop the `export` on both, or import them in the tests if they are meant to be asserted against.

### IN-02: Redundant condition in the focus-restore effect

**File:** `apps/web/src/pods/application-edit/components/offer-panel.tsx:139-144`
**Issue:** `document.activeElement` is never a disconnected node, so `!active.isConnected` is dead. `contentRef.current?.contains(active)` is also true only if Radix has not yet unmounted the content (for example with a future exit animation). The effect works today, but the intent is hard to read.
**Fix:** Remove `!active.isConnected`, or add a comment that the `contains` branch is for animated unmounts.

### IN-03: Test assertions on the shown schema rely on a substring check

**File:** `apps/api/src/offers/extract.pipeline.test.ts` (test "shows the model the provider-facing schema, without the word language")
**Issue:** `expect(JSON.stringify(sent)).not.toContain("language")` and the same check on `messages[0].content` pass only because the contract schema carries no `.describe()` text and no field name containing "language". Adding a description such as "programming language" to any contract field would fail this test without any regression in the group enum.
**Fix:** Assert on the group enum only. The `toEqual(expected)` against the patched enum already proves that. Narrow the substring check to the `tags.items.properties.group` subtree, or search for the quoted token `"language"`.

---

_Reviewed: 2026-11-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
