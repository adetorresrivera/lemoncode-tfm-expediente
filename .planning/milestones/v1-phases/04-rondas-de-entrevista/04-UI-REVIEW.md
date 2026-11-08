# Phase 04 — UI Review

**Audited:** 2026-11-03
**Branch:** `phase/04-rondas-entrevista` (code at HEAD `e7dafaf`, includes the code-review fixes 57aa1db and 501d46f, which touch no visual code)
**Baseline:** `04-UI-SPEC.md` (approved 2026-11-01) and `docs/DESIGN.md`
**Screenshots:** not captured. A dev server answered on `localhost:5173` (web). The standard probe picked `localhost:3000` first, which is the Hono API (answers `404 NOT_FOUND` JSON for `/`), so the probe would have audited the wrong target. Playwright 1.64.1 is installed but its Chromium build is missing (`~/.cache/ms-playwright` has no browser), so no capture ran. This is a code-only audit. Run `npx playwright install chromium` and point the capture at `http://localhost:5173` to close the gap.
**Interaction captures:** off (`workflow.ui_interaction_capture` is false)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every Spanish string in the Copywriting Contract ships verbatim; tuteo throughout; no emojis or exclamation marks |
| 2. Visuals | 3/4 | Section heading and round titles are identical in size and weight (16px, 600, serif), so hierarchy is flat; the locked status select has no visual state |
| 3. Color | 4/4 | Tokens only, no hex or palette classes; accent limited to the listed elements; outcome badge neutral; trash icon not destructive |
| 4. Typography | 4/4 | Only 16px and 14px added; weights 400 and 600 only; serif for titles, mono for the counter, as declared |
| 5. Spacing | 3/4 | Off-scale `mt-0.5` (2px) in the field error icon; the feedback slot relies on `empty:-mt-4`, a fragile negative-margin trick |
| 6. Experience Design | 3/4 | Busy guard, in-dialog errors, focus return and confirmations are implemented; the locked status select is not visibly disabled; the four human checks of the phase were never run |

**Overall: 21/24**

No pillar scored 1. No defect was found that breaks a task flow, so there are no BLOCKERs. All findings below are WARNINGs or INFO.

---

## Top 3 Priority Fixes

1. **The status select looks available while a round saves** — a user can open «Cambiar estado», pick a value, and nothing happens (the hook drops the change, and React restores the old value). No visual or textual cue explains it. Fix: add `aria-disabled:pointer-events-none aria-disabled:opacity-50` to the `NativeSelect` in `apps/web/src/pods/application-detail/components/status-change.tsx` (L40-44). UI-SPEC line 264 requires exactly these classes on the status selector.

2. **The phase's visual and keyboard pass has never been run** — the human checks of 04-01 (D6), 04-02 (D4), 04-03 (D5) and 04-04 (D4) remain open: keyboard-only flow, native `datetime-local` in Chrome, Firefox and Safari, the 360 px dialog with the soft keyboard, and dark theme. jsdom does not apply Tailwind, so none of the layout claims (`min-h-11` wrapping of «No superada», the internal scroll of the dialog, the 44 px icon buttons) is verified. Fix: install Chromium, capture the detail page at 360, 768 and 1440 px, and walk the checklist in `04-04-SUMMARY.md` before the demo.

3. **Fragile spacing around the feedback slot and an off-scale offset** — `apps/web/src/pods/application-detail/components/interviews-section.tsx` L73 uses `empty:-mt-4` to cancel the parent `gap-4` when the always-mounted live region is empty. It works today, but any whitespace or wrapper added inside the region breaks the rhythm silently. Fix: wrap the header and the live region in one `flex flex-col` container so the region carries no gap of its own, then keep `gap-4` only between that group and the list. Separately, `interview-dialog.tsx` L394 copies `mt-0.5` (2px, off the 4px scale) from `form-field.tsx`; use `mt-1` if the icon still aligns with the first line.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Every string declared in the contract is present in the code with the exact text:

