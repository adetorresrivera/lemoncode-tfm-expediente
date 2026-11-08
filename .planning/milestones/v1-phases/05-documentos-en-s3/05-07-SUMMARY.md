---
phase: 05-documentos-en-s3
plan: 07
subsystem: web
tags: [react, application-detail, documents, download, formatFileSize]
requires:
  - phase: 05-01
    provides: documentSchema with fileName, application link ids in contracts
  - phase: 05-02
    provides: GET /api/documents/:id and GET /api/documents/:id/download
provides:
  - formatFileSize helper (reused by 05-08)
  - Documentos section in the application detail aside with per-row download
  - getDocument api call, DetailDocument view models and mapper in application-detail
affects: [05-08 document library, 05-09 UAT]
tech-stack:
  added: []
  patterns:
    - keyed documents effect (application id + attempt + both link ids) with Promise.allSettled and per-slot outcome
key-files:
  created:
    - apps/web/src/pods/application-detail/components/documents-section.tsx
  modified:
    - apps/web/src/common/lib/format.ts
    - apps/web/src/common/lib/format.test.ts
    - apps/web/src/pods/application-detail/api/api.ts
    - apps/web/src/pods/application-detail/application-detail.vm.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.ts
    - apps/web/src/pods/application-detail/application-detail.hooks.ts
    - apps/web/src/pods/application-detail/application-detail.container.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/components/delete-dialog.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx
key-decisions:
  - "Documents effect key is `${applicationId}#${attempt}:${cv ?? ''}:${coverLetter ?? ''}`; mutations that keep the links keep the key, so nothing is refetched"
  - "Each linked row settles on its own (Promise.allSettled): a 404 or network failure degrades only that row (D-25)"
  - "download attribute kept on the anchor; its behaviour on an error response stays a backstop for the UAT (Assumption A2)"
requirements-completed: [DOC-04]
status: complete
duration: 25 min
completed: 2026-11-04
commits: 2
plan_head_before: b3f42395f7273b5aff93431064ad1538cdb12b8e
plan_head_after: 5e989f56d4221b6d0c1a0c87392e25fe48e8e17f
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
coverage:
  - deliverable: formatFileSize base 1024 with es-ES decimals and KB to MB rollover
    human_judgment: false
    verification:
      - kind: test
        ref: apps/web/src/common/lib/format.test.ts#formatFileSize
        status: pass
  - deliverable: Documentos section with two fixed rows under the status history, download links, loading, empty and per-row error states
    human_judgment: false
    verification:
      - kind: test
        ref: apps/web/src/pods/application-detail/application-detail.test.tsx#documents section
        status: pass
  - deliverable: A real browser download keeps the SPA in place and saves the file with its original name
    human_judgment: true
    rationale: "Content-Disposition plus the download attribute behave per browser (Assumption A2); no jsdom test can assert it"
  - deliverable: Delete dialog states that linked documents are not deleted
    human_judgment: false
    verification:
      - kind: test
        ref: apps/web/src/pods/application-detail/application-detail.test.tsx#delete dialog
        status: pass
---

# Phase 5 Plan 07: Documents in the application detail Summary

**The application detail shows the linked CV and cover letter (name, version, date, size) with a download link each, degrading per row, plus `formatFileSize` and the delete-dialog sentence about kept documents.**

## What was built

- `formatFileSize(bytes)` in `common/lib/format.ts`. Rule: bytes under 1024 print as `N B`; from there KB with a one-decimal es-ES formatter (`,0` omitted); when the KB value rounded to one decimal reaches 1024 it prints in MB instead. No unit above MB. Examples verified in tests: 512, 1023, 1024, 1536, 235520, 1048575, 1258291, 5242880.
- `application-detail` pod: `getDocument(id, signal)` (id through `encodeURIComponent`), `DetailDocumentVm`, `DetailDocumentSlotVm`, `DetailDocumentsVm`, `ApplicationDetailVm.documentLinks`, `mapDocumentFromApiToDetailVm`, and `ApplicationDetailState.documents`.
- Hook: a second effect, active only once the application result is ok. It requests each non-null link in parallel with `Promise.allSettled`, aborts on cleanup and never writes a stale result. Slots are derived: no link is `none`, key not yet answered is `loading`, otherwise the outcome.
- `DocumentsSection` in the aside under `StatusHistory` (aside column is now `flex flex-col gap-6`). Two fixed rows (CV, Carta de presentación) with empty, loading (two skeletons), ok (label, mono size, `Descargar` anchor with `download`, `Download` icon, aria-label) and error (CircleAlert in `text-foreground`, no link) states.
- Delete dialog description ends with «Los documentos vinculados no se eliminan.».

## Decisions and scope notes

- **No dependency added.**
- **Scope:** 11 files as declared in the plan (over the 10-file warning, under the 15-file blocker), accepted explicitly in the plan; not split.
- **Documents effect key:** `${applicationId}#${attempt}:${cv ?? ""}:${coverLetter ?? ""}`. A status change or round mutation returns the same links, so the key is unchanged and no `GET /api/documents/*` is repeated (tested). A different application id or link set changes the key, so the previous rows are never shown (tested).
- **Live regions:** the section adds exactly one `role="status"` region (sr-only «Cargando documentos…», empty after loading). A failed row's sentence sits in an always-mounted `aria-live="polite"` div without a role. The detail's status-region count goes from 3 to 4 (the test was updated).
- **Replaced Phase 2 test:** «never renders linked documents» was replaced by a test that the section renders under the history with its two fixed rows, plus a «documents section» describe (empty, populated, loading, 404, network failure, no refetch, id change).
- **A2 backstop for the UAT:** with the `download` attribute, a download whose endpoint answers 404 should leave the SPA in place instead of replacing the tab with the JSON error. This cannot be asserted in jsdom; check it once in a real browser. If a browser misbehaves, remove the attribute (D-24 behaviour is unchanged).

## Verification

- `npm run typecheck`, `npm run test` (web: 547 tests, 15 files; run by the pre-commit hook for both commits), `npm run lint`: all pass.
- All Task 1 and Task 2 acceptance greps pass.

## TDD Gate Compliance

The pre-commit hook runs the full suite, so a RED commit could not be recorded. RED was observed locally before each implementation: Task 1 with `formatFileSize` missing (8 failing rows in `format.test.ts`) and the pod tests written first; Task 2 with the updated copy test failing (`1 failed | 74 passed`) before the sentence was added. GREEN was committed together with its tests in `399c46f` (Task 1) and `5e989f5` (Task 2). No refactor commit.

## Deviations from Plan

None - plan executed exactly as written. (Prettier reformatted a few lines after writing; no behaviour change.)

## Commit count

Measured with `git rev-list --count b3f42395f7273b5aff93431064ad1538cdb12b8e..HEAD` because the shared `.git` directory is not writable from the worktree (no ledger file): 2 commits before this SUMMARY commit.

- `399c46f` feat(05-07): show the linked CV and cover letter in the application detail
- `5e989f5` feat(05-07): tell the user linked documents stay when an application is deleted

## Known Stubs

None.

## Threat Flags

None. Mitigations of the register are in place: `encodeURIComponent` in `getDocument` and the download href (T-05-28), React text nodes only for names and versions (T-05-29), `Promise.allSettled` with a per-row error slot and tests for 404 and network failure (T-05-30).

## Requirement

DOC-04 is complete: API in 05-02, UI here.

## Self-Check: PASSED

- documents-section.tsx exists; commits `399c46f` and `5e989f5` are ancestors of HEAD.
