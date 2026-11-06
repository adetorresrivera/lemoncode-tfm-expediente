---
phase: 05
review: 05-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Success-line timer test can flake on fake-timer drift"
  - id: WR-02
    severity: warning
    disposition: open
    title: "The \"outside pointer never closes it\" guard is not tested where it matters"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Close «X» stays active-looking but does nothing while uploading"
  - id: IN-01
    severity: info
    disposition: open
    title: "Test asserts Tailwind class names, including ones inherited from the shared Input"
  - id: IN-02
    severity: info
    disposition: open
    title: "Misleading helper name in a test"
  - id: IN-03
    severity: info
    disposition: open
    title: "`Field` and `controlProps` duplicated from the application form"
  - id: IN-04
    severity: info
    disposition: open
    title: "List item mapper duplicates the document mapper field list"
  - id: IN-05
    severity: info
    disposition: open
    title: "Upload and pick containers duplicate the outcome and success-timer logic"
  - id: IN-06
    severity: info
    disposition: open
    title: "Filter change keeps the previous filter's rows and counter on screen"
open: 9
total: 9
recorded: 2026-11-06T09:03:29.696Z
---

# Phase 05: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - (not in the current review) |
| IN-05 | info | open | - (not in the current review) |
| IN-06 | info | open | - (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
