---
status: complete
phase: 05-documentos-en-s3
source: [05-VERIFICATION.md]
started: 2026-11-04T20:35:00Z
updated: 2026-11-06T08:18:32.720Z
---

## Current Test

[testing complete]

## Tests

### 1. Upload a real DOCX saved by Word and by LibreOffice, then a real PDF, from the real file chooser at /documents
expected: Both DOCX files are accepted (signature check by ZIP central directory), appear in the list with name, version and size, and download byte-identical
result: pass

### 2. Upload a file larger than 5 MB in a real browser, and a .txt file
expected: Spanish messages 'El archivo supera 5 MB.' and 'Solo se admiten archivos PDF o DOCX.' appear on the file field with no uncaught network error; a real browser must read the 413 JSON even if the server cuts the connection
result: pass

### 3. Open an application detail whose linked document no longer has its object (or answers 404) and click Descargar; also download a normal one
expected: Normal download saves the file with its original name; the 404 case does not navigate away or leave a blank page in a way the user cannot recover from
result: pass

### 4. Check /documents, the upload dialog and the application form documents section at 360 px width, keyboard only
expected: No horizontal scroll, controls reachable by keyboard, focus returns to «Subir nuevo» after the dialog closes
result: issue
reported: "I think it would look better if we move the button outside the white square and make it a bit bigger so it maches the other buttons"
severity: cosmetic
previous_result: issue
previous_reported: "The tooltip Seleection archivo - Ningun archivo seleccionado. Looks missaligned"
retest_after: 05-10-PLAN.md

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-05-4
  truth: "At 360 px width, keyboard only, /documents, the upload dialog and the application form documents section show no horizontal scroll, all controls are reachable, and focus returns to «Subir nuevo» after the dialog closes"
  status: resolved
  reason: "User reported: The tooltip Seleection archivo - Ningun archivo seleccionado. Looks missaligned"
  severity: cosmetic
  test: 4
  resolved_by: 05-10-PLAN.md
  resolved_at: 2026-11-06
  root_cause: "The file input reuses the shared Input (h-11, px-4, text-base, no vertical padding). Native file inputs do not vertically centre their content inside a fixed height, and the ::file-selector-button is styled text-sm with no height while the «Ningún archivo seleccionado» label inherits text-base, so the button and label sit on different baselines near the top of the 44 px box."
  artifacts:
    - path: "apps/web/src/pods/document-upload/components/upload-dialog.tsx"
      issue: "File input className (line ~210) sets file: styles without a height/alignment and mismatches the label font size"
    - path: "apps/web/src/common/components/ui/input.tsx"
      issue: "Base Input has fixed h-11 and no py, which suits text inputs but not type=file"
  missing:
    - "Give the file input vertical padding (e.g. py-2) and a fixed-height, vertically centred file: button (file:h-7 file:inline-flex file:items-center), with matching text size for button and label (text-sm), so both sit centred in the 44 px control at 360 px and desktop"
    - "Keep the change local to the upload dialog (do not alter the shared Input for text fields)"
    - "Style the file-selector as a DS outline/sm button (user re-test 2026-11-06: 'does not look like a button at all')"
  debug_session: ""
- gap_id: G-05-4b
  truth: "In the upload dialog (both modes), the file-selection button sits outside the white «Archivo» input box and matches the size and look of the other dialog buttons, at 360 px and 1280 px, Claro and Oscuro, keyboard operable"
  status: failed
  reason: "User reported: I think it would look better if we move the button outside the white square and make it a bit bigger so it maches the other buttons"
  severity: cosmetic
  test: 4
  artifacts: []
  missing: []
