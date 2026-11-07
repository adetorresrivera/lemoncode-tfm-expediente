---
phase: 06-pulido-de-demo
plan: 01
subsystem: api-seed
tags: [seed, mongo, silo, services, idempotency, pdf]
requires: []
provides:
  - "npm run seed (root and @tfm/api) running the compiled dist/scripts/seed.js"
  - "buildSeedPlan(now): pure seed plan (one document, one application in this plan)"
  - "runSeed(deps): service-driven runner with seed-only cleanup"
  - "storage-only seed: true mark on applications and documents"
  - "cv-frontend.pdf demo asset copied to dist by the build"
affects: [06-02]
tech-stack:
  added: []
  patterns:
    - "Injected mutable clock passed as the `now` argument of both services"
    - "Assets located with new URL(..., import.meta.url), valid from src and dist"
key-files:
  created:
    - apps/api/src/scripts/seed.ts
    - apps/api/src/scripts/seed/seed.plan.ts
    - apps/api/src/scripts/seed/seed.run.ts
    - apps/api/src/scripts/seed/seed.run.test.ts
    - apps/api/src/scripts/assets/cv-frontend.pdf
  modified:
    - apps/api/package.json
    - package.json
    - .gitattributes
key-decisions:
  - "Seed marks records with seed: true through the untyped collection; ApplicationDoc, DocumentDoc and contracts are untouched (D-02)"
  - "All timestamps come from the services via an injected clock; the only direct Mongo write is the mark (D-06 amended)"
  - "Root seed script ends with `--` so flags reach the child script (Pitfall 1)"
requirements-completed: [DEMO-01, DEMO-05]
duration: 25 min
completed: 2026-11-06
status: complete
commits: 1
plan_head_before: b5291beef861f609f52c6a08598f0d3b9d0ea042
plan_head_after: 2c511e0
actuals:
  tokens: 6500
  tasks: 1
  commits: 1
coverage:
  - deliverable: "npm run seed loads a linked CV and an application through the services; a second run replaces them"
    verification:
      - kind: test
        ref: "apps/api/src/scripts/seed/seed.run.test.ts"
        status: pass
      - kind: command
        ref: "npm run seed (twice, both printed Seed listo)"
        status: pass
    human_judgment: false
  - deliverable: "No real people or contact data in seeded content; no sensitive logging"
    human_judgment: true
    rationale: "Privacy prohibitions are judged by reading the invented data and log lines, no test asserts them"
---

# Phase 6 Plan 01: Seed tracer Summary

One command (`npm run seed`) fills Mongo and Silo with one linked CV and one application through the real documents and applications services with an injected clock, and a second run replaces exactly the `seed: true` records.

## Accomplishments

- Root `seed` forwards to `@tfm/api`, which runs `node dist/scripts/seed.js`; `npm run build -w @tfm/api` copies `src/scripts/assets` to `dist/scripts/assets`, so the seed needs neither tsx nor `docs/` at run time. `seed:dev` runs the same entry with tsx.
- `buildSeedPlan(now)` is pure: one document (`CV Frontend`, v3, now - 40 days) and one application (created `guardada` at now - 38 days, `enviada` at now - 37 days, linked to the CV).
- `runSeed` clears previous `seed: true` applications, the Silo objects of seeded documents and the seeded documents, then replays the plan through `createDocumentsService` / `createApplicationsService`; history, `appliedAt` and `updatedAt` come from the real rules.
- `cv-frontend.pdf` is a one-page Helvetica, Latin-1 PDF (invented person, `.example` contact), `*.pdf` marked binary in `.gitattributes`. The throwaway generator (the RESEARCH "Minimal readable PDF" script) lived in the scratchpad and is not committed.
- Integration test on `tfm_test` / `tfm-assets-test` (5 cases): planned counts and marks, CV link and `%PDF-` download, coherent history, second run replaces (old S3 keys answer null), a user's own application and document survive two runs, no `"seed"` key in `GET /api/applications` or `/api/documents`.

Seed output line (both runs, against the devcontainer `tfm` / `tfm-assets`):
`Seed listo: 1 candidaturas y 1 documentos en tfm / tfm-assets.` The second run first printed `Seed anterior eliminado: 1 candidaturas y 1 documentos.`

No dependency was added.

## Task Commits

1. Task 1 (tracer): `2c511e0` feat(06-01): seed tracer loads a linked CV and application through the services

## Verification

- `npm run test -w @tfm/api -- src/scripts/seed`: 5 passed.
- `npm run build -w @tfm/contracts && npm run build -w @tfm/api`; `dist/scripts/assets/cv-frontend.pdf` present; `npm run seed` twice printed `Seed listo:`.
- `npm run typecheck && npm run test`: contracts 57, api 412, web 615 passed.
- Acceptance greps: seed/cpSync/seed:dev scripts present, root `--` forwarding present, `binary: set` for the PDF, `%PDF-` / `%%EOF` markers, `seed` count 0 in the two repositories and two contract schemas.
- ESLint and Prettier clean on `apps/api/src/scripts`.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Known Stubs

None. The plan intentionally holds one document and one application; 06-02 fills the 12-application demo list and adds `--reset`.

## Threat Flags

None. No new network endpoint or trust boundary beyond the plan's threat model.

## Next Phase Readiness

Ready for 06-02: extend `buildSeedPlan` (12 applications, rounds, more documents), add `--reset` and prove flag forwarding through `npm run seed -- --reset`, and re-check the final command from the image WORKDIR.

## Self-Check: PASSED

- FOUND: apps/api/src/scripts/seed.ts, seed/seed.plan.ts, seed/seed.run.ts, seed/seed.run.test.ts, assets/cv-frontend.pdf
- FOUND: commit 2c511e0 (ancestor of HEAD)
