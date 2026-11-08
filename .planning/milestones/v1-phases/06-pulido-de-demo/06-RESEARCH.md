# Phase 6: Pulido de demo - Research

**Researched:** 2026-11-06
**Domain:** Demo hardening of an existing React 19 / Hono / Mongo / S3 monorepo: idempotent seed compiled into the runtime image, README, accessibility and responsive polish, robustness fixes, test debt, cold-start verification.
**Confidence:** HIGH (almost everything was read in the repo or exercised in this session; the few LOW items are in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Seed — locked by the user's brief**
- **D-01:** `npm run seed` (root → `@tfm/api`) and `docker compose exec app npm run seed` both work. The runtime image has only `dist/` and prod deps (no `tsx`), so the seed is compiled into `apps/api/dist` and its assets are copied there by the build. The current placeholder `seed` script in `apps/api/package.json` is replaced.
- **D-02:** Idempotent. Every application and document the seed creates is marked `seed: true` in Mongo (a storage-only field, never exposed through the API or contracts). A normal run deletes only `seed: true` records (and their Silo objects) and recreates them.
- **D-03:** `npm run seed -- --reset` wipes everything (all applications, documents and bucket objects) before seeding, to clean up records created during demo rehearsals. — **Reversibility:** reversible — flag only; destructive at runtime by design, so the script prints what it deletes.
- **D-04:** 12 varied applications: every status from `docs/DOMAIN.md` present, realistic distribution (more `enviada` / `en_entrevistas`, a few `oferta`, `rechazada`, `descartada`, etc. — Claude picks), 3 with several interview rounds, status histories coherent with the domain rules, realistic grouped tags, 2 CVs and 1 cover letter linked.
- **D-05:** Dates are relative to the moment the seed runs: everything falls within the last 6 weeks, so the list looks recent on 9 Nov; upcoming rounds may be in the near future.
- **D-06:** The seed writes through the API services (applications, interviews, documents/storage) so domain rules apply (`tagKey`, `updatedAt`, `enviada → en_entrevistas`, magic-byte file checks). After that it patches dates/history timestamps and the `seed: true` mark directly in Mongo.
  - *Amended 2026-11-06 in CONTEXT.md (user, plan review):* dates and history timestamps come from an injected clock passed to the services, advanced before each call; only the `seed: true` mark is written directly in Mongo (this is Pattern 1 below).
- **D-07:** The 3 demo PDFs (2 CVs, 1 cover letter) are committed, small, readable PDFs in `apps/api/src/scripts/assets/`, copied to `dist` by the build. No PDF library. They must pass the Phase 5 file-type checks.
- **D-08:** The 3 offer fixtures are **not** seeded as applications. They exist only to be pasted live; the 12 seeded applications use other invented offers, so the demo offer is never already in the list.
- **D-09:** The fixtures **move** to `docs/demo/ofertas/*.txt` as the single source of truth (`remote-senior.txt`, `onsite-junior.txt`, `english-nice-to-have.txt`). `apps/api/src/offers/__fixtures__/fixtures.ts`, its tests and `src/scripts/try-extract.ts` read from there. — **Reversibility:** reversible — a path change in one module.
- **D-10:** The seed has its own test against the devcontainer Mongo/Silo: two runs leave exactly 12 seed applications, all statuses present, histories coherent, documents linked and downloadable. Data generation lives in a pure function that is also unit-tested without services.

**Robustness — locked by the user's brief**
- **D-11:** Review loading, error and empty states in every view (list, detail, form, documents).
- **D-12:** Responsive check at 360, 768 and 1280 px with no horizontal scroll on any screen.
- **D-13:** Accessibility: full keyboard walkthrough, labelled fields, visible focus, `aria-live="polite"` on load/error/AI results; automated axe checks on list, detail and form.
- **D-14:** Mock mode documented: `LLM_PROVIDER=mock docker compose up`.
- **D-15:** Image: reasonable size, every version pinned, healthchecks on every service, cold start tested after `docker compose down -v`.
- **D-26 (added 2026-11-06 in CONTEXT.md, user, plan review):** `compose.yml` sets `OLLAMA_KEEP_ALIVE: "30m"` on the `ollama` service and the README documents a warm-up extraction before presenting (resolves Open Question 5).

**Open review findings folded into this phase** (fixed as Phase 6 plans on the phase branch, not via `/gsd-code-review NN --fix`; each fix flips its entry in the owning `NN-REVIEW-DISPOSITION.md` to `fixed`)
- **D-16:** Startup and live failures: API startup hanging/dying when Mongo/S3 are slow and `pingS3` without abort (Phase 1, see `01-REVIEW-DISPOSITION.md`); 02 WR-04 list shows «no results» during refetch; 02 WR-03 stale delete-dialog error after cancel and reopen.
- **D-17:** Flaky tests: 05 WR-01 success-line timer test drift; Phase 1 cold-start `Failed to start forks worker` in `@tfm/web` (required for DEMO-06 «clean checkout»).
- **D-18:** English/default screens and SPA fallback: 01 WR-07 unknown routes and route errors render TanStack's English defaults → Spanish not-found/error screens in the DS voice; 01 WR-08 SPA fallback answers missing static files with `200 text/html` and a missing `index.html` is silent.
- **D-19:** Phase 5 UI-review top fixes: error icons tinted `text-destructive` against the UI-SPEC, dialog close «X» silently ignored during upload (05 WR-03), off-scale `mt-0.5` / `file:mr-3`.
- **D-20:** Cheap extras: 02 WR-01 request-body limit + `.max()` on unbounded strings (`sourceUrl`, document ids) — contracts change, so `@tfm/contracts` stays the single source; 02 WR-02 cleanup trap in `scripts/compose-smoke.sh`.

**LLM providers in the README**
- **D-21:** The README documents **only Ollama and `mock`** (how to change the Ollama model via `LLM_MODEL`, and `mock` as the fallback). Gemini and Groq are **not** documented and no provider code is added. The existing `openai` provider may be mentioned generically as «compatible con OpenAI» with `LLM_BASE_URL` / `LLM_API_KEY`. This overrides the «Ollama / Gemini / Groq / mock» line of the brief.

**README — locked by the user's brief**
- **D-22:** Final README in Spanish (DS voice: tuteo, short sentences, no exclamations or emojis): what it is, screenshot, requirements (Docker), start in 3 commands, seed (incl. `--reset`), switching model (D-21), mock recovery, devcontainer development, repo structure, scripts, links to `docs/` and to `docs/demo/ofertas/`. Remove the «mínimo de la fase 1» / «llega en la fase 6» notes.

**Tests**
- **D-23:** Sweep the business rules in `docs/DOMAIN.md` and every `*.mapper.ts` (api + web pods) and cover what is missing.
- **D-24:** Close the draft Nyquist validations of phases 02, 03 and 05 (`02-VALIDATION.md`, `03-VALIDATION.md`, `05-VALIDATION.md`) by filling their gaps.
- **D-25:** `npm run typecheck && npm run test` green on a clean checkout; every plan ends with a `<verify>` running at least that.

### Claude's Discretion
- Accessibility tooling: prefer `axe-core` used directly with a tiny Vitest helper over `vitest-axe` (fewer deps, maintained); justify the new devDependency in the plan SUMMARY. axe's `color-contrast` rule does not run in jsdom, so AA contrast (light and dark) is verified separately — e.g. a unit test computing contrast ratios of DS token pairs from `docs/design/expediente.css` / the web theme, plus a manual check.
- Responsive and keyboard verification method (manual checklist recorded in UAT, optionally a real browser); no Playwright unless justified.
- README screenshot: captured from the seeded app (light theme, list view), stored under `docs/` and referenced from the README.
- Exact status distribution and content of the 12 applications, tag sets, company names (invented, no real-company impersonation in documents).
- Image-size target and how the cold-start test is scripted (likely an extension of `scripts/compose-smoke.sh`, with `mock` so it does not wait on the 4.6 GB model).

### Deferred Ideas (OUT OF SCOPE)
- Gemini / Groq as documented or native providers (D-21) — out of this phase; can be mentioned in the defense as "OpenAI-compatible endpoints would work".
- Remaining open review findings, kept as known debt for the defense: 04 WR-01 single-slot `busy` lock in rounds and 04 WR-02 weak unmount-timers test; 01 WR-03 theme store desync across tabs / blocked storage; 01 WR-04 tag normalisation not enforced in contracts; 01 WR-05/WR-06 misleading error codes; 01 WR-01/WR-02 (traversal test positive control, `server.host: true`); 05 WR-02 and IN-*; 03 IN-*; 04 IN-*.
- Remaining UI-review improvement lists (`01-UI-REVIEW.md`, other items of `05-UI-REVIEW.md`) beyond D-19.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEMO-01 | `npm run seed` (also via `docker compose exec app npm run seed`) loads demo applications, documents and the 3 fixture offers into Mongo and Silo | Seed architecture (injected-clock write path through the services, `seed: true` mark, `--reset`, dist build + asset copy, root script `--` forwarding). **Conflict with D-08 flagged in Open Questions Q1.** |
| DEMO-02 | README explains how to run, seed, switch `LLM_PROVIDER` and recover with `mock` when Ollama fails | README section list in Architecture Patterns; Ollama keep-alive/warm-up and cold-model 504 evidence (Pitfall 9); grep-based doc checks in Validation Architecture |
| DEMO-03 | The app is usable from 360 px width without horizontal scroll | UI-SPEC §5 risk list; no browser in the devcontainer, so a human UAT pass is mandatory; jsdom class assertions as a backstop |
| DEMO-04 | Fully keyboard-operable, visible focus, labelled fields, `aria-live="polite"`, AA contrast | axe-core in jsdom verified (0 violations on all current screens once `lang="es"` is set); contrast pair table recomputed and matches UI-SPEC; sidebar focus ring and skip link changes |
| DEMO-05 | Full demo flow under 2 minutes on a clean machine, with Ollama and with `mock` | Measured Ollama CPU timings from Phase 3 (10-21 s warm, 504 on cold load), mock returns a fixed draft, compose cold-start script design, timed manual UAT |
| DEMO-06 | Pending tests completed; `npm run typecheck && npm run test` pass on a clean checkout | Baseline run (all green), mapper gap list, validation-draft status (03 is already validated), 05 WR-01 flake fix, forks-worker cold-start mitigation |
</phase_requirements>

## Summary

The phase is polish on a green codebase: this session `npm run typecheck` (5 s warm) and `npm run test` (contracts 57, api 407, web 615 tests, about 19 s warm) passed untouched [VERIFIED: ran both on branch `phase/06-pulido-demo`]. No new product capability and, apart from `axe-core` (test-only), no new dependency. The work splits into seven streams: (1) the seed, which is the only substantial new code; (2) API robustness (startup retry, S3 abort, SPA fallback, body limit); (3) shell, error screens and token sweep from the approved UI-SPEC; (4) dialog lock, delete-dialog reset and list-refetch fixes; (5) a11y/contrast/live-region tests; (6) test debt and flake mitigation; (7) README, compose cold-start script, docs write-backs and the human-only UAT/screenshot.

The riskiest technical facts, all verified here: `npm run seed -- --reset` does **not** forward `--reset` with the current root script (needs a trailing `--` in the root script); `docs/` is in `.dockerignore`, `tsc` does not copy assets (a `node -e "fs.cpSync(...)"` step works on Node 22); the services take an injectable `now`, so the seed can write historically coherent timestamps through the normal write path with almost no direct Mongo patching; a hand-rolled one-page PDF with the built-in Helvetica font is parsed by pdf.js with accents intact; the `mock` provider always returns the same draft ("Lumen Analytics"), so no seeded application may use that company/title; and `docker compose down -v` on the default project would delete the 4.6 GB Ollama model volume, so the cold-start test must use its own project name.

Three items need a human: the README screenshot, the three-viewport/keyboard/timed-demo UAT (no browser exists in the devcontainer), and confirming how DEMO-01's "3 fixture offers" wording is reconciled with D-08.

**Primary recommendation:** Build the seed as `buildSeedPlan(now)` (pure) + `runSeed({db, storage, clock})` (service-driven, injectable, testable on `tfm_test`) + a thin entry `seed.ts`; compile it to `dist` with a `cpSync` build step; fix everything else exactly as the approved UI-SPEC and the review findings dictate; finish with a cold-start smoke in an isolated compose project using `LLM_PROVIDER=mock` and a human timed pass.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Demo data generation and idempotent reset | API / Backend (script in `apps/api`, runs inside the app image) | Database / Storage | Must go through the services so domain rules (tagKey, history, appliedAt, magic bytes) apply (D-06) |
| `seed: true` mark and wipe | Database / Storage (Mongo field, Silo objects) | API / Backend | Storage-only field; mapper whitelists fields so it never reaches the API |
| Demo PDFs | Database / Storage (committed assets copied to `dist`) | — | Read by the seed, uploaded through `documents.service` |
| Startup resilience, S3 abort, body limit, SPA fallback | API / Backend | CDN / Static (the API serves `web/dist`) | `apps/api/src/main.ts`, `storage/s3.ts`, `app.ts` |
| Not-found / route-error screens, skip link, shell focus | Browser / Client | — | TanStack Router defaults + `layouts/app-layout.tsx` |
| Dialog lock, delete-dialog reset, list refetch | Browser / Client | — | Pod hooks/components |
| Contrast / axe / live-region checks | Browser / Client (jsdom tests) | — | Test support only |
| Contract bounds (`sourceUrl`, ids) | `packages/contracts` | API (enforces) / Browser (form validates) | Single source of truth (CLAUDE.md) |
| Cold-start, health, image size | Infra (Dockerfile, compose, `scripts/compose-smoke.sh`) | — | D-15 |
| README, screenshot, docs write-backs | Documentation | — | D-22 |

## Standard Stack

### Core (all existing; versions read from the workspace manifests this session)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | 4.13.13 | API, `hono/body-limit` already used by `documents.routes.ts` | Existing |
| mongodb | 7.7.0 | Seed direct patches, `deleteMany` | Existing |
| @aws-sdk/client-s3 | 3.1152.0 | `ListObjectsV2`, `DeleteObject(s)`, `abortSignal` | Existing |
| zod | 4.6.7 | Contract bounds | Existing |
| @tanstack/react-router | 1.170.44 | `defaultNotFoundComponent`, `defaultErrorComponent` | Existing; behaviour verified below |
| vitest | 5.0.4 | All tests | Existing |
| @testing-library/react / user-event / jsdom | 16.3.3 / 14.6.8 / 30.1.2 | Component, a11y tests | Existing |

### Supporting (new)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| axe-core | 4.14.0 (devDependency of `@tfm/web` only) | Automated a11y rules in jsdom | `src/test/axe.ts` helper; justify in the plan SUMMARY (CLAUDE.md: no dependency without justification) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| axe-core direct | vitest-axe 0.1.0 | Extra wrapper, last release old; CONTEXT already prefers direct |
| `fs.cpSync` in the build script | `copyfiles`/`cpy-cli` | New dependency for one line; rejected |
| Hand-rolled PDF template | `pdf-lib`/`pdfkit` | D-07 forbids a PDF library |
| Retry wrapper for the forks-worker error | Devcontainer named volume for `node_modules` | The volume is the real root cause fix but needs a container rebuild; the user declined it on 2026-10-30 (see Open Questions Q4) |

**Installation:**
```bash
npm install --save-dev axe-core@4.14.0 -w @tfm/web
```

**Version verification:** `npm view axe-core version` returned `4.14.0`, modified 2026-11-05, repo `https://github.com/dequelabs/axe-core.git`, no postinstall script [VERIFIED: npm registry, `gsd-tools query package-legitimacy check`].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| axe-core | npm | many years (latest published 2026-10-05) | about 109M/week | github.com/dequelabs/axe-core | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`axe-core` was also the package named in CONTEXT.md by the user, and the seam returned `"verdict": "OK"`, `"deprecated": false`, `"postinstall": null` [VERIFIED: `gsd-tools query package-legitimacy check --ecosystem npm axe-core`]. No other package is proposed. `pdfjs-dist` and `pypdf` were used **only in the scratchpad** to validate a hand-made PDF and are not recommended for the repo.

## Architecture Patterns

### System Architecture Diagram

```
SEED (one command, two entry points)

 host/devcontainer:  npm run build && npm run seed [-- --reset]
 compose:            docker compose exec app npm run seed [-- --reset]
        |
        v   root "seed" = npm run seed -w @tfm/api --if-present --   (trailing -- forwards flags)
 apps/api "seed" = node dist/scripts/seed.js
        |
   seed.ts (thin entry)
     parse argv --reset  --> loadConfig({...env, LLM_PROVIDER:"mock"})   (no LLM vars needed)
     connectMongo (also ensureIndexes) + createS3Client + ensureBucket
        |
        +-- --reset?  --> print counts --> deleteMany(applications), deleteMany(documents), delete ALL bucket objects
        +-- else      --> find {seed:true} docs --> storage.delete(s3Key) each --> deleteMany({seed:true})
        |
        v
   runSeed({db, storage, clock})          <-- also called by the integration test on tfm_test / tfm-assets-test
     plan = buildSeedPlan(clock.realNow)  <-- PURE: 3 docs + 12 apps, every date derived from "now"
        |
        v   for each step: clock.set(step.at)
     documents.service.upload(...)   (PDF bytes from dist/scripts/assets/*.pdf -> magic bytes checked, S3 put, Mongo insert)
     applications.service.create / changeStatus / addInterview   (rules applied, history stamped with the injected clock)
     db.collection("applications"|"documents").updateOne({_id},{$set:{seed:true}})   (mark right after each insert)
        |
        v
   Mongo (tfm) + Silo (tfm-assets)  -->  GET /api/applications shows 12 cards; /documents shows 3 rows
```

### Recommended Project Structure
```
apps/api/src/scripts/
├── seed.ts                  # thin entry: argv, config, wiring, exit codes (no tests import it)
├── seed/
│   ├── seed.plan.ts         # buildSeedPlan(now): pure data (documents + applications + timeline)
│   ├── seed.plan.test.ts    # pure unit tests: statuses, histories, dates, tags, uniqueness
│   ├── seed.run.ts          # runSeed(deps) + clearSeedData / resetAll
│   └── seed.run.test.ts     # integration on tfm_test + tfm-assets-test (two runs => 12)
├── assets/
│   ├── cv-frontend.pdf      # committed binary, ASCII-only PDF 1.4
│   ├── cv-fullstack.pdf
│   └── cover-letter.pdf      # English file names (CLAUDE.md); renamed at plan revision 2026-11-06
└── try-extract.ts           # existing; reads fixtures from docs/demo/ofertas
docs/demo/ofertas/{remote-senior,onsite-junior,english-nice-to-have}.txt   # moved with git mv
docs/img/application-list.png                                                # human-captured (English file name, CLAUDE.md)
apps/web/src/common/components/{route-not-found,route-error}.tsx
apps/web/src/test/axe.ts, apps/web/src/common/lib/contrast.ts (+ test)
```

### Pattern 1: Injected clock instead of post-hoc timestamp patching
**What:** Both services already accept `now: () => Date` as their last constructor argument [VERIFIED: `applications.service.ts` `createApplicationsService(repository, findDocumentTypes, now: () => Date = () => new Date())` and `documents.service.ts` `createDocumentsService(repository, storage, now: () => Date = () => new Date())`]. Every write inside them stamps `createdAt`, `updatedAt`, `statusHistory[].at`, `appliedAt` and the document `createdAt` from that function (e.g. `repository.changeStatus(id, status, now())`, `repository.addInterview(id, interview, INTERVIEW_STATUS_RULE, at)`). A mutable clock the seed advances before each call yields coherent, backdated timestamps through the real rules, so only the `seed: true` mark needs a direct Mongo write. This satisfies D-06 ("writes through the API services ... patches ... the `seed: true` mark directly") with less patching than the literal wording.
**When to use:** Always in the seed. Walk each application through its history (create as `guardada`, `changeStatus` to `enviada`, `addInterview` which auto-moves `enviada → en_entrevistas`, etc.) so histories are domain-coherent rather than created directly in a late status.
**Example:**
```typescript
// Source: apps/api/src/applications/applications.service.ts (signature) + this research
let current = new Date();
const clock = { set: (d: Date) => { current = d; }, now: () => current };
const documents = createDocumentsService(createDocumentsRepository(db), storage, clock.now);
const applications = createApplicationsService(
  createApplicationsRepository(db),
  (ids) => createDocumentsRepository(db).findTypes(ids),
  clock.now,
);
clock.set(step.at);
const created = await applications.create({ ...input, cvDocumentId: cv.id }); // links validated by the service
await db.collection("applications").updateOne(
  { _id: new ObjectId(created.id) },
  { $set: { seed: true } },
);
```

### Pattern 2: Pure plan builder, imperative runner
**What:** `buildSeedPlan(now: Date)` returns plain data (`{ documents: [...], applications: [{ input, timeline: [{ at, op }] }] }`). All "last 6 weeks", "one future round", status distribution and tag choices live here and are unit-tested without services (D-10). `runSeed` only executes the plan.
**When to use:** Always; it is what makes D-10's two-level test feasible.

### Pattern 3: Run-time wiring for the container
The runtime image has only `apps/api/dist`, `packages/contracts/dist`, `apps/web/dist`, prod `node_modules` and the root/api `package.json` [VERIFIED: `Dockerfile` lines 33-36 `COPY --from=build ... /app/apps/api/dist apps/api/dist`]. `npm run seed -w @tfm/api` resolves in that layout as user `node` [VERIFIED: `docker run --rm --entrypoint sh tfm-app:0.1.0 -c 'cd /app; npm run seed -w @tfm/api'` printed the placeholder and exited 0]. Assets are located with `new URL("../assets/cv-frontend.pdf", import.meta.url)` which works from `src` (tsx, vitest) and from `dist`.

### Pattern 4: TanStack Router defaults
`createRouter({ routeTree, history, parseSearch, stringifySearch, defaultNotFoundComponent, defaultErrorComponent })` [VERIFIED by scratch test, since deleted]: with `defaultNotFoundComponent: () => <h1>ES NOT FOUND</h1>` the result for `/nope` rendered inside `<main>` with the `<aside>` (shell) still present; today the unknown route renders the English text `Not Found` [VERIFIED: scratch test output "NOTFOUND: Not Found"]. `defaultErrorComponent` receives `({ error, reset })`. The UI-SPEC's root `errorComponent` (no shell) belongs on `createRootRoute({ component, errorComponent })` in `routes/__root.tsx`.

### Pattern 5: Hono body limit scoped per router
`documents.routes.ts` already applies `bodyLimit({ maxSize, onError: () => { throw tooLarge(); } })` on its own POST [VERIFIED: file read]. Do the same for `/api/applications/*` and `/api/offers/*` only. A global `/api/*` limit would cap the 5 MB upload route.

### Anti-Patterns to Avoid
- **Seeding the 3 fixtures as applications** (contradicts D-08), or any application with company `Lumen Analytics` / title `Desarrollador/a Frontend Senior`: the `mock` provider always returns that draft whatever text is pasted [VERIFIED: `apps/api/src/llm/mock.provider.ts` `MOCK_OFFER_EXTRACTION`], so the demo offer would look pre-existing.
- **Creating an application directly in a late status**: history would have a single entry; walk the transitions.
- **Patching `updatedAt`/history after the fact**: unnecessary with the injected clock and easy to leave inconsistent.
- **Putting the `seed` field in `ApplicationDoc`/contracts**: it is storage-only; use an untyped `db.collection(...)` for the mark. The mappers whitelist fields by name, so it can never leak [VERIFIED: `applications.mapper.ts`, `documents.mapper.ts`] — add a mapper test asserting this.
- **Same tag label in two groups** within one application: `normalizeTags` merges duplicates across all groups (first spelling and group win) [VERIFIED: `packages/contracts/src/tag.normalize.ts`].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Domain rules in seeded data (history, `appliedAt`, `enviada → en_entrevistas`, tag `key`, link validation) | Direct `insertOne` with hand-built history | `createApplicationsService` / `createDocumentsService` with the injected clock | Rules already tested; D-06 |
| File type validation of seed PDFs | A separate check | `documents.service.upload` (uses `detectDocument`) | Same path as users |
| Body-size limiting | Manual Content-Length parsing | `hono/body-limit` | Already used; handles chunked bodies |
| S3 deadline | `Promise.race` timers | `s3.send(cmd, { abortSignal: AbortSignal.timeout(ms) })` | Verified against Silo: aborts with `AbortError` [VERIFIED: scratch run] |
| Bucket wipe | Delete by known keys only | `ListObjectsV2` pagination + `DeleteObjects` | `--reset` must also remove orphans; verified to work on Silo [VERIFIED: scratch run, 5 objects listed and deleted, `Errors: []`] |
| a11y rules | Custom ARIA checks | `axe-core` | Maintained rule set |
| Contrast math | Tailwind class parsing | 25-line WCAG luminance function over `styles.css` custom properties | Tokens are plain hex with `var(--x)` aliases; recomputed table matches the UI-SPEC |
| PDF text | A PDF library | Template string + computed xref offsets (see Code Examples) | D-07; validated with pdf.js |
| Asset copy in build | New npm package | `node -e "require('node:fs').cpSync(...)"` | Works on Node 22.23 [VERIFIED: ran it] |

**Key insight:** every "hard" piece already exists in the repo. The phase succeeds by wiring existing services, not by adding mechanisms.

## Runtime State Inventory

Not a rename/refactor phase. The only runtime-state consequences are the seed's own: (a) the seed **creates** Mongo documents carrying a new storage-only `seed: true` field and Silo objects under `documents/<id>/...`; (b) `--reset` deletes **all** applications, documents and bucket objects of the configured `MONGO_URL`/`S3_BUCKET`; (c) older dev-DB applications created before plan 02-03 have no `tags.key` and do not match the stack filter (STATE.md) — `--reset` removes them; (d) no OS-registered state, no secrets renamed, no build artifacts renamed (new `dist/scripts/assets/` is produced by the build).

## Common Pitfalls

### Pitfall 1: `npm run seed -- --reset` silently drops the flag
**What goes wrong:** the flag never reaches the script, and a rehearsal wipe does not happen (or the opposite assumption causes data loss confusion).
**Why:** root script `"seed": "npm run seed -w @tfm/api --if-present"` gets `--reset` appended **after** `--if-present`, so npm parses it as its own config flag. [VERIFIED: toy workspace with npm 10.9.9, "ARGS []"]. With a trailing `--` in the root script the flag is appended to the child command line and arrives (the toy then failed only because `node -e` treats it as a node flag; with `node dist/scripts/seed.js --reset` it arrives in `process.argv`).
**How to avoid:** root `"seed": "npm run seed -w @tfm/api --if-present --"`; test with a real script file printing `process.argv.slice(2)`; document `docker compose exec app npm run seed -- --reset`.
**Warning signs:** `--reset` accepted with no output about deleting everything.

### Pitfall 2: `docs/` is not in the Docker build context
`.dockerignore` lists `docs`, `*.md`, `.planning`, `scripts` [VERIFIED: file read]. Fixtures in `docs/demo/ofertas` are therefore unavailable in the image and during `npm run build` there. That is fine because the seed does not use them (D-08) and the fixture tests run in the devcontainer, but do **not** make `apps/api/src` code that is imported at runtime by `main.ts` or `seed.ts` read from `docs/`. `fixtures.ts` is compiled into `dist` today (tsconfig.build only excludes `*.test.ts`); harmless until `readFixtureText` is called, optionally exclude `src/offers/__fixtures__` and `src/scripts/try-extract.ts` from `tsconfig.build.json`.

### Pitfall 3: PDFs and git/text handling
`.gitattributes` is `* text=auto eol=lf` [VERIFIED: file read]. An all-ASCII PDF is classified as text and rewritten with LF; byte offsets in `xref` break if any CR was ever introduced. Generate with `\n` only, add `*.pdf binary` to `.gitattributes`, and verify `git diff --stat` shows the PDFs as binary. Keep characters within Latin-1 (accents, `·`, `«»` are fine; `€` and `—` are not in Latin-1, use octal escapes `\200`/`\227` or avoid).

### Pitfall 4: Docker stream loss in this devcontainer
`docker run`/`exec` output was empty on the first invocation and present on the second [VERIFIED: observed this session]; `compose-smoke.sh` documents the same ("detach an `exec` stream after ~0.5 s") and works around it by writing results to a file in the container and polling. Any new smoke step (seed, cold start) must reuse `http_send`/`http_get` or the same file-polling idiom, and assert via the API (`GET /api/applications` count) rather than the seed's stdout.

### Pitfall 5: `docker compose down -v` deletes the Ollama model
The compose project `expediente` owns `mongo-data`, `s3-data` **and** `ollama-data` (4.6 GB model) [VERIFIED: `compose.yml` volumes block]. A literal `down -v` for the cold-start test destroys the model and forces a re-pull. Run the cold-start test with a separate project (`docker compose -p expediente-cold ...`), only the services it needs (`app mongo s3`, with `LLM_PROVIDER=mock`, which does not depend on `ollama`: `app.depends_on` lists mongo, s3, s3-init only [VERIFIED: compose.yml]), and `down -v` that project. Also the script must never publish-port-clash with a running `expediente` project (port 8080).

### Pitfall 6: Mongo text/tag state when the API never started
The indexes are created by `connectMongo` → `ensureIndexes` [VERIFIED: `db/mongo.ts`]. A seed run on a fresh volume before the API has ever started must call `connectMongo` (not a bare `MongoClient`) and `ensureBucket`, or the `tags.key` index and text index are missing.

### Pitfall 7: Test-database sharing
API tests run with `fileParallelism: false` against the single DB `tfm_test` and bucket `tfm-assets-test` [VERIFIED: `vitest.config.ts`, `src/test/mongo.ts`, `src/test/documents.ts`]. The seed integration test must use `useTestDb()` / `useTestStorage()` and `reset()` afterwards; it must never be pointed at `tfm`/`tfm-assets`. The `--reset` path in tests must run against these only.

### Pitfall 8: Phase-1 findings lost their disposition rows
D-16 says the "API startup hanging/dying" and "`pingS3` without abort" findings are in `01-REVIEW-DISPOSITION.md`. They are not: they were WR-01/WR-02 of the *first* review (commit `b578856`); the second review reused those ids for the traversal-test and `server.host` findings, so the table has no row for them [VERIFIED: compared the disposition table with `git show b578856:...01-REVIEW.md`]. Add explicit new rows (for example `WR-01a`/`WR-02a`) when flipping to `fixed`, and note the reuse.

### Pitfall 9: Ollama on CPU can exceed the demo budget and the 90 s timeout
Phase 3 measured `gemma4:e2b` on 10 CPU cores: first run 504 on all three fixtures (cold load plus loaded machine), then 10-21 s per extraction with the D-25 prompt [VERIFIED: `03-09-SUMMARY.md` "Model rerun with the D-25 prompt": 21.3 s, 10.0 s, 11.1 s; run 1: 90.1 s `LLM_TIMEOUT`]. Ollama unloads a model after 5 minutes idle by default; `OLLAMA_KEEP_ALIVE` (global) or `keep_alive` (per request) change that [CITED: docs.ollama.com/faq]. The provider does not send `keep_alive` [VERIFIED: `ollama.provider.ts` sends only `options: { temperature: 0, num_ctx: 8192 }` and `format`]. A cold first paste during the defense is the single most likely way to break DEMO-05 with Ollama. Recommend `OLLAMA_KEEP_ALIVE: "30m"` on the `ollama` compose service plus a README "calienta el modelo antes de empezar" step (see Open Questions Q5).

### Pitfall 10: Existing tests assert the classes the sweep removes
`common-components.test.tsx` asserts `text-destructive` on the error icon (line 180) and `px-1.5`/`font-bold` on `AiMark` (lines 217-219); `app-layout.test.tsx` asserts `gap-3` and `font-medium` (lines 53, 58) [VERIFIED: grep]. Update those tests in the same commit as the class changes (pre-commit runs the full typecheck, and the pre-push hook runs the full test suite).

### Pitfall 11: Same fake-timer drift pattern in other tests
`vi.useFakeTimers({ shouldAdvanceTime: true })` also appears in `application-detail.test.tsx` (lines 940, 1494) and `document-list.test.tsx` (line 617) besides the flagged 05 WR-01 test (`document-upload.test.tsx` line 648) [VERIFIED: grep]. Fix 05 WR-01 as the review suggests (drop real-time advance or widen the margin: assert at 4000 ms, advance 1500 ms) and re-read the other three for the same margin problem.

### Pitfall 12: Worker-start flake is environmental, not code
`Failed to start forks worker` comes from a hard-coded 90 s start timeout in Vitest while 6 forks each load jsdom from the slow bind-mounted workspace (`require('jsdom')` 42-46 s there vs 0.4 s on overlay), measured in Phase 2 research [CITED: `02-RESEARCH.md` Q6 detail]. Today the filesystem is warm (`require('jsdom')` 0.54 s; whole web suite 12.8 s), so the flake only shows after a cold cache. No Vitest option helped in Phase 2 [CITED: same section]. See Open Questions Q4 for the choice.

## Code Examples

### Root and API scripts (D-01, Pitfall 1)
```jsonc
// package.json (root)
"seed": "npm run seed -w @tfm/api --if-present --"

// apps/api/package.json
"build": "tsc -p tsconfig.build.json && node -e \"require('node:fs').cpSync('src/scripts/assets','dist/scripts/assets',{recursive:true})\"",
"seed": "node dist/scripts/seed.js",
"seed:dev": "tsx --conditions=@tfm/source src/scripts/seed.ts"
```
In the devcontainer `dist` must exist first: `npm run build && npm run seed`; in the image the build already ran.

### Entry script skeleton
```typescript
// apps/api/src/scripts/seed.ts  (Source: this research; config.ts + main.ts patterns read in repo)
const reset = process.argv.slice(2).includes("--reset");
// loadConfig requires LLM vars unless the provider is mock: the seed never calls the LLM.
const config = loadConfig({ ...process.env, LLM_PROVIDER: "mock" });
const { client, db } = await connectMongo(config.MONGO_URL);   // also ensureIndexes
const s3 = createS3Client(config);
await ensureBucket(s3, config.S3_BUCKET);
try {
  const summary = await runSeed({ db, s3, bucket: config.S3_BUCKET, reset, log: console.log });
  console.log(`Seed listo: ${summary.applications} candidaturas, ${summary.documents} documentos.`);
} finally {
  s3.destroy();
  await client.close();
}
```
Log only counts and the target database/bucket names, never offer text. When `reset` is true print what will be removed (counts of applications, documents, bucket objects) before deleting (D-03).

### Pure plan test targets (D-10)
Assert on `buildSeedPlan(fixedNow)`: exactly 12 applications; all 7 statuses of `applicationStatusSchema` present (`guardada`, `enviada`, `en_entrevistas`, `oferta_recibida`, `aceptada`, `rechazada`, `descartada` [VERIFIED: `packages/contracts/src/enums.ts:6-14`]); `enviada` and `en_entrevistas` most frequent; 3 applications with 3 rounds; one future `scheduledAt`; every timeline step within `[now - 42 d, now]`; non-decreasing timestamps; no company/title equal to the mock draft or to the three fixtures' companies (`Nimbo Software`, `Talleres Digitales del Sur`, `Northwind Labs` [VERIFIED: `fixtures.ts`]); at least one application with more than 3 tags, one without salary, one without location, one 70-80 character title, each work mode once; all document names ≤ 40 characters; tag labels ≤ 40 characters and unique per application under `tagKey`.

### Integration test targets (tfm_test, tfm-assets-test)
Run `runSeed` twice: `applications` count with `seed:true` is exactly 12 and total is 12; documents with `seed:true` is 3; no object from the first run's keys remains in the bucket; every seeded application's `statusHistory` satisfies: first entry at `createdAt`, consecutive statuses differ, last equals `status`, timestamps non-decreasing; an application with rounds has history containing `en_entrevistas` after `enviada`; `cvDocumentId`/`coverLetterDocumentId` resolve to existing documents of the right type and `documentsService.open(id)` returns a stream starting with `%PDF-`; the public list (`GET /api/applications` through `createApp`) does not expose a `seed` key. A third case: pre-create a non-seed application and document, run without `--reset` (they survive), run with `reset: true` (they are gone and the bucket is empty).

### Minimal readable PDF (D-07), validated with pdf.js
```javascript
// Throwaway generator, validated this session: pdf.js read back "Lucía Demo Pérez / Desarrolladora Frontend · Madrid / ..."
const esc = (s) => s.replace(/[\\()]/g, "\\$&");
function pdf(lines) {
  const content = ["BT", "/F1 11 Tf", "14 TL", "56 780 Td", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1"); // one page, 772 bytes for 5 lines
}
```
Run it once, commit the three output files (the generator itself need not be committed, or keep it under `scripts/` as documentation), and check each with `detectDocument(bytes, "x.pdf")`. Text must be Latin-1.

### axe helper (jsdom)
```typescript
// apps/web/src/test/axe.ts  (types verified with the repo's tsconfig options)
import axe, { type AxeResults } from "axe-core";

export async function checkA11y(root: Element = document.documentElement): Promise<AxeResults["violations"]> {
  document.documentElement.lang = "es"; // jsdom has no lang; index.html has <html lang="es">
  const results = await axe.run(root, { rules: { "color-contrast": { enabled: false } } });
  return results.violations;
}
// in a test: expect(await checkA11y()).toEqual([]);
```
Verified this session (scratch tests, removed): with `lang="es"` axe reported **zero violations** on the populated list, detail (with a round), new-application form, `/documents`, the open «Añadir ronda» dialog and the open mobile Sheet; without `lang` the only finding was `html-has-lang`. One run takes about 110 ms. The two error screens and the skip link are new, so they are the first things that can fail.

### Contrast helper (recomputes the UI-SPEC table)
Parse `apps/web/src/styles.css`: the `:root { ... }` block and the `.dark { ... }` block, collect `--name: #hex;` pairs, resolve `var(--x)` aliases, overlay `.dark` on `:root`. WCAG luminance: channel `c/255`, `c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`, `L = 0.2126R + 0.7152G + 0.0722B`, ratio `(L1+0.05)/(L2+0.05)`. Every row of the UI-SPEC "Contrast contract" was recomputed this session and matches to two decimals (for example `foreground/background` 13.94 light / 14.57 dark; `destructive` on `card` 7.40 light / 2.83 dark; `ring` on `sidebar` 1.24 light; `sidebar-ring` on `sidebar` 6.32 / 9.63) [VERIFIED: ran a script over `styles.css`]. The test asserts text pairs ≥ 4.5, non-text ≥ 3.0, and that the documented non-passes are not used as foreground.

### Body limit on JSON routes (D-20, 02 WR-01)
```typescript
// apps/api/src/applications/applications.routes.ts, before the handlers (also offers/extract.routes.ts)
import { bodyLimit } from "hono/body-limit";
routes.use("*", bodyLimit({
  maxSize: 256 * 1024,
  onError: () => { throw new ApiError(413, "VALIDATION_ERROR", "Solicitud demasiado grande"); },
}));
```
`errorCodeSchema` has no payload-too-large code [VERIFIED: `packages/contracts/src/error.schema.ts:3-12`: VALIDATION_ERROR, NOT_FOUND, DOCUMENT_IN_USE, FILE_TOO_LARGE, UNSUPPORTED_FILE_TYPE, LLM_ERROR, LLM_TIMEOUT, INTERNAL_ERROR]; reuse `VALIDATION_ERROR` with status 413 and avoid a contracts enum change. Legit payloads are far below the cap (`offerText` ≤ 20,000 chars, `notes` ≤ 5,000).

Contracts bounds (single source): `sourceUrl` `.max(2048)`, `cvDocumentId`/`coverLetterDocumentId` `.max(64)` (keep them strings, not `length(24)`: Phase 5 tests expect an unknown id to produce the field error «El documento no existe»). These constants live in `applicationFieldsSchema`, which the response schema extends, so the web form validates them too; `issueToMessage` for `sourceUrl` returns one generic URL message for every issue, which is acceptable for a 2,049-character URL.

### S3 abort and startup (D-16)
```typescript
// storage/s3.ts
await s3.send(new HeadBucketCommand({ Bucket: bucket }), { abortSignal: AbortSignal.timeout(2000) }); // pingS3
// ensureBucket: same option (5000) on Head and Create
```
```typescript
// main.ts: bounded retry then a deliberate exit, logging err.message only (never a stack or a URL with credentials)
for (let attempt = 1; ; attempt++) {
  try { ({ client: mongoClient, db } = await connectMongo(config.MONGO_URL)); await ensureBucket(s3, config.S3_BUCKET); break; }
  catch (err) {
    console.error(`Startup attempt ${attempt} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    if (attempt === 10) process.exit(1);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```
`connectMongo` already bounds server selection at 3000 ms [VERIFIED: `db/mongo.ts`]. Under compose the container restarts (`restart: unless-stopped`) and `depends_on ... service_healthy` already orders startup, so the retry mostly protects `npm run dev`. Keep the attempt log lines free of the Mongo URL (it may carry credentials).

### SPA fallback (D-18, 01 WR-08)
Current code answers any non-API GET with `indexHtml` and status 200 [VERIFIED: `app.ts:110-114`]. Restrict the fallback to extension-less last segments (`!/\.[A-Za-z0-9]+$/.test(path)`) so a missing `/assets/index-abc.js` is a JSON/plain 404, not HTML; and when `webDistDir` is set but `readIndexHtml` returned `undefined`, log one line naming the directory (and in `main.ts` with `NODE_ENV=production` exit non-zero). Existing tests cover serving assets, fallback for client routes and traversal [VERIFIED: `app.test.ts` describe "static hosting with SPA fallback"]; add: missing asset → 404, missing index → warning.

### Router defaults (D-18, UI-SPEC A7)
```typescript
// core/router/router.ts
createRouter({ routeTree, history, parseSearch, stringifySearch,
  defaultNotFoundComponent: RouteNotFound,
  defaultErrorComponent: RouteError });   // ({ error, reset }) => never renders error.message
// routes/__root.tsx
createRootRoute({ component: AppLayout, errorComponent: RootError });  // standalone, no shell
```
`RouteNotFound`/`RouteError` live in `common/components/` (not in a pod; pods must not import pods). Copy and layout are exact in `06-UI-SPEC.md` §1.

### List refetch (D-16, 02 WR-04)
In `application-list.component.tsx` the empty branches run whenever `applications.length === 0`, including while `refreshing` with a stale empty array. Treat `refreshing && applications.length === 0` as a loading state (skeleton, `count = null`) and keep the stale cards with `aria-busy` when the stale list is non-empty. Use the code in `02-REVIEW.md` WR-04: `const showSkeleton = firstLoad || (refreshing && applications.length === 0)`.

### Delete-dialog reset (D-16, 02 WR-03)
`deletion = { key, state: "error" }` persists in `application-detail.hooks.ts` (state set at line 422-427) until the next attempt; the dialog state lives in the component (`useState(open)`). Expose `resetDeleteError()` from the hook and call it when the dialog opens. The same reset-on-open contract applies to the round-delete and document-delete dialogs (UI-SPEC §3); the document delete dialog is controlled by `row !== null`, so reset happens where the container sets the row.

### Dialog lock (D-19, 05 WR-03)
`DialogContent`/`AlertDialogContent` gain `closeDisabled?: boolean`; the X is `aria-disabled` (stays focusable), and every close attempt (X, Esc, overlay) writes the fixed sentence into the dialog's existing always-mounted `role="status" aria-live="polite"` line. The upload dialog's `handleOpenChange` already swallows closes while uploading (`upload-dialog.tsx:65-67`), so the change is to surface feedback, not to alter the lock. Copy is exact in the UI-SPEC («Cancela la subida para cerrar.»).

### cold-start and smoke additions (D-15, 02 WR-02)
- `WR-02` trap: register `trap cleanup_app EXIT` right after `app_id` is known (and the same for `doc_app_id`/`doc_id`); the cleanup issues DELETE and ignores failure [CITED: `02-REVIEW.md` WR-02 fix].
- Add `--cold` (or a sibling script) that runs in project `expediente-cold`: `docker compose -p expediente-cold down -v`, then `LLM_PROVIDER=mock docker compose -p expediente-cold up -d --build --wait app mongo s3`, waits for `/api/health`, runs `docker compose -p expediente-cold exec -T app npm run seed`, asserts `GET /api/applications` has 12 items and `GET /api/documents` 3, downloads one document (starts with `%PDF-`), posts a fixture to `/api/offers/extract` and expects 200 with the mock draft, records elapsed seconds, then `down -v`. Build the JSON body for the fixture on the host (`node -p "JSON.stringify({text: ...})"`) because `http_send` passes the body as argv.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vitest-axe` wrapper | `axe-core` called directly (`axe.run(el, { rules })`) | CONTEXT decision | One devDependency, same rules |
| TanStack's built-in Not Found / error screens | `defaultNotFoundComponent` / `defaultErrorComponent` | router option present in 1.170.44 [VERIFIED: scratch] | Spanish screens inside the shell |
| Global `/api/*` body cap | per-router `bodyLimit` | this phase | Upload route keeps its 5 MB + 64 KB limit |
| Default Ollama keep-alive (5 min) | `OLLAMA_KEEP_ALIVE` set on the service | docs.ollama.com/faq [CITED] | No cold reload in the middle of the demo |

**Deprecated/outdated:**
- `docs/ARCHITECTURE.md` and `docs/AI-EXTRACTION.md` still say the fixtures live in `apps/api/src/offers/__fixtures__/` and that the seed reuses them; both change with D-08/D-09 (write back).
- `docs/ARCHITECTURE.md` lists `scripts/seed.ts` under `apps/api`; the real path is `apps/api/src/scripts/seed.ts` (+ `seed/`).
- `03-VALIDATION.md` is already `status: validated`, `nyquist_compliant: true` (validated 2026-11-01); STATE.md's "still draft" is stale (Open Questions Q2).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 256 KiB is a safe JSON body cap for applications and offers routes | Code Examples (Body limit) | A legitimate maximal payload (control characters escape to 6 bytes each) could be rejected; pick 512 KiB if worried |
| A2 | The cold-model Ollama timeout seen in Phase 3 (a loaded 8 GB-shared devcontainer) will also happen on the presenter's laptop | Pitfall 9 | If the laptop has GPU/more RAM the keep-alive/warm-up advice is merely harmless |
| A3 | `OLLAMA_KEEP_ALIVE: "30m"` is acceptable memory-wise on the demo machine | Open Questions Q5 | Higher resident memory; use a shorter value |
| A4 | The forks-worker flake will recur on a cold cache of the presenter's machine | Pitfall 12 | If never recurring, the retry wrapper is harmless dead code |
| A5 | Mixed Spanish/English tags and invented companies are acceptable "realistic" content | Seed content | Content-only, trivial to edit |
| A6 | `fs.cpSync` is acceptable in the Docker build stage (same Node 22.23.2) | Code Examples | Verified on Node 22.23.4 locally; the image uses 22.23.2 (not run) |

## Open Questions (RESOLVED)

All seven questions were resolved before planning closed; each carries an inline **RESOLVED** line naming the decision and the plan that implements it (plan numbers as revised on 2026-11-06).

1. **DEMO-01 / ROADMAP success criterion 1 say the seed loads "the 3 fixture offers"; D-08 says they are not seeded.**
   - What we know: D-08 and UI-SPEC §9 are explicit (the fixtures exist only to be pasted live; the 12 seeded apps use other offers). `REQUIREMENTS.md` DEMO-01 and the ROADMAP text were written earlier.
   - What's unclear: whether the user wants the wording changed.
   - Recommendation: follow D-08 (locked). In the phase, rewrite DEMO-01 and ROADMAP SC1 to "...loads demo applications and documents into Mongo and Silo; the 3 fixture offers are available in `docs/demo/ofertas/`", and have the seed's final log line print that path. Flag it for the user at plan review.
   - **RESOLVED:** D-08 stays locked and wins over the old wording. Plan 06-16 (Task 2) rewrites DEMO-01 in `REQUIREMENTS.md` and ROADMAP Phase 6 SC1; plan 06-02 (Task 3) makes the seed print «Ofertas para pegar en la demo: docs/demo/ofertas/» as its last line.
2. **Which validation drafts really need closing (D-24)?** `03-VALIDATION.md` is already validated and compliant; `02-VALIDATION.md` is `draft`, `nyquist_compliant: false`, `wave_0_complete: false`; `05-VALIDATION.md` is `draft`, `nyquist_compliant: true`, `wave_0_complete: false`, all rows `⬜ pending` (the tests exist and pass). Recommendation: plan one task per phase 02 and 05 that maps each requirement/row to its existing test file (they exist: for example `applications.status.test.ts`, `applications.interviews.test.ts`, `applications.documents.test.ts`, `documents.upload.test.ts`, `document-list.test.tsx`), flips rows to `✅ green`, ticks Wave 0 boxes, and sets frontmatter; for 03 only record "verified, no change" (Nyquist audit table already shows 0 gaps).
   - **RESOLVED:** D-24. Plan 06-15 closes `02-VALIDATION.md` (Task 2) and `05-VALIDATION.md` (Task 3) with run evidence; `03-VALIDATION.md` is recorded as verified with no change.
3. **The Phase 1 startup/ping findings have no disposition row (Pitfall 8).** Recommendation: add rows with new ids and a Source note rather than editing WR-01/WR-02.
   - **RESOLVED:** D-16. Plan 06-04 (Task 1) adds rows `WR-01a` and `WR-02a` with a Source note about the reused ids and sets them to `fixed`.
4. **Forks-worker flake (D-17): which mitigation?** Options: (a) in-repo, recommended: the web workspace's `test` script runs Vitest through a ~25-line Node wrapper that reruns **once** only when the output contains `Failed to start` + `worker` and no test result was produced; plus a README/UAT note; (b) real fix: a Docker named volume for `node_modules` in `.devcontainer/docker-compose.yml` (requires a container rebuild, a `checkpoint:human-action`; previously declined on 2026-10-30 [CITED: `02-VALIDATION.md` Wave 0 decision]). Recommend (a) now and offer (b) to the user.
   - **RESOLVED:** option (a), D-17. Plan 06-13 (Task 1) adds `apps/web/scripts/run-vitest.mjs`, a one-shot retry only on the worker-start failure; the devcontainer volume stays declined (2026-10-30).
5. **Ollama keep-alive/warm-up (Pitfall 9):** add `OLLAMA_KEEP_ALIVE: "30m"` to the compose `ollama` service and a README "warm up" command (one `docker compose exec ollama ollama run gemma4:e2b "hola"` or a `try-extract` run), or leave compose untouched and only document. Needs the user's nod because it changes compose.
   - **RESOLVED:** the user chose the keep-alive option at plan review on 2026-11-06 (D-26). Plan 06-16 (Task 3) adds `OLLAMA_KEEP_ALIVE: "30m"` to the `ollama` service and the README «Calentar el modelo antes de la demo» step; no execution-time checkpoint remains.
6. **Human-only steps:** README screenshot (`docs/img/application-list.png`, 1280x800 light theme, from the seeded app), the S1-S11 x 3 viewports x 2 themes pass, the keyboard walk, `prefers-reduced-motion`, and the timed 2-minute demo with Ollama and with `mock`. No browser, Playwright or Chromium exists in the devcontainer [VERIFIED: `which chromium ... ` and `~/.cache/ms-playwright` absent]. Plan these as `checkpoint:human-verify` tasks writing `06-UAT.md`; the user's host browser reaches the dev ports through devcontainer forwarding and the compose port on `127.0.0.1:8080`.
   - **RESOLVED:** plan 06-17 runs one consolidated human pass (Task 2) recorded in `06-UAT.md`, and Task 3 fixes every reported layout or keyboard issue with a guard test before recording; the screenshot is `docs/img/application-list.png`.
7. **Image size target (Claude's discretion):** the current `tfm-app:0.1.0` is 397 MB (node:22-slim base, 42 MB prod `node_modules`, 356 KB api dist, 1.3 MB web dist) [VERIFIED: `docker images`, `du` in the image]. Recommend a documented ceiling of 450 MB asserted in the smoke script.
   - **RESOLVED:** 450 MB ceiling (Claude's discretion, D-15), asserted by `bash scripts/compose-smoke.sh --cold` in plan 06-16 (Task 1).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | everything | ✓ | v22.23.4 / 10.9.9 | — |
| Docker CLI + daemon (outside-of-docker) | compose smoke, cold start, image checks | ✓ | 29.9.2 | — (streams unreliable, use file-polling idiom) |
| MongoDB (devcontainer `mongo`) | API integration tests, seed test | ✓ | reachable via `MONGO_URL=mongodb://mongo:27017/tfm` | — |
| Silo / MinIO (devcontainer `s3`) | storage + seed tests | ✓ | `http://s3:9000` health 200; SDK ops verified | — |
| Ollama (devcontainer `ollama`) | real-model timing | ✓ | `gemma4:e2b` present | `LLM_PROVIDER=mock` |
| Browser (Chromium/Firefox/Playwright) | responsive, keyboard, screenshot, timed demo | ✗ | — | Human pass on the user's host browser (checkpoint) |
| pdftotext / qpdf / mutool / pypdf | PDF validation | ✗ | — | `pdfjs-dist` in a scratch dir only (not committed); `detectDocument` check in the test |
| Pre-pulled compose images | cold start | ✓ | `mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`, `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`, `ollama/ollama:0.40.3` all present locally | — |

**Missing dependencies with no fallback:** none blocking, but the browser-based checks cannot be automated here.
**Missing dependencies with fallback:** browser (human), PDF viewers (scratch pdf.js).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 (contracts node defaults; api node, real Mongo `tfm_test` + Silo `tfm-assets-test`, `fileParallelism: false`; web jsdom 30.1.2 + Testing Library) |
| Config file | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` (`setupFiles: ./src/test/setup.ts`), contracts defaults |
| Quick run command | `npm run test -w @tfm/api -- src/scripts` · `npm run test -w @tfm/web -- src/<path>` |
| Full suite command | `npm run typecheck && npm run test && npm run lint` (plus `npm run build` and `bash scripts/compose-smoke.sh --down` at the phase gate) |

Baseline this session: typecheck green; contracts 57, api 407 (21 files), web 615 (16 files) tests green, about 19 s warm [VERIFIED: ran].

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEMO-01 | `buildSeedPlan` shape (12 apps, 7 statuses, 3 with rounds, dates in window, no mock-draft/fixture collisions) | unit (node) | `npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts` | ❌ Wave 0 |
| DEMO-01 | Two runs leave exactly 12/3, histories coherent, links resolve, downloads are PDFs, `--reset` wipes all, `seed` field not exposed | integration (Mongo + Silo test bucket) | `npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts` | ❌ Wave 0 |
| DEMO-01 | Seed works in the image | compose smoke | `bash scripts/compose-smoke.sh --cold` (new) | ❌ Wave 0 |
| DEMO-01 | `npm run seed -- --reset` forwards the flag | script test | run a real `node dist/scripts/seed.js --reset` against the test DB env, or unit-test `parseArgs` + manual check | ❌ Wave 0 |
| DEMO-02 | README contains run/seed/`--reset`/`LLM_PROVIDER=mock`/`LLM_MODEL`/`docs/demo/ofertas` and none of the removed phase notes | grep | `grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md` (plan `<verify>` form) | n/a |
| DEMO-03 | No horizontal overflow at 360/768/1280 | manual (UAT S1-S11) + jsdom class backstop (`min-w-0`, `break-words`, `w-full sm:w-auto`) | `npm run test -w @tfm/web -- src/layouts src/common` | UAT file ❌ |
| DEMO-04 | axe (non-contrast) on list, detail, form, documents, dialog, Sheet, both error screens, light and dark | component | `npm run test -w @tfm/web -- src/test src/core/router` | ❌ Wave 0 (`src/test/axe.ts`) |
| DEMO-04 | AA contrast of all token pairs, both themes | unit | `npm run test -w @tfm/web -- src/common/lib/contrast.test.ts` | ❌ Wave 0 |
| DEMO-04 | Live-region inventory, skip link, `aria-current`, sidebar focus ring classes, close-blocked sentence, reset-on-open, refetch without empty flash, Spanish 404/error | component | `npm run test -w @tfm/web -- src/layouts src/pods src/core/router` | partial ✅ (extend) |
| DEMO-05 | Mock extraction through the production image; API-level flow | compose smoke (`--cold`) | `bash scripts/compose-smoke.sh --cold` | ❌ Wave 0 |
| DEMO-05 | 2-minute timed demo with Ollama and with mock | manual (UAT) | n/a | ❌ |
| DEMO-06 | Mapper gaps closed; DOMAIN rules traced to tests; 05 WR-01 stable | unit/component | `npm run test -w @tfm/web -- src/pods` · `npm run test -w @tfm/api -- src/applications src/documents` | partial ✅ |
| DEMO-06 | Clean checkout | script | `git clone . "$TMP" && cd "$TMP" && npm ci && npm run typecheck && npm run test` (run on the overlay FS, in the devcontainer so Mongo/Silo env exists) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the touched workspace's targeted command (API about 5-10 s, web per pod).
- **Per wave merge:** `npm run typecheck && npm run test && npm run lint`.
- **Phase gate:** full suite + `npm run build` + `bash scripts/compose-smoke.sh --down` + `--cold`, then `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `apps/api/src/scripts/seed/seed.plan.test.ts`, `seed.run.test.ts` (D-10)
- [ ] `apps/web/src/test/axe.ts` and the axe test file(s) (D-13); `axe-core` devDependency
- [ ] `apps/web/src/common/lib/contrast.ts` + `contrast.test.ts`
- [ ] Mapper unit tests (D-23): web mappers have no dedicated `*.mapper.test.ts`; exported functions with **no direct test-file reference** found by grep: `document-upload.mapper` (`newUploadFormValues`, `validateUploadForm`, `mapUploadFormToRequest`, `mapUploadedDocumentFromApiToVm`, the three message constants), `application-detail.mapper` (`mapInterviewFromApiToVm`, `nextInterviewRound`, `newInterviewFormValues`), `document-list.mapper` (`deleteErrorMessage`, `mapDocumentFromApiToVm`); the rest are referenced only through component tests. API mappers (`applications.mapper`, `documents.mapper`) are covered only through route tests: add direct tests including "an extra stored field (`seed: true`) is not mapped".
- [ ] DOMAIN rule sweep (D-23): rules 1-7 already have named tests (for example rule 4 «makes a linked document undeletable until the link is cleared (rule 4)», rule 5 «keeps the documents of a deleted application, now deletable (rule 5)») [VERIFIED: grep of test titles]; produce a rule→test table in the phase SUMMARY and add tests only where a row is empty (rule 6 is covered by `application-edit.merge.test.ts`; rule 2 by the `appliedAt` tests).
- [ ] 05 WR-01 timer fix, and a re-read of the three sibling `shouldAdvanceTime` tests
- [ ] Updates of the two test files that assert removed classes (Pitfall 10)
- [ ] New smoke mode `--cold` in `scripts/compose-smoke.sh`

## Security Domain

`security_enforcement` is enabled (ASVS level 1, block on high) [VERIFIED: `.planning/config.json`].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (single-user, no login) | — |
| V3 Session Management | no | — |
| V4 Access Control | no (loopback-only ports, no users) | `127.0.0.1` port binds already in `compose.yml` |
| V5 Input Validation | yes | Zod contracts incl. new `.max()` bounds; per-router `bodyLimit`; seed reads only fixed asset paths |
| V6 Cryptography | no new use | — |
| V7 Logging | yes | Never log offer text, file names or keys; seed logs counts and target names only; startup retry logs `err.message` only |
| V12 Files | yes | Seed PDFs pass through `detectDocument` (magic bytes + extension) via the upload service |
| V14 Configuration | yes | Pinned image versions, `.env` ignored, `.env.example` current; `OLLAMA_KEEP_ALIVE` (if added) is not a secret; default `minioadmin` credentials stay loopback-only and documented as dev-only |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized JSON body exhausts memory/storage | DoS | `bodyLimit` + `.max()` on `sourceUrl`/ids (D-20) |
| `--reset` run against the wrong environment wipes real data | Tampering | Print target db/bucket and counts before deleting; flag-only; never a default; tests pin to `tfm_test`/`tfm-assets-test` |
| Seed deletes user data on a normal run | Tampering | Delete only `{seed: true}` documents and the S3 keys they own |
| Missing hashed asset served as `index.html` hides a broken deploy | Integrity | Extension-aware fallback (WR-08) |
| Startup error logs leak the Mongo URL | Information disclosure | Log `err.message` only; message text from the driver can contain the host but not credentials in `mongodb://mongo:27017/tfm`; still do not log the URL |
| Error screen shows server/thrown message | Information disclosure | `RouteError` renders fixed copy only (UI-SPEC) |
| Path traversal through static root | Tampering | Already covered by existing tests (`static root is fixed (T-01-06)`) |
| LAN exposure of the Vite dev server (`server.host: true`) | Information disclosure | Deferred by CONTEXT (01 WR-02); mention in the README that the demo should use the compose stack, bound to `127.0.0.1` |

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `06-CONTEXT.md`, `06-UI-SPEC.md`, `REQUIREMENTS.md`, `STATE.md`, `package.json` x3, `Dockerfile`, `compose.yml`, `.env.example`, `.dockerignore`, `.gitattributes`, `scripts/compose-smoke.sh`, `README.md`, `apps/api/src/{app,main,config,errors}.ts`, `storage/s3.ts`, `db/mongo.ts`, `applications/*.{service,repository,routes,mapper}.ts`, `documents/*.{service,repository,routes,mapper,file-type,file-name}.ts`, `llm/{mock,ollama}.provider.ts`, `offers/__fixtures__/*`, `scripts/try-extract.ts`, `test/{mongo,documents}.ts`, `packages/contracts/src/{application.schema,error.schema,enums,document.schema,interview.schema,tag.normalize}.ts`, `apps/web/src/{styles.css,layouts/app-layout.tsx,core/router/router.ts,routes/__root.tsx,common/components/*}`, application-list/detail/document pods, review reports and dispositions of phases 1, 2, 5, validation drafts of 2, 3, 5, `docs/{DOMAIN,ARCHITECTURE,PRODUCT,AI-EXTRACTION}.md`, `03-09-SUMMARY.md`, `02-RESEARCH.md` Q6.
- Executed this session: `npm run typecheck`, `npm run test` (baseline); scratch Vitest runs of axe-core 4.14.0 against the real router (6 screens) and TanStack default components (scratch files removed, `git status` clean); WCAG ratio script over `styles.css`; AWS SDK ListObjectsV2/DeleteObjects/abortSignal against the devcontainer Silo (scratch bucket created and deleted); toy npm workspace for argument forwarding (npm 10.9.9); `docker run tfm-app:0.1.0` for `npm run seed -w @tfm/api`; hand-made PDF validated with pdf.js (scratch); `tsc` check of `import axe from "axe-core"` with the repo's compiler options.
- `gsd-tools query package-legitimacy check --ecosystem npm axe-core` (verdict OK).

### Secondary (MEDIUM confidence)
- docs.ollama.com/faq: default 5 min keep-alive, `OLLAMA_KEEP_ALIVE`, `keep_alive` per request [CITED].

### Tertiary (LOW confidence)
- Vitest start-timeout root cause and the unhelpfulness of pool options come from the Phase 2 research (not re-measured; today's filesystem is warm).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - one test-only dependency, verified legitimate and type-compatible.
- Architecture (seed, API fixes, router): HIGH - every mechanism exercised or read in code.
- Pitfalls: HIGH for 1-8, 10-11 (verified); MEDIUM for 9 and 12 (measured earlier, not on the presenter's machine).
- UI/a11y: HIGH for automated checks (axe/contrast verified); the responsive/keyboard/timing results cannot be known until the human pass.

**Research date:** 2026-11-06
**Valid until:** 2026-11-09 (defense date); stack is frozen, nothing here goes stale before then.
