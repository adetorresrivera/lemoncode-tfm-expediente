---
gsd_state_version: "1.0"
current_phase: 6
current_phase_name: Pulido de demo
status: planning
stopped_at: Phase 05 complete, ready to plan Phase 6
last_updated: "2026-11-06T09:14:41.123Z"
last_activity: 2026-11-06
last_activity_desc: Phase 05 complete, transitioned to Phase 6
state_head: c0ec3d3aa571b8534d0dc40a4cc8abe24cb03907
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 45
  completed_plans: 45
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-06)

**Core value:** Pegar una oferta y obtener un expediente casi completo y revisable en segundos, con el flujo entero (pegar → guardar → ronda → CV → estado → filtrar) demostrable en menos de 2 minutos con `docker compose up`.
**Current focus:** Phase 6 — Pulido de demo

## Current Position

Phase: 6 — Pulido de demo
Plan: Not started
Status: Ready to plan
Last activity: 2026-11-06 — Phase 05 complete, transitioned to Phase 6

Progress: [███████░░░] 71%

## Performance Metrics

**Velocity:**
- Total plans completed: 45
- Average duration: - min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6 | - | - |
| 02 | 12 | - | - |
| 03 | 12 | - | - |
| 04 | 4 | - | - |
| 05 | 11 | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7 phases fixed by the author, one phase = one PR, branch `phase/NN-nombre`; targets 29 Oct / 31 Oct / 2 Nov / 3 Nov / 5 Nov / 7 Nov / 8 Nov; defense 9 Nov 2026.
- [Roadmap]: Category → phase map: FND→1, APP→2, AI→3, INT→4, DOC→5, DEMO→6, PRES→7. DOC-03 (upload from the form) lands in Phase 5.
- [Roadmap]: All contracts schemas are defined in Phase 1 (FND-02); later phases add behavior only.
- [Phase 1]: Security audit closed 26/26 threats (ASVS 1); Nyquist validation compliant; UI audit 16/24 kept as an improvement list (`01-UI-REVIEW.md`), not applied.
- [Phase 2]: Executed on branch `phase/02-candidaturas` (per CLAUDE.md), 12 plans in 10 waves; verified 5/5, UAT 4/4, security 30/30 closed (2 accepted low risks). Only new dependency: `@tanstack/react-form` 1.33.5 (human-approved).
- [Phase 2]: Hand-overs — Phase 3 adds `offerText` and Phase 5 adds `cvDocumentId`/`coverLetterDocumentId` to `toEditableFields`; Phase 4 routes every interview mutation through the applications service (updatedAt, enviada→en_entrevistas); Phase 6 seed goes through the service or computes tag `key` with `tagKey`.
- [Phase 2]: TDD plans commit RED+GREEN together because the pre-commit hook runs the full suite; recorded per SUMMARY under "TDD Gate Compliance".
- [Phase 3]: 12 plans (9 + 3 gap-closure) on `phase/03-autocompletado-con-ia`; verified 8/8 (regenerated after quick 261101-qh3), UAT pass, security 24/24 closed (2 accepted low), UI review 20/24 with its 3 top fixes applied in 261101-qh3. No new dependency.
- [Phase 3]: Prompt changes need user approval and a new sha256 fingerprint (D-25); current approved fingerprint `deeed808…`. Spoken languages come through the model-only `idiomas` field; `@tfm/contracts` unchanged.

- [Phase 4]: 4 plans on `phase/04-rondas-entrevista`; verified 4/4 (regenerated after review fix 2ea14e0), UAT 6/6, security 0 open threats, UI review done. No new dependency. Interview mutations go through the applications service; the `enviada → en_entrevistas` rule runs inside the same pipeline `findOneAndUpdate`.
- [Phase 5]: 11 plans (9 + 2 gap-closure for the upload-dialog file button) on `phase/05-documentos-s3`; verified, UAT 4/4, security 38/38 closed (5 accepted low), UI review 19/24 kept as an improvement list (`05-UI-REVIEW.md`), not applied. No new dependency. `fileName` added to `documentSchema` (D-05); file type by magic bytes + extension without a library.

### Pending Todos

None yet.

### Blockers/Concerns

