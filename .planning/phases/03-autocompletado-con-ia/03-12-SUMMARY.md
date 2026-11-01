---
phase: 03-autocompletado-con-ia
plan: 12
subsystem: ui
tags: [react, radix-collapsible, focus-management, tanstack-form, a11y]
gap_closure: true
gap_ids: [G-03-3]

requires:
  - phase: 03-autocompletado-con-ia
    provides: OfferPanel, useOfferExtraction, status region outside the collapsible (plans 03-06..03-11)
provides:
  - controlled «Pegar oferta» panel (open state owned by useOfferExtraction)
  - automatic fold after a successful analysis that filled at least one field or tag
  - focus rule at the fold (trigger only when focus was lost or inside the panel content)
  - specs, D-12 and AI-05 text describing the fold
affects: [phase-03 UAT re-verification, 03-UI-SPEC, 03-CONTEXT D-12]

actuals:
  tokens: 11100
  tasks: 3
  commits: 3

plan_head_before: 3b05f060905de5153604c51c7b382ed398225429
plan_head_after: 73839d15b7c33e5ce2233ec5300229d2780e8caf

tech-stack:
  added: []
  patterns:
    - "Controlled Radix Collapsible: the hook owns open/setOpen, the panel renders open + onOpenChange"
    - "Fold focus effect keyed on open true->false, guarded by document.activeElement"

key-files:
  created: []
  modified:
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/components/offer-panel.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx
    - .planning/phases/03-autocompletado-con-ia/03-UI-SPEC.md
    - .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md
    - .planning/phases/03-autocompletado-con-ia/03-RESEARCH.md
    - docs/DESIGN.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Fold condition: merge.aiFields.length > 0 || merge.aiTags.length > 0 (same condition under which the summary is not the nothing-new sentence)"
  - "Focus rule: after open goes true->false, focus moves to the trigger only if document.activeElement is null, body, disconnected or inside the panel content; a field the user is typing in keeps focus (D-20)"
  - "Status region stays outside CollapsibleContent and the content is not force-mounted; the draft stays in the hook so reopening keeps it"

patterns-established:
  - "Programmatic focus moves in the panel are two: after Cancel (AI button) and after the fold (trigger)"

requirements-completed: [AI-05, AI-06, AI-08]

duration: ~25min
completed: 2026-11-01
status: complete
---

# Phase 3 Plan 12: Fold the «Pegar oferta» panel after analysis (G-03-3) Summary

**Controlled Collapsible owned by `useOfferExtraction`: a successful analysis that filled a field or tag folds the panel on create and edit, with focus moved to «Pegar oferta» only when it was lost or inside the panel, and the specs (D-12 amended) updated to match.**

## Accomplishments

- `OfferPanelModel` now carries `open` and `onOpenChange` (the uncontrolled `defaultOpen` is gone). `useOfferExtraction` takes `initialOpen` (true on create, false on edit), returns `open`/`setOpen` and calls `setOpen(false)` in the success branch when the merge filled at least one field or tag. Errors, cancels, aborted results and the nothing-new success never touch `open`.
- `OfferPanel` renders `<Collapsible open onOpenChange>` and a `useEffect` on `[open]` with `triggerRef`, `contentRef`, `wasOpenRef`: on true to false it focuses the trigger when `document.activeElement` is null, `body`, disconnected or inside the content. A user typing in a form field keeps focus (D-20). The status region stays outside the collapsible, so «Hemos rellenado…» and «Te falta completar: …» remain announced after the fold.
- `03-UI-SPEC.md` (amendment line, focal point, placement, status region, draft, edit mode, Success row, Cancel, missing-fields reason, keyboard and focus, new UI Considerations row), `03-CONTEXT.md` D-12, `03-RESEARCH.md` pointer, `docs/DESIGN.md` («se pliega tras analizar») and the AI-05 text in `REQUIREMENTS.md` describe the fold. The AI-05 checkbox and its traceability row (`| AI-05 | Phase 3 | Pending |`) were left untouched.
- No dependency added (apps/web/package.json and the lockfile unchanged).

## Tests

Updated (kept every assertion, only the panel is reopened first with the new `openOfferPanel(user)` helper):
- first create test (now asserts fold, no textarea, trigger focused, summary shown), «keeps the status region outside the collapsible content…» (checks the status after the automatic fold, without clicking the trigger), «does not move focus when the analysis succeeds or fails» (now error half only: panel open, focus on the AI button), D-20 test (folds, «Empresa *» keeps focus), nothing-new, error `it.each`, connection error and cancel (all assert `aria-expanded="true"`).
- Second analysis after a success now calls `openOfferPanel(user)` first: «drops the missing sentence…», «marks the fields a second analysis fills again…», «brings «Complétalo tú» back…», «replaces the fields still marked «IA»…», «replaces the AI salary range and currency…», «keeps a field the user edits while a second analysis runs (D-20)», «reads the tags-only sentences…», «replaces the AI chips on a second analysis…», «replaces the AI chips still present…»; «keeps the analyzed text when the textarea changes afterwards…» reopens before typing in the textarea.

Added: focus lost goes to the trigger; missing fields named in the status line after the fold with «Complétalo tú» kept; reopen shows the same draft and a second analysis posts the same body and folds again; the edit screen starts collapsed, folds after a successful analysis with the trigger focused and reopens with the analysed text.

## TDD Gate Compliance

The pre-commit hook runs the full typecheck and test suite, so RED and GREEN could not be committed separately; they are committed together in `6b1c2a1` (task 1) and `c9a2e95` (task 2), as the plan allows. Honest note: for task 1 the implementation was written before the first test run, so there is no separate RED run for the first test; the first run after the code change failed 11 of the existing tests that still used the textarea or AI button after a success (the expected consequence of the fold), which were then updated. Task 2 tests passed on first run except one expectation of mine on the edit-screen summary text (missing-fields sentence), fixed in the test.

## Deviations from Plan

None to the rules. One test-only adjustment: the edit-screen fold test matches the summary with a regex because the stored application has no Modalidad or Seniority, so the sentence also carries «Te falta completar…».

## Known Stubs

None.

## Threat Flags

None. T-03-22 mitigated (badges, chip marks and «Complétalo tú» stay on the form; the status region outside the collapsible announces the summary; covered by the missing-fields-after-fold test). T-03-23 accepted (draft stays in memory only). T-03-SC: no package installed.

## Human check pending

Run `LLM_PROVIDER=mock npm run dev`, open `/applications/new`, paste 50 or more characters and press «Autocompletar con IA» with the keyboard; repeat on an existing application via «Editar». Expected: the panel folds after about 300 ms on both screens, the focus ring is on «Pegar oferta», the summary shows under the trigger, filled fields show «IA», and reopening shows the pasted text. Also the 60 to 90 s CPU backstop (panel open with the trigger disabled until the answer, then fold). Real focus ring, scroll position and screen-reader announcement cannot be checked in jsdom.

## Verification

`npm run typecheck && npm run test && npm run lint` exit 0 (contracts 55, api 260, web 407 tests).

## Self-Check: PASSED

- Commits 6b1c2a1, c9a2e95, 73839d1 are ancestors of HEAD.
- All modified files exist; acceptance greps (no `defaultOpen`, `initialOpen` twice in the container, `setOpen(false)`, `triggerRef`, no `forceMount`, `openOfferPanel`, `activeElement`, spec/doc amendments) pass.
