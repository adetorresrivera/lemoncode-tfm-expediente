# Phase 6: Pulido de demo - Context

**Gathered:** 2026-11-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the 9 Nov demo impossible to break and make a clean machine start everything with one command: an idempotent demo seed, a final Spanish README, a robustness pass (loading/error/empty states, responsive at 360/768/1280, keyboard + axe accessibility, cold start after `docker compose down -v`), the demo-relevant open review findings fixed, and the pending tests written so `npm run typecheck && npm run test` pass on a clean checkout. Requirements DEMO-01..DEMO-06. Branch `phase/06-pulido-demo` (ROADMAP). No new product capabilities.

</domain>

<decisions>
## Implementation Decisions

### Seed — locked by the user's brief
- **D-01:** `npm run seed` (root → `@tfm/api`) and `docker compose exec app npm run seed` both work. The runtime image has only `dist/` and prod deps (no `tsx`), so the seed is compiled into `apps/api/dist` and its assets are copied there by the build. The current placeholder `seed` script in `apps/api/package.json` is replaced.
- **D-02:** Idempotent. Every application and document the seed creates is marked `seed: true` in Mongo (a storage-only field, never exposed through the API or contracts). A normal run deletes only `seed: true` records (and their Silo objects) and recreates them.
- **D-03:** `npm run seed -- --reset` wipes everything (all applications, documents and bucket objects) before seeding, to clean up records created during demo rehearsals. — **Reversibility:** reversible — flag only; destructive at runtime by design, so the script prints what it deletes.
- **D-04:** 12 varied applications: every status from `docs/DOMAIN.md` present, realistic distribution (more `enviada` / `en_entrevistas`, a few `oferta`, `rechazada`, `descartada`, etc. — Claude picks), 3 with several interview rounds, status histories coherent with the domain rules, realistic grouped tags, 2 CVs and 1 cover letter linked.
- **D-05:** Dates are relative to the moment the seed runs: everything falls within the last 6 weeks, so the list looks recent on 9 Nov; upcoming rounds may be in the near future.
- **D-06:** The seed writes through the API services (applications, interviews, documents/storage) so domain rules apply (`tagKey`, `updatedAt`, `enviada → en_entrevistas`, magic-byte file checks). After that it patches dates/history timestamps and the `seed: true` mark directly in Mongo.
- **D-07:** The 3 demo PDFs (2 CVs, 1 cover letter) are committed, small, readable PDFs in `apps/api/src/scripts/assets/`, copied to `dist` by the build. No PDF library. They must pass the Phase 5 file-type checks.
- **D-08:** The 3 offer fixtures are **not** seeded as applications. They exist only to be pasted live; the 12 seeded applications use other invented offers, so the demo offer is never already in the list.
- **D-09:** The fixtures **move** to `docs/demo/ofertas/*.txt` as the single source of truth (`remote-senior.txt`, `onsite-junior.txt`, `english-nice-to-have.txt`). `apps/api/src/offers/__fixtures__/fixtures.ts`, its tests and `src/scripts/try-extract.ts` read from there. — **Reversibility:** reversible — a path change in one module.
- **D-10:** The seed has its own test against the devcontainer Mongo/Silo: two runs leave exactly 12 seed applications, all statuses present, histories coherent, documents linked and downloadable. Data generation lives in a pure function that is also unit-tested without services.

### Robustness — locked by the user's brief
- **D-11:** Review loading, error and empty states in every view (list, detail, form, documents).
- **D-12:** Responsive check at 360, 768 and 1280 px with no horizontal scroll on any screen.
- **D-13:** Accessibility: full keyboard walkthrough, labelled fields, visible focus, `aria-live="polite"` on load/error/AI results; automated axe checks on list, detail and form.
- **D-14:** Mock mode documented: `LLM_PROVIDER=mock docker compose up`.
- **D-15:** Image: reasonable size, every version pinned, healthchecks on every service, cold start tested after `docker compose down -v`.

