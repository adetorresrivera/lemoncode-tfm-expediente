# Phase 01 — UI Review

**Audited:** 2026-10-29
**Baseline:** `01-UI-SPEC.md` (design contract) + `docs/DESIGN.md` + `CLAUDE.md` UI rules
**Screenshots:** not captured (no dev server answered on localhost:3000, 5173 or 8080). Code-only audit. Visual pillars are scored from class and source inspection, not rendered output.
**Interaction captures:** off (`workflow.ui_interaction_capture` is false). Interaction findings are code-derived.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All shell and empty-state strings match the contract verbatim. |
| 2. Visuals | 3/4 | Sidebar wordmark is `text-2xl` instead of the contracted `text-base font-semibold` block, so the brand block is heavier than specified. |
| 3. Color | 2/4 | Disabled nav at `/60` (contract floor is `/70`). Nav links have no `focus-visible:ring-sidebar-ring`, so focus falls back to the base `outline-ring/50` the contract forbids inside the navy sidebar. `dark:` variants remain in shadcn primitives. |
| 4. Typography | 2/4 | Six sizes in use against a declared four (`text-3xl`, `text-xs`, `text-xl`, `text-2xl`, `text-[11px]`, `text-sm`/`text-base`). `font-medium` (500) appears in nav, header button and toggle/button primitives, outside the 400/600 rule. |
| 5. Spacing | 2/4 | Content offset `lg:pl-72` (288 px) does not match the 256 px sidebar (`w-64`), leaving a 32 px gap. `gap-3` and `px-3` are used in the nav, both outside the declared scale. No `max-w-5xl` wrapper. |
| 6. Experience Design | 3/4 | Empty state present, shell keyboard path works (UAT 2 and 4 passed). Disabled items are correctly non-focusable. Focus styling in the sidebar and Sheet does not meet the contract. |

**Overall: 16/24**

---

## Top 3 Priority Fixes

1. **Content is offset 32 px wider than the sidebar, and the page has no content column** — On desktop the main content starts 32 px further right than the sidebar edge and stretches across the full width, which breaks the layout the contract specifies. Fix: in `apps/web/src/layouts/app-layout.tsx`, change `<main className="p-6 lg:pl-72">` to `<main className="lg:pl-64">`, then wrap `<Outlet />` in `<div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">`.

