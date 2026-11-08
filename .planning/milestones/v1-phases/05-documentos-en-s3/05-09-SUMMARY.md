---
phase: 05-documentos-en-s3
plan: 09
subsystem: infra
tags: [compose-smoke, docker, multipart, docs, phase-gate]

requires:
  - phase: 05-documentos-en-s3
    provides: documents API (05-01..05-03), upload/picker/library UI (05-04..05-08)
provides:
  - documents round trip in scripts/compose-smoke.sh against the delivered image
  - DOMAIN, ARCHITECTURE and DESIGN describing the documents feature as built
  - green phase gate (typecheck, lint, test, build)
affects: [phase 6 seed, phase verification (/gsd-verify-work UAT backstops)]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 63132c6b3a915b41b9e63c143dfe7a7da221ff81
plan_head_after: 96b6fdd237cd0496d004791b11ccbafeea7b5400

tech-stack:
  added: []
  patterns:
    - "http_upload mirrors http_send: argv only, result polled from /tmp/smoke.out, bytes built inside the container"

key-files:
  created: []
  modified:
    - scripts/compose-smoke.sh
    - docs/DOMAIN.md
    - docs/ARCHITECTURE.md
    - docs/DESIGN.md

key-decisions:
  - "The smoke deletes the application before the document (rule 4 blocks the reverse) and checks rule 5 by reading the document back with 200 after the application is gone."
  - "Docs only describe what was built; no new decisions. The 400 on a wrong link and the two 404 messages come from the 05-02 and 05-03 summaries."

requirements-completed: [DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06]

coverage:
  - id: D1
    description: "The delivered image uploads a PDF (201), lists it with usedBy 0, reads and downloads it (body starts with %PDF-), links it to an application, refuses its delete with 409 DOCUMENT_IN_USE, keeps it when the application is deleted (rule 5), deletes it (204, then 404), and answers 415 for a .txt and 413 for a 6 MB .pdf"
    requirement: DOC-01
    verification:
      - kind: integration
        ref: "bash scripts/compose-smoke.sh --down (section «documents round trip»), ends with SMOKE OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "DOMAIN.md, ARCHITECTURE.md and DESIGN.md describe the documents model, endpoints, module and pod structure, composition slots and screens as built"
    requirement: DOC-06
    verification:
      - kind: other
        ref: "acceptance greps of plan 05-09 task 2 (fileName, GET /api/documents/:id row, document-list, renderDocumentPicker, no placeholder, Documentos screen); prettier --check on the three docs"
        status: pass
    human_judgment: true
    rationale: "Whether the prose is accurate and readable is a reviewer judgment; no test asserts it"
  - id: D3
    description: "The whole monorepo typechecks, lints, tests and builds"
    verification:
      - kind: unit
        ref: "npm run typecheck && npm run lint && npm run test && npm run build"
        status: pass
    human_judgment: false
  - id: D4
    description: "Word and LibreOffice .docx files are accepted; Chrome download after deleting the object; layout at 360 px; 6 MB 413 message in a real browser"
    verification:
      - kind: manual_procedural
        ref: "plan 05-09 task 2 human-check (RESEARCH Assumptions A1, A2, Pitfall 4)"
        status: unknown
    human_judgment: true
    rationale: "Real producers and a real browser are needed; left for /gsd-verify-work"

duration: 25min
completed: 2026-11-04
status: complete
---

# Phase 5 Plan 09: Documents in the delivered image, docs and phase gate Summary

**The compose smoke now proves the whole documents flow inside the Docker image (multipart upload, list with usedBy, read, download, link, 409 of rule 4, rule 5, delete, 415, 413) and leaves nothing behind; DOMAIN, ARCHITECTURE and DESIGN describe the feature as built; the full gate is green.**

No dependency added.

## Accomplishments

- `http_upload PATH FILE_NAME TYPE SIZE_BYTES [PDF|TEXT]` next to `http_send`: bytes are built with `Buffer` inside the app container and posted as a `FormData` with `fetch`, so the 6 MB body of the 413 check is a real multipart request with its real Content-Length.
- Section «documents round trip» between «interview rounds round trip» and «offers route»: 201 upload, list with `"usedBy":0`, GET by id 200, download 200 with `%PDF-`, application created with `cvDocumentId` 201, 409 `DOCUMENT_IN_USE`, application deleted 204, document still readable (rule 5), document deleted 204 then 404, `.txt` 415 `UNSUPPORTED_FILE_TYPE`, 6 MB `.pdf` 413 `FILE_TOO_LARGE`.
- `docs/DOMAIN.md`: Document model with `fileName`, how `fileName` and the S3 key slug are derived, `mimeType` from the file signature, `usedBy` derived and never stored; rules 4 and 5 completed with the real message and the 400 on a wrong link.
- `docs/ARCHITECTURE.md`: contracts line, documents module file list, `createDocumentStorage`, the three new indexes, the refined documents endpoint rows plus `GET /api/documents/:id`, the documents 404 messages and link validation in the codes paragraph, `document-list` scene, pod and `/documents` route, and the composition rules (`renderDocumentPicker`, `renderHeader`, refresh signal).
- `docs/DESIGN.md`: «Documentos» active in the Shell, the `/documents` screen, the detail aside with the linked CV and cover letter, and the form's Documentos section with «Subir nuevo». This also closes the DESIGN.md item flagged in 05-08 (UI-SPEC §5).

## Task Commits

1. **Task 1: documents round trip in the compose smoke** - `5f17b1c` (test)
2. **Task 2: reference docs describe the documents feature** - `96b6fdd` (docs)

`commits: 2` is measured with `git rev-list --count 63132c6b3a915b41b9e63c143dfe7a7da221ff81..HEAD` before this SUMMARY commit (the shared `.git` is not writable from the worktree, so no ledger file was kept); `plan_head_after` is the HEAD before the SUMMARY commit.

## Verification Results

- `bash -n scripts/compose-smoke.sh` ok; `docker compose version` v5.6.1.
- `bash scripts/compose-smoke.sh --down`: exit 0, the log shows every section including «documents round trip», last line `SMOKE OK`. The image was built from this worktree. The containers were removed (`--down`), volumes untouched by design.
- `npm run typecheck && npm run lint && npm run test && npm run build`: exit 0 (contracts 57, api 407, web 614 tests; build contracts, api, web).
- Acceptance greps of both tasks pass. `prettier --check` passes on the three docs (it has no parser for the `.sh`).

## Deviations from Plan

None - plan executed exactly as written.

## UAT backstops left for /gsd-verify-work

1. Upload a `.docx` saved by Microsoft Word and one saved by LibreOffice (RESEARCH Assumption A1; the signature check reads the ZIP central directory).
2. In Chrome, open «Descargar» after deleting the object from the Silo console (the tab must stay in the SPA; otherwise drop the `download` attribute).
3. At 360 px, open `/documents`, the application form and a detail with long names: no horizontal scroll.
4. Upload a 6 MB PDF with the client check bypassed to see «El archivo supera 5 MB.» under «Archivo».

## Known Stubs

None.

## Threat Flags

None. T-05-34 is mitigated: the smoke deletes its application and document and asserts the 404; the 415 and 413 uploads store nothing. A failure in the middle of the section would exit through `fail` without cleanup, as in the older sections (the missing cleanup trap is the open Phase 2 finding WR-02, not addressed here).

## Self-Check: PASSED

- Modified files exist: scripts/compose-smoke.sh, docs/DOMAIN.md, docs/ARCHITECTURE.md, docs/DESIGN.md.
- Commits `5f17b1c` and `96b6fdd` are ancestors of HEAD.
