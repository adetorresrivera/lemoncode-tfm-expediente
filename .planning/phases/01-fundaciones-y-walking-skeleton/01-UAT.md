---
status: partial
phase: 01-fundaciones-y-walking-skeleton
source: [01-VERIFICATION.md]
started: 2026-10-29T16:40:00Z
updated: 2026-10-29T21:21:45.918Z
---

## Current Test

[testing complete]

## Tests

### 1. Run `docker compose up --build` on a clean host (committed port mappings, no override) and open http://localhost:8080
expected: App container healthy, mongo/s3/ollama healthy, s3-init exited 0, browser lands on /applications inside the themed shell; `curl http://localhost:8080/api/health` gives all four fields ok; Silo console at 127.0.0.1:9001 lists bucket tfm-assets
result: blocked
blocked_by: other
reason: "Error response from daemon: ports are not available: exposing port TCP 127.0.0.1:9001 -> 127.0.0.1:0: listen tcp4 127.0.0.1:9001: bind: Only one usage of each socket address (protocol/network address/port) is normally permitted. Known environment clash (see 01-01-SUMMARY / 01-06-SUMMARY): host port 9001 held outside compose, not a compose.yml defect. Re-test after freeing 8080/9001 or on a clean host."

### 2. Resize a browser to 1024 px and 1023 px wide
expected: At 1024 px the fixed sidebar is visible and the header with «Abrir menú» is hidden; at 1023 px the sidebar is hidden and the «Abrir menú» button sits at the left edge of the header, the Sheet opens from the left, and Esc returns focus to the button
result: pass
note: "Re-test after quick task 261029-sa5 (commits 1c631ce, 626364c) moved the button to the left. Previous report: Si. Se ve el menu. Pero creo que el boton que abre el menu deberia estar a la izquierda, por donde sale el Sheet"

### 3. Select Oscuro, reload the page (hard reload, throttled CPU if possible)
expected: No light-theme frame is painted before React mounts; theme stays dark and the toggle shows Oscuro
result: pass

### 4. Open the mobile Sheet with the keyboard, Tab through it, press Esc
expected: Focus stays trapped inside the Sheet; Esc closes it and focus returns to the «Abrir menú» button; the theme toggle fits the 256 px sidebar and the Sheet without clipping
result: pass

## Summary

total: 4
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps
- gap_id: G-01-2
  truth: "At 1023 px the sidebar is hidden and the header button opens the Sheet"
  status: resolved
  resolved_by: "261029-sa5-PLAN (quick task, commits 1c631ce, 626364c)"
  resolved_at: 2026-10-29
  reason: "User reported: Si. Se ve el menu. Pero creo que el boton que abre el menu deberia estar a la izquierda, por donde sale el Sheet"
  severity: minor
  test: 2
  artifacts: []
  missing: []