- Section heading and empty state: `interviews-section.tsx` L55, L82.
- Add and edit titles and descriptions: `interviews-section.tsx` L108-117.
- Field labels, hints and placeholder: `interview-dialog.tsx` L144-305 («Elige un tipo», «Si lo vacías, se asigna la siguiente.», «Opcional. Hora en tu zona horaria.», «Preguntas, impresiones, próximos pasos…»).
- Primary and secondary buttons, «Guardando…»: `interview-dialog.tsx` L337-349.
- Outcome and mode labels: `common/lib/enum-labels.ts` L43-62, matching the contract table.
- Round title «Ronda N · Tipo» and «Sin fecha»: `application-detail.mapper.ts` plus `interview-item.tsx` L71.
- Feedback messages: `application-detail.hooks.ts` L259-260, L312, L334; «Ronda añadida. Estado cambiado a En entrevistas.» is built from `STATUS_LABELS`, so it cannot drift.
- Error messages: `application-detail.mapper.ts` L209-215 (the invalid-date message «Introduce una fecha y hora válidas.» is a discretionary addition, allowed by the contract's Claude's-discretion clause); `interview-dialog.tsx` L325; `interview-delete-dialog.tsx` L68.
- Delete confirmation title and description: `interview-delete-dialog.tsx` L57, L61 («Vas a eliminar la ronda N (Tipo). Esta acción no se puede deshacer.»).
- Tuteo is consistent («Introduce», «Revisa», «Inténtalo», «Anota», «Cambia»). No emojis, no exclamation marks in the new files (grep checked).
- Icon-only buttons carry Spanish `aria-label`s: «Editar ronda N», «Eliminar ronda N», «Cerrar» (`interview-item.tsx` L38, L52; `dialog.tsx` L54).

Not a deduction: the locked status select has no explanatory copy. That belongs to Experience Design.

### Pillar 2: Visuals (3/4)

- **Flat hierarchy inside the section.** The section `h2` «Rondas de entrevista» (`interviews-section.tsx` L51-54) and each round `h3` (`interview-item.tsx` L29) are both `font-serif text-base font-semibold leading-[1.2]`. The contract declares both as «Heading 16px 600». The result is that the section title and the round titles read at the same level, and each round title competes with the header. The sibling sections (Tags, Notes, Offer text, History) use the same `h2` treatment, so this is consistent with the page, but the nested list adds a level that carries no extra weight. Consider `text-sm` or `font-normal` for the round title only if the contract is reopened; do not change it silently.
- **Locked status select has no visual state.** See Priority Fix 1. `status-change.tsx` L40-44 sets `aria-disabled` but the `NativeSelect` only styles `disabled:` (`native-select.tsx` L18). The round buttons do get `aria-disabled:opacity-50` (`interview-item.tsx` L37, L51; `interviews-section.tsx` L61), so during a round save the status control looks active and the round controls look inactive.
- **Positive:** the focal point follows the contract. «Añadir ronda» is the one outline button in the header, the Guardar button is the only `default` button in the dialog, and the outcome badge is a neutral chip with icon and text (`interview-outcome-badge.tsx` L25-27).

### Pillar 3: Color (4/4)

- Tokens only. Grep over `pods/application-detail`, `ui/dialog.tsx`, `ui/button.tsx`, `ui/native-select.tsx` and `ui/toggle-group.tsx` found no hex values and no `bg-blue`, `text-white`, `text-gray`, `bg-red` or `bg-green` classes.
- Accent (`bg-primary`) is used only on: the dialog's «Guardar ronda» (`Button` default), and the selected items of the Modalidad and Resultado toggle groups (`interview-dialog.tsx` L44-45, TOGGLE_ITEM_CLASS). The toggle base class sets `data-[state=on]:bg-accent`, and `cn` (`twMerge`) resolves the override to `bg-primary` (verified in `toggle.tsx` L7 and `lib/utils.ts`).
- The outcome badge is `bg-muted text-foreground` for all three outcomes (`interview-outcome-badge.tsx` L25). No `status-*`, no `brand-gold`, no destructive for «No superada».
- The row Trash2 inherits `currentColor` (`interview-item.tsx` L59), as the contract requires.
- The Dialog overlay uses `bg-sidebar/70` and the surface `bg-popover`, both declared in the contract.
- Not verified in the browser: the hover state of unselected toggle items (`hover:bg-muted hover:text-muted-foreground`, from `toggle.tsx`) sets muted text on a muted background. The contract did not measure that pair. Check it with the dark-theme pass.
- The field error icon uses `text-destructive` (`interview-dialog.tsx` L394), the same as `RequestStatus`. It is decorative (`aria-hidden`) and always paired with text, so the 3:1 non-text rule does not apply to it.

### Pillar 4: Typography (4/4)

- Sizes used in the new files: `text-base` (16px) and `text-sm` (14px) only, plus the inherited `text-base` of the dialog title and description. No `text-xs`, `text-lg` or arbitrary `text-[…]`.
- Weights used: `font-semibold` (600) and the default 400 from `Input`, `Textarea` and `NativeSelect`. No `font-bold`, `font-medium` or `font-light`.
- Serif is used for the section `h2`, the round `h3` and the dialog title. Mono with `tabular` is used only on the notes counter (`interview-dialog.tsx` L313).
- Line heights: `leading-[1.2]` on headings, `leading-normal` on labels, `leading-tight` on toggle items for the two-line wrap, as declared.

### Pillar 5: Spacing (3/4)