2. **Keyboard focus is invisible or low-contrast inside the navy sidebar and Sheet** — The nav links and theme items have no explicit focus ring, so the only indicator is the base `outline-ring/50` (Oxford on navy, contrast too low). This is an AA failure for a keyboard-only requirement. Fix: add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring` to `NAV_ITEM_CLASS` in `app-layout.tsx` and to the `ToggleGroupItem` class in `theme-toggle.tsx`. Also add the same ring to the mobile menu button.

3. **Nav and toggle typography and spacing drift from the scale** — `NAV_ITEM_CLASS` uses `gap-3 px-3 py-2 font-medium` and no `h-11`, so touch targets are about 36 px instead of 44 px, and the 500 weight is outside the declared pair. The theme labels use `text-xs` (12 px), which is not in the scale. Fix: set nav items to `flex h-11 items-center gap-2 px-4 text-sm`, use `font-semibold` only on the active item and `font-normal` otherwise, change `ITEM_CLASS` in `theme-toggle.tsx` to `text-sm`, and set the scene h1 to `text-[28px]`. Then replace `font-medium` in `ui/button.tsx`, `ui/toggle.tsx` and `ui/toggle-group.tsx` with `font-semibold`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- Strings match the contract exactly: «Expediente», «Mis candidaturas», «Principal», «Mis candidaturas / Tablero / Documentos», «Próximamente», «Abrir menú», «Navegación principal», «Cerrar» (`ui/sheet.tsx:77`), «Tema», «Sistema / Claro / Oscuro», and the empty-state sentence in `components/empty-state.tsx`.
- Voice follows the DS: tuteo, no exclamation marks, no emojis.
- Minor: the empty-state card has no title or action. This is intentional per contract, so it is not a deduction.

### Pillar 2: Visuals (3/4)
- Focal point is correct: the scene h1 and the empty-state card, with no competing accent on the body.
- Icon-only menu button has `aria-label="Abrir menú"` and the icon is `aria-hidden`.
- Deviation: `app-layout.tsx` renders the sidebar wordmark as `<p className="font-serif text-2xl">`. The contract specifies `text-base font-semibold` in an `h-14 px-4` brand block. The brand block is missing entirely, so the sidebar top is not aligned with the mobile header height (`h-14`).
- Deviation: the mobile header wordmark is `text-xl`, and the Sheet title is `text-2xl font-normal`. Neither matches the contract's wordmark style.
- The `Sheet` close button, overlay (`bg-sidebar/70`) and `side="left"` match the contract.

### Pillar 3: Color (2/4)
- Token discipline is good. A grep for hex values and palette classes (`bg-blue-*`, `bg-black`, `text-white`) finds none in app code.
- Deviation: disabled nav items use `text-sidebar-foreground/60` (`app-layout.tsx`). The contract requires `/70` and says "No lower opacity". At `/60` the contrast falls below the AA target that the contract cites.
- Deviation: focus rings are missing inside the sidebar and Sheet (see Top Fix 2). The contract requires `ring-sidebar-ring` there.
- Deviation: the shadcn primitives keep `dark:` variants (`ui/button.tsx`, `ui/toggle.tsx`). The contract says components never use `dark:`. Visual impact is small because the tokens already switch, but the rule is broken.
- Accent usage: the active-item left marker `border-sidebar-primary` is not present in `NAV_ITEM_CLASS`. The active nav state relies on `data-[status=active]:bg-sidebar-accent` only, so the 2 px gold marker from the contract is missing. This is an accent reservation the contract explicitly lists.
- Theme toggle selected state has no `border border-sidebar-primary`. The contract lists this as the second reserved accent use.

### Pillar 4: Typography (2/4)
- Sizes in use across the shell and scene: `text-[11px]` (eyebrow, hint), `text-sm` (nav), `text-xs` (theme labels, `theme-toggle.tsx:8`), `text-base` (empty state), `text-xl` (mobile wordmark), `text-2xl` (sidebar wordmark, Sheet title), `text-3xl` (scene h1, `scenes/application-list.scene.tsx`). That is six sizes against a declared four. The contract's Display is 28 px (`text-[28px]`), and `text-3xl` renders 30 px.
- Weights in use: `font-medium` on nav (`NAV_ITEM_CLASS`) and in the shadcn primitives. The contract allows only 400 and 600. `font-normal` on the Sheet title and the hint is allowed but the Sheet title should match the wordmark (600).
- Serif usage is correct: wordmark, Sheet title and h1 only, plus the base-layer `h1, h2, h3` rule.

### Pillar 5: Spacing (2/4)
- Layout offset defect: `main` uses `lg:pl-72` (288 px). The sidebar is `lg:w-64` (256 px). The contract requires the offset to equal the sidebar width (`lg:pl-64`). The 32 px mismatch is visible at every desktop width.
- Missing content column: the contract requires `mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8`. The current `main` has `p-6` at all sizes and no max width, so long content will stretch across the full viewport.
- Nav spacing: `NAV_ITEM_CLASS` uses `gap-3` and `px-3`. Both are outside the declared scale (the contract states "No 12 px spacing (`gap-3`, `px-3`) anywhere in the shell"). Nav items also lack `h-11`, so the rows are about 36 px high instead of the 44 px touch target.
- Mobile gutter: `p-6` (24 px) is used where the contract specifies `px-4 py-6` (16 px horizontal).
- Header and sidebar padding (`px-4`, `p-4`, `gap-6`, `gap-2`, `h-14`) match the scale.

### Pillar 6: Experience Design (3/4)
- Verified by UAT (`01-UAT.md`, all 4 passed): 1024 px breakpoint switch, 1023 px Sheet with the menu button on the left, Oscuro persisting without a light flash, Sheet focus trap and Esc returning focus.
- Disabled nav items are `aria-disabled` spans and not focusable, which matches the contract's tab order.
- Theme toggle uses `ToggleGroup type="single"` with the guard against empty values, so clicking the active item keeps it selected.
- Deduction: keyboard focus indication inside the navy surfaces does not meet the contract (Top Fix 2), so the keyboard-only requirement in `CLAUDE.md` is only partly met.
- Deduction: the nav `Link` has no focus styling, and the disabled hint is not announced, so screen-reader users will not hear that the items are unavailable beyond `aria-disabled`. Low severity.
- Loading, error and destructive states are out of scope for Phase 1 per the contract, so they are not scored.

---

## Severity Summary

- **BLOCKER:** none. No pillar scored 1, and no defect breaks a user task.
- **WARNING:** pillars 2, 3, 4, 5 and 6 each have at least one specific finding above. Fix recommended before the Phase 1 demo. Fixes 1 and 2 are the most important.

## Files Audited

- `apps/web/src/layouts/app-layout.tsx`
- `apps/web/src/layouts/app-layout.test.tsx`
- `apps/web/src/scenes/application-list.scene.tsx`
- `apps/web/src/pods/application-list/application-list.component.tsx`
- `apps/web/src/pods/application-list/components/empty-state.tsx`
- `apps/web/src/common/components/theme-toggle.tsx`
- `apps/web/src/common/components/ui/button.tsx`
- `apps/web/src/common/components/ui/sheet.tsx`
- `apps/web/src/common/components/ui/toggle.tsx`
- `apps/web/src/common/components/ui/toggle-group.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/routes/__root.tsx`
- `docs/DESIGN.md`, `.planning/phases/01-fundaciones-y-walking-skeleton/01-UI-SPEC.md`, `01-UAT.md`
- Screenshots directory `.planning/ui-reviews/` created with a `.gitignore` covering captures and `interaction/`. No captures were taken.