- [Schedule]: 7 phases must fit before the 9 Nov defense; MVP finished beats features half done.
- [Ship]: Phases 1-4 shipped 2026-11-03 as stacked PRs #1 (01→main), #2 (02→01), #3 (03→02), #4 (04→03); merge in order. GitHub default branch is `main` (only "First commit"). `.planning/config.json` still has `branching_strategy` = `none`; phase branches are created by hand. PR #1 carries the committed `.claude/` GSD install (~320k lines).
- [Phase 1]: Web tests (`@tfm/web`) intermittently fail with `Failed to start forks worker` on a cold start; not seen during Phase 2 but not fixed either.
- [Phase 1]: Open code-review findings that can hurt a live demo: API startup hangs or dies when Mongo/S3 is slow, and `pingS3` has no abort (see `01-REVIEW-DISPOSITION.md`, ids carried from the first review). `server.host: true` in `apps/web/vite.config.ts` exposes the dev server on all interfaces.
- [Phase 2]: Code review 0 critical / 4 warnings / 9 info, all `open` in `02-REVIEW-DISPOSITION.md`. Demo-relevant: WR-01 no request-body limit + unbounded `sourceUrl`/document ids; WR-02 compose smoke has no cleanup trap; WR-03 stale delete error; WR-04 empty state flashes during refetch. `/gsd-code-review 02 --fix` applies them.
- [Phase 2]: `02-VALIDATION.md` still draft — `/gsd-validate-phase 02` (Nyquist) not run; `/gsd-ui-review 02` not run.
- [Phase 2]: Dev DB applications created before plan 02-03 have no `tags.key` and do not match the stack filter; delete or re-save them.
- [Env]: GSD install hard-codes `/workspaces/TFM/.claude`; the devcontainer folder is now `lemoncode-tfm-expediente`, bridged by a container-local symlink `/workspaces/TFM`. Reinstall GSD to fix permanently. `.DS_Store` and `.claude/worktrees/` are in `.git/info/exclude` (macOS host writes `.DS_Store` into the bind mount, which blocked worktree merges).
- [Phase 3]: Open info findings in `03-REVIEW-DISPOSITION.md`: IN-01 ~12 lucide icons from earlier phases still at default stroke; IN-02 `idiomas` entries are trusted, so a technology the model puts there wins over its `stack` tag; IN-03 model-facing schema still offers the `idioma` tag group; IN-04 docs drift; IN-05 triple `LLM_BASE_URL` trailing-slash normalization.
- [Phase 3]: `03-VALIDATION.md` still draft — `/gsd-validate-phase 03` (Nyquist) not run. `03-03-SUMMARY.md` lists `src/scripts/try-extract.ts` and `__fixtures__/fixtures.ts` without the `apps/api/` prefix.
- [Phase 1]: `npm run format:check` flags the untracked GSD artifact `.gsd/dispatch-isolation-sentinel.json`; add `.gsd` to `.prettierignore` when convenient.

- [Phase 4]: Open findings in `04-REVIEW-DISPOSITION.md`: WR-01 the `busy` lock (`busyRef`) is still one slot while feedback and timers are per application (a second mutation on A is possible after A → B → A with A pending); WR-02 the unmount-cancels-timers test only asserts `clearTimeout` ≥ 1; IN-01 `endBusy` own-lock guard untested; IN-02 `deletingRef`/`onDeleted` not scoped per application; IN-03 per-key error feedback never pruned. `/gsd-code-review 04 --fix` applies the warnings. `04-01/02-SUMMARY.md` key-files list paths without the `apps/web/src/` prefix.
- [Phase 5]: Open findings in `05-REVIEW-DISPOSITION.md` (WR-01..WR-03, IN-01..IN-06), incl. a possibly flaky timer test and an untested idle outside-pointer case. UI review top fixes not applied: error icons tinted `text-destructive` against the UI-SPEC, dialog X silently ignored during upload, `mt-0.5`/`file:mr-3` off-scale. `05-VALIDATION.md` still draft (`/gsd-validate-phase 05` not run). Several 05-SUMMARY key-files lack the `apps/*/src/` prefix.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 261029-sa5 | Fix mobile menu button position (left, where the Sheet opens) and bind Vite dev server to IPv4 (UAT gap G-01-2) | 2026-10-29 | 6bc7437 | [261029-sa5-fix-mobile-menu-button-position-left-whe](./quick/261029-sa5-fix-mobile-menu-button-position-left-whe/) |
| 261101-gfe | D-25 prompt change: add Pitfall 7 rule lines to extraction prompt | 2026-11-01 | 20acd9c | [261101-gfe-d-25-prompt-change-add-pitfall-7-rule-li](./quick/261101-gfe-d-25-prompt-change-add-pitfall-7-rule-li/) |
| 261101-gpz | Fix re-analysis merge: replace fields still marked IA on a second analysis | 2026-11-01 | fca9c55 | [261101-gpz-fix-re-analysis-merge-replace-fields-sti](./quick/261101-gpz-fix-re-analysis-merge-replace-fields-sti/) |
| 261101-qh3 | Phase 03 UI-review fixes: icon stroke 1.5, spoken languages as separate model field, gold-ink missing border | 2026-11-01 | 411a55c | [261101-qh3-phase-03-ui-review-fixes-icon-stroke-1-5](./quick/261101-qh3-phase-03-ui-review-fixes-icon-stroke-1-5/) |

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-06T09:20:00Z
Stopped at: Phase 05 complete, ready to plan Phase 6
Resume file: None
