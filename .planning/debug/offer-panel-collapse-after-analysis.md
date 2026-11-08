---
status: diagnosed
trigger: "offer-panel-collapse-after-analysis — After a successful analysis the «Pegar oferta» panel collapses on its own so the filled form is in view (new behaviour requested at UAT 2026-11-01; UI-SPEC to be amended)"
created: 2026-11-01T14:00:00Z
updated: 2026-11-01T14:20:00Z
goal: find_root_cause_only
audit_acknowledged:
  milestone: v1
  at: 2026-11-08
  status: diagnosed
---

## Current Focus

bug_class: Bohrbug (deterministic; in fact a spec gap, not a defect)
hypothesis: CONFIRMED. The panel is an uncontrolled Radix Collapsible (`defaultOpen`), nothing in the success path can close it, and the spec (D-12, UI-SPEC line 217) orders it to stay open. This is behaviour that was never specified, not a bug.
test: DONE. Scratch experiment confirmed that focus falls to <body> when the panel closes with the AI button focused, and that focusing the trigger after the close works.
expecting: n/a
next_action: Return ROOT CAUSE FOUND to the orchestrator. The planner amends D-12 and the UI-SPEC, then a gap plan implements the controlled collapse, trigger focus and tests.

reasoning_checkpoint:
  hypothesis: "The panel does not fold after a successful analysis because OfferPanel renders <Collapsible defaultOpen={defaultOpen}> (uncontrolled), the open state is private to Radix, and useOfferExtraction's success branch only writes form values, marks and status. Nothing can close it, and D-12 and UI-SPEC line 217 say it must stay open."
  confirming_evidence:
    - "offer-panel.tsx:140-143 passes only defaultOpen. There is no open/onOpenChange prop, and OfferPanelModel (vm.ts:141-148) has no open-state field"
    - "application-edit.hooks.ts:345-376: the success branch calls setFieldValue, onMerged and setStatus({kind:'success'}). It has no open-state or focus side effect"
    - "03-CONTEXT.md:34 (D-12): 'After a successful analysis the panel stays open ... focus does not move'. 03-UI-SPEC.md:217 and :256 say the same"
    - "application-edit.ai.test.tsx:143-144 asserts analyze toHaveFocus() and trigger aria-expanded=true after success, and the baseline run passes 181/181"
  falsification_test: "If any code path set the Collapsible open state on success (a controlled open prop, a key change remounting Collapsible, or a programmatic trigger click), the test at :144 would fail. It passes, so no such path exists."
  fix_rationale: "N/A (diagnose only). The fix is a spec change plus new behaviour: make the panel controlled, close it on success, and move focus to the trigger."
  blind_spots: "Not reproduced in the docker image or a real browser. The code reading and a passing test are enough because the code has no collapse path at all. Screen-reader timing between moving focus and the polite live region has not been checked with a real AT."
  candidate_causes:
    - "spec/requirements: D-12 explicitly specifies stays open (CONFIRMED, primary)"
    - "code: uncontrolled defaultOpen Collapsible with no close path (CONFIRMED, follows from the spec)"
    - "environment: production build or mock provider behaving differently (ELIMINATED, the mock fill worked per UAT and the success path is the same for every provider)"
  and_gate: "no. A single cause: the behaviour was never specified, so it was never built. The code just follows the spec."

## Symptoms

expected: On the create screen (/applications/new), once «Autocompletar con IA» succeeds and the form is filled, the «Pegar oferta» panel folds automatically so the filled form is in view.
actual: User reported: "Auto completing works but the AI part does not collapse automatically". Observed with LLM_PROVIDER=mock in the docker compose production image.
errors: None reported
reproduction: Test 3 in UAT (.planning/phases/03-autocompletado-con-ia/03-UAT.md)
started: Discovered during UAT 2026-11-01; the current UI-SPEC only says open on create, collapsed on edit

## Eliminated

- hypothesis: The collapse is implemented but broken in the production docker image or with LLM_PROVIDER=mock (an environment-specific failure)
  evidence: There is no collapse code anywhere. Collapsible is uncontrolled, and OfferPanelModel has no open prop or setter. The success path is provider-agnostic, and the test at application-edit.ai.test.tsx:144 asserts aria-expanded="true" after success and passes.
  timestamp: 2026-11-01T14:10:00Z

