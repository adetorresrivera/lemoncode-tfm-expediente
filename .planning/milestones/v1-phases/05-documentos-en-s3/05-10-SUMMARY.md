---
phase: 05-documentos-en-s3
plan: 10
subsystem: ui
tags: [tailwind, file-input, design-system, gap-closure, react]
gap_ids: [G-05-4]

requires:
  - phase: 05-documentos-en-s3
    provides: upload dialog (generic and picker modes, one component per D-22) and the shared Input
provides:
  - native file-selector button of the upload dialog styled as the DS outline/sm button
  - class assertions in the pod test pinning that look and the untouched text inputs
  - amended «Archivo» row in 05-UI-SPEC.md
affects: [05-UAT test 4 re-test, document-upload]

actuals:
  tokens: 2600
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Native file control restyled with file: / hover:file: utilities that mirror a DS Button variant, local to the call site (shared Input untouched)"

key-files:
  created: []
  modified:
    - apps/web/src/pods/document-upload/components/upload-dialog.tsx
    - apps/web/src/pods/document-upload/document-upload.test.tsx
    - .planning/phases/05-documentos-en-s3/05-UI-SPEC.md

key-decisions:
  - "File button mirrors Button variant=outline size=sm as file: utilities with DS tokens only; label in the Label role (text-sm font-semibold), file name keeps the Body role (text-base)"
  - "Fix is a className change local to upload-dialog.tsx; input.tsx and button.tsx are byte-identical to 2ff6f2a"
  - "No fallback step (F1-F3) applied; the human check is still pending"

patterns-established:
  - "44 px control arithmetic: 1 px border + py-1.25 (5 px) + file:h-8 (32 px) + 5 px + 1 px border"

requirements-completed: [DOC-01, DOC-03]

coverage:
  - id: D1
    description: "The file input carries the outline/sm button class list (border, fill, radius, shadow, hover, 14 px semibold label) and py-1.25 inside the 44 px control; the text inputs are untouched"
    requirement: "DOC-01"
    verification:
      - kind: unit
        ref: "apps/web/src/pods/document-upload/document-upload.test.tsx#styles the native file button as an outline button centred in the 44 px control"
        status: pass
    human_judgment: false
  - id: D2
    description: "The native button reads as a button and sits centred beside the file name at 360 px and 1280 px, in both dialog modes and both themes (G-05-4)"
    requirement: "DOC-03"
    verification: []
    human_judgment: true
    rationale: "Visual alignment and button look cannot be asserted in jsdom; the human check (05-UAT test 4 re-test) is the condition for closing G-05-4"

duration: 10min
completed: 2026-11-06
status: complete
plan_head_before: dc20344e400a0d6b78a50244dd8bec33ce6f4b39
plan_head_after: 0cea9473597cd9834240d51c5e7e8f24420a7323
commits: 1
---

# Phase 5 Plan 10: File input styled as the DS outline button Summary

**The upload dialog's native «Seleccionar archivo» control now carries the Button outline/sm look through `file:` utilities (32 px button, 5 px vertical padding inside the 44 px «Archivo» control), with no dependency added and the shared Input unchanged.**

`gap_ids: [G-05-4]`. No dependency added.

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 (Task 1 tracer, Task 2 full gate)
- **Files modified:** 3

## Accomplishments

- Final file input className (unchanged by any fallback; fallback step applied: **none**):
  `w-full min-w-0 py-1.25 file:mr-3 file:inline-flex file:h-8 file:cursor-pointer file:items-center file:rounded-md file:border file:border-border file:bg-background file:px-3 file:text-sm file:font-semibold file:text-foreground file:shadow-xs file:transition-colors hover:file:bg-accent hover:file:text-accent-foreground`
- The same list is recorded in the «Archivo» row of 05-UI-SPEC.md as a one-line diff (Typography section untouched; the Notes cell «Do not hide the native control behind a custom button» is kept).
- A new pod test pins every class, rejects the old `file:bg-transparent` / `file:border-0` look and proves «Nombre» keeps `h-11 text-base` without `py-1.25`.
- Gate: `npm run typecheck`, `npm run test` (615 web tests plus the other workspaces, exit 0) and `npm run lint` all pass.

## Task Commits

1. **Task 1: Tracer, native file button as DS outline/sm button** - `0cea947` (fix)
2. **Task 2: Full gate, human check pending** - no code change (gate run only; no fallback step needed)

## TDD Gate Compliance

RED and GREEN went into a single commit (`0cea947`) because the pre-commit hook runs the full suite, as in phases 2-4. RED was run first: the new test failed on the planned assertion, the missing `py-1.25` class on the file input (Received: the old `file:mr-4 file:border-0 file:bg-transparent ...` list); the other 51 tests passed. After the className change the pod suite passed 52/52. No separate `test(...)` commit exists for this reason; this is the documented, accepted deviation from commit-per-phase TDD.

## Acceptance criteria (Task 1)

All eight pass: single-occurrence grep of the eight tokens, the exact className string, the test greps, the one-line UI-SPEC diff with exactly one `G-05-4`, and the invariance checks (`button.tsx` and `input.tsx` identical to 2ff6f2a, `accept=".pdf,.docx"` and `type="file"` kept, `package.json` / `package-lock.json` identical to 2ff6f2a).

## Human check: PENDING (G-05-4 stays open)

`workflow.human_verify_mode` is `"end-of-phase"`, so the executor did not stop. G-05-4 closes only when the UAT re-test of test 4 in 05-UAT.md (`/gsd-verify-work 05`) records `result: pass`. The check, copied from the plan:

Start with `npm run dev`, open http://localhost:5173/documents and click «Subir documento». Check «Archivo» at 360 px and at 1280 px, in the «Claro» and the «Oscuro» themes, and in both dialog modes (/documents and «Subir nuevo» in the application form's CV picker).

- Button look: border, fill, rounded corners, inner padding, a smaller version of «Descartar subida» / «Subir nuevo»; hover turns the fill to the accent colour with a pointer cursor. The browser's own title tooltip is native and kept.
- Arithmetic (devtools): input 44 px high with 5 px padding top and bottom; `::file-selector-button` 32 px high with a 14 px semibold label.
- Alignment: «Ningún archivo seleccionado» (16 px) on one line beside the button, vertically centred, equal space above and below; the same after choosing a PDF.
- Layout and focus: no horizontal scroll at 360 px (a long name may end in the control's own ellipsis); Tab onto «Archivo» shows the project focus ring around the whole control.

If it fails, apply fallback F1 (`pt-1 pb-1.5`), F2 (`pt-1.5 pb-1`) or F3 (`file:h-7` plus `py-1.75`) from Task 2 of the plan, one at a time, to the className, the test and the UI-SPEC row together. If none passes the plan is blocked.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. Static class literals only; validation, `accept` list and the native control are unchanged (T-05-36 accepted, T-05-SC mitigated: no package changes).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for the UAT re-test of test 4. No other open items from this plan.

---
*Phase: 05-documentos-en-s3*
*Completed: 2026-11-06*
