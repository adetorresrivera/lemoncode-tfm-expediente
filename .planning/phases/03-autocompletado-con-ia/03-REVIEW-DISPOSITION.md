---
phase: 03
review: 03-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Normalization of over-long labels and surplus tags is unreachable; one off-spec field fails the whole analysis"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "The global error handler logs a fragment of the pasted offer on malformed JSON"
  - id: IN-01
    severity: info
    disposition: open
    title: "Any non-recognised failure of the extraction request is reported as \"No hay conexión\"; a throw in the merge is also mislabeled"
  - id: IN-02
    severity: info
    disposition: open
    title: "A user-chosen currency can be overwritten when both salary fields are blank"
  - id: IN-03
    severity: info
    disposition: open
    title: "Retrying at temperature 0 repeats the same failure"
  - id: IN-04
    severity: info
    disposition: open
    title: "Docs drift from the implementation"
  - id: IN-05
    severity: info
    disposition: open
    title: "Trailing-slash normalization of `LLM_BASE_URL` is done three times"
open: 5
total: 7
recorded: 2026-11-01T12:47:44.354Z
---

# Phase 03: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 03-REVIEW-FIX.md |
| WR-02 | warning | fixed | 03-REVIEW-FIX.md |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
