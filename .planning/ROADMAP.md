# Roadmap: Expediente

## Overview

Expediente is built as seven vertical slices, one per pull request, in the order the author fixed: first a walking skeleton that already runs under `docker compose up` (monorepo, contracts, health, themed shell), then the manual application tracker (CRUD, filtered list, detail, status history), then the AI autofill that is the project's core value, then interview rounds, then documents in S3. Phase 6 turns the working product into a repeatable demo (seed, README, responsive and accessible UI, pending tests) and Phase 7 produces the defense material. The defense is on **9 Nov 2026**; each phase has a target date and its own branch `phase/NN-nombre`, and a finished MVP always wins over half-built features.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Fundaciones y walking skeleton** - Monorepo, contracts, API health, themed shell and `docker compose up` working end to end (target 29 Oct) (completed 2026-10-29)
- [x] **Phase 2: Candidaturas** - Listado, detalle, alta/edición manual, estado e historial (target 31 Oct) (completed 2026-10-31)
- [x] **Phase 3: Autocompletado con IA** - Paste an offer and get a reviewable draft that never overwrites user data (target 2 Nov) (completed 2026-11-01)
- [ ] **Phase 4: Rondas de entrevista** - Create, edit and delete interview rounds with the automatic move to `en_entrevistas` (target 3 Nov)
- [ ] **Phase 5: Documentos en S3** - Upload CV and cover letters, link them to applications, download them (target 5 Nov)
- [ ] **Phase 6: Pulido de demo** - Seed, README, responsive and accessibility pass, pending tests (target 7 Nov)
- [ ] **Phase 7: Documentación y defensa** - Deck, demo script, AI-usage doc, ADRs and examiner Q&A (target 8 Nov)

## Phase Details

### Phase 1: Fundaciones y walking skeleton
**Goal:** As the sole user, I want to run `docker compose up` and open a themed Expediente shell at localhost:8080 backed by a healthy API, so that every later phase ships on a working end-to-end skeleton.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Target**: 29 Oct 2026 · **Branch**: `phase/01-fundaciones`
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, FND-09, FND-10
**Success Criteria** (what must be TRUE):
  1. From the repo root, `npm install`, `npm run build`, `npm run test`, `npm run lint` and `npm run typecheck` pass across `apps/web`, `apps/api` and `packages/contracts`; web and API import every API model (enums, tag, interview, application, document, offer-extraction, error schemas and types) from `@tfm/contracts`; a commit with a lint, format or type error is rejected by the pre-commit hook.
  2. `docker compose up` (multi-stage Dockerfile, pinned image versions) brings up the app plus healthy Mongo, Silo and Ollama services, and the app opens at `http://localhost:8080`.
  3. `GET /api/health` returns `{ status, mongo, s3, llm }` and each field reflects real connectivity (stopping Mongo or Silo changes the matching field); the API refuses to start with an invalid environment, answers every error as `{ error: { code, message, details? } }`, and `.env.example` lists every variable the system reads.
  4. Opening the web app lands on `/applications` inside the Expediente shell (parchment and Oxford blue tokens, EB Garamond / Source Sans 3 / JetBrains Mono): fixed sidebar at 1024 px and above, header with a menu button that opens a sheet with the same navigation below that.
  5. The user can switch theme between Sistema, Claro and Oscuro from the shell; the default follows the system and the choice survives a reload.
