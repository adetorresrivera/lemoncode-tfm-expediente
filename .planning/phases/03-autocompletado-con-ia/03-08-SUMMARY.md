---
phase: 03-autocompletado-con-ia
plan: 08
subsystem: contracts-ui
tags: [offer-limits, abort-controller, react, vitest, a11y]
status: complete

requires:
  - phase: 03-autocompletado-con-ia
    provides: "03-01 extract route and offerExtractRequestSchema; 03-04 useOfferExtraction and OfferPanel; 03-07 stored offer text"
provides:
  - "OFFER_TEXT_MIN and OFFER_TEXT_MAX exported from @tfm/contracts and used by offerExtractRequestSchema"
  - "Offer panel length gate, es-ES counter, limit hints and the VALIDATION_ERROR length message"
  - "useOfferExtraction().cancel() and the cancelled status"
  - "Analysing state: read-only textarea, locked panel trigger, Cancelar análisis with one focus move"
affects: []

requirements-completed: [AI-01, AI-05]

actuals:
  tokens: 14000
  tasks: 2
  commits: 4
plan_head_before: 9d03029e44ab3143bd2c99cb0ffde08fe4c89f76
plan_head_after: e353cfd3f7fe34bb1ab6586b0dc832c39b6bc3b0

tech-stack:
  added: []
  patterns:
    - "Limits live once in contracts; the panel and hook import them and write no numeric literal"
    - "Counter measures draft.length (what maxLength caps); the gate measures draft.trim().length (what the API validates); both are UTF-16 code units"
    - "cancel() aborts and releases the controller ref so a new analysis can start at once; the existing aborted-signal checks make late answers no-ops"

key-files:
  created: []
  modified:
    - packages/contracts/src/offer-extraction.schema.ts
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/components/offer-panel.tsx
    - apps/web/src/pods/application-edit/application-edit.ai.test.tsx

key-decisions:
  - "No dependency added."
  - "OFFER_TEXT_MIN/OFFER_TEXT_MAX now live in contracts and drive both the API schema and the panel."
  - "Counting units: counter = draft length, gate = trimmed length, both UTF-16 code units (the unit of String.length and of Zod)."
  - "A disabled AI button uses aria-disabled (still focusable, click ignored) rather than the disabled attribute."

duration: 25 min
completed: 2026-11-01
---

# Phase 3 Plan 08: Offer limits and cancel Summary

**The «Pegar oferta» panel now takes its 50 / 20.000 character limits from one pair of constants in @tfm/contracts (shared with the API schema), shows a counter and hints, and lets the user cancel a running analysis while the rest of the form stays editable.**

## Accomplishments

- `OFFER_TEXT_MIN = 50` and `OFFER_TEXT_MAX = 20000` exported next to `offerExtractRequestSchema`, which now uses them. API and contracts tests pass unchanged.
- Panel: «0 / 20.000» counter (es-ES grouping forced with `useGrouping: "always"`, not a live region), «Pega al menos 50 caracteres» hint, «Has llegado al límite de 20.000 caracteres.» at the cap, `maxLength` from the constant, and `aria-disabled` AI button (focusable, described by the hint) gated on the trimmed length.
- A 400 `VALIDATION_ERROR` maps to the new `length` reason and shows «La oferta debe tener entre 50 y 20.000 caracteres.» (numbers formatted from the constants). The 03-01 flow test that expected the network message was updated.
- `analyze()` also returns early below the minimum, independent of the button.
- Cancel: `cancel()` aborts the controller, releases the ref and sets `cancelled`; the panel shows the neutral «Análisis cancelado.» and moves focus to «Autocompletar con IA». A late answer is a no-op; analysing again sends a fresh request that fills only still-empty fields.
- Analysing state: textarea `readOnly` with `bg-muted`, panel trigger disabled so the panel stays open, «Cancelar análisis» (outline) in the actions row; nothing outside the panel is disabled or aria-busy.

## Task Commits

1. Task 1 RED: `1edbb14` test(03-08): add failing tests for the offer limits, counter and length message
2. Task 1 GREEN: `c81d76c` feat(03-08): take the offer text limits from contracts in the panel
3. Task 2 RED: `1aaf789` test(03-08): add failing tests for cancelling a running analysis
4. Task 2 GREEN: `e353cfd` feat(03-08): cancel a running analysis while the form stays usable

## TDD Gate Compliance

- RED (Task 1): 8 tests failed on assertions for the planned behavior (missing counter, hint, aria-disabled, length message); the remaining 42 passed. Semantic assessment: the target tests ran and failed for the intended reason, not for import or syntax faults. The formal `check tdd-red-evidence` record was not produced (Vitest text reporter output only).
- RED (Task 2): 4 tests failed (locked state, cancel flow, fresh request after cancel, tab order with the cancel button); the others (double press, Enter, unmount abort, idle tab order, focus not moved) already held by the 03-04 behavior and act as regression locks.
- GREEN commits follow each RED commit. No REFACTOR commits.

## Deviations from Plan

None - plan executed exactly as written. Environment note: `npm ci` was run in the worktree to obtain `node_modules` (gitignored, no dependency changes).

## Known Stubs

None.

## Threat Flags

None. T-03-15 mitigations are in place: one request at a time, client-side length gate from the contracts constants, Cancel and unmount abort the request.

## Verification

- `npm run test -w @tfm/contracts` (55 passed), `npm run test -w @tfm/api -- src/offers` (53 passed), `npm run test -w @tfm/web -- src/pods/application-edit src/common` (196 passed).
- `npm run typecheck && npm run test && npm run lint` exit 0 (contracts 55, api 211, web 385 tests).
- Acceptance greps for both tasks pass (constants exported and used, no numeric literal or «20.000» in panel/hooks, no «¡», `cancelled` and `onCancel` present).

## Self-Check: PASSED

- Files modified exist; commits 1edbb14, c81d76c, 1aaf789, e353cfd are ancestors of HEAD.
