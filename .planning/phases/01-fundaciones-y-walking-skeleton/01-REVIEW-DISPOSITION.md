---
phase: 01
review: 01-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "API process dies, or hangs, at startup when Mongo or S3 is slow or down, contradicting the health design"
  - id: WR-02
    severity: warning
    disposition: open
    title: "`pingS3` has no abort, so every health call against a hung S3 leaves a pending socket"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Theme store desynchronises from the DOM (cross-tab and blocked-storage cases)"
  - id: WR-04
    severity: warning
    disposition: open
    title: "Contracts do not enforce tag normalisation or uniqueness that DOMAIN.md specifies"
  - id: WR-05
    severity: warning
    disposition: open
    title: "Error handler collapses non-400/404 `HTTPException` and every `SyntaxError` into misleading codes"
  - id: WR-06
    severity: warning
    disposition: open
    title: "A `ZodError` raised from LLM output would be reported as a 400 caused by the client"
  - id: WR-07
    severity: warning
    disposition: open
    title: "Unknown routes and route errors render TanStack's English default screens"
  - id: WR-08
    severity: warning
    disposition: open
    title: "SPA fallback answers missing static files with `200 text/html`, and a missing `index.html` is silent"
  - id: IN-01
    severity: info
    disposition: open
    title: "Inline theme script and `initTheme` disagree on unknown values and skip `color-scheme`"
  - id: IN-02
    severity: info
    disposition: open
    title: "Disabled nav entries are `span aria-disabled` with no role"
  - id: IN-03
    severity: info
    disposition: open
    title: "`probe()` rejects if the probe function throws synchronously"
  - id: IN-04
    severity: info
    disposition: open
    title: "Response schema `applicationSchema` re-applies input constraints and defaults"
  - id: IN-05
    severity: info
    disposition: open
    title: "`offerExtractionSchema` is stricter than useful for LLM output and looser than the form it feeds"
  - id: IN-06
    severity: info
    disposition: open
    title: "Minor robustness gaps in contracts and formatting"
  - id: IN-07
    severity: info
    disposition: open
    title: "Duplicated base-URL normalisation and repo-wide `legacy-peer-deps`"
open: 15
total: 15
recorded: 2026-10-29T16:04:08.216Z
---

# Phase 01: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| WR-05 | warning | open | - |
| WR-06 | warning | open | - |
| WR-07 | warning | open | - |
| WR-08 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| IN-06 | info | open | - |
| IN-07 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
