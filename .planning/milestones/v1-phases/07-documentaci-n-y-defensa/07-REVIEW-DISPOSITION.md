---
phase: 07
review: 07-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Demo script says Ollama takes «unos segundos» and gates the demo on 20 s, but the project's own evidence says ~48 s"
  - id: WR-02
    severity: warning
    disposition: open
    title: "`browser-tools.sh mermaid` demands the Compose network, and `mermaid-check.mjs` calls itself «offline» while needing the npm registry"
  - id: WR-03
    severity: warning
    disposition: open
    title: "The prose rules do not tie a number to the right figure and are not wired into any documented command"
  - id: WR-04
    severity: warning
    disposition: open
    title: "`check-docs --ia` never verifies the `<!-- source: … -->` snippet of the AI document"
  - id: WR-05
    severity: warning
    disposition: open
    title: "`check-figures.mjs` exits 0 with «FIGURES OK» while `tests` and two keys are not independently checked"
  - id: IN-01
    severity: info
    disposition: open
    title: "`capture.mjs` and `mermaid-check.mjs` are never linted or formatted"
  - id: IN-02
    severity: info
    disposition: open
    title: "Self-test of the mermaid check accepts any failure as «broken diagram rejected»"
  - id: IN-03
    severity: info
    disposition: open
    title: "`dias_con_commits` is computed in UTC by the script but in author-local time by the documented command"
  - id: IN-04
    severity: info
    disposition: open
    title: "README structure list is stale, and the voice check skips the README"
  - id: IN-05
    severity: info
    disposition: open
    title: "Small overstatements in the AI document and the deck"
  - id: IN-06
    severity: info
    disposition: open
    title: "ADR intro misdescribes the ADR order, and ADR-005 relies on a non-neutral source"
  - id: IN-07
    severity: info
    disposition: open
    title: "Container install pins only the top-level packages"
  - id: IN-08
    severity: info
    disposition: open
    title: "`set -e` is ignored inside `mermaid_exec`, so a failed `docker cp` is only caught later"
open: 13
total: 13
recorded: 2026-11-07T16:35:12.782Z
---

# Phase 07: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| WR-05 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| IN-06 | info | open | - |
| IN-07 | info | open | - |
| IN-08 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
