---
phase: 06-pulido-de-demo
plan: 02
subsystem: api-seed
tags: [seed, mongo, silo, reset, tdd, pdf, idempotency]
requires: [06-01]
provides:
  - "buildSeedPlan(now): 12 applications and 3 documents with every UI-SPEC section 9 display case"
  - "parseSeedArgs / SeedUsageError: strict options, exit 2 before any connection"
  - "runSeed reset path: announces database, bucket and counts, then wipes both collections and the bucket"
  - "keep-and-unmark rule for seed documents linked by a user application"
  - "cv-fullstack.pdf and cover-letter.pdf demo assets"
affects: [06-16]
tech-stack:
  added: []
  patterns:
    - "Pure plan + replay helper in the test to prove domain rules without services"
    - "Paginated ListObjectsV2 + DeleteObjects (1,000 per call, Quiet) for the bucket wipe"
key-files:
  created:
    - apps/api/src/scripts/seed/seed.plan.test.ts
    - apps/api/src/scripts/assets/cv-fullstack.pdf
    - apps/api/src/scripts/assets/cover-letter.pdf
  modified:
    - apps/api/src/scripts/seed/seed.plan.ts
    - apps/api/src/scripts/seed/seed.run.ts
    - apps/api/src/scripts/seed/seed.run.test.ts
    - apps/api/src/scripts/seed.ts
key-decisions:
  - "Status distribution: enviada 3, en_entrevistas 3, guardada 2, oferta_recibida 1, aceptada 1, rechazada 1, descartada 1; 3-round applications are one en_entrevistas (third round ahead), the oferta_recibida and the rechazada"
  - "Normal run keeps a seed document that a user application links, removes its seed mark and logs the count (rule 4 of docs/DOMAIN.md); --reset deletes everything, links included"
  - "Unknown options exit 2 before loadConfig, so a typo never touches Mongo or Silo"
requirements-completed: [DEMO-01, DEMO-05]
duration: 40 min
completed: 2026-11-06
status: complete
commits: 5
plan_head_before: a3fa42e51e8661e0ef430482763bdf89cad71a59
plan_head_after: 7d66ccf62e40e6c6dfd09d8d56e90b812eeba9ed
actuals:
  tokens: 28000
  tasks: 3
  commits: 5
coverage:
  - deliverable: "Pure 12-application, 3-document demo plan covering all statuses, rounds 0/1/3, the date window, document links and the display cases, excluding the mock draft and the fixture offers"
    verification:
      - kind: test
        ref: "apps/api/src/scripts/seed/seed.plan.test.ts"
        status: pass
    human_judgment: false
  - deliverable: "npm run seed lands the full list in Mongo and Silo with coherent histories, linked documents and downloadable PDFs"
    verification:
      - kind: test
        ref: "apps/api/src/scripts/seed/seed.run.test.ts"
        status: pass
      - kind: command
        ref: "npm run seed -> Seed listo: 12 candidaturas y 3 documentos en tfm / tfm-assets."
        status: pass
    human_judgment: false
  - deliverable: "--reset announces and wipes; unknown options are rejected; linked seed documents survive; interrupted runs recover"
    verification:
      - kind: test
        ref: "apps/api/src/scripts/seed/seed.run.test.ts#parseSeedArgs and reset cases"
        status: pass
      - kind: command
        ref: "npm run seed -- --nope (host exit 2, message printed)"
        status: pass
    human_judgment: false
  - deliverable: "The D-01 command resolves inside the runtime image tfm-app:0.1.0"
    verification:
      - kind: command
        ref: "docker run --rm --entrypoint npm tfm-app:0.1.0 run seed -- --nope (exit 2, 'Opción desconocida: --nope')"
        status: pass
    human_judgment: false
  - deliverable: "Seeded content is invented and readable (no real people, companies or contact data; PDFs legible)"
    human_judgment: true
    rationale: "Privacy and legibility are judged by reading the invented data and opening the PDFs; no test asserts them"
---

# Phase 6 Plan 02: Demo list and `--reset` Summary

The seed now loads a 12-application, 3-document demo list through the real services, and `npm run seed -- --reset` announces what it deletes before wiping Mongo and the bucket, so every rehearsal starts from the same list.

