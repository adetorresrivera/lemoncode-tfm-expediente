# Requirements: Expediente

**Defined:** 2026-10-28
**Core Value:** Pegar una oferta y obtener un expediente casi completo y revisable en segundos, con el flujo entero demostrable en menos de 2 minutos con `docker compose up`.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundations (FND)

- [ ] **FND-01**: Developer can run `npm install`, `npm run build`, `npm run test`, `npm run lint` and `npm run typecheck` from the root of the npm-workspaces monorepo (`apps/web`, `apps/api`, `packages/contracts`)
- [ ] **FND-02**: Web and API import every API model (enums, tag, interview, application, document, offer-extraction, error schemas and inferred types) from `@tfm/contracts`, never redefined
- [ ] **FND-03**: User can call `GET /api/health` and get `{ status, mongo, s3, llm }` reflecting real connectivity
- [ ] **FND-04**: API validates its environment with Zod at startup and returns every error as `{ error: { code, message, details? } }`
- [ ] **FND-05**: User opens the web app and lands on `/applications` inside a shell with desktop sidebar and mobile sheet navigation
- [ ] **FND-06**: User can switch theme between Sistema, Claro and Oscuro; the choice persists and the default follows the system
- [ ] **FND-07**: User sees the app with the «Expediente» design system (tokens, EB Garamond / Source Sans 3 / JetBrains Mono)
- [ ] **FND-08**: User can run `docker compose up` and reach the app at `http://localhost:8080` with Mongo, Silo and Ollama services healthy (multi-stage Dockerfile, pinned image versions)
- [ ] **FND-09**: Developer commits only code that passes ESLint, Prettier and typecheck via Husky + lint-staged pre-commit
- [ ] **FND-10**: `.env.example` lists every variable the system reads and stays up to date

### Applications (APP)

- [ ] **APP-01**: User can create an application with title (2–120) and company (1–120) required and the remaining offer fields optional, validated by the contracts schema
- [ ] **APP-02**: User can edit an application with the same form used to create it
- [ ] **APP-03**: User can delete an application after a confirmation dialog; its documents are not deleted
- [ ] **APP-04**: User can view the list of applications as cards with title, company · location, status badge, up to 3 tags plus `+N`, salary and last-updated date
- [ ] **APP-05**: User sees loading, error-with-retry, empty and empty-by-filters states in the list
- [ ] **APP-06**: User can filter the list by free text (title/company), status (multi), stack tags (multi), work mode and seniority
- [ ] **APP-07**: Filters and sort live in URL search params, survive reload and can be cleared with «Limpiar filtros»
- [ ] **APP-08**: User can sort the list by last update or by applied date
- [ ] **APP-09**: User can open an application detail with offer data, grouped tags, status history, notes, linked documents and collapsible original offer text
- [ ] **APP-10**: User can change status to any of the 7 states from the detail; each change appends `{ status, at }` to the history and an unchanged status adds nothing
- [ ] **APP-11**: First move to `enviada` sets `appliedAt` to now when it is empty
- [ ] **APP-12**: User can add tags by group (stack / se valora / idiomas) with normalization (trim, collapsed spaces, case-insensitive dedupe, max 20, first spelling kept)
- [ ] **APP-13**: `updatedAt` changes on any modification, including status and interview changes
- [ ] **APP-14**: User can pick stack filters from existing tags served by `GET /api/tags` ordered by count

### AI extraction (AI)

- [ ] **AI-01**: API exposes `POST /api/offers/extract { text }` validating 50–20,000 characters and returning an `OfferExtraction`
- [ ] **AI-02**: `LlmClient` is swappable by `LLM_PROVIDER` between `ollama`, `openai` (OpenAI-compatible) and `mock`, with `ping()` feeding `/api/health`
- [ ] **AI-03**: Extraction returns 504 `LLM_TIMEOUT` after `LLM_TIMEOUT_MS`, and 502 `LLM_ERROR` after one retry when the output does not parse or fails the schema
- [ ] **AI-04**: API normalizes the draft (trim, empty → `null`, swap inverted salary range, dedupe and truncate tags) and never logs the full offer text
- [ ] **AI-05**: User sees a «Pegar oferta» panel in the form (open on create, collapsed on edit) with an «Autocompletar con IA» action and a non-blocking «Analizando la oferta…» / error state
- [ ] **AI-06**: Applying a draft fills only empty fields, merges tags without duplicates, and never persists anything until the user saves
- [ ] **AI-07**: Fields filled by the AI show the «IA» mark, which disappears when the user edits the field
- [ ] **AI-08**: Relevant fields still empty after extraction (title, company, work mode, seniority) are highlighted with «Complétalo tú»
- [ ] **AI-09**: The pasted text is stored as the application's `offerText` when the user saves

### Interviews (INT)

- [ ] **INT-01**: User can add an interview round with type, date, mode, outcome and notes from a dialog in the detail
- [ ] **INT-02**: Round number is assigned automatically (current max + 1) and can be edited
- [ ] **INT-03**: User can edit and delete an interview round
- [ ] **INT-04**: Adding a round while status is `enviada` moves the application to `en_entrevistas` with a history entry
- [ ] **INT-05**: User sees rounds ordered by round number with type, date, mode and outcome

### Documents (DOC)

- [ ] **DOC-01**: User can upload a PDF or DOCX up to 5 MB with type (CV / carta), name and version, stored in S3 bucket `tfm-assets`
- [ ] **DOC-02**: Upload rejects oversize files with 413 `FILE_TOO_LARGE` and other types with 415 `UNSUPPORTED_FILE_TYPE`, with a friendly message in the UI
- [ ] **DOC-03**: User can link one CV and one cover letter to an application, choosing an existing document or uploading a new one from the form
- [ ] **DOC-04**: User can download linked documents from the detail
- [ ] **DOC-05**: Deleting a document linked to any application is rejected with 409 `DOCUMENT_IN_USE`
- [ ] **DOC-06**: User can list documents, optionally filtered by type

### Demo readiness (DEMO)

- [ ] **DEMO-01**: `npm run seed` (also via `docker compose exec app npm run seed`) loads demo applications, documents and the 3 fixture offers into Mongo and Silo
- [ ] **DEMO-02**: README explains how to run, seed, switch `LLM_PROVIDER` and recover with `mock` when Ollama fails
- [ ] **DEMO-03**: The app is usable from 360 px width without horizontal scroll
- [ ] **DEMO-04**: The app is fully keyboard-operable with visible focus, labelled fields, `aria-live="polite"` on load/error/AI results and AA contrast
- [ ] **DEMO-05**: The full demo flow (paste offer → autofill → review → save → add round → attach CV → change status → see it filtered) works in under 2 minutes on a clean machine, with Ollama and with `mock`
- [ ] **DEMO-06**: Pending tests from earlier phases are completed and `npm run typecheck && npm run test` pass on a clean checkout

### Presentation (PRES)

- [ ] **PRES-01**: Defense deck exists and covers problem, product, architecture, AI usage and demo
- [ ] **PRES-02**: Demo script with timings and a fallback path exists
- [ ] **PRES-03**: `docs/ia-en-el-proyecto.md` documents how AI was used in development (GSD + Claude Code) and in the product
- [ ] **PRES-04**: `docs/decisiones.md` records the ADRs for stack and architecture decisions
- [ ] **PRES-05**: Likely examiner questions with prepared answers are documented

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
| (filled by roadmapper) | | Pending |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 0
- Unmapped: 55 ⚠️

---
*Requirements defined: 2026-10-28*
*Last updated: 2026-10-28 after initial definition*
