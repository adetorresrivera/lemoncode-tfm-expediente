---
phase: 04-rondas-de-entrevista
reviewed: 2026-11-03T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - apps/api/src/applications/applications.interviews.test.ts
  - apps/api/src/applications/applications.repository.ts
  - apps/api/src/applications/applications.routes.ts
  - apps/api/src/applications/applications.service.ts
  - apps/web/src/common/components/ui/dialog.tsx
  - apps/web/src/common/lib/enum-labels.ts
  - apps/web/src/common/lib/format.test.ts
  - apps/web/src/common/lib/format.ts
  - apps/web/src/pods/application-detail/api/api.ts
  - apps/web/src/pods/application-detail/application-detail.component.tsx
  - apps/web/src/pods/application-detail/application-detail.container.tsx
  - apps/web/src/pods/application-detail/application-detail.hooks.ts
  - apps/web/src/pods/application-detail/application-detail.interviews.test.tsx
  - apps/web/src/pods/application-detail/application-detail.mapper.ts
  - apps/web/src/pods/application-detail/application-detail.test.tsx
  - apps/web/src/pods/application-detail/application-detail.vm.ts
  - apps/web/src/pods/application-detail/components/interview-delete-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-dialog.tsx
  - apps/web/src/pods/application-detail/components/interview-item.tsx
  - apps/web/src/pods/application-detail/components/interview-outcome-badge.tsx
  - apps/web/src/pods/application-detail/components/interviews-section.tsx
  - apps/web/src/pods/application-detail/components/status-change.tsx
  - docs/ARCHITECTURE.md
  - scripts/compose-smoke.sh
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-11-03
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

I reviewed the interview-rounds slice: the three API routes with their service and repository, the web pod (hook, mapper, VM, dialogs, section), the shared `dialog` and `format` helpers, the docs and the compose smoke. `npm run typecheck` and ESLint on the touched directories are clean, and `format.test.ts` passes.

The server side is sound:
- The pipeline update in `addInterview` reads every expression from the input document. Concurrent creates therefore get distinct round numbers and at most one status move.
- Client values are wrapped in `$literal`, so a leading `$` cannot be evaluated.
- The round id is only compared as a string, never used to build an update document.
- The 404 distinction between application and round is correct.

No injection, authorization or data-loss defects were found. The remaining problems are on the web side:
- **WR-01:** editing a round can silently rewrite its stored date.
- **WR-02:** the hook's busy flag and success timer are not scoped to the application or to unmount.
- **IN-01 to IN-04:** smaller accessibility, validation and duplication items.

## Warnings

### WR-01: Editing a round silently rewrites a stored `scheduledAt` that the form cannot represent

**File:** `apps/web/src/pods/application-detail/application-detail.mapper.ts:96-103` (with `apps/web/src/common/lib/format.ts:44-55`)
**Issue:** The edit dialog opens with `isoToLocalInput(interview.scheduledAt)`, which truncates to the minute. Submitting converts the field back with `localInputToIso`, and the result is always sent in the PUT body, even if the user only changed the outcome. Two cases change the stored instant without the user touching the date:
1. A round whose stored instant has non-zero seconds or milliseconds (API-created, seeded or imported) loses them. The existing test "drops seconds and milliseconds on the way back" documents this, but nothing guards the save path.
2. An instant that falls in the second occurrence of the autumn DST overlap (for example `2026-10-25T01:30:00Z` in Europe/Madrid) is shown as `02:30`. On save it is reinterpreted as the first occurrence (`00:30:00Z`), so the date moves one hour. The existing test "resolves the Madrid fall-back overlap to its first occurrence" confirms that behaviour.

This is silent data corruption on an unrelated edit, for example flipping `pendiente` to `superada`.

**Fix:** Keep the original ISO in the edit values, or in a separate field of the VM. In `mapInterviewFormToApiInput`, reuse it when the date control still holds the value that was loaded.
```ts
// mapper: expose the loaded pair
editValues: { ..., scheduledAt: local },
loadedScheduledAt: { local, iso: interview.scheduledAt },

// when building the PUT body
scheduledAt:
  values.scheduledAt === "" ? null
  : original && values.scheduledAt === original.local ? original.iso
  : (localInputToIso(values.scheduledAt) ?? values.scheduledAt),
```
The edit path of the hook would need to pass `original` through. Add a test that edits only the outcome of a round stored as `2026-10-25T01:30:15.250Z` and asserts the PUT body carries the unchanged `scheduledAt`.

### WR-02: Busy flag and success timer are not scoped to the application or to unmount

