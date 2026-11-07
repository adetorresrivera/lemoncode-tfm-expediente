---
phase: 06-pulido-de-demo
verified: 2026-11-07T12:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/06-pulido-de-demo/06-01-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-01-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-02-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-02-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-03-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-03-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-04-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-04-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-05-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-05-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-06-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-06-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-07-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-07-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-08-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-08-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-09-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-09-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-10-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-10-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-11-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-11-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-12-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-12-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-13-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-13-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-14-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-14-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-15-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-15-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-16-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-16-SUMMARY.md"
  - ".planning/phases/06-pulido-de-demo/06-17-PLAN.md"
  - ".planning/phases/06-pulido-de-demo/06-17-SUMMARY.md"
  - "README.md"
  - "apps/api/src/scripts/seed.ts"
  - "apps/api/src/scripts/seed/seed.plan.ts"
  - "apps/api/src/scripts/seed/seed.run.ts"
  - "apps/web/src/layouts/app-layout.tsx"
  - "apps/web/src/test/a11y.test.tsx"
  - "apps/web/src/test/responsive.test.tsx"
  - "compose.yml"
  - "docs/img/application-list.png"
covered_digest: "v4:sha256:d40e870cbb36abd0f24e1078142f1717762fa09f6a7bb86230c6e995e7a876cb"
behavior_unverified: 0
overrides_applied: 0
advisory:
  - finding: "06-REVIEW.md WR-01..WR-03 and IN-01..IN-05 are all still `open` in 06-REVIEW-DISPOSITION.md (e.g. WR-03: seed marking is a second write, an interrupted seed leaves unmarked demo records)"
    category: other
    reason: "Not on the demo happy path; none contradicts a roadmap success criterion. Triage before ship."
    evidence_status: "none provided (no failing test)"
  - finding: "Browser checks in 06-UAT.md (viewport matrix, focus walk, reduced motion, screenshot) were run by an automated Playwright pass, not by hand; timed demos (13 s mock, 48 s Ollama) are the presenter's stopwatch"
    category: other
    reason: "Recorded honestly in the UAT file; the same properties have jsdom guards (responsive.test.tsx, a11y.test.tsx) that pass. The verifier had no browser and could not re-run them."
    evidence_status: "UAT record plus passing guards"
---

# Phase 6: Pulido de demo Verification Report

