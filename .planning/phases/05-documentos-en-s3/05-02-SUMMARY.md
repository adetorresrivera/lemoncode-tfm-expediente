---
phase: 05-documentos-en-s3
plan: 02
subsystem: api
tags: [hono, mongodb, aggregation, s3, silo, download, delete]

requires:
  - phase: 05-documentos-en-s3
    provides: "05-01 upload path: DocumentStorage, DocumentsRepository.insert, documentsRoutes POST, contentDisposition, test helpers"
provides:
  - GET /api/documents (newest first, usedBy, ?type filter)
  - GET /api/documents/:id
  - GET /api/documents/:id/download (streamed, original name, nosniff)
  - DELETE /api/documents/:id (409 DOCUMENT_IN_USE when linked)
  - Real-Silo contract test of the S3 adapter
affects: [05-03 link validation, 05-04..05-08 web pods, phase 6 seed]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 31d1d455adccecd21776b53b595400a800f1c86e
plan_head_after: 39a010e7912c2b5a7b2f1a251c608186d6b7056c

tech-stack:
  added: []
  patterns:
    - "usedBy computed per request by one aggregation over applications ($project ids, $unwind, $match string, $group); never stored"
    - "Delete order: 404 check, 409 check, Mongo deleteById, then object delete best effort with its error swallowed"
    - "Download header value only from contentDisposition(document.fileName)"
    - "parseObjectId takes the not-found message so each resource keeps its own 404 text"

key-files:
  created:
    - apps/api/src/documents/documents.test.ts
    - apps/api/src/storage/storage.test.ts
  modified:
    - apps/api/src/http/object-id.ts
    - apps/api/src/db/mongo.ts
    - apps/api/src/documents/documents.mapper.ts
    - apps/api/src/documents/documents.repository.ts
    - apps/api/src/documents/documents.service.ts
    - apps/api/src/documents/documents.routes.ts
    - apps/api/src/documents/documents.upload.test.ts
    - apps/api/src/test/documents.ts

key-decisions:
  - "Delete removes the Mongo record first and the S3 object second; an object delete failure is swallowed and answers 204 anyway. An orphan object is invisible and harmless, a record pointing to a missing object is not (D-11). Nothing is logged, so no key or file name can leak."
  - "Three new indexes: documents createdAt_-1 (list order), applications cvDocumentId_1 and coverLetterDocumentId_1 (in-use check), all in ensureIndexes."
  - "parseObjectId(raw, notFoundMessage = 'Candidatura no encontrada'): existing callers keep their message."
  - "Accepted race T-05-14: a link saved between the 409 check and the delete could point to a deleted document. Single-user local app; 05-03 rejects links to unknown documents, so a later save surfaces it as a 400."
  - "Assumption-delta decision: no-change. The word 'optional' describes the type query filter, not a relaxed identity field."

patterns-established:
  - "Same-instant list ordering: sort { createdAt: -1, _id: -1 }, stable across requests"
  - "fakeStorage({ failDelete }) to prove callers never depend on object delete succeeding"

requirements-completed: []
requirements-partial:
  - id: DOC-04
    done: "Download endpoint streams the stored bytes with the original name; 404 for missing record or object (API)"
    pending: "Download button in the detail UI (05-07)"
  - id: DOC-05
    done: "DELETE refuses a linked document with 409 DOCUMENT_IN_USE and the D-29 sentence; unlinked delete removes record then object (API)"
    pending: "UI message in the library (05-08)"
  - id: DOC-06
    done: "List with usedBy, newest first, type filter and 400 on invalid filter (API)"
    pending: "Library UI (05-08)"

coverage:
  - id: D1
    description: "GET /api/documents lists newest first with usedBy and the type filter; invalid or repeated type answers 400; empty answers []"
    requirement: DOC-06
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.test.ts (describe GET /api/documents)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Same-instant documents come back in a stable order, later-created first"
    requirement: DOC-06
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.test.ts#orders documents created at the same instant by the later one first, stably"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET :id and download answer the stored data, with accents in the file name preserved and nosniff; unknown, malformed id and missing object answer 404 with distinct messages"
    requirement: DOC-04
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.test.ts (describe GET /api/documents/:id and /download)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Delete is refused with 409 when a CV or cover letter link exists, removes record then object otherwise, and still answers 204 when the object delete fails"
    requirement: DOC-05
    verification:
      - kind: integration
        ref: "apps/api/src/documents/documents.test.ts (describe DELETE /api/documents/:id)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The real S3 adapter stores and streams back the same bytes in Silo, answers null for deleted or never-written keys, and delete is idempotent"
    requirement: DOC-04
    verification:
      - kind: integration
        ref: "apps/api/src/storage/storage.test.ts"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 02: List, read, download and delete documents Summary