- hypothesis: A regression, i.e. a previous commit collapsed the panel and a later one broke it
  evidence: D-12 (03-CONTEXT.md:34) and the discussion log (03-DISCUSSION-LOG.md:19, "Se queda abierto" chosen over "Se pliega") specify stays open from the start, and 03-01-PLAN.md:41 put it in as a must-have truth.
  timestamp: 2026-11-01T14:17:00Z

## Evidence

- timestamp: 2026-11-01T14:02:00Z
  checked: Knowledge base (.planning/debug/knowledge-base.md); MemPalace
  found: There is no knowledge base file (.planning/debug/ did not exist before this session), and no MemPalace query tool is available in this agent.
  implication: There is no known-pattern candidate, so the investigation starts open.

- timestamp: 2026-11-01T14:04:00Z
  checked: apps/web/src/pods/application-edit/components/offer-panel.tsx (full)
  found: Lines 140-143 render `<Collapsible defaultOpen={defaultOpen} ...>`, so Radix keeps the open state itself (uncontrolled). There is no `open` or `onOpenChange` prop. The trigger has `disabled={analysing}` (line 149). The status region `<div role="status" aria-live="polite">` is at lines 221-223, a sibling after `</Collapsible>`, so it stays mounted after a collapse. The only programmatic focus move is Cancel to analyzeRef (line 212).
  implication: The panel can only change state through a user click on the trigger. No prop can close it.

- timestamp: 2026-11-01T14:05:00Z
  checked: apps/web/src/common/components/ui/collapsible.tsx
  found: This is a thin Radix wrapper (radix-ui 1.8.1). A comment at line 19 says "Radix unmounts the content while the collapsible is closed (no forceMount)".
  implication: Any collapse unmounts the textarea, the AI button and the Cancel button. If focus is on the AI button when the panel closes, the focused node is removed.

- timestamp: 2026-11-01T14:06:00Z
  checked: application-edit.container.tsx and application-edit.vm.ts:141-148
  found: ApplicationCreate passes `defaultOpen: true` (line 65) and ApplicationEditForm passes `defaultOpen: false` (line 123). The OfferPanelModel has `defaultOpen`, draft, status and the three handlers, but no open state. The component spreads `offerPanel` straight into `<OfferPanel>` (component.tsx:50).
  implication: The container cannot control open/closed today. It only seeds the first value.

- timestamp: 2026-11-01T14:07:00Z
  checked: application-edit.hooks.ts useOfferExtraction success branch (lines 345-376)
  found: On a resolved, non-aborted extraction it merges, writes fields with dontRunListeners, writes offerText and tags, calls onMerged, then calls setStatus({kind:'success', filled, tagsAdded, missing}). It has no open-state or focus side effect. Errors set {kind:'error'}, cancel sets {kind:'cancelled'}.
  implication: The success path never closes the panel. The status `kind` change to 'success' is the natural signal a controlled panel could react to.

- timestamp: 2026-11-01T14:08:00Z
  checked: .planning/phases/03-autocompletado-con-ia/03-CONTEXT.md:34 (D-12); 03-UI-SPEC.md:181, :185, :202, :217, :222, :244, :256, :288
  found: D-12 reads "After a successful analysis the panel **stays open** ... focus does not move." UI-SPEC:217 (Success row) says "panel stays open; **focus does not move** (D-12)". UI-SPEC:256 says "Programmatic focus moves in this phase: exactly one (after Cancel, to the AI button). Success and error never move focus." UI-SPEC:244 says that because focus does not move, missing fields are named in the status sentence. UI-SPEC:202 says the status region stays outside the content so announcements survive a collapse. UI-SPEC:185 says the container passes `defaultOpen = (mode === "create")`.
  implication: The current behaviour is exactly what the approved spec asks for. The UAT request reverses D-12, so this is a requirements change and not an implementation bug.

