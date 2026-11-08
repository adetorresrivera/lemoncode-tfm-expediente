# Phase 7: Documentación y defensa - Context

**Gathered:** 2026-11-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Defense material for the in-person presentation on **9 Nov 2026** (15 min total, 5 min of live demo). No product code changes. The examiners' required outline (bases): idea and problem → MVP and completed iterations → demo → technologies and AI tools and how they were applied → challenges and learnings → next steps.

Deliverables (locked by the user's brief, all under `docs/presentacion/` unless noted):
1. `docs/presentacion/deck.md` — ~10 slides; per slide: title, bullet content, speaker note, time. The user converts it to slides with the Expediente look themselves. Includes a Mermaid architecture diagram and a Mermaid GSD-loop diagram.
2. `docs/presentacion/demo-script.md` — timed 5-minute script over the seed: list + filters → paste offer (fixture) → autofill → review AI marks → save → add round → attach CV → change status → back to the filtered list. Plan B with `LLM_PROVIDER=mock`, plan C with screenshots/video. Pre-flight checklist (`docker compose up`, seed, model pulled, browser zoom, light mode).
3. `docs/ia-en-el-proyecto.md` — how GSD + Claude Code were used (phases, plan count, commits, PRs, time, sourced from `.planning/` and `git log`), what worked and what didn't, and the product's AI architecture (LlmClient, structured output, local vs cloud and cost).
4. `docs/decisiones.md` — short ADRs (context, decision, alternatives, consequences).
5. `docs/presentacion/preguntas-tribunal.md` — 15 likely examiner questions with short answers (seed examples from the user: why a backend if the focus is front, what if the AI hallucinates, why not React Query, how it would scale to multi-user, AI cost in production, what you'd change).
6. `README.md` — «Próximos pasos» section with the backlog (Kanban, document library with suggested CV, dashboard, e2e, login).
7. `docs/presentacion/capturas/` — updated screenshots (list, detail, form with AI marks, dark mode, mobile).

Verification (locked): every internal link resolves; every figure in the AI doc is checked against `git log` and `.planning/`. Every plan still ends with `<verify>` running at least `npm run typecheck && npm run test`.

All prose in Spanish, DS voice (tuteo, short sentences, no exclamations, no emojis). File names in English, except the user-named Spanish docs (`ia-en-el-proyecto.md`, `decisiones.md`, `preguntas-tribunal.md`, `docs/presentacion/`, `capturas/`) — same deliberate exception as `docs/demo/ofertas/` in Phase 6 (D-09).

</domain>

<decisions>
## Implementation Decisions

### Deck structure and timing
- **D-01:** The demo goes **in the middle**, following the bases order: title/idea → MVP and iterations → **demo (5:00)** → technologies + AI → challenges → next steps.
- **D-02:** The ~10 non-demo minutes are **weighted toward the front end**. The three front topics with their own slides: **(a) pods + contracts** (course architecture vm/mapper/hooks/container/component, view model not derived from the API model, shared Zod in `@tfm/contracts`); **(b) form + AI marks** (TanStack Form, the AI draft only fills empty fields, per-field «IA» marks until the user edits); **(c) accessibility and responsive** (from 360 px, keyboard-only, axe in tests, 44 px touch targets, AA contrast light/dark). AI in the product and GSD in development share less time (~2 min together); Claude sets the exact per-slide times, which must add up to 15:00 including the 5:00 demo.
- **D-03:** Architecture diagram in Mermaid at **container level plus an AI-flow sequence**: browser → web (pods) → Hono API → Mongo / Silo / `LlmClient` (ollama | openai | mock), with `@tfm/contracts` shared; and a sequence diagram of extraction: paste → `POST` extract endpoint → structured output → AI marks in the form (no persistence).
- **D-04:** **One or two real code snippets** (≤10 lines each, copied from the repo, with file path), e.g. a pod mapper and the `LlmClient` interface (`apps/api/src/llm/llm.client.ts`). Snippets must match the current code verbatim.
- **D-05:** GSD diagram = **the per-phase loop without figures**: discuss → plan (research + plan-checker) → execute (waves, atomic commits) → verify/UAT → review/security → ship (PR), with the gap-closure loop back to plan.

### Live demo script
- **D-06:** The offer pasted live is **`docs/demo/ofertas/remote-senior.txt`** (Nimbo Software, Frontend Senior, remote). The other two fixtures are listed as alternates only.
- **D-07:** The mock decision is made **before starting**, in the pre-flight checklist: run a warm-up extraction; if it is too slow or fails, start with `LLM_PROVIDER=mock docker compose up` and say so naturally. No live compose restart is planned as the main path (it costs ~30–60 s); the live-failure path is: say the line, continue with plan C screenshots/video for that step.
- **D-08:** Adding the round moves the new application `enviada → en_entrevistas` automatically (service rule); the script then moves it **manually to «oferta»**, and the speaker points out the history shows the automatic transition («la regla la aplica el servicio»). Researcher must confirm the status a newly created application starts in and how the history renders it.
- **D-09:** If Ollama extracts a field wrongly live, **use it**: the script includes a prepared line — «por eso nada se guarda solo; corrijo el campo y la marca IA desaparece» — and the speaker corrects the field.
- **D-10:** Plan C video is **recorded by the user**; the demo script doubles as the recording script. The video is **not committed** (size); the doc only says where it lives (local / USB).

### AI doc figures
- **D-11:** Time is reported as **calendar days** (first commit 2026-10-27 → PR #6 merge 2026-11-07), **days with commits**, and the **sum of `duration` from the plan SUMMARY files**, noting the plans that lack it (56 of 62 have one at the time of discussion — recount).
- **D-12:** Commits: **total + breakdown** by Conventional Commit type (feat/fix/test/docs/chore/…) and by phase. GSD's `docs(...)` planning commits are shown as what they are (roughly half), not hidden.
- **D-13:** **Cut-off = end of Phase 6, commit `c11ab61`** (PR #6). All figures are reproducible with commands anchored on `c11ab61` (e.g. `git rev-list --count c11ab61`); the doc lists those commands. Phase 7 is mentioned separately as «documentación», without figures.
- **D-14:** «Qué funcionó y qué no» is **frank, with real examples from `.planning/`**: gap-closure plans (3 in Phase 3, 2 in Phase 5), UAT G-03-2 (gemma4:e2b classified C/Python as languages → `idiomas` field), the approved-prompt sha256 fingerprint rule (D-25 Phase 3), TDD RED+GREEN in one commit because the pre-commit hook runs the full suite, UI reviews kept as improvement lists, the phase 6 browser pass finding 28–36 px chips, etc. Each claim cites its source file.
- **D-15:** Cloud cost = **measured tokens × public price**: measure input/output tokens of a real extraction for the 3 fixtures (system prompt included), multiply by the current public price of **small OpenAI models** (named in the cost table with source URL and date), project to 100 and 10 000 offers/month. Compare with local Ollama (zero marginal cost, hardware/latency trade-off).
- **D-16:** Elsewhere (AI doc prose, examiner Q&A, deck) cloud providers are named **generically** as «compatible con OpenAI»; **Gemini and Groq are not mentioned** (consistent with Phase 6 D-21). OpenAI model names appear only in the cost table.

### Screenshots and ADRs
- **D-17:** Screenshots are taken by an **automated browser** in a plan, over the seeded app, at fixed viewports: 1280 light — list, detail, form with AI marks; 1280 dark — at least one view; 360 mobile — at least the list. Use Claude in Chrome or Playwright via `npx` (one-off, **not** added as a dependency). Reproducible (the plan records the steps/URLs). The AI-marks capture may use `LLM_PROVIDER=mock` for determinism. Optionally refresh `docs/img/application-list.png` used by the README.
- **D-18:** `docs/decisiones.md` holds the user's **8 ADRs** — monorepo + contracts; course pods; Hono + official driver; single-user; Silo vs SeaweedFS/RustFS after the end of MinIO CE; local Ollama + swappable provider; image + compose; shadcn with the design system — **plus 4 key ones** examiners may ask about: own data hooks without React Query; the AI draft never persists and only fills empty fields; literal system prompt with sha256 fingerprint; file type by magic bytes. Format per ADR: context, decision, alternatives, consequences (short). Sources: PROJECT.md Key Decisions and the phase CONTEXT/SUMMARY files. CLAUDE.md requires stack changes to go through this file, so it becomes the canonical ADR log.

### Claude's Discretion
- Exact per-slide times and slide count (~10), within D-01/D-02.
- Opening and closing filters for the demo, chosen over the 12 seeded applications so they show something (e.g. status + tag), and the final filter showing the new application next to seeded ones.
- Warm-up threshold for switching to mock in the checklist (e.g. second warm-up extraction > ~20 s or any error).
- The 9 examiner questions beyond the user's 6 seed examples; answer length (short, 2–4 sentences).
- Which 1–2 code snippets go on slides.
- Content of «Próximos pasos» beyond the user's list — draw from REQUIREMENTS.md v2 and PROJECT.md out-of-scope backlog.
- Link-check method for the verify step (script without new dependencies preferred).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §Phase 7 — goal, success criteria, branch `phase/07-documentacion-defensa`
- `.planning/REQUIREMENTS.md` — PRES-01..05; §v2 Requirements (backlog for «Próximos pasos»); §Out of Scope
- `.planning/PROJECT.md` — Key Decisions table (ADR source), Out of Scope backlog line
- `CLAUDE.md` — stack, code rules, «no stack change without ADR in `docs/decisiones.md`», UI voice

### Product docs (content source for deck, ADRs, Q&A)
- `docs/PRODUCT.md` — idea, problem, scope
- `docs/DOMAIN.md` — statuses and rules (e.g. `enviada → en_entrevistas`)
- `docs/ARCHITECTURE.md` — structure, API, env vars
- `docs/DESIGN.md` — design system «Expediente» (for slide content on DS/a11y)
- `docs/AI-EXTRACTION.md` — extraction design, literal system prompt
- `README.md` — current sections; «Próximos pasos» goes here; demo/mock/warm-up sections reused by the demo script

### Demo
- `docs/demo/ofertas/remote-senior.txt` — the offer pasted live (D-06); siblings are alternates
- `.planning/phases/06-pulido-de-demo/06-CONTEXT.md` — seed decisions (D-01..D-10), mock mode (D-14), keep-alive/warm-up (D-26), README provider rule (D-21)

### Figures and lessons (AI doc)
- `.planning/STATE.md` — accumulated per-phase decisions and outcomes
- `.planning/phases/*/*-SUMMARY.md` — `duration` per plan
- `.planning/phases/*/*-VERIFICATION.md`, `*-UAT.md`, `*-REVIEW*.md`, `*-SECURITY.md`, `*-UI-REVIEW.md` — evidence for «qué funcionó y qué no»
- `.planning/quick/` — 4 quick tasks
- `git log c11ab61` and `gh pr list --state all` — commit and PR figures (cut-off D-13)

### Product AI code
- `apps/api/src/llm/llm.client.ts`, `ollama.provider.ts`, `openai.provider.ts`, `mock.provider.ts`, `structured-call.ts` — LlmClient and structured output
- `apps/api/src/offers/extract.service.ts`, `extract.routes.ts` — extraction endpoint
- `apps/web/src/pods/application-edit/` — form, merge of AI draft, AI marks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `npm run seed` / `docker compose exec app npm run seed` (+ `--reset`): demo data the script and screenshots run on.
- `docs/demo/ofertas/*.txt`: three fixtures; `remote-senior.txt` is the live one.
- `scripts/compose-smoke.sh`: cold-start check usable in the pre-flight checklist.
- `apps/api/src/scripts/try-extract.ts`: runs an extraction from a fixture — candidate for measuring tokens (D-15) and for the warm-up.
- `docs/img/application-list.png`: existing README screenshot.

### Established Patterns
- Spanish DS voice in all user-facing text; Spanish doc folder names are an accepted exception.
- Figures and claims must be sourced (verification locked by the user).

### Integration Points
- README gets a new «Próximos pasos» section and links to `docs/presentacion/`, `docs/ia-en-el-proyecto.md`, `docs/decisiones.md` from its «Documentación» section.

</code_context>

<specifics>
## Specific Ideas

- Speaker line for AI mistakes: «por eso nada se guarda solo; corrijo el campo y la marca IA desaparece».
- Speaker line for the automatic status change: «la regla la aplica el servicio».
- Demo story ends happily: new application ends in «oferta» and shows up in the final filtered list next to seeded ones.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Kanban, document library with suggested CV, dashboard, e2e, login are content of the README «Próximos pasos» section, not work for this phase.)

</deferred>

---

*Phase: 07-documentacion-y-defensa*
*Context gathered: 2026-11-07*
