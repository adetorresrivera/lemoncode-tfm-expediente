---
phase: 02
review: 02-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "No request-body limit and several unbounded string fields in the input contract"
    note: "body limit on /api/applications and .max on sourceUrl and document ids (06-05); salary bounds not applied, outside D-20"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "compose-smoke leaves the smoke record in the Mongo volume when a later step fails"
    note: "trap in scripts/compose-smoke.sh, 06-05"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Delete dialog shows a stale error after cancel and reopen"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "List shows \"no results\" while a refetch is in flight"
    note: "Fixed in 06-06"
  - id: IN-01
    severity: info
    disposition: open
    title: "Search field does not follow the URL after the first render"
  - id: IN-02
    severity: info
    disposition: open
    title: "PUT validates fields it then ignores"
  - id: IN-03
    severity: info
    disposition: open
    title: "Indexes that nothing uses"
  - id: IN-04
    severity: info
    disposition: open
    title: "Error-handler and JSON-gate edge cases"
  - id: IN-05
    severity: info
    disposition: open
    title: "Small targets and no disabled styling for aria-disabled buttons"
  - id: IN-06
    severity: info
    disposition: open
    title: "An unparseable salary is silently dropped"
  - id: IN-07
    severity: info
    disposition: open
    title: "Detail page title is not reset for the loading, not-found and error states"
  - id: IN-08
    severity: info
    disposition: open
    title: "One legacy document breaks the whole list"
  - id: IN-09
    severity: info
    disposition: open
    title: "Saving a stale edit form can erase an automatic appliedAt"
---

# Phase 02 review disposition

Every finding starts `open`. Set `disposition` to `fixed`, `skipped` (with a reason) or `accepted` as each one is triaged; `/gsd-code-review 02 --fix` reconciles fixed/skipped automatically.
