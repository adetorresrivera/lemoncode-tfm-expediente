---
phase: 03-autocompletado-con-ia
reviewed: 2026-11-01T20:15:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - apps/api/src/offers/extract.pipeline.test.ts
  - apps/api/src/offers/extract.service.test.ts
  - apps/api/src/offers/extract.service.ts
  - apps/web/src/common/components/request-status.tsx
  - apps/web/src/common/components/tag-chip.tsx
  - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
  - apps/web/src/pods/application-edit/components/field-props.ts
  - apps/web/src/pods/application-edit/components/form-field.test.tsx
  - apps/web/src/pods/application-edit/components/form-field.tsx
  - apps/web/src/pods/application-edit/components/offer-panel.tsx
  - docs/AI-EXTRACTION.md
  - docs/DESIGN.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-11-01T20:15:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Incremental review of quick task 261101-qh3 (diff base 6af244a): spoken languages routed through a separate model-facing `idiomas` field, lucide icons at `strokeWidth` 1.5, and the missing-field border switched to `border-brand-gold-ink`.

I traced the API change end to end. `rawOfferExtractionSchema` accepts `idiomas` absent, `null` or a string array. `modelOfferExtractionSchema` requires it (`maxItems` 20, label 1 to 40). `normalizeExtraction` puts the `idiomas` tags before the model tags, so they win duplicates and the 20-tag cap never drops them. The output goes through `offerExtractionSchema.safeParse`, so no `idiomas` key leaves the API. Both `cutLabel` and `normalizeTags` handle blank and over-long entries correctly. The `SPOKEN_LANGUAGE_WORDS` backstop still runs for tags inside `tags`, so the previous WR-01 fix is not regressed. The prompt text in code and in `docs/AI-EXTRACTION.md` match, and the API and web test suites pass (113 and 218 tests).

The web changes are mechanical and correct. `border-brand-gold-ink` resolves to a defined token (`--color-brand-gold-ink`, light and dark), the tests and `DESIGN.md` agree, and the removed `border-brand-gold` class has no leftover references.

No bugs or security issues were found. Three minor quality items follow. None of them re-reports an item already in 03-REVIEW-DISPOSITION.md.

## Info

### IN-01: `strokeWidth={1.5}` is applied to some lucide icons only

**File:** `apps/web/src/pods/application-detail/application-detail.component.tsx:75`, and 11 other sites (the first ones are listed below)
**Issue:** `docs/DESIGN.md` states "Iconos lucide `strokeWidth={1.5}`" as a general rule. The change sets it only on the icons in `request-status.tsx`, `tag-chip.tsx`, `form-field.tsx` and `offer-panel.tsx`. These icons still render at lucide's default of 2:
- `ArrowLeft` at `application-detail.component.tsx:75`
- `Pencil` at `application-detail.component.tsx:104`
- `ExternalLink` at `offer-data-section.tsx:59`
- `RotateCcw` at `detail-states.tsx:111`, `edit-states.tsx:107`, `empty-filtered-state.tsx:25`, `filter-panel.tsx:112` and `list-error.tsx:46`
- `SlidersHorizontal` at `filter-panel.tsx:70`
- `Plus` at `application-list.scene.tsx:51`
- the `ChevronDown` instances at `offer-text-section.tsx:40` and `offer-panel.tsx:180`
- `XIcon` in `ui/sheet.tsx:76`

Some of these sit on the same screen as the updated icons, so stroke weights are mixed. Repeating the prop at every call site also makes it easy to miss one, as happened here.
**Fix:** Set the default once instead of per site. Options: a small `Icon` wrapper in `common/` that defaults `strokeWidth` to 1.5, or a CSS rule such as `svg.lucide { stroke-width: 1.5; }` in `styles.css`. Then drop the per-site props. Alternatively, narrow the `DESIGN.md` rule to the AI and form surfaces if the partial scope is deliberate.

### IN-02: `idiomas` entries are fully trusted and can silently absorb a `stack` tag

**File:** `apps/api/src/offers/extract.service.ts:174-195`
**Issue:** Entries of `idiomas` skip `SPOKEN_LANGUAGE_WORDS` and are placed first. If the model puts a technology in `idiomas` (for example "Java" or "Go"), it becomes a `language` tag. Because languages win duplicates, the correct `stack` tag from `tags` is then discarded. Before this change the same mistake was caught by the guard (D-26). The model now has a required `idiomas` array to fill, so it may pad it. The trust is a deliberate design choice (documented in the comment and in `AI-EXTRACTION.md`), so this is a residual risk and not a defect.
**Fix:** Optional hardening. When an `idiomas` entry has the same key as a `tags` entry the model filed under `stack` or `nice_to_have`, and the entry does not pass `isSpokenLanguageLabel`, keep the `tags` group:
```ts
const modelKeys = new Map(modelTags.map((t) => [tagKey(t.label), t.group]));
// drop an idiomas entry whose key is already a non-language tag and fails isSpokenLanguageLabel
```
Otherwise accept the risk and note it in the decision log.

### IN-03: The model-facing schema still advertises the `idioma` tag group that the prompt no longer describes

**File:** `apps/api/src/offers/extract.service.ts:62` (`MODEL_TAG_GROUPS`) and `:33-37` (prompt)
**Issue:** The prompt no longer has an `idioma:` bullet under `tags` and says languages go in `idiomas`, "nunca en tags". `MODEL_TAG_GROUPS` still offers `"idioma"` as a legal group inside `tags`. The enum value is now an unexplained option, which invites the misfiling `idiomas` was meant to prevent. The `SPOKEN_LANGUAGE_WORDS` backstop covers it, but the model-facing contract is inconsistent with the instructions. `extract.pipeline.test.ts` pins the enum, so removing the value means changing that test as well.
**Fix:** Drop `"idioma"` from `MODEL_TAG_GROUPS` (`["stack", "nice_to_have"]`) and update the pipeline test. Keep `"idioma"` in `rawOfferExtractionSchema` so older answers still parse. If the enum is kept on purpose as a tolerance path, say so in the comment at line 64.

---

_Reviewed: 2026-11-01T20:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