## Accomplishments

- **Demo plan (D-04, D-05, D-10).** 12 invented applications. Final statuses: enviada 3, en_entrevistas 3, guardada 2, oferta_recibida 1, aceptada 1, rechazada 1, descartada 1. Rounds: three applications with 3 rounds (Harbor Pine Software with its third round at now + 3 days 10:00 UTC, Mercado Atlas with an offer, Sendero Datos rejected after a failed technical test), three with 1 round, six with none. Companies: Estudio Ámbar, Cobalto Sistemas, Fundición Digital, Brújula Labs, Tinta y Byte, Harbor Pine Software, Quillon Works, Olivar Cloud, Mercado Atlas, Kestrel Forge, Sendero Datos, Pajarera Studio. Display cases: 7 tags on one card (`+N`), no salary (Fundición Digital), no location (Brújula Labs), a 71-character title, remoto/hibrido/presencial all present, salary with only a minimum, all documents in use (CV Frontend on 7 applications, CV Full Stack on 3, Carta de presentación on the two 3-round applications that carry it).
- **D-08.** No company or title equals the mock draft («Lumen Analytics») or the three fixture offers (`Nimbo Software`, `Talleres Digitales del Sur`, `Northwind Labs`); the test asserts it against `MOCK_OFFER_EXTRACTION` and `OFFER_FIXTURES`. The seed ends with «Ofertas para pegar en la demo: docs/demo/ofertas/».
- **PDFs (D-07).** `cv-fullstack.pdf` (Mario Ejemplo Ruiz) and `cover-letter.pdf` (Lucía Demo Pérez) generated with the RESEARCH script (kept in the scratchpad, not committed): one page, Latin-1, binary per `.gitattributes`, accepted by `detectDocument`, each download starts with `%PDF-`.
- **`--reset` (D-03).** Reset log line, verbatim from the test on `tfm_test` / `tfm-assets-test`: `Borrando todo en tfm_test / tfm-assets-test: 1 candidaturas, 1 documentos, N objetos.` It is logged after counting and before any deletion (a test where the log call throws proves nothing was deleted). Bucket wipe is a paginated `ListObjectsV2` plus `DeleteObjects` in batches of at most 1,000 with `Quiet: true`, failing on `Errors`.
- **Strict options.** `parseSeedArgs` accepts only `--reset`; anything else throws `SeedUsageError` («Opción desconocida: --rest. Uso: npm run seed [-- --reset]»). `seed.ts` prints it to stderr and exits 2 before `loadConfig`.
- **Rule-4 keep decision.** A normal run keeps any seed document that a non-seed application links, `$unset`s its `seed` field, keeps its object and logs «N documentos de demo quedan en tu biblioteca porque los usa una candidatura tuya.». The user application keeps a resolvable link. `--reset` deletes everything, links included.
- **Interrupted run.** A storage that rejects the second `put` leaves only `seed: true` records; the next normal run ends with exactly 12 + 3.
- **In-image check (D-01).** `docker compose build app` built `tfm-app:0.1.0`; `docker run --rm --entrypoint npm tfm-app:0.1.0 run seed -- --nope` (image WORKDIR `/app`, user `node`) exited 2 and printed «Opción desconocida: --nope», so root script -> `@tfm/api` -> `dist/scripts/seed.js` resolves in the runtime image. No fix to the Dockerfile was needed.

No dependency was added (`ListObjectsV2Command` and `DeleteObjectsCommand` come from the existing `@aws-sdk/client-s3`).

## Flagged Assumptions (not resolved)

- Two seed runs started in parallel are not supported; the presenter runs one at a time.
- A crash in the instant between an application (or document) insert and its `seed` mark leaves one unmarked record that only `--reset` removes.

## Task Commits

1. Task 1: `cb022bf` test (RED), `db0ab27` feat (GREEN, plan + 2 PDFs), `c8765eb` refactor (read the clock once as `origin`)
2. Task 2: `3666c16` test(06-02): full plan lands coherently in Mongo and Silo (runner needed no change)
3. Task 3: `7d66ccf` feat(06-02): `--reset`, strict options, keep-linked rule, interrupted-run recovery

