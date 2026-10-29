---
status: testing
phase: 01-fundaciones-y-walking-skeleton
source: [01-VERIFICATION.md]
started: 2026-10-29T16:40:00Z
updated: 2026-10-29T16:40:00Z
---

## Current Test

number: 1
name: Run `docker compose up --build` on a clean host (committed port mappings, no override) and open http://localhost:8080
expected: |
  App container healthy, mongo/s3/ollama healthy, s3-init exited 0, browser lands on /applications inside the themed shell; `curl http://localhost:8080/api/health` gives all four fields ok; Silo console at 127.0.0.1:9001 lists bucket tfm-assets
awaiting: user response

## Tests

### 1. Run `docker compose up --build` on a clean host (committed port mappings, no override) and open http://localhost:8080
expected: App container healthy, mongo/s3/ollama healthy, s3-init exited 0, browser lands on /applications inside the themed shell; `curl http://localhost:8080/api/health` gives all four fields ok; Silo console at 127.0.0.1:9001 lists bucket tfm-assets
result: [pending]

### 2. Resize a browser to 1024 px and 1023 px wide
expected: At 1024 px the fixed sidebar is visible and the header with «Abrir menú» is hidden; at 1023 px the sidebar is hidden and the header button opens the Sheet
result: [pending]

### 3. Select Oscuro, reload the page (hard reload, throttled CPU if possible)
expected: No light-theme frame is painted before React mounts; theme stays dark and the toggle shows Oscuro
result: [pending]

### 4. Open the mobile Sheet with the keyboard, Tab through it, press Esc
expected: Focus stays trapped inside the Sheet; Esc closes it and focus returns to the «Abrir menú» button; the theme toggle fits the 256 px sidebar and the Sheet without clipping
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