- **Off-scale offset.** `interview-dialog.tsx` L394 uses `mt-0.5` (2px) on the field error icon, copied from `form-field.tsx`. The contract's scale is multiples of 4. Minor, but it is the only non-scale value in the new files.
- **Fragile empty-region compensation.** `interviews-section.tsx` L73 uses `className="empty:-mt-4"` on the always-mounted live region. The region must take zero height when empty (contract: «zero height when empty»). The negative margin achieves this, but it depends on the region having no child nodes at all, and on the parent `gap-4` being exactly 16px. A future whitespace text node or wrapper would add 16px silently. Priority Fix 3 describes the restructure.
- **Positive:** the rest follows the declared scale: `gap-1`, `gap-2`, `gap-4`, `gap-x-4 gap-y-2`, `p-4 lg:p-6`, `pt-2`, `pt-4`, `pr-10` on the dialog title (40px, so the title does not run under the 44px X), `size-11` (44px) on every icon button, `h-11` on every touch control.
- The Dialog `max-w-lg`, `w-[calc(100%-2rem)]` and `max-h-[calc(100dvh-2rem)]` arbitrary values (`ui/dialog.tsx` L43) are declared in the contract, not drift.

### Pillar 6: Experience Design (3/4)

**Implemented and matching the contract:**

- Save: «Guardando…» with `aria-disabled`, the form's submit guard (`interview-dialog.tsx` L135), the dialog cannot close while saving (L73, L346), typed values kept on failure, error in the always-mounted region (L321-328).
- Delete: `AlertDialog` with initial focus on «Conservar ronda», close ignored while deleting (`interview-delete-dialog.tsx` L41-43), error inside the dialog (L64-71), focus to «Añadir ronda» after a completed delete (`interviews-section.tsx` L151-158).
- Edit: focus returns to the row's Pencil button (`interviews-section.tsx` L129-133, opener stored on click).
- Empty state, zero/one/many rounds, notes folded behind a trigger that is only rendered when notes exist (`interview-item.tsx` L88).
- One mutation at a time: busy guard in the hook, shared with the add button and every row action, and the status select now locked (`component.tsx` L129).
- Outside pointer does not close the dialog (`interview-dialog.tsx` L79).

**Gaps:**

- **Locked status select (WARNING).** `status-change.tsx` L40-44. While a round is saving, the status select is `aria-disabled` but still opens and accepts a pick. The hook drops the change silently. Add `aria-disabled:pointer-events-none aria-disabled:opacity-50` to the `NativeSelect` (contract line 264). A short hint is optional.
- **Verification of the flow is missing (WARNING).** Four human-checks were listed in the plan summaries and none was run (see Priority Fix 2). The most at-risk items are the native `datetime-local` picker per browser, the 360 px dialog with the soft keyboard, and keyboard-only focus return after Escape from the nested delete dialog.
- **No visual state on the save and delete buttons (INFO).** `interview-dialog.tsx` L332-338 and `interview-delete-dialog.tsx` L73-84 use `aria-disabled` without an opacity change. The contract accepts the label change as the cue («Guardando…», «Eliminando…»), so this is compliant, but a pending button looks identical to an idle one apart from its text.
- **Notes limit feedback (INFO).** The counter `{n} / 5.000` is not a live region (per contract). Only an error on submit reports overflow, and the `maxLength` on the textarea makes that path reachable only by programmatic input. Compliant.

---

## Registry Safety

`components.json` exists (shadcn initialized). The contract lists no third-party registry (`04-UI-SPEC.md` line 377). Registry audit: 0 third-party blocks to check. No flags.

---

## Files Audited

- `apps/web/src/pods/application-detail/components/interviews-section.tsx`
- `apps/web/src/pods/application-detail/components/interview-item.tsx`
- `apps/web/src/pods/application-detail/components/interview-dialog.tsx`
- `apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx`
- `apps/web/src/pods/application-detail/components/interview-outcome-badge.tsx`
- `apps/web/src/pods/application-detail/components/status-change.tsx`
- `apps/web/src/pods/application-detail/application-detail.component.tsx` (section placement and `locked` wiring)
- `apps/web/src/pods/application-detail/application-detail.hooks.ts` (feedback copy, busy guard)
- `apps/web/src/pods/application-detail/application-detail.mapper.ts` (validation copy)
- `apps/web/src/common/components/ui/dialog.tsx`
- `apps/web/src/common/components/ui/alert-dialog.tsx` (class reference)
- `apps/web/src/common/components/ui/button.tsx`, `native-select.tsx`, `toggle-group.tsx`, `toggle.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`
- `apps/web/src/common/lib/enum-labels.ts`, `common/lib/format.ts`, `common/lib/utils.ts`
- `apps/web/src/pods/application-edit/components/form-field.tsx` (pattern reference)
- `apps/web/src/styles.css` (token names)
- `docs/DESIGN.md`, `.planning/phases/04-rondas-de-entrevista/04-UI-SPEC.md`
