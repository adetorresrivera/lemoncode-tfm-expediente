---
phase: 05-documentos-en-s3
plan: 11
subsystem: ui
tags: [tailwind, file-input, upload-dialog, gap-closure, vitest]
gap_ids: [G-05-4b]

requires:
  - phase: 05-documentos-en-s3
    provides: plan 05-10 outline-styled native file button (0cea947) in the upload dialog
provides:
  - boxless «Archivo» file input in the upload dialog (no border, no fill, no side padding, at least 44 px high)
  - native file-selector button at the size and look of «Descartar subida» (h-11, px-4, outline look)
  - invalid state shown on the button border (aria-invalid:file:border-destructive)
affects: [05-UAT test 4 re-test, /gsd-verify-work 05]

actuals:
  tokens: 2700
  tasks: 2
  commits: 1
plan_head_before: d6df5be84f4060fe418d5941da5cb9f9575fddb1
plan_head_after: 14bbb988f31a005b9390a5c24c7a9f47fc3a0396

tech-stack:
  added: []
  patterns:
    - "Boxless native file input: the shared Input base classes (h-11, border, bg-card, px-4) are merged away by tailwind-merge for this one control; the button look is built from file: and hover:file: utilities"

key-files:
  created: []
  modified:
    - apps/web/src/pods/document-upload/components/upload-dialog.tsx
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - .planning/phases/05-documentos-en-s3/05-UI-SPEC.md

key-decisions:
  - "Fix is local to the file input className in upload-dialog.tsx (one-line diff); shared Input and DS Button are byte-identical to 72cd86f"
  - "Fallback F1 (file:align-middle) was NOT applied: it is only applicable if the human check reports vertical misalignment"

requirements-completed: [DOC-01, DOC-03]

coverage:
  - id: D1
    description: "The «Archivo» file input renders without border, fill or side padding (h-auto min-h-11 border-0 bg-transparent px-0), so the native button sits on the dialog background"
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#renders the native file button as an h-11 outline button outside the input box"
        status: pass
    human_judgment: true
    rationale: "Whether the control visually reads as outside any box at 360 px and 1280 px, in both themes, is a visual judgment (G-05-4b is a design request); tests only pin class names"
  - id: D2
    description: "The native file-selector button has the size and look of «Descartar subida» (file:h-11 file:px-4, outline border, bg-background, shadow-xs, Label role, accent hover)"
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#renders the native file button as an h-11 outline button outside the input box"
        status: pass
    human_judgment: true
    rationale: "Pseudo-element rendering (::file-selector-button) is not observable in jsdom; the match with the other dialog buttons needs the human re-test of UAT test 4"
  - id: D3
    description: "Invalid state shows on the button border (aria-invalid:file:border-destructive); native control, accept list, client checks and the same component in both dialog modes are unchanged"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx (52 tests in the pod file, all passing)"
        status: pass
    human_judgment: true
    rationale: "The destructive colour on the pseudo-element and the focus ring around the control are visual; confirmed only by the end-of-phase human check"

duration: 12min
completed: 2026-11-06
status: complete
---

# Phase 5 Plan 11: Boxless file input with an h-11 outline file button Summary