### Open review findings folded into this phase
Fixed as Phase 6 plans on the phase branch (not via `/gsd-code-review NN --fix`); each fix flips its entry in the owning `NN-REVIEW-DISPOSITION.md` to `fixed`.
- **D-16:** Startup and live failures: API startup hanging/dying when Mongo/S3 are slow and `pingS3` without abort (Phase 1, see `01-REVIEW-DISPOSITION.md`); 02 WR-04 list shows «no results» during refetch; 02 WR-03 stale delete-dialog error after cancel and reopen.
- **D-17:** Flaky tests: 05 WR-01 success-line timer test drift; Phase 1 cold-start `Failed to start forks worker` in `@tfm/web` (required for DEMO-06 «clean checkout»).
- **D-18:** English/default screens and SPA fallback: 01 WR-07 unknown routes and route errors render TanStack's English defaults → Spanish not-found/error screens in the DS voice; 01 WR-08 SPA fallback answers missing static files with `200 text/html` and a missing `index.html` is silent.
- **D-19:** Phase 5 UI-review top fixes: error icons tinted `text-destructive` against the UI-SPEC, dialog close «X» silently ignored during upload (05 WR-03), off-scale `mt-0.5` / `file:mr-3`.
- **D-20:** Cheap extras: 02 WR-01 request-body limit + `.max()` on unbounded strings (`sourceUrl`, document ids) — contracts change, so `@tfm/contracts` stays the single source; 02 WR-02 cleanup trap in `scripts/compose-smoke.sh`.

### LLM providers in the README
- **D-21:** The README documents **only Ollama and `mock`** (how to change the Ollama model via `LLM_MODEL`, and `mock` as the fallback). Gemini and Groq are **not** documented and no provider code is added. The existing `openai` provider may be mentioned generically as «compatible con OpenAI» with `LLM_BASE_URL` / `LLM_API_KEY`. This overrides the «Ollama / Gemini / Groq / mock» line of the brief.

### README — locked by the user's brief
- **D-22:** Final README in Spanish (DS voice: tuteo, short sentences, no exclamations or emojis): what it is, screenshot, requirements (Docker), start in 3 commands, seed (incl. `--reset`), switching model (D-21), mock recovery, devcontainer development, repo structure, scripts, links to `docs/` and to `docs/demo/ofertas/`. Remove the «mínimo de la fase 1» / «llega en la fase 6» notes.

### Tests
- **D-23:** Sweep the business rules in `docs/DOMAIN.md` and every `*.mapper.ts` (api + web pods) and cover what is missing.
- **D-24:** Close the draft Nyquist validations of phases 02, 03 and 05 (`02-VALIDATION.md`, `03-VALIDATION.md`, `05-VALIDATION.md`) by filling their gaps.
- **D-25:** `npm run typecheck && npm run test` green on a clean checkout; every plan ends with a `<verify>` running at least that.

### Claude's Discretion
- Accessibility tooling: prefer `axe-core` used directly with a tiny Vitest helper over `vitest-axe` (fewer deps, maintained); justify the new devDependency in the plan SUMMARY. axe's `color-contrast` rule does not run in jsdom, so AA contrast (light and dark) is verified separately — e.g. a unit test computing contrast ratios of DS token pairs from `docs/design/expediente.css` / the web theme, plus a manual check.
- Responsive and keyboard verification method (manual checklist recorded in UAT, optionally a real browser); no Playwright unless justified.
- README screenshot: captured from the seeded app (light theme, list view), stored under `docs/` and referenced from the README.
- Exact status distribution and content of the 12 applications, tag sets, company names (invented, no real-company impersonation in documents).
- Image-size target and how the cold-start test is scripted (likely an extension of `scripts/compose-smoke.sh`, with `mock` so it does not wait on the 4.6 GB model).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and rules
- `CLAUDE.md` — stack, code rules, pod architecture, commands, `<verify>` requirement
- `docs/PRODUCT.md` — scope and demo flow
- `docs/DOMAIN.md` — statuses, transitions, history, tag groups (seed coherence, D-23 rule sweep)
- `docs/ARCHITECTURE.md` — API, env vars, compose/deployment
- `docs/DESIGN.md` and `docs/design/expediente.css` — DS tokens, voice, focus/contrast (D-13, D-19, contrast check)
- `docs/AI-EXTRACTION.md` — providers and mock (README D-21)
- `.planning/REQUIREMENTS.md` — DEMO-01..DEMO-06
- `.planning/ROADMAP.md` — Phase 6 success criteria

