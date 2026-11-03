---
phase: 04
review: 04-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Concurrent mutations on two applications now share single-slot feedback state and one timer ref"
  - id: IN-01
    severity: info
    disposition: open
    title: "The \"releases only its own lock\" guard in `endBusy` has no test"
  - id: IN-02
    severity: info
    disposition: open
    title: "`deletingRef` and `onDeleted` are still not scoped to the application"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "Busy flag and success timer are not scoped to the application or to unmount"
  - id: IN-03
    severity: info
    disposition: open
    title: "Duplicated literals and near-identical shapes"
  - id: IN-04
    severity: info
    disposition: open
    title: "PUT semantics are inconsistent between `round` and the other fields"
open: 5
total: 6
recorded: 2026-11-03T11:02:34.968Z
---

# Phase 04: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| WR-02 | warning | fixed | 04-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | open | - (not in the current review) |
| IN-04 | info | open | - (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
