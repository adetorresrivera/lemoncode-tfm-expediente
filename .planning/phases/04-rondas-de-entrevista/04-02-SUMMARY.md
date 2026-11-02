---
phase: 04-rondas-de-entrevista
plan: 02
subsystem: detail-ui
tags: [react, tanstack-form, radix-toggle-group, radix-collapsible, intl, datetime-local]

requires:
  - phase: 04-rondas-de-entrevista
    provides: "04-01 add dialog (Tipo, Ronda), InterviewVm/InterviewFormValues, mappers, useInterviewForm, POST /interviews"
provides:
  - "formatDateTime, localInputToIso, isoToLocalInput in common/lib/format.ts"
  - "InterviewDialog in components/interview-dialog.tsx with Fecha y hora, Modalidad, Resultado and Notas"
  - "InterviewItem and InterviewOutcomeBadge; the list sorted by round, instant (null last) and id"
  - "application-detail.interviews.test.tsx, the rounds test file for 04-03 and 04-04"
affects: [04-03, 04-04]

plan_head_before: 21fc4dab8ede7e420ee6315bd0ca6bc035c7d583
plan_head_after: f662d1e94d73e6cf6ba7b7fd960abec42013956d

actuals:
  tokens: 16000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Local-time datetime-local value converted with new Date(value) at the mapper boundary; invalid value passed on so the schema reports it"
    - "Sorting once in the mapper on a copy, comparing dates as instants with null last"
    - "Toggle groups named by a visible label via aria-labelledby; onValueChange writes only values the enum schema accepts"
    - "Accessible-name suffix for repeated controls: label text, a real space, then an sr-only span"

key-files:
  created:
    - apps/web/src/pods/application-detail/components/interview-dialog.tsx
    - apps/web/src/pods/application-detail/components/interview-item.tsx
    - apps/web/src/pods/application-detail/components/interview-outcome-badge.tsx
    - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
  modified:
    - apps/web/src/common/lib/format.ts
    - apps/web/src/common/lib/format.test.ts
    - apps/web/src/pods/application-detail/application-detail.vm.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.ts
    - apps/web/src/pods/application-detail/components/interviews-section.tsx

key-decisions:
  - "Conversion helpers live in common/lib/format.ts: pure, tested under a fixed zone, and reused by the edit mode of 04-03 (isoToLocalInput)"
  - "An unparsable date is an error, never a silent null: the mapper passes the raw value on and the field shows «Introduce una fecha y hora válidas.»"
  - "Notes error copy «Las notas admiten hasta 5.000 caracteres.» is attached to the notes field (the only issue that field can raise is too_big)"
  - "Unparsable stored dates count as «no date» when sorting (NaN guard in instantOf) so the comparator stays consistent"
  - "Notes trigger renders label, a literal space and then the sr-only «de la ronda N» span: the accessible-name algorithm trims the leading space of an inline sr-only span, giving «Ver notasde la ronda 1»"

patterns-established:
  - "Tests that depend on the zone stub TZ with vi.stubEnv and call vi.unstubAllEnvs in afterEach"
  - "InterviewItem renders the whole li; 04-03 adds the edit and delete actions to its header div"

requirements-completed: [INT-01, INT-05]

coverage:
  - id: D1
    description: "The add dialog records Tipo, Ronda, Fecha y hora, Modalidad, Resultado and Notas in that order with the specified defaults on every opening"
    requirement: INT-01
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#round dialog fields"
        status: pass
    human_judgment: false
  - id: D2
    description: "Local datetime is sent as ISO 8601 UTC; empty is null; past dates accepted; DST gap and overlap resolved; invalid and oversized values explained under the field"
    requirement: INT-01
    verification:
      - kind: unit
        ref: "apps/web/src/common/lib/format.test.ts#localInputToIso and isoToLocalInput"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#rounds form mapper"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rounds are listed by round, instant (null last) and id, each with date in the browser zone or «Sin fecha», mode, neutral outcome badge and folded notes"
    requirement: INT-05
    verification:
      - kind: unit
        ref: "apps/web/src/common/lib/format.test.ts#formatDateTime"
        status: pass
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#rounds view model"
        status: pass
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#rounds list"
        status: pass
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.interviews.test.tsx#outcome badge"
        status: pass
    human_judgment: false
  - id: D4
    description: "The native datetime-local picker works in Chrome, Firefox and Safari and the list shows the same local date and time that was picked; 360 px layout with «No superada» wrapping and no sideways scroll"
    verification: []
    human_judgment: true
    rationale: "Native pickers and Tailwind layout are not exercised by jsdom (css: false); Task 2 carries a human-check that was not run in this session"

duration: 70min
completed: 2026-11-02
status: complete
---

# Phase 4 Plan 02: Complete the round and read it back Summary

**The add dialog now records date and time (local to ISO UTC via `new Date`), mode, outcome and notes, and each round is listed by round number then instant with a neutral outcome badge, `Sin fecha` fallback and notes folded behind a collapsible as plain text; no dependency added.**

## Performance

- **Duration:** about 70 min
- **Tasks:** 2
- **Files modified:** 9 (4 created, 5 modified)
- **Commits:** 2 task commits (`98cc052`, `f662d1e`)

## Accomplishments