**Upload dialog «Archivo» input loses its box (border-0 bg-transparent px-0, min 44 px) and its native «Seleccionar archivo» button is resized to the dialog's own outline buttons (file:h-11 file:px-4) with the error state moved onto the button border; G-05-4b remains pending the UAT re-test.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-11-06T08:46:00Z
- **Completed:** 2026-11-06T08:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- File input className rewritten (one line): the shared Input box (`border`, `bg-card`, `px-4`, `h-11`) is merged away; the native button is `h-11` / `px-4`, matching «Descartar subida», with `aria-invalid:file:border-destructive` for the invalid state. Both dialog modes (/documents and the form's «Subir nuevo») get it, since they are one component (D-22).
- Pod test «renders the native file button as an h-11 outline button outside the input box» replaces the 05-10 class test: positive class list, one `not.toHaveClass` per absent class, parity with «Descartar subida», and proof that «Nombre» keeps its box.
- 05-UI-SPEC.md «Archivo» row (one line) records the final class list with a G-05-4b note; the Notes cell «Do not hide the native control behind a custom button» is intact.

**Final class list of the file input (fallback F1 not applied):**
`h-auto min-h-11 w-full min-w-0 border-0 bg-transparent px-0 file:mr-3 file:inline-flex file:h-11 file:cursor-pointer file:items-center file:rounded-md file:border file:border-border file:bg-background file:px-4 file:text-sm file:font-semibold file:text-foreground file:shadow-xs file:transition-colors hover:file:bg-accent hover:file:text-accent-foreground aria-invalid:file:border-destructive`

No dependency added. `gap_ids: [G-05-4b]`.

## Task Commits

1. **Task 1: Tracer — boxless «Archivo» control with the native file button at outline-button size** - `14bbb98` (feat; RED and GREEN together)
2. **Task 2: Full gate, then the human re-test closes G-05-4b** - no code change; `npm run typecheck && npm run test && npm run lint` exit 0 (Vitest: 57, 407 and 615 tests passing across the three workspaces)

**Plan metadata:** committed separately as `docs(05-11): complete ... plan` (SUMMARY only; STATE.md and ROADMAP.md are left to the orchestrator in worktree mode).

## Files Created/Modified

- `apps/web/src/pods/document-upload/components/upload-dialog.tsx` - className of the file Input (1 line changed)
- `apps/web/src/pods/document-upload/document-upload.test.tsx` - class-assertion test rewritten in place
- `.planning/phases/05-documentos-en-s3/05-UI-SPEC.md` - «Archivo» row Control cell (1 line changed)

## TDD Gate Compliance

RED was run and observed failing before the implementation: `npm run test -w @tfm/web -- src/pods/document-upload` gave `1 failed | 51 passed (52)`, the failing test being the new «renders the native file button as an h-11 outline button outside the input box», failing on the `toHaveClass` assertion for the file input (planned assertion, not a syntax, import or zero-test fault; semantic assessment: target executed and failed for the intended reason). Per the plan, RED and GREEN were committed together in `14bbb98` because the pre-commit hook runs typecheck and lint-staged on the staged files, and a commit holding a failing test would be a broken intermediate; there is therefore no separate `test(05-11)` commit. This is the same arrangement as 05-10 and is a flagged departure from the strict test-then-feat commit sequence.

## Decisions Made

None beyond the plan: the fix stays local to the file input className; shared Input and Button untouched; focus ring left to the shared Input.

## Deviations from Plan

None - plan executed exactly as written. (Prettier ran through lint-staged on commit; the exact-className acceptance string still matches.)

## Issues Encountered

None. A fresh worktree had no `node_modules`; `npm install` was run at the worktree root and left `package.json` / `package-lock.json` untouched.

## Known Stubs

None.

## Threat Flags

None. Static class literals only; `type="file"`, `accept=".pdf,.docx"` and validation are unchanged (T-05-37 accepted, T-05-SC mitigated: no package diff).

## Human Check Pending (G-05-4b stays open)

`workflow.human_verify_mode` is `end-of-phase`, so no checkpoint was raised. G-05-4b is NOT closed by this SUMMARY: the plan closes only when the UAT re-test of test 4 in 05-UAT.md (`/gsd-verify-work 05`) records `result: pass`. Human check to run (copied from the plan):

Start with `npm run dev`, open http://localhost:5173/documents and click «Subir documento». Check «Archivo» at 360 px and at 1280 px, in the «Claro» and «Oscuro» themes.

- No box: no border and no filled square around «Archivo»; «Seleccionar archivo» sits directly on the dialog background, with «Ningún archivo seleccionado» (or the chosen name) as plain text to its right.
- Size and look: same height, padding, border, fill, radius and label as «Descartar subida». Input computes to 44 px high, 0 border, 0 padding; its `::file-selector-button` to 44 px high, 16 px left and right padding, 14 px semibold label. Hover turns the fill to the accent colour with a hand pointer.
- Alignment: the file name on one line beside the button, vertically centred against it; the same after choosing a PDF.
- Error: press «Subir documento» with no file. Focus moves to «Archivo», the button border turns destructive, message under the field.
- Keyboard and layout: Tab onto «Archivo» shows the project focus ring; Space opens the chooser; no horizontal scroll at 360 px; Esc or «Descartar subida» returns focus to «Subir documento».
- Second mode: in an application form, «Subir nuevo» in the CV picker shows the same control and returns focus to «Subir nuevo» on close.

Fallback F1 (only if the name is visibly higher or lower than the button label): append `file:align-middle` to the className, the test's positive class list and the UI-SPEC row together, re-run the gate and repeat the check. If F1 fails or a different look is requested, report as a blocker of 05-11.

## Next Phase Readiness

Code, tests and spec are in place and the full gate is green (typecheck, tests, lint). Ready for the UAT re-test of test 4 (`/gsd-verify-work 05`).

## Self-Check: PASSED

- FOUND: apps/web/src/pods/document-upload/components/upload-dialog.tsx, document-upload.test.tsx, 05-UI-SPEC.md (all modified in `14bbb98`)
- FOUND: commit `14bbb98` is an ancestor of HEAD
- All Task 1 acceptance criteria re-run and passing; `npm run typecheck && npm run test && npm run lint` exit 0 (pod file: 52 tests passing)

---
*Phase: 05-documentos-en-s3*
*Completed: 2026-11-06*
