---
phase: 06
review: 06-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "New `sourceUrl` length cap shows a misleading validation message"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Mongo client leaks when `ensureIndexes` fails inside the new startup retry"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Seed marking is a second write, so an interrupted run leaves unmarked demo records"
  - id: IN-01
    severity: info
    disposition: open
    title: "Body-limit block duplicated between applications and offers routes"
  - id: IN-02
    severity: info
    disposition: open
    title: "Retry attempt count is duplicated and the final message hides the cause"
  - id: IN-03
    severity: info
    disposition: open
    title: "`compose-smoke.sh --cold` silently exits on some failures"
  - id: IN-04
    severity: info
    disposition: open
    title: "DESIGN.md still describes the old tag chip height"
  - id: IN-05
    severity: info
    disposition: open
    title: "Test helpers and guards with side effects or brittle strategy"
open: 8
total: 8
recorded: 2026-11-07T10:53:10.820Z
---

# Phase 06: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