**File:** `apps/web/src/pods/application-detail/application-detail.hooks.ts:85-89, 163-173, 247-256`
**Issue:** Everything else in the hook is keyed by `applicationId#attempt`. The shared mutation guard is not: `busy` state and `busyRef` are global to the hook instance.
- If `applicationId` changes while a status change or round mutation is in flight, the newly shown application inherits `busy === true`. Add, edit, delete and the status select are all locked until the previous request settles. The result and feedback are correctly ignored, but the lock leaks.
- The unmount effect clears `successTimerRef` once. A mutation that resolves after unmount still runs `scheduleSuccessClear()` (lines 209, 253, 291, 313). That arms a new 5 s timer that nothing clears, and it then calls `setMutation` and `setInterviewFeedback` on an unmounted component. This is harmless in React 19, but it is a leaked timer and contradicts the "mutation is never aborted on unmount" comment's intent.

**Fix:** Store the key with the busy marker and derive `busy` from it, as is already done for `mutation`.
```ts
const [busyKey, setBusyKey] = useState<string | null>(null);
const busy = busyKey === key;
```
Keep `busyRef` for same-tick blocking, but have the ref store the key it was started for. Add a `mountedRef` that the unmount effect sets to `false`, and skip `scheduleSuccessClear()` when it is false.

## Info

### IN-01: A non-numeric «Ronda» is silently treated as empty when adding

**File:** `apps/web/src/pods/application-detail/components/interview-dialog.tsx:190-205` (with `application-detail.mapper.ts:165-169`)
**Issue:** `<input type="number">` reports `value === ""` while its text is not a valid number (for example the user typed `e` or `-`). In add mode `mapInterviewFormToApiInput` then leaves `round` out and the server assigns the next number. The user typed something invalid, got no error, and the round was numbered by the server.
**Fix:** Read `event.target.validity.badInput` in the `onChange`. When it is true, store a sentinel the validator rejects, for example the raw `event.target.value || "x"`. Alternatively, switch to `type="text" inputMode="numeric"` and let `interviewInputSchema` report «La ronda debe ser un número entero de 1 o más.»

### IN-02: Repeated round numbers produce identical accessible names

**File:** `apps/web/src/pods/application-detail/components/interview-item.tsx:38, 52, 98`
**Issue:** The API deliberately allows repeated round numbers; the test "stores a round equal to an existing one" covers it. The edit and delete buttons, the notes toggle and the dialog titles are all named only by the round number, such as «Editar ronda 2». With two rounds numbered 2, screen-reader and keyboard users get two indistinguishable controls, and the delete confirmation does not say which one it will remove.
**Fix:** Include the type, and the date when present, in the accessible names. For example `aria-label={`Editar ronda ${round}, ${typeLabel}`}`. Reuse the same wording in the delete dialog description. It already includes `typeLabel`, so only the buttons and the notes `sr-only` text need it.

### IN-03: Duplicated literals and near-identical shapes

**File:** `apps/web/src/pods/application-detail/components/interview-dialog.tsx:40-41, 304`; `application-detail.mapper.ts:198`; `apps/web/src/common/lib/format.ts:1-35`; `apps/api/src/applications/applications.repository.ts:71-90`; `applications.service.ts:172-183, 199-209`
**Issue:**
- The notes limit 5000 appears as a literal in three places (`NOTES_MAX_TEXT`, `maxLength={5000}` and the «5.000 caracteres» message). It is also duplicated from the contract's `max(5000)`. If the contract changes, the UI drifts.
- `formatDateTime` copies the whole `formatDate` body, including the `.map` that appends the period to the month.
- `NewInterview` and `InterviewChanges` are the same shape apart from `id`.
- `addInterview` and `updateInterview` in the service build the same field mapping, including the `scheduledAt` normalisation, twice.

**Fix:**
- Export a `NOTES_MAX_LENGTH` constant from contracts, or derive it in the web pod, and use it for `maxLength`, the counter and the message.
- Extract a shared `withAbbreviatedMonth(parts)` helper in `format.ts`.
- Define `type InterviewChanges = Omit<NewInterview, "id">` in the repository.
- Add a small `toInterviewFields(input)` helper in the service.

### IN-04: PUT semantics are inconsistent between `round` and the other fields

**File:** `apps/api/src/applications/applications.repository.ts:305-327`; `apps/api/src/applications/applications.service.ts:196-209`; `docs/ARCHITECTURE.md:84`
**Issue:** A PUT body that omits `round` keeps the stored number. A body that omits `outcome` is reset to `pendiente` by the contract default, and omitted `notes` and `scheduledAt` are cleared to `null`. A client that sends only `{type, mode}`, as the compose smoke does, can therefore wipe a `superada` outcome and the notes while the round number survives. The doc row says only «edita la ronda» and does not mention either behaviour.
**Fix:** Document in `ARCHITECTURE.md` that PUT replaces the round: omitted optional fields reset to their defaults and `round` is the only field that is kept. Alternatively, make `outcome` follow the same keep-if-absent rule as `round`.

---

_Reviewed: 2026-11-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
