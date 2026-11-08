# Requirements: Expediente

**Defined:** 2026-10-28
**Core Value:** Pegar una oferta y obtener un expediente casi completo y revisable en segundos, con el flujo entero demostrable en menos de 2 minutos con `docker compose up`.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundations (FND)

- [x] **FND-01**: Developer can run `npm install`, `npm run build`, `npm run test`, `npm run lint` and `npm run typecheck` from the root of the npm-workspaces monorepo (`apps/web`, `apps/api`, `packages/contracts`)
- [x] **FND-02**: Web and API import every API model (enums, tag, interview, application, document, offer-extraction, error schemas and inferred types) from `@tfm/contracts`, never redefined
- [x] **FND-03**: User can call `GET /api/health` and get `{ status, mongo, s3, llm }` reflecting real connectivity
- [x] **FND-04**: API validates its environment with Zod at startup and returns every error as `{ error: { code, message, details? } }`
- [x] **FND-05**: User opens the web app and lands on `/applications` inside a shell with desktop sidebar and mobile sheet navigation
- [x] **FND-06**: User can switch theme between Sistema, Claro and Oscuro; the choice persists and the default follows the system
- [x] **FND-07**: User sees the app with the «Expediente» design system (tokens, EB Garamond / Source Sans 3 / JetBrains Mono)
- [x] **FND-08**: User can run `docker compose up` and reach the app at `http://localhost:8080` with Mongo, Silo and Ollama services healthy (multi-stage Dockerfile, pinned image versions)
- [x] **FND-09**: Developer commits only code that passes ESLint, Prettier and typecheck via Husky + lint-staged pre-commit
- [x] **FND-10**: `.env.example` lists every variable the system reads and stays up to date

### Applications (APP)

- [x] **APP-01**: User can create an application with title (2–120) and company (1–120) required and the remaining offer fields optional, validated by the contracts schema
- [x] **APP-02**: User can edit an application with the same form used to create it
- [x] **APP-03**: User can delete an application after a confirmation dialog; its documents are not deleted
- [x] **APP-04**: User can view the list of applications as cards with title, company · location, status badge, up to 3 tags plus `+N`, salary and last-updated date
- [x] **APP-05**: User sees loading, error-with-retry, empty and empty-by-filters states in the list
- [x] **APP-06**: User can filter the list by free text (title/company), status (multi), stack tags (multi), work mode and seniority
- [x] **APP-07**: Filters and sort live in URL search params, survive reload and can be cleared with «Limpiar filtros»
- [x] **APP-08**: User can sort the list by last update or by applied date
- [x] **APP-09**: User can open an application detail with offer data, grouped tags, status history, notes, linked documents and collapsible original offer text
- [x] **APP-10**: User can change status to any of the 7 states from the detail; each change appends `{ status, at }` to the history and an unchanged status adds nothing
- [x] **APP-11**: First move to `enviada` sets `appliedAt` to now when it is empty
- [x] **APP-12**: User can add tags by group (stack / se valora / idiomas) with normalization (trim, collapsed spaces, case-insensitive dedupe, max 20, first spelling kept)
- [x] **APP-13**: `updatedAt` changes on any modification, including status and interview changes
- [x] **APP-14**: User can pick stack filters from existing tags served by `GET /api/tags` ordered by count

### AI extraction (AI)

- [x] **AI-01**: API exposes `POST /api/offers/extract { text }` validating 50–20,000 characters and returning an `OfferExtraction`
- [x] **AI-02**: `LlmClient` is swappable by `LLM_PROVIDER` between `ollama`, `openai` (OpenAI-compatible) and `mock`, with `ping()` feeding `/api/health`
- [x] **AI-03**: Extraction returns 504 `LLM_TIMEOUT` after `LLM_TIMEOUT_MS`, and 502 `LLM_ERROR` after one retry when the output does not parse or fails the schema
- [x] **AI-04**: API normalizes the draft (trim, empty → `null`, swap inverted salary range, dedupe and truncate tags) and never logs the full offer text
- [x] **AI-05**: User sees a «Pegar oferta» panel in the form (open on create, collapsed on edit, folded after a successful analysis) with an «Autocompletar con IA» action and a non-blocking «Analizando la oferta…» / error state
- [x] **AI-06**: Applying a draft fills empty fields and fields still marked «IA» (replacing or clearing them), never touches user-typed or user-edited values, merges tags without duplicates (AI chips not edited are replaced), and never persists anything until the user saves
- [x] **AI-07**: Fields filled by the AI show the «IA» mark, which disappears when the user edits the field
- [x] **AI-08**: Relevant fields still empty after extraction (title, company, work mode, seniority) are highlighted with «Complétalo tú»
- [x] **AI-09**: The pasted text is stored as the application's `offerText` when the user saves

### Interviews (INT)

- [x] **INT-01**: User can add an interview round with type, date, mode, outcome and notes from a dialog in the detail
- [x] **INT-02**: Round number is assigned automatically (current max + 1) and can be edited
- [x] **INT-03**: User can edit and delete an interview round
- [x] **INT-04**: Adding a round while status is `enviada` moves the application to `en_entrevistas` with a history entry
- [x] **INT-05**: User sees rounds ordered by round number with type, date, mode and outcome

### Documents (DOC)

