---
phase: "03"
audited: 2026-11-01
baseline: 03-UI-SPEC.md (rev 1 + 2026-11-01 fold amendment), docs/DESIGN.md, CLAUDE.md
overall: 20/24
screenshots: none (Playwright browsers not installed; code-only audit)
---

# Phase 03 (Autocompletado con IA) — UI Review

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All UI-SPEC copy matches shipped strings exactly; no exclamations or emoji in web or API. |
| 2. Visuals | 3/4 | Structure and focal point match the spec; `Sparkles` on the AI button (and other phase icons) lack the required `strokeWidth={1.5}`. |
| 3. Color | 3/4 | Tokens only; accent confined to the reserved list. Light-theme gold missing-field border is 2.90:1 vs `bg-ai-missing-bg` (3.07:1 vs `bg-card`), below 3:1 non-text AA; UI-SPEC accepts it as mitigated. |
| 4. Typography | 3/4 | 400/600 plus the approved 700 on the «IA» badge. Tag chip is `text-sm` in code vs `text-[13px]` in DESIGN.md/UI-SPEC. |
| 5. Spacing | 4/4 | All spacing classes match the spec; no arbitrary values (code-level only). |
| 6. Experience Design | 3/4 | All states implemented with correct `aria-live`. Open: spoken-language guard demotes valid model output (WR-01); no automated check for the 60–90 s run. |

**Overall: 20/24** — no blockers.

## Top 3 Priority Fixes

1. **Icon stroke weight** — add `strokeWidth={1.5}` to `<Sparkles>` in `apps/web/src/pods/application-edit/components/offer-panel.tsx:229`, `Check`/`LoaderCircle`/`CircleAlert` in `apps/web/src/common/components/request-status.tsx` (22, 27, 29), `CircleAlert` in `apps/web/src/pods/application-edit/components/form-field.tsx:60`, `Check`/`X` in `apps/web/src/common/components/tag-chip.tsx` (42, 79).
2. **Spoken-language guard (WR-01, open)** — `apps/api/src/offers/extract.service.ts:71-129`: labels such as «Coreano B1» or «Hindi» fall into «Stack tecnológico». Widen `SPOKEN_LANGUAGE_WORDS` (coreano, hindi, turco, hebreo, griego, danés, noruego, finés, rumano, checo, ucraniano, húngaro, vasco, gallego, bilingüe, nativo + English forms) or invert to a programming-language deny list; record in `docs/AI-EXTRACTION.md` §Normalización.
3. **Missing-field border contrast (light theme)** — `field-props.ts` uses `border-brand-gold`. Either accept the exception in writing or switch to `border-brand-gold-ink` (already in `styles.css`) with a UI-SPEC amendment.

## Additional Findings

- **Chip typography drift (WARNING):** `tag-chip.tsx:5` uses `text-sm`, not `text-[13px]`. Pre-existing from phase 2 (1476e56). Fix the class or amend the spec.
- **Two `default` buttons in the form (INFO):** «Autocompletar con IA» and «Guardar candidatura»; accepted by UI-SPEC.
- **Hint row class (INFO):** `offer-panel.tsx` uses `flex-wrap` + `ml-auto` instead of the spec's `justify-between` + `shrink-0`; harmless.
- **Open review items (INFO):** IN-01, IN-02, IN-03 from 03-REVIEW.md; not user-visible.
- **Not verified visually (INFO):** fold animation, trigger focus ring after fold, dark-mode gold border — covered by the passing manual UAT.

## Registry Safety

No third-party registries declared in UI-SPEC; no flags.

## Files Audited

UI-SPEC, CONTEXT, UAT, REVIEW, REVIEW-DISPOSITION, 12 SUMMARYs; `docs/DESIGN.md`, `CLAUDE.md`; `offer-panel.tsx`, `form-field.tsx`, `field-props.ts`, `job-section.tsx`, `conditions-section.tsx`, `application-edit.component.tsx`, `ai-mark.tsx`, `tag-chip.tsx`, `request-status.tsx`, `ui/{textarea,button,input,label}.tsx`, `styles.css`; repo-wide greps for palette/hex classes, weights, sizes, arbitrary values, strokeWidth, exclamations and emoji.