**Plans**: 6/6 plans complete
Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Walking-skeleton tracer: workspace + contracts health/error + API real health + built web + Docker/compose smoke; error contract, env fail-fast, .env.example (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Quality gate: ESLint flat config, Prettier, Husky pre-commit (lint-staged + typecheck) and pre-push (tests) (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03-PLAN.md — All API contracts (enums, tag, interview, document, offer-extraction, application) + openai/mock LLM providers (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-04-PLAN.md — Web: / → /applications through route → scene → pod (full pod file set), DS tokens and fonts, http-client, formatters (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-05-PLAN.md — Shell: shadcn primitives, theme Sistema/Claro/Oscuro, AppLayout with sidebar and Sheet (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01-06-PLAN.md — README and phase gate (clean-install suite, compose smoke with model pull) (wave 6)
**UI hint**: yes

### Phase 2: Candidaturas
**Goal:** As a job seeker, I want to create, find, review and move my applications through their states, so that I have one reliable record of every selection process.
**Mode:** mvp
**Depends on**: Phase 1
**Target**: 31 Oct 2026 · **Branch**: `phase/02-candidaturas`
**Requirements**: APP-01, APP-02, APP-03, APP-04, APP-05, APP-06, APP-07, APP-08, APP-09, APP-10, APP-11, APP-12, APP-13, APP-14
**Success Criteria** (what must be TRUE):
  1. The user can create an application with only title (2–120) and company (1–120) required, edit it later with the same form, and add tags by group (stack / se valora / idiomas) that are trimmed, space-collapsed, deduplicated case-insensitively (first spelling kept) and capped at 20; invalid input shows validation errors from the contracts schema.
  2. The list shows each application as a card (title, company · location, status badge, up to 3 tags plus `+N`, salary, last-updated date) and shows distinct loading, error-with-retry, empty and empty-by-filters states.
  3. The user can filter by free text (title/company), status (multi), stack tags picked from `GET /api/tags` ordered by count, work mode and seniority, and sort by last update or applied date; filters and sort live in the URL, survive a reload, and «Limpiar filtros» resets them.
  4. The detail shows offer data, tags grouped by type, status history, notes and a collapsible original offer text; the interview and linked-documents sections are not rendered until Phases 4 and 5 (no placeholders); the user can delete the application after a confirmation dialog and its documents are not deleted.
  5. The user can change status to any of the 7 states from the detail; each change appends `{ status, at }` to the history, re-selecting the same status adds nothing, the first move to `enviada` sets `appliedAt` when empty, and `updatedAt` changes on every modification.
**Plans**: 12/12 plans complete
Plans:
**Wave 1**
- [x] 02-01-PLAN.md — Tracer: POST/GET applications on real Mongo listed at /applications through the list pod (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — List loading, error-with-retry and empty states, counter and layout carry-over (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-03-PLAN.md — Tags normalized in contracts and stored with a key, GET /api/tags; DS cards with StatusBadge, TagChip, salary and date (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 02-04-PLAN.md — API filters and sort on Mongo with hardened query parsing (wave 4)
- [x] 02-05-PLAN.md — Filter state in the URL; search field, «Limpiar filtros» and empty-by-filters (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 02-06-PLAN.md — Status, work mode, seniority and sort controls, mobile disclosure, stack tag filter from /api/tags (wave 5)
- [x] 02-07-PLAN.md — GET /api/applications/:id with strict id handling (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 02-08-PLAN.md — Card link (supplied by the scene) and the read-only detail with every Phase 2 section; APP-09 partial, documents in Phase 5 (wave 6, after 02-06: shared list pod files)

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 02-09-PLAN.md — Atomic PATCH status with optimistic selector and rollback; DELETE behind a confirmation dialog with a notice on the list; APP-13 partial (wave 7)

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 02-10-PLAN.md — Legitimacy checkpoint and install of @tanstack/react-form; create form path and entry points (wave 8, not autonomous)

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 02-11-PLAN.md — Form sections Condiciones, Seguimiento and Etiquetas by group with normalization feedback (wave 9)

**Wave 10** *(blocked on Wave 9 completion)*
- [x] 02-12-PLAN.md — PUT whitelist and edit mode from the detail (stored appliedAt kept unless edited); phase gate with a CRUD round trip in the compose smoke; APP-13 partial, interview changes in Phase 4 (wave 10)
**UI hint**: yes

### Phase 3: Autocompletado con IA
**Goal:** As a job seeker, I want to paste an offer and get a reviewable draft of the application form, so that I fill an application in seconds without losing anything I already typed.
**Mode:** mvp
**Depends on**: Phase 2
**Target**: 2 Nov 2026 · **Branch**: `phase/03-autocompletado-ia`
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, AI-09
**Success Criteria** (what must be TRUE):
  1. `POST /api/offers/extract { text }` accepts 50–20,000 characters and returns a normalized `OfferExtraction` (trimmed strings, empty → `null`, inverted salary range swapped, tags deduplicated and truncated) without ever logging the full offer text.
  2. Setting `LLM_PROVIDER` to `ollama`, `openai` or `mock` switches the model with no code change, `/api/health` reports the provider through `ping()`, and `mock` works fully offline as the demo's plan B.
  3. A model timeout answers 504 `LLM_TIMEOUT` after `LLM_TIMEOUT_MS`, and unparseable or schema-invalid output is retried once and then answers 502 `LLM_ERROR`; in the form the user sees a non-blocking «Analizando la oferta…» state or a clear error and can keep editing.
  4. The «Pegar oferta» panel is open when creating and collapsed when editing; «Autocompletar con IA» fills only empty fields, merges tags without duplicates, and persists nothing until the user saves.
  5. Fields filled by the AI show the «IA» mark that disappears when the user edits them, relevant fields still empty (title, company, work mode, seniority) are highlighted with «Complétalo tú», and the pasted text is stored as `offerText` on save.
**Plans**: 12/12 plans complete (9 executed, 3 gap closure from UAT 2026-11-01)
Plans:
**Wave 1**
- [x] 03-01-PLAN.md — Tracer: «Pegar oferta» panel → POST /api/offers/extract → extract service (literal prompt, verified against the doc) → LlmClient (mock end to end) → fill-only-empty merge of the text/enum fields; then limits, errors, the wait and edit mode on the same path (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md — LlmCallOptions (abort signal), callStructured (one LLM_TIMEOUT_MS budget, one retry, 502/504) and the real Ollama (think:false, num_ctx 8192) and OpenAI-compatible (json_schema strict) providers (wave 2)
- [x] 03-04-PLAN.md — Salary/currency merge rules and missing fields, merge unit tests, «Te falta completar» in the summary (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-03-PLAN.md — normalizeExtraction, length/duration-only logging, request signal route → service → model, body limit, the three fixtures with expectations, dev-only `npm run try-extract` (wave 3)
- [x] 03-05-PLAN.md — «IA» badge (AiMark) and «Complétalo tú» on the fields, with the mark lifecycle via the form listener (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 03-06-PLAN.md — Tag union without duplicates and the per-chip AI mark; tag counts in the summary (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 03-07-PLAN.md — offerText stored on POST and PUT, set only by a successful analysis, prefilled in edit mode (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 03-08-PLAN.md — OFFER_TEXT_MIN/MAX in contracts, panel limits, counter and length message, read-only while analysing, «Cancelar análisis» (wave 6)

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 03-09-PLAN.md — Phase gate (compose smoke + full suite), D-24 manual run against gemma4:e2b as manual evidence, blocking human review and D-25 decision (wave 7, not autonomous)

**Gap closure wave 1** *(UAT 2026-11-01)*
- [x] 03-10-PLAN.md — G-03-2: group guard in normalizeExtraction (programming languages → stack, D-26), the model sees «idioma» through a provider-facing schema and the approved prompt line (D-01, D-25 amended, new fingerprint), manual rerun against gemma4:e2b

**Gap closure wave 2** *(blocked on gap wave 1: shared 03-CONTEXT.md)*
- [x] 03-11-PLAN.md — G-03-2b: per-group tag placeholders «Ej.: React» / «Ej.: Docker» / «Ej.: Inglés B2» (D-27), 02-UI-SPEC copy amended

**Gap closure wave 3** *(blocked on gap wave 2: shared 03-CONTEXT.md)*
- [x] 03-12-PLAN.md — G-03-3: the «Pegar oferta» panel folds after a successful analysis on create and edit, focus rule, keep-open cases, D-12 amended in CONTEXT, UI-SPEC, DESIGN and AI-05
**UI hint**: yes

### Phase 4: Rondas de entrevista
**Goal:** As a job seeker, I want to log the interview rounds of an application, so that its process history and status stay in sync without extra bookkeeping.
**Mode:** mvp
**Depends on**: Phase 2
**Target**: 3 Nov 2026 · **Branch**: `phase/04-rondas-entrevista`
**Requirements**: INT-01, INT-02, INT-03, INT-04, INT-05
**Success Criteria** (what must be TRUE):
  1. From the detail, the user can add a round in a dialog with type, date, mode, outcome and notes; the round number is assigned automatically (current max + 1) and can be edited.
  2. The user can edit and delete an existing round from the detail.
  3. The detail lists rounds ordered by round number, each showing type, date, mode and outcome.
  4. Adding a round while the status is `enviada` moves the application to `en_entrevistas` with a history entry; in any other status the status is left alone, and any round change updates the application's `updatedAt`.
**Plans**: 3/4 plans executed
Plans:
**Wave 1**
- [x] 04-01-PLAN.md — Tracer: «Añadir ronda» dialog → POST /api/applications/:id/interviews → one atomic pipeline update (max + 1, rule 3, updatedAt) → view replaced by the response; then the limits, failures and busy guard of the same path (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 04-02-PLAN.md — Fecha y hora (datetime-local ↔ ISO UTC), Modalidad, Resultado and Notas in the dialog; each round row with date, mode, neutral outcome badge and folded notes in D-07 order (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 04-03-PLAN.md — PUT (arrayFilters) and DELETE ($pull, no renumbering) round endpoints; edit from its row with «Ronda» required (D-28) and delete with confirmation and focus handling (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 04-04-PLAN.md — Status select waits while a round is saving (D-16); compose smoke round trip of the round endpoints, ARCHITECTURE rows and phase gate (wave 4)
**UI hint**: yes

### Phase 5: Documentos en S3
**Goal:** As a job seeker, I want to upload my CV and cover letters and attach one of each to an application, so that I always know which documents I sent to each company.
**Mode:** mvp
**Depends on**: Phase 2
**Target**: 5 Nov 2026 · **Branch**: `phase/05-documentos-s3`
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06
**Success Criteria** (what must be TRUE):
  1. The user can upload a PDF or DOCX up to 5 MB with type (CV / carta), name and version; the file lands in the `tfm-assets` bucket and the document appears in the list, which can optionally be filtered by type.
  2. An oversize file is rejected with 413 `FILE_TOO_LARGE` and any other file type with 415 `UNSUPPORTED_FILE_TYPE`, and the UI shows a friendly message in Spanish for each.
  3. In the application form the user can link one CV and one cover letter, choosing an existing document or uploading a new one without leaving the form (the document section of the form lands in this phase).
  4. The application detail shows the linked documents and the user can download each of them.
  5. Deleting a document that is linked to any application is rejected with 409 `DOCUMENT_IN_USE`.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Pulido de demo
**Goal:** As the presenter, I want seeded data, a README and a responsive, accessible UI, so that the full demo runs in under 2 minutes on a clean machine.
**Mode:** mvp
**Depends on**: Phase 3, Phase 4, Phase 5
**Target**: 7 Nov 2026 · **Branch**: `phase/06-pulido-demo`
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06
**Success Criteria** (what must be TRUE):
  1. `npm run seed` (and `docker compose exec app npm run seed`) loads demo applications, documents and the 3 fixture offers into Mongo and Silo, leaving a list worth demoing.
  2. The README lets someone on a clean machine run the project, seed it, switch `LLM_PROVIDER`, and recover with `mock` when Ollama fails.
  3. Every screen is usable from 360 px width without horizontal scroll, and fully operable with the keyboard alone, with visible focus, labelled fields, `aria-live="polite"` on load, error and AI results, and AA contrast in light and dark themes.
  4. The full demo flow (paste offer → autofill → review → save → add round → attach CV → change status → see it filtered) completes in under 2 minutes on a clean machine, both with Ollama and with `mock`.
  5. Tests pending from earlier phases are written, and `npm run typecheck && npm run test` pass on a clean checkout.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Documentación y defensa
**Goal:** As the presenter, I want the deck, demo script and supporting documents ready, so that I can defend the project on 9 Nov 2026 with a fallback path if something fails.
**Mode:** mvp
**Depends on**: Phase 6
**Target**: 8 Nov 2026 · **Branch**: `phase/07-documentacion-defensa`
**Requirements**: PRES-01, PRES-02, PRES-03, PRES-04, PRES-05
**Success Criteria** (what must be TRUE):
  1. A defense deck exists and covers problem, product, architecture, AI usage and demo.
  2. A demo script with timings exists, including a fallback path (`LLM_PROVIDER=mock`) for each step that can fail.
  3. `docs/ia-en-el-proyecto.md` explains how AI was used in development (GSD + Claude Code) and inside the product.
  4. `docs/decisiones.md` records the ADRs for the stack and architecture decisions.
  5. Likely examiner questions are documented with prepared answers.
**Plans**: TBD

## Cross-Phase Notes

Seams where a requirement's owner phase and the phase that finishes its behavior differ. Each requirement stays mapped to exactly one phase; these notes tell planners what to leave stubbed or empty.

- **Contracts up front (FND-02):** Phase 1 defines every schema listed in `docs/ARCHITECTURE.md` (including interview, document and offer-extraction), so later phases add behavior, not models.
- **Health `llm` field (FND-03 → AI-02):** Phase 1 reports LLM connectivity with a minimal provider-aware reachability probe; Phase 3 replaces it with `LlmClient.ping()`.
- **Detail sections (APP-09):** Phase 2 does not render the interviews and linked-documents sections, not even as empty states (D-15); Phase 4 (INT-05) adds the rounds section and Phase 5 (DOC-03, DOC-04) adds the documents section. The "linked documents" clause of APP-09 is therefore completed in Phase 5.
- **`updatedAt` on interview changes (APP-13 → INT):** the rule lives in the applications service from Phase 2; Phase 4 must route every interview mutation through it.
- **Document section of the form (DOC-03):** the form exists from Phase 2 (and gains the AI panel in Phase 3); Phase 5 adds the CV / cover-letter section, with the scene rendering `DocumentUploadContainer` and passing `onSelected` as a prop (no pod imports another pod).
- **Seed inputs (DEMO-01):** the 3 fixture offers are created in Phase 3 and demo documents depend on Phase 5, so the seed lands in Phase 6.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundaciones y walking skeleton | 6/6 | Complete    | 2026-10-29 |
| 2. Candidaturas | 12/12 | Complete    | 2026-10-31 |
| 3. Autocompletado con IA | 12/12 | Complete    | 2026-11-01 |
| 4. Rondas de entrevista | 3/4 | In Progress | - |
| 5. Documentos en S3 | 0/TBD | Not started | - |
| 6. Pulido de demo | 0/TBD | Not started | - |
| 7. Documentación y defensa | 0/TBD | Not started | - |