- [x] **DOC-01**: User can upload a PDF or DOCX up to 5 MB with type (CV / carta), name and version, stored in S3 bucket `tfm-assets`
- [x] **DOC-02**: Upload rejects oversize files with 413 `FILE_TOO_LARGE` and other types with 415 `UNSUPPORTED_FILE_TYPE`, with a friendly message in the UI
- [x] **DOC-03**: User can link one CV and one cover letter to an application, choosing an existing document or uploading a new one from the form
- [x] **DOC-04**: User can download linked documents from the detail
- [x] **DOC-05**: Deleting a document linked to any application is rejected with 409 `DOCUMENT_IN_USE`
- [x] **DOC-06**: User can list documents, optionally filtered by type

### Demo readiness (DEMO)

- [x] **DEMO-01**: `npm run seed` (also via `docker compose exec app npm run seed`) loads demo applications and documents into Mongo and Silo, idempotently (`-- --reset` wipes everything first); the 3 fixture offers are available to paste from `docs/demo/ofertas/` and are never seeded (D-08)
- [x] **DEMO-02**: README explains how to run, seed, switch `LLM_PROVIDER` and recover with `mock` when Ollama fails
- [x] **DEMO-03**: The app is usable from 360 px width without horizontal scroll
- [x] **DEMO-04**: The app is fully keyboard-operable with visible focus, labelled fields, `aria-live="polite"` on load/error/AI results and AA contrast
- [x] **DEMO-05**: The full demo flow (paste offer → autofill → review → save → add round → attach CV → change status → see it filtered) works in under 2 minutes on a clean machine, with Ollama and with `mock`
- [x] **DEMO-06**: Pending tests from earlier phases are completed and `npm run typecheck && npm run test` pass on a clean checkout

### Presentation (PRES)

- [x] **PRES-01**: Defense deck exists and covers problem, product, architecture, AI usage and demo
- [x] **PRES-02**: Demo script with timings and a fallback path exists
- [x] **PRES-03**: `docs/ia-en-el-proyecto.md` documents how AI was used in development (GSD + Claude Code) and in the product
- [x] **PRES-04**: `docs/decisiones.md` records the ADRs for stack and architecture decisions
- [x] **PRES-05**: Likely examiner questions with prepared answers are documented

## v2 Requirements

Backlog after phase 7. Tracked but not in the current roadmap.

### Iterations

- **KAN-01**: User can move applications between statuses on a Kanban board with accessible drag & drop
- **LIB-01**: User can manage a document library with versions
- **LIB-02**: AI suggests the best CV for an offer
- **DASH-01**: User sees interview reminders and a timeline
- **DASH-02**: User sees metrics derived from `statusHistory`
- **E2E-01**: Playwright e2e tests cover the main demo flow
- **AI-10**: Extraction prompt reuses the user's existing tags from `GET /api/tags`

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Login and multiuser | Single-user local app; `ownerId` stays reserved and always `null` |
| Public landing page | Adds nothing to the defense |
| URL scraping and job-portal integrations | Outside the Front End + AI focus of the TFM |
| Email notifications | Needs infrastructure the local deliverable does not have |
| Cloud deployment | Deliverable is a locally runnable Docker image |
| React Query | Course-style hooks with `fetch` + `AbortController` are enough for the MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Complete |
| FND-08 | Phase 1 | Complete |
| FND-09 | Phase 1 | Complete |
| FND-10 | Phase 1 | Complete |
| APP-01 | Phase 2 | Complete |
| APP-02 | Phase 2 | Complete |
| APP-03 | Phase 2 | Complete |
| APP-04 | Phase 2 | Complete |
| APP-05 | Phase 2 | Complete |
| APP-06 | Phase 2 | Complete |
| APP-07 | Phase 2 | Complete |
| APP-08 | Phase 2 | Complete |
| APP-09 | Phase 2 | Complete |
| APP-10 | Phase 2 | Complete |
| APP-11 | Phase 2 | Complete |
| APP-12 | Phase 2 | Complete |
| APP-13 | Phase 2 | Complete |
| APP-14 | Phase 2 | Complete |
| AI-01 | Phase 3 | Complete |
| AI-02 | Phase 3 | Complete |
| AI-03 | Phase 3 | Complete |
| AI-04 | Phase 3 | Complete |
| AI-05 | Phase 3 | Complete |
| AI-06 | Phase 3 | Complete |
| AI-07 | Phase 3 | Complete |
| AI-08 | Phase 3 | Complete |
| AI-09 | Phase 3 | Complete |
| INT-01 | Phase 4 | Complete |
| INT-02 | Phase 4 | Complete |
| INT-03 | Phase 4 | Complete |
| INT-04 | Phase 4 | Complete |
| INT-05 | Phase 4 | Complete |
| DOC-01 | Phase 5 | Complete |
| DOC-02 | Phase 5 | Complete |
| DOC-03 | Phase 5 | Complete |
| DOC-04 | Phase 5 | Complete |
| DOC-05 | Phase 5 | Complete |
| DOC-06 | Phase 5 | Complete |
| DEMO-01 | Phase 6 | Complete |
| DEMO-02 | Phase 6 | Complete |
| DEMO-03 | Phase 6 | Complete |
| DEMO-04 | Phase 6 | Complete |
| DEMO-05 | Phase 6 | Complete |
| DEMO-06 | Phase 6 | Complete |
| PRES-01 | Phase 7 | Complete |
| PRES-02 | Phase 7 | Complete |
| PRES-03 | Phase 7 | Complete |
| PRES-04 | Phase 7 | Complete |
| PRES-05 | Phase 7 | Complete |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 55
- Unmapped: 0

---
*Requirements defined: 2026-10-28*
*Last updated: 2026-11-06 after plan 06-16: DEMO-01 reworded because D-08 keeps the 3 fixture offers out of the seed (they live in `docs/demo/ofertas/`)*
