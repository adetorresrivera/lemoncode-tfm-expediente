# Milestones

## v1 MVP (Shipped: 2026-11-08)

**Delivered:** Expediente completo y demostrable con `docker compose up`: pegar una oferta, revisar el borrador de la IA, guardar, añadir rondas, vincular CV y carta, cambiar estado y filtrar, más el material de defensa del TFM.

**Phases completed:** 7 phases (1-7), 68 plans, 86 tasks

**Stats:**
- Timeline: 13 days (2026-10-27 → 2026-11-08), 595 commits
- Code: ~40,900 lines of TypeScript/TSX in `apps/` and `packages/` (incl. tests); 1416 tests at the Phase 6 gate
- Git range: `a618764` (First commit) → `5ced4b3` (docs(07): ship phase 7 — PR #7)
- Shipped as stacked PRs #1–#7, one per phase (`phase/NN-nombre`)

**Key accomplishments:**
1. Walking skeleton on a npm-workspaces monorepo: `@tfm/contracts` as the single Zod source of truth, Hono API with real Mongo/Silo/Ollama health and a fixed error contract, themed shell, pinned multi-stage Docker image and compose smoke (Phase 1)
2. Full applications tracker: CRUD with an editable-field whitelist, URL-synced filters and sort, detail with atomic status history, shared TanStack Form create/edit (Phase 2)
3. AI autofill — the core value: `POST /api/offers/extract` behind a swappable `LlmClient` (ollama / openai-compatible / mock), merge that only fills empty fields, «IA» and «Complétalo tú» marks, grouped tag proposals, approved prompt fingerprint (Phase 3)
4. Interview rounds and documents in S3: atomic round numbering with the `enviada → en_entrevistas` rule; PDF/DOCX upload by magic bytes to Silo, linking from the form, download, and 409 delete protection when in use (Phases 4-5)
5. Repeatable demo: idempotent seed, Spanish README, responsive from 360 px, keyboard and reduced motion, axe AA contrast in both themes, timed demo (mock 13 s, Ollama 48 s) (Phase 6)
6. Defense material checked by scripts: 11-slide deck, demo script with plans B and C, `docs/ia-en-el-proyecto.md`, ADR-001..ADR-012 and 15 examiner answers, guarded by `check-docs.mjs` and `check-figures.mjs` (Phase 7)

**Closeout type:** override_closeout
- No `v1-MILESTONE-AUDIT.md`: `/gsd-audit-milestone` was not run before close (author's choice).
- Phases 1-6: every `VERIFICATION.md` says `passed`, but `init.manager` reports them stale because later phases changed covered source files. Phase 7 verified and current.
- Requirements: 55/55 v1 requirements checked off.
- Known verification overrides: 3 newly acknowledged, 0 carried forward from a prior close (see STATE.md Deferred Items).

**Known tech debt (advisory, non-blocking):** open WR/IN findings in the `*-REVIEW-DISPOSITION.md` files of phases 2-6 (archived in `milestones/v1-phases/`), e.g. Phase 4 one-slot `busy` lock, Phase 6 `connectMongo` client leak on index failure, seed two-write marking; `server.host: true` in `apps/web/vite.config.ts`.

---
