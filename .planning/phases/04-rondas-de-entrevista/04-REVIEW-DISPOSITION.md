---
phase: 04
review: 04-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Editing a round silently rewrites a stored `scheduledAt` that the form cannot represent"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Busy flag and success timer are not scoped to the application or to unmount"
  - id: IN-01
    severity: info
    disposition: open
    title: "A non-numeric «Ronda» is silently treated as empty when adding"
  - id: IN-02
    severity: info
    disposition: open
    title: "Repeated round numbers produce identical accessible names"
  - id: IN-03
    severity: info
    disposition: open
    title: "Duplicated literals and near-identical shapes"
  - id: IN-04
    severity: info
    disposition: open
    title: "PUT semantics are inconsistent between `round` and the other fields"
open: 6
total: 6
recorded: 2026-11-03T06:44:53.292Z
---

# Phase 04: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