- timestamp: 2026-11-01T14:10:00Z
  checked: Baseline run of `vitest run src/pods/application-edit` in the worktree
  found: 4 files and 181 tests pass. application-edit.ai.test.tsx:143-144 explicitly asserts `analyze` toHaveFocus() and the trigger aria-expanded="true" after success. The test "does not move focus when the analysis succeeds or fails" (:1577) also locks D-12 in place.
  implication: The tests pin the stays-open behaviour. A change must update them deliberately and is not fixing a regression.

- timestamp: 2026-11-01T14:12:00Z
  checked: Scan of application-edit.ai.test.tsx for tests that use panel controls after a successful analysis on the create screen (script in the scratchpad)
  found: About 10 create-screen tests run a second analysis after a success: :239, :402, :607, :639, :658, :696, :736, :943, :1036, :1080. :1223 types into the textarea after a success. :424 clicks the trigger to collapse after success, which would then *re-open* it. :104/:144 and :1577 assert the stays-open behaviour and the focus.
  implication: Auto-collapse will break these unless they re-open the panel first (for example a `reopenPanel()` helper that clicks «Pegar oferta»). :424 must change so it asserts that the status survives the *automatic* collapse.

- timestamp: 2026-11-01T14:15:00Z
  checked: Scratch experiment apps/web/src/__scratch__/collapse-focus.test.tsx (since deleted, never committed). A controlled Radix Collapsible with a button inside CollapsibleContent and a status div outside. Focus the button, then rerender with open=false.
  found: Both tests passed. (1) With no focus handling the button unmounts and document.activeElement === document.body, while the status region outside still holds its text. (2) Calling triggerRef.focus() in an effect after the close leaves the trigger focused with aria-expanded="false".
  implication: An auto-collapse on its own would drop keyboard and screen-reader focus to <body> (WCAG 2.4.3 Focus Order and 2.4.7 risk) whenever the user started the analysis from the AI button, which is the normal path. The fix MUST move focus programmatically. The trigger is a working target. The status region already survives a collapse as built.

- timestamp: 2026-11-01T14:17:00Z
  checked: Repo-wide grep of docs and planning for the stays-open rule
  found: 03-DISCUSSION-LOG.md:19 has the row "Panel tras éxito | Se queda abierto / Se pliega | Se queda abierto", so the user explicitly chose stays open at discuss time. The same rule is restated in 03-RESEARCH.md:30, 03-01-PLAN.md:41 and UI-SPEC:217/:244/:256. docs/DESIGN.md:43 says "abierto en alta, plegado en edición" and is silent on what happens after success. 03-08-PLAN/SUMMARY say the trigger is disabled while analysing "so the panel stays open", which still holds.
  implication: This confirms a deliberate requirements reversal (D-12 amended by UAT G-03-3). It is not an implementation miss. The spec amendment must touch CONTEXT D-12 and UI-SPEC. DESIGN.md:43 can optionally gain "se pliega tras analizar".

## Resolution

root_cause: "Missing behaviour, not a bug. The «Pegar oferta» panel is an uncontrolled Radix Collapsible (offer-panel.tsx:140-143, `defaultOpen` only; OfferPanelModel in vm.ts:141-148 has no open state), and the success branch of useOfferExtraction (hooks.ts:345-376) only writes form values, marks and status. The code does exactly what the approved spec asks: D-12 (03-CONTEXT.md:34, chosen in 03-DISCUSSION-LOG.md:19) and UI-SPEC:217/:256 say the panel stays open and focus does not move after success, and tests ai.test.tsx:143-144 and :1577 pin that in place. The UAT request (G-03-3) reverses D-12."
fix: "(diagnose only, not applied) Make the panel controlled: replace `defaultOpen` with `open` + `onOpenChange` in OfferPanelModel, owned by the hook (initial = mode === 'create'). Set open=false in the success branch together with setStatus. In OfferPanel, after a close caused by success, focus the trigger only when focus was lost (activeElement is body or null) or was inside the content. Keep open on error and cancel. Amend D-12 and the UI-SPEC lines listed in the handback."
verification: "Diagnosis verified by code reading, a passing baseline (181/181 in src/pods/application-edit) that asserts stays-open, and a scratch Radix experiment showing that focus falls to <body> on collapse unless it is moved."
files_changed: []
