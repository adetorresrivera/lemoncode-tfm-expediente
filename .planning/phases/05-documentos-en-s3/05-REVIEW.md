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
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-11-06
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the upload dialog and its test file, with extra attention to the diff against `d38d87a`. That diff is the 05-10 change: the native file button is restyled as an outline button, and a class-assertion test was added. The dialog logic is sound. It covers close guard while uploading, focus handling, `stopPropagation` across the Radix portal, name prefill without overwriting typed names, and an `aria-invalid` focus move after a frame. I found no crash, security or data-loss defects. The issues are in the new test and in fragile styling arithmetic.

## Warnings

### WR-01: New styling test asserts class strings, not behavior, and part of it cannot fail

**File:** `apps/web/src/pods/document-upload/document-upload.test.tsx:571-607`
**Issue:** jsdom computes no layout or pseudo-element styles. The test name promises an outline button "centred in the 44 px control", but it only checks that a list of Tailwind class names is present.
- It re-types the className literal from `upload-dialog.tsx:211`, so any restyle needs two edits and the test proves nothing about the rendered result.
- Several asserted classes (`h-11`, `text-base`, `focus-visible:ring-2`, `focus-visible:ring-ring`, `min-w-0`, `w-full`) come from `Input`'s base classes in `ui/input.tsx`, not from this change. The test now fails on unrelated edits to the shared `Input`.
- `expect(nameInput(dialog)).not.toHaveClass("py-1.25")` is nearly tautological, because nothing in the name field could add that class.
- The two `.not.toHaveClass("file:bg-transparent" / "file:border-0")` checks only guard against a revert of the exact old string.

**Fix:** Drop the test, or reduce it to a small guard that does not duplicate the literal. Verify the visual result with the UI review or a manual check at 360 px. If a regression guard is wanted, assert only the two classes that carry the intent, `py-1.25` and `file:h-8`, and rename the test to say it checks the class contract (for example "keeps the vertical padding that centres the file button").

### WR-02: Timer test has a 100 ms margin and runs on a clock that advances in real time

**File:** `apps/web/src/pods/document-upload/document-upload.test.tsx:609-635`
**Issue:** The test uses `vi.useFakeTimers({ shouldAdvanceTime: true })`. With this option the fake clock also advances with real time. It then asserts the message is still present after 4900 ms of fake time, and gone after 200 ms more. The window before the 5000 ms timeout fires is 100 ms. On a slow CI run, real time elapsed between the success message appearing and `advanceTimersByTime(4900)` (`findByText`, `act` flushes) is added to the fake clock. The line can then clear before the "still present" assertion, which makes the test flaky. This test predates the 05-10 diff but is in the reviewed file.
**Fix:** Use `vi.useFakeTimers()` without `shouldAdvanceTime`. If `userEvent` needs it, keep the option but widen the margin (assert presence at 4000 ms, absence at 5100 ms or later). Also move `vi.useFakeTimers` after `render` and the upload so only the 5 s timer is faked.

## Info

### IN-01: File-button vertical centring depends on three unrelated magic numbers

**File:** `apps/web/src/pods/document-upload/components/upload-dialog.tsx:211`
**Issue:** `py-1.25` (5 px) is correct only while `Input` stays at `h-11` (44 px), the 1 px input border stays, and the button stays at `file:h-8` (32 px): 44 - 2 - 32 = 10 px, split as 5 px per side. The coupling is implicit and appears nowhere except a hidden calculation. `py-1.25` is also the only non-integer spacing step in the codebase (grep found no other use). The `::file-selector-button` also renders slightly differently in Safari and Firefox, and no cross-browser check is recorded.
**Fix:** Add a one-line comment above the className: `// 44 px control - 2 px border - 32 px button = 10 px, so py-1.25 on each side`. Also check the dialog in Firefox and Safari.

### IN-02: Outline file button has very low boundary contrast

**File:** `apps/web/src/pods/document-upload/components/upload-dialog.tsx:211`
**Issue:** `file:border-border` (#dcd2bd) on a `bg-card` input (#fffdf8), with a `bg-background` (#f6f1e6) fill, gives well under 3:1 non-text contrast for the button edge. This mirrors the existing `Button` outline variant, so it is consistent, and the "Elegir archivo" label is readable. Still, the project constraint is WCAG AA contrast, and the control's boundary is the input's `border-input` (#8c7f64), not this inner border.
**Fix:** If a visible inner edge is required, use `file:border-input`. Otherwise treat it as an accepted DS limitation and note it in the UI review.

---

_Reviewed: 2026-11-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