**Phase Goal:** As the presenter, I want seeded data, a README and a responsive, accessible UI, so that the full demo runs in under 2 minutes on a clean machine.
**Verified:** 2026-11-07
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | `npm run seed` (and `docker compose exec app npm run seed`) loads demo applications and documents into Mongo and Silo, leaving a list worth demoing; the 3 fixture offers are in `docs/demo/ofertas/` | ✓ VERIFIED | `apps/api/src/scripts/seed.ts` wires `connectMongo`, `createS3Client`, `ensureBucket`, `runSeed`; `seed.run.ts` is substantive (uploads PDFs through `documentsService`, creates applications through `applicationsService` with status and interview timeline, marks `seed:true`, idempotent `clearSeedData`, `--reset` wipes DB + bucket, strict arg parsing). `seed.plan.ts` plans 12 applications covering all 7 statuses, 0/1/3 rounds and 3 documents. Package script `seed` -> `node dist/scripts/seed.js`; `build` copies PDF assets to `dist/scripts/assets` (present); Dockerfile copies `apps/api/dist` so the in-image command works. The 3 fixture `.txt` files exist (34-40 lines each) and are not in the plan (D-08). Seed unit tests pass (api 467/467). |
| 2 | README lets someone on a clean machine run the project, seed it, switch `LLM_PROVIDER`, and recover with `mock` when Ollama fails | ✓ VERIFIED | `README.md` (177 lines): 3-command start, seed + `--reset`, fixture offers, «Cambiar de modelo» (`LLM_MODEL`, `LLM_PROVIDER=openai`), warm-up, «Si Ollama falla» with `LLM_PROVIDER=mock docker compose up --build -d` and the way back. `compose.yml` forwards `LLM_PROVIDER: ${LLM_PROVIDER:-ollama}` to `app`, so the documented command works. `.env.example` lists `LLM_PROVIDER`. Screenshot `docs/img/application-list.png` exists and is referenced. 06-17 records `compose-smoke.sh --cold` (clean volumes, seed, PDF download, mock extraction) ending `SMOKE OK`. |
| 3 | Every screen usable from 360 px without horizontal scroll and fully keyboard-operable, visible focus, labelled fields, `aria-live="polite"` on load/error/AI results, AA contrast in both themes | ✓ VERIFIED | Code: skip link «Saltar al contenido» -> `#main-content` in `layouts/app-layout.tsx`; `role="status" aria-live="polite"` regions across list, detail, edit, offer panel, documents, dialogs (20+ sites); 44 px classes present (`h-11` status filter, `h-11 min-w-11` chips, `size-11` sheet close); Radix animations behind `motion-safe:` in dialog, alert-dialog and sheet. Tests: `a11y.test.tsx` (axe on every screen/state, both themes), `live-regions.test.tsx`, `responsive.test.tsx` (670 lines), `common/lib/contrast.ts` with `contrast.test.ts` over theme tokens, `view-states.test.tsx`; all pass (web 890/890). UAT: 30-cell viewport matrix N <= M everywhere, focus walk 10/10 screens visible, 6 findings fixed with guards (98e5c63, bd6f63b). See advisory on who ran the browser. |
| 4 | Full demo flow completes in under 2 minutes with Ollama and with `mock` | ✓ VERIFIED | `06-UAT.md` tests 5 and 6: `seconds: 13` (mock) and `seconds: 48` (Ollama after the README warm-up), presenter's stopwatch; UAT gate recorded OK. Cold-start path covered by `compose-smoke.sh --cold`. Not re-timed by the verifier (no browser). |
| 5 | Tests pending from earlier phases are written; `npm run typecheck && npm run test` pass on a clean checkout | ✓ VERIFIED | Run by the verifier on the current tree: `npm run typecheck` clean in all workspaces; `npm run test` contracts 59/59, api 467/467, web 890/890; `eslint . --max-warnings=0` clean. No `.skip`/`.todo`/`.only` and no `TODO/FIXME/XXX/TBD` markers in `apps`, `packages`, `scripts`, `README.md`. Clean-checkout run recorded in 06-VALIDATION.md (C97); 02- and 05-VALIDATION closed (06-15). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/api/src/scripts/seed.ts`, `seed/seed.run.ts`, `seed/seed.plan.ts` | Idempotent seed with `--reset` | ✓ VERIFIED | Substantive and wired through the real services; assets copied at build |
| `apps/api/src/scripts/assets/*.pdf` | 3 demo PDFs | ✓ VERIFIED | Present in src and dist |
| `docs/demo/ofertas/*.txt` | 3 fixture offers | ✓ VERIFIED | 3 files, not seeded |
| `README.md` | Run, seed, switch provider, mock recovery | ✓ VERIFIED | Complete, matches compose |
| `docs/img/application-list.png` | README screenshot | ✓ VERIFIED | Exists, referenced from README |
| `layouts/app-layout.tsx` | Skip link and `main#main-content` | ✓ VERIFIED | Present |
| `test/a11y.test.tsx`, `live-regions.test.tsx`, `responsive.test.tsx`, `contrast.test.ts` | A11y and responsive guards | ✓ VERIFIED | Present and green |
| `scripts/compose-smoke.sh`, `scripts/compose.cold.yml` | Cold smoke | ✓ VERIFIED | Present; documented in README |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| root `npm run seed` | `seed.js` | `npm run seed -w @tfm/api` -> `node dist/scripts/seed.js` | WIRED | README notes build first in devcontainer |
| `seed.run.ts` | applications/documents services | `createApplicationsService`, `createDocumentsService` with injected clock | WIRED | Domain rules apply to seeded data |
| README mock recovery | `app` container | `LLM_PROVIDER` interpolation in `compose.yml` | WIRED | |
| Skip link | `main#main-content` | href `#main-content` | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Seeded list | applications / documents | seed -> services -> Mongo/S3 | Yes (no fixtures hardcoded in UI) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck | `npm run typecheck` | exit 0 | ✓ PASS |
| Full test suite (run once) | `npm run test` | 59 + 467 + 890 passed | ✓ PASS |
| Lint | `npx eslint . --max-warnings=0` | clean | ✓ PASS |
| Live stack at :8080 | `curl localhost:8080/api/health` | unreachable from the verifier's container (stack runs on the host) | ? SKIP (covered by UAT record) |

### Probe Execution

Step 7c: no `probe-*.sh` declared. `scripts/compose-smoke.sh` is Docker-based and was not re-run by the verifier; the plans record `SMOKE OK` for `--down` and `--cold` (06-17, C98/C134/C141).

### Requirements Coverage

All six IDs appear in PLAN frontmatter and in REQUIREMENTS.md; no orphans.

| Requirement | Source Plans | Description | Status | Evidence |
| ----------- | ------------ | ----------- | ------ | -------- |
| DEMO-01 | 06-01, 06-02, 06-03, 06-16 | Seed, idempotent, `--reset`, fixtures not seeded | ✓ SATISFIED | Truth 1 |
| DEMO-02 | 06-16, 06-17 | README run/seed/provider/mock | ✓ SATISFIED | Truth 2 |
| DEMO-03 | 06-06, 06-07, 06-08, 06-11, 06-17 | 360 px no horizontal scroll | ✓ SATISFIED | Truth 3 |
| DEMO-04 | 06-06 to 06-12, 06-17 | Keyboard, focus, labels, aria-live, AA | ✓ SATISFIED | Truth 3 |
| DEMO-05 | 06-01 to 06-06, 06-10, 06-16, 06-17 | Demo under 2 min, Ollama and mock | ✓ SATISFIED | Truth 4 |
| DEMO-06 | 06-13, 06-14, 06-15, 06-17 | Pending tests, typecheck + test green | ✓ SATISFIED | Truth 5 |

Bookkeeping: `.planning/REQUIREMENTS.md` still shows DEMO-01..06 as `[ ]` / `Pending` and ROADMAP Phase 6 is unchecked; the orchestrator should tick them on phase completion.

### Anti-Patterns Found

None. No debt markers, no skipped tests, no stub implementations in phase files.

### Human Verification Required

None outstanding. Browser and stopwatch items were already completed in 06-UAT.md (see advisory).

### Gaps Summary

No gaps. Residual advisory items: the 8 code-review findings (3 warnings) remain `open` in 06-REVIEW-DISPOSITION.md and should be triaged (fix or defer) before `/gsd-ship`; the browser pass was automated rather than manual.

---

_Verified: 2026-11-07_
_Verifier: Claude (gsd-verifier)_
