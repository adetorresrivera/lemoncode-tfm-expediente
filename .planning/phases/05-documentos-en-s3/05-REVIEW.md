---
phase: 05-documentos-en-s3
reviewed: 2026-11-06T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - apps/web/src/pods/document-upload/components/upload-dialog.tsx
  - apps/web/src/pods/document-upload/document-upload.test.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-11-06
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

I reviewed the upload dialog component and its test file. I also read the hook, mapper, shared `Input`, `cn` and container to check how they fit together. `vitest run src/pods/document-upload` passes (52 tests) and ESLint is clean on the pod. I found no correctness or security defects in the component. The close guard, the submit propagation stop, the name prefill and the focus handling all trace through correctly. The weaknesses are in the tests: one timing-dependent test and one guard that no test actually exercises. Some UX and maintainability points remain.

## Warnings

### WR-01: Success-line timer test can flake on fake-timer drift

**File:** `apps/web/src/pods/document-upload/document-upload.test.tsx:646-672`
**Issue:** The test uses `vi.useFakeTimers({ shouldAdvanceTime: true })`, so the fake clock also advances with real time. The 5 s timer starts when the upload resolves. It is then followed by `findByText` polling and a React flush. Only after that does the test advance 4900 ms and assert the line is still visible. That leaves a 100 ms margin. Any real-time lag over 100 ms between the timer arming and the first `advanceTimersByTime(4900)` makes `getByText("Documento subido.")` throw. A loaded CI runner can hit this. The test would then fail for a reason unrelated to the code.
**Fix:** Drop `shouldAdvanceTime`, and drive the fake clock only through `advanceTimers: vi.advanceTimersByTime` on `userEvent`. Await the upload with `act` plus `vi.advanceTimersByTimeAsync(0)` instead of real-time polling. Alternatively widen the margin: assert at 4000 ms, then advance 1500 ms.

### WR-02: The "outside pointer never closes it" guard is not tested where it matters

**File:** `apps/web/src/pods/document-upload/document-upload.test.tsx:420-431` (guard at `upload-dialog.tsx:72`)
**Issue:** The component's documented rule is that an outside pointer never closes the dialog, so a stray click cannot discard typed data. The only test that fires `pointerDown` on the overlay does so while `uploading` is true. In that state `handleOpenChange` already ignores every close request. The test would still pass if `onInteractOutside={(event) => event.preventDefault()}` were deleted. The idle case, where a click outside would close the dialog and drop the filled values, has no coverage. The `Escape` close while idle is covered by the focus test, but the pointer one is not.
**Fix:** Add an idle test. Open the dialog, type a version, then `fireEvent.pointerDown` on `[data-slot="dialog-overlay"]` and assert the dialog is still present and `versionInput` still holds its value.

### WR-03: Close «X» stays active-looking but does nothing while uploading

**File:** `apps/web/src/pods/document-upload/components/upload-dialog.tsx:65-67`
**Issue:** While a request is in flight, `handleOpenChange` silently swallows the close request. The shared `DialogContent` still renders the «Cerrar» button, enabled and focusable (the test at line 423 confirms it is clickable). A keyboard or screen-reader user who activates it gets no response and no explanation. The only cue is that «Cancelar subida» now has focus. This is a silent no-op control, which is an accessibility and UX defect.
**Fix:** While uploading, give the user feedback when a close is attempted. For example, set a "close blocked" live message such as «Cancela la subida para cerrar.» in `handleOpenChange`. Alternatively pass a prop to hide or disable the X while `uploading`, which needs a small change to `DialogContent`.

## Info

### IN-01: Test asserts Tailwind class names, including ones inherited from the shared Input

**File:** `apps/web/src/pods/document-upload/document-upload.test.tsx:571-644`
**Issue:** The test pins about 30 class tokens, including `rounded-md`, `text-base` and `focus-visible:ring-*`. These come from `common/components/ui/input.tsx`, not from this pod. It also asserts the absence of `py-1.25`, `file:h-8` and similar leftovers from earlier plans. It checks class strings, not rendered behavior, because jsdom has no layout. Any harmless refactor of the shared Input or of the class order breaks it. It also couples this pod's tests to the Input implementation.
**Fix:** Keep only the few assertions that guard the intent (`file:h-11`, `border-0`, `bg-transparent`, `px-0`). Drop the assertions on inherited tokens and the list of removed classes.

### IN-02: Misleading helper name in a test

**File:** `apps/web/src/pods/document-upload/document-upload.test.tsx:496, 547, 623`
**Issue:** `submit(dialog, "Descartar subida")` returns the cancel/discard button. The helper is named `submit`, so these calls read as submitting. It is a generic "button by name" lookup.
**Fix:** Rename the helper to `button` or `dialogButton`, or add a `discard(dialog)` helper for the «Descartar subida» cases.

### IN-03: `Field` and `controlProps` duplicated from the application form

**File:** `apps/web/src/pods/document-upload/components/upload-dialog.tsx:341-418`
**Issue:** The comment acknowledges that the field shell and the aria wiring are copied from the application form because a pod cannot import another pod. Two copies will drift, for example if one gains `aria-live` on errors and the other does not. The shared place for this is `common/components`.
**Fix:** Move `Field`, `firstFieldError` and `controlProps` to `common/components` (for example `form-field.tsx`), and import them from both pods.

---

_Reviewed: 2026-11-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