## TDD Gate Compliance

- Task 1: RED `cb022bf` (6 of 10 plan tests failed on the planned assertions against the 06-01 plan: counts, statuses, rounds, display cases, links) then GREEN `db0ab27`. Semantic assessment: the failures were assertion failures on the target behaviours, not import or fixture faults.
- Task 3: RED was run (7 of 16 tests failed on assertions or `parseSeedArgs is not a function`) but it was NOT committed separately: the pre-commit hook runs `tsc --noEmit`, which rejects a test file importing `parseSeedArgs` / `SeedUsageError` before they exist, and `--no-verify` is not allowed. Tests and implementation went into the single `7d66ccf` commit. This is a gate deviation for Task 3 only.

## Verification

- `npm run test -w @tfm/api -- src/scripts/seed`: 26 passed (10 plan, 16 runner; 18 after Task 2, 8 more in Task 3).
- `npm run typecheck && npm run test && npm run lint`: contracts 59, api 464, web 711 passed, no TS or ESLint problems.
- `npm run seed` (devcontainer `tfm` / `tfm-assets`): `Seed listo: 12 candidaturas y 3 documentos en tfm / tfm-assets.` then `Ofertas para pegar en la demo: docs/demo/ofertas/`. `ls apps/api/dist/scripts/assets/*.pdf | wc -l` = 3.
- `npm run seed -- --nope`: exits 2 and prints «Opción desconocida: --nope» (host and image). `--reset` was never run against the devcontainer database.
- Acceptance greps: `Date.now`/`Math.random` count 0 in `seed.plan.ts`; `MOCK_OFFER_EXTRACTION` and `OFFER_FIXTURES` in the plan test; `DeleteObjectsCommand`, `ListObjectsV2Command` in `seed.run.ts`; `parseSeedArgs` in `seed.ts`; `binary: set` for `cover-letter.pdf`.

## Deviations from Plan

**1. [Rule 3 - Blocking] In-image check run with `--entrypoint npm`, not `--entrypoint sh`**
- **Found during:** Task 3
- **Issue:** The agent sandbox refuses `docker run ... sh -c`, so the plan's third verify command could not run verbatim.
- **Fix:** Ran `docker run --rm --entrypoint npm tfm-app:0.1.0 run seed -- --nope`, redirecting the output to a host file and checking the exit code (2) and the message. Same WORKDIR, user and npm resolution.
- **Files modified:** none
- **Commit:** n/a

**2. [Rule 2 - Missing critical] Tests reset the test database before each case**
- **Found during:** Task 1 (a first run saw 13 applications, a leftover in the shared `tfm_test` from another run)
- **Fix:** `beforeEach(wipe)` next to `afterEach(wipe)` in `seed.run.test.ts`, which also removes the objects of leftover documents.
- **Commit:** `7d66ccf`

**3. [Gate] Task 3 RED not committed separately** (see TDD Gate Compliance).

**Total deviations:** 3 (1 blocking-environment, 1 robustness, 1 TDD commit granularity). **Impact:** none on behaviour or on the plan's acceptance criteria. Note for the orchestrator: API integration tests share the single `tfm_test` database and the `tfm-assets-test` bucket (D-11), so other worktree agents running API tests at the same moment can disturb the counts of these cases.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint or trust boundary beyond the plan's threat model (T-06-05, T-06-06, T-06-07, T-06-30 mitigated as planned; T-06-SC: no package installed).

## Next Phase Readiness

Ready for the plans that rely on the seeded list (README, rehearsal and cold smoke in 06-16): `npm run seed -- --reset` is the rehearsal command, and the offers to paste live live in `docs/demo/ofertas/` (created by another plan).

## Self-Check: PASSED

- FOUND: apps/api/src/scripts/seed/seed.plan.ts, seed.plan.test.ts, seed.run.ts, seed.run.test.ts, seed.ts, assets/cv-fullstack.pdf, assets/cover-letter.pdf
- FOUND: commits cb022bf, db0ab27, c8765eb, 3666c16, 7d66ccf (ancestors of HEAD)