**Documents API widened with a newest-first list carrying `usedBy` and a type filter, `GET :id`, a streamed download with the accented original name, and a delete that rule 4 refuses with 409 when any application links the document, plus a real-Silo contract test of the adapter.**

No dependency added.

## Performance

- **Duration:** about 10 min
- **Completed:** 2026-11-04
- **Tasks:** 2
- **Files:** 10 (2 created, 8 modified)

## Accomplishments

- `GET /api/documents` answers items that parse with `documentListItemSchema`, sorted `{ createdAt: -1, _id: -1 }`; `usedBy` comes from one aggregation over `applications` that ignores null or absent links.
- `GET /api/documents/:id` and `/download` share the 404 «Documento no encontrado» for unknown and malformed ids (no id oracle); an object missing from storage answers 404 «Archivo no encontrado» instead of a 500 or an empty 200.
- Download streams the object (`transformToWebStream`, no buffering) with Content-Type from the stored mime type, Content-Length from the stored size, Content-Disposition only from `contentDisposition(fileName)` and the global `nosniff`.
- `DELETE /api/documents/:id`: 404 check, `isInUse` 409 `DOCUMENT_IN_USE` with the D-29 sentence, `deleteById`, then `storage.delete` with its error swallowed.
- `fakeStorage({ failDelete })` and `storage/storage.test.ts` (real Silo, bucket `tfm-assets-test` only).

## Task Commits

1. **Task 1: List, read and download** - `7df360f` (feat)
2. **Task 2: Delete with rule 4 and the Silo contract test** - `39a010e` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing upload test stubs did not satisfy the widened repository interface**
- **Found during:** Task 1 commit (pre-commit typecheck)
- **Issue:** `documents.upload.test.ts` built `DocumentsRepository` objects with only `insert`, so `tsc` failed once the interface gained `list`, `findById`, `usageCounts` (and later `isInUse`, `deleteById`).
- **Fix:** A `repositoryWith(insert)` helper fills the other methods with stubs that throw if reached.
- **Files modified:** apps/api/src/documents/documents.upload.test.ts
- **Commits:** 7df360f, 39a010e

**2. [Rule 3 - Blocking] `remove` helper type in the new test**
- **Found during:** Task 2 typecheck
- **Issue:** `app.request` returns `Response | Promise<Response>`, not assignable to `Promise<Response>`.
- **Fix:** The helper is `async` and awaits the request.
- **Files modified:** apps/api/src/documents/documents.test.ts
- **Commit:** 39a010e

**Total deviations:** 2 auto-fixed (both Rule 3, test typing). **Impact:** none on behavior or scope.

## TDD Gate Compliance

The plan is `type: execute`, so the plan-level gate does not apply; both tasks carry `tdd="true"`. The pre-commit hook runs the whole test suite, so a failing RED commit cannot be made. RED was observed locally instead: for Task 2 the delete tests were written first and failed against the unchanged code (6 failures: 404 instead of 204/409, «Recurso no encontrado» instead of «Documento no encontrado»), then turned green with the implementation. For Task 1 the tests and implementation were written in the same working pass and run green together (no separate failing run was captured). RED and GREEN are committed together as `feat(05-02)`; there is no `refactor` commit.

## Issues Encountered

- The per-plan commit ledger could not be written inside the worktree (shared `.git` is read-only); `commits`, `plan_head_before` and `plan_head_after` were measured with `git rev-list --count 31d1d455adccecd21776b53b595400a800f1c86e..HEAD` (2, before the SUMMARY commit).
- The first Task 1 commit attempt was rejected by the hook (typecheck on the stale upload test stubs); fixed as deviation 1 and re-committed once.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-05-14 (link/delete race) is accepted as documented.

## Next Phase Readiness

Everything the web plans call exists and is tested on real Mongo: list, get, download, delete. Ready for 05-03 (link validation against `documents`), which also closes the stale-link edge of T-05-14. DOC-04, DOC-05 and DOC-06 stay partial until the UI in 05-07 and 05-08.

## Self-Check: PASSED

- Created files exist: `documents.test.ts`, `storage.test.ts` (verified through `git status` and commit contents).
- Commits `7df360f` and `39a010e` are ancestors of HEAD.
- `npm run typecheck`, `npm run test` (contracts 20, api 397, web 498) and `npm run lint` exit 0; all acceptance greps of both tasks pass.