- `common/lib/format.ts` gained `formatDateTime` (es-ES, abbreviated month with period, `hour: "2-digit"` + `hourCycle: "h23"`), `localInputToIso` and `isoToLocalInput`. Fixed-zone tests under Europe/Madrid and America/New_York verify the round trip, seconds and milliseconds dropped on the way back, the Madrid spring-forward gap (`2026-03-29T02:30` becomes `01:30Z` and reads back as `03:30`) and the fall-back overlap (`2026-10-25T02:30` becomes `00:30Z`, its first occurrence), and `null` for `""` and `"nope"`.
- `InterviewDialog` moved to `components/interview-dialog.tsx` (04-03 adds the edit mode there) with Fecha y hora (`datetime-local`, hint, no past-date rule), Modalidad and Resultado (single-choice toggle groups labelled via `aria-labelledby`, the empty re-click value ignored, selected item on `bg-primary`), and Notas (`maxLength={5000}`, `placeholder`, `{n} / 5.000` counter linked by `aria-describedby`, not a live region).
- The mapper converts the local value with `localInputToIso` and, if it does not parse, passes the raw value on so the schema reports it. Error copy chosen for an invalid date: «Introduce una fecha y hora válidas.»; for notes: «Las notas admiten hasta 5.000 caracteres.».
- `mapApplicationFromApiToDetailVm` maps a sorted copy (round, then `Date.parse` instant with no date last, then id); `InterviewVm` gained `dateLabel`, `modeLabel`, `outcomeLabel`.
- `InterviewItem` and `InterviewOutcomeBadge` render the row. The three outcomes share one `bg-muted text-foreground` chip with Clock, Check or X; notes only exist behind «Ver notas» and render as a text node in `whitespace-pre-wrap break-words`.

## Task Commits

1. **Task 1: Record date and time, mode, outcome and notes in the round dialog** - `98cc052` (feat)
2. **Task 2: Read each round in the list, ordered, with date, mode, outcome and notes** - `f662d1e` (feat)

**Plan metadata:** committed separately after this file (docs).

## Files Created/Modified

- `apps/web/src/common/lib/format.ts` - `formatDateTime`, `localInputToIso`, `isoToLocalInput`
- `apps/web/src/common/lib/format.test.ts` - fixed-zone tests of the three helpers
- `apps/web/src/pods/application-detail/application-detail.vm.ts` - `dateLabel`, `modeLabel`, `outcomeLabel`
- `apps/web/src/pods/application-detail/application-detail.mapper.ts` - date conversion, field messages, ordering, labels
- `apps/web/src/pods/application-detail/components/interview-dialog.tsx` - the dialog with every field (new, moved from the section)
- `apps/web/src/pods/application-detail/components/interview-item.tsx` - one round row (new)
- `apps/web/src/pods/application-detail/components/interview-outcome-badge.tsx` - neutral badge (new)
- `apps/web/src/pods/application-detail/components/interviews-section.tsx` - hosts the dialog, renders `InterviewItem`
- `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx` - dialog, mapper, badge and list tests (new)

## Decisions Made

See `key-decisions`. No dependency added; lockfile and `packages/contracts` unchanged. Native `Date` and `Intl` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Accessible name of the notes trigger lost its space**
- **Found during:** Task 2 (list tests)
- **Issue:** `Ver notas<span class="sr-only"> de la ronda 1</span>` computed as «Ver notasde la ronda 1» because the accessible-name algorithm trims the whitespace at the edge of an inline child, so the planned name «Ver notas de la ronda 1» did not match.
- **Fix:** Render the label, a literal `{" "}` text node and then `<span className="sr-only">de la ronda N</span>`; the name is exactly «Ver notas de la ronda 1» (and «Ocultar notas de la ronda 1»).
- **Files modified:** `apps/web/src/pods/application-detail/components/interview-item.tsx`
- **Verification:** the notes test finds the button by that exact name.
- **Committed in:** `f662d1e`

**Total deviations:** 1 auto-fixed (1 bug). **Impact on plan:** none; copy and behaviour as specified.

## Issues Encountered

The sandbox refused chained git or heredoc commands in one call and the auto-mode classifier failed transiently a few times; resolved by splitting commands and retrying once.

## TDD Gate Compliance

Both tasks are `tdd="true"`. Tests were written first and run before the implementation; the pre-commit hook runs `tsc` over the workspace, so a RED commit that imports symbols not yet present cannot be committed, and RED and GREEN were committed together as one `feat` commit per task (the Phase 2/3 convention).

- RED (Task 1): 19 of 32 tests in `format.test.ts` and `application-detail.interviews.test.tsx` failed on the planned assertions (missing helpers, absent controls) before any implementation. Semantic assessment: failures came from the planned behaviour missing, not from setup faults.
- RED (Task 2): the 3 new `formatDateTime` cases failed in `format.test.ts` (3 failed, 18 passed) before the helper existed; the new list, mapper and badge tests could not run before the badge component existed because their file imports it, so that part of RED is not separately demonstrable.
- GREEN: `98cc052` and `f662d1e`. REFACTOR: none.
- No separate `test(04-02)` commits exist; flagged for the end-of-phase review.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-04-08 mitigated and tested (unparsable value reaches the schema and is reported under the field; DST cases). T-04-09 mitigated and tested (notes are a React text node; markup in notes shown literally; no `dangerouslySetInnerHTML` or `innerHTML` in the pod). T-04-SC: no package installed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-03 can add edit and delete to the header `div` of `InterviewItem` and the edit mode to `InterviewDialog` (`isoToLocalInput` is ready for the stored `scheduledAt`).
- Not run: the plan's `human-check` (native picker in Chrome, Firefox and Safari; keyboard-only flow; 360 px width with «No superada» wrapping); tracked as D4 with `human_judgment: true`.

---
*Phase: 04-rondas-de-entrevista*
*Completed: 2026-11-02*

## Self-Check: PASSED

- Created files exist: `interview-dialog.tsx`, `interview-item.tsx`, `interview-outcome-badge.tsx`, `application-detail.interviews.test.tsx`.
- Commits `98cc052` and `f662d1e` are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (contracts 55, api 299, web 463) and `npm run lint` exit 0; every acceptance criterion grep of both tasks passes.
