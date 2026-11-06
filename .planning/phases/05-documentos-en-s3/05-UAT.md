---
status: complete
phase: 05-documentos-en-s3
source: [05-VERIFICATION.md]
started: 2026-11-04T20:35:00Z
updated: 2026-11-06T07:27:46.951Z
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
reported: "The tooltip Seleection archivo - Ningun archivo seleccionado. Looks missaligned"
severity: cosmetic

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
  status: failed
  reason: "User reported: The tooltip Seleection archivo - Ningun archivo seleccionado. Looks missaligned"
  severity: cosmetic
  test: 4
  artifacts: []
  missing: []