### Open findings folded in (D-16..D-20)
- `.planning/phases/01-fundaciones-y-walking-skeleton/01-REVIEW-DISPOSITION.md` and `01-REVIEW.md`
- `.planning/phases/02-candidaturas/02-REVIEW-DISPOSITION.md` and `02-REVIEW.md`
- `.planning/phases/05-documentos-en-s3/05-REVIEW-DISPOSITION.md`, `05-REVIEW.md`, `05-UI-REVIEW.md`, `05-UI-SPEC.md`

### Validation drafts (D-24)
- `.planning/phases/02-candidaturas/02-VALIDATION.md`
- `.planning/phases/03-autocompletado-con-ia/03-VALIDATION.md`
- `.planning/phases/05-documentos-en-s3/05-VALIDATION.md`

### Prior-phase decisions that constrain the seed
- `.planning/phases/03-autocompletado-con-ia/03-CONTEXT.md` — fixtures, mock provider, never log offer text
- `.planning/phases/05-documentos-en-s3/05-CONTEXT.md` — document model (`fileName`), file-type checks, S3 keys

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/applications/applications.service.ts`, `documents/documents.service.ts`, `storage/s3.ts`: the seed's write path (D-06).
- `apps/api/src/offers/__fixtures__/fixtures.ts` (`OFFER_FIXTURES`, `readFixtureText`): to re-point at `docs/demo/ofertas/` (D-09).
- `apps/api/src/scripts/try-extract.ts`: existing script pattern under `src/scripts/`.
- `scripts/compose-smoke.sh`: health + outage-recovery smoke; base for cold-start check and the WR-02 trap.
- Tag key helper `tagKey` (Phase 2) for seeded tags.

### Established Patterns
- Root scripts delegate to workspaces (`npm run seed -w @tfm/api --if-present`).
- Runtime image (`Dockerfile`) copies only `apps/api/dist`, `packages/contracts/dist`, `apps/web/dist` and prod `node_modules`; anything the seed needs at runtime must be in `dist`.
- Compose already pins images (`mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04…`, `ollama/ollama:0.40.3`) and has healthchecks; `app` does not depend on `ollama` (model pull never blocks).
- Pre-commit runs the full typecheck; TDD plans commit RED+GREEN together.
- Web pods: 5 pods (`application-list`, `application-detail`, `application-edit`, `document-list`, `document-upload`), each with a mapper.

### Integration Points
- `apps/api/package.json` `seed` script (placeholder today).
- `apps/api/tsconfig.build.json` / build step to include `src/scripts/seed.ts` and copy `assets/`.
- TanStack Router root: `notFoundComponent` / `errorComponent` (D-18).
- API static/SPA fallback in `apps/api/src/app.ts` (D-18 WR-08).

</code_context>

<specifics>
## Specific Ideas

- The demo flow to protect end to end: paste offer → autofill → review → save → add round → attach CV → change status → see it filtered, under 2 minutes, with Ollama and with `mock`.
- The offers pasted live come from `docs/demo/ofertas/*.txt`.
- `--reset` exists specifically so rehearsals can be wiped before the real defense.

</specifics>

<deferred>
## Deferred Ideas

- Gemini / Groq as documented or native providers (D-21) — out of this phase; can be mentioned in the defense as "OpenAI-compatible endpoints would work".
- Remaining open review findings, kept as known debt for the defense: 04 WR-01 single-slot `busy` lock in rounds and 04 WR-02 weak unmount-timers test; 01 WR-03 theme store desync across tabs / blocked storage; 01 WR-04 tag normalisation not enforced in contracts; 01 WR-05/WR-06 misleading error codes; 01 WR-01/WR-02 (traversal test positive control, `server.host: true`); 05 WR-02 and IN-*; 03 IN-*; 04 IN-*.
- Remaining UI-review improvement lists (`01-UI-REVIEW.md`, other items of `05-UI-REVIEW.md`) beyond D-19.

</deferred>

---

*Phase: 06-pulido-de-demo*
*Context gathered: 2026-11-06*
