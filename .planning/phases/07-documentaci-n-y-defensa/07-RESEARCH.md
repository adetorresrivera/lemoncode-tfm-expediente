# Phase 7: Documentación y defensa - Research

**Researched:** 2026-11-07
**Domain:** Defense material (deck, demo script, AI-usage doc, ADRs, examiner Q&A, README, screenshots). Documentation only: no product code changes.
**Confidence:** HIGH for repo facts and figures (every figure below was re-run this session); MEDIUM for external prices and OpenAI tokenization (cited / estimated); two items stay `[ASSUMED]` (see Assumptions Log).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The demo goes **in the middle**, following the bases order: title/idea → MVP and iterations → **demo (5:00)** → technologies + AI → challenges → next steps.
- **D-02:** The ~10 non-demo minutes are **weighted toward the front end**. The three front topics with their own slides: **(a) pods + contracts** (course architecture vm/mapper/hooks/container/component, view model not derived from the API model, shared Zod in `@tfm/contracts`); **(b) form + AI marks** (TanStack Form, the AI draft only fills empty fields, per-field «IA» marks until the user edits); **(c) accessibility and responsive** (from 360 px, keyboard-only, axe in tests, 44 px touch targets, AA contrast light/dark). AI in the product and GSD in development share less time (~2 min together); Claude sets the exact per-slide times, which must add up to 15:00 including the 5:00 demo.
- **D-03:** Architecture diagram in Mermaid at **container level plus an AI-flow sequence**: browser → web (pods) → Hono API → Mongo / Silo / `LlmClient` (ollama | openai | mock), with `@tfm/contracts` shared; and a sequence diagram of extraction: paste → `POST` extract endpoint → structured output → AI marks in the form (no persistence).
- **D-04:** **One or two real code snippets** (≤10 lines each, copied from the repo, with file path), e.g. a pod mapper and the `LlmClient` interface (`apps/api/src/llm/llm.client.ts`). Snippets must match the current code verbatim.
- **D-05:** GSD diagram = **the per-phase loop without figures**: discuss → plan (research + plan-checker) → execute (waves, atomic commits) → verify/UAT → review/security → ship (PR), with the gap-closure loop back to plan.
- **D-06:** The offer pasted live is **`docs/demo/ofertas/remote-senior.txt`** (Nimbo Software, Frontend Senior, remote). The other two fixtures are listed as alternates only.
- **D-07:** The mock decision is made **before starting**, in the pre-flight checklist: run a warm-up extraction; if it is too slow or fails, start with `LLM_PROVIDER=mock docker compose up` and say so naturally. No live compose restart is planned as the main path (it costs ~30–60 s); the live-failure path is: say the line, continue with plan C screenshots/video for that step.
- **D-08:** Adding the round moves the new application `enviada → en_entrevistas` automatically (service rule); the script then moves it **manually to «oferta»**, and the speaker points out the history shows the automatic transition («la regla la aplica el servicio»). Researcher must confirm the status a newly created application starts in and how the history renders it.
- **D-09:** If Ollama extracts a field wrongly live, **use it**: the script includes a prepared line — «por eso nada se guarda solo; corrijo el campo y la marca IA desaparece» — and the speaker corrects the field.
- **D-10:** Plan C video is **recorded by the user**; the demo script doubles as the recording script. The video is **not committed** (size); the doc only says where it lives (local / USB).
- **D-11:** Time is reported as **calendar days** (first commit 2026-10-27 → PR #6 merge 2026-11-07), **days with commits**, and the **sum of `duration` from the plan SUMMARY files**, noting the plans that lack it (56 of 62 have one at the time of discussion — recount).
- **D-12:** Commits: **total + breakdown** by Conventional Commit type (feat/fix/test/docs/chore/…) and by phase. GSD's `docs(...)` planning commits are shown as what they are (roughly half), not hidden.
- **D-13:** **Cut-off = end of Phase 6, commit `c11ab61`** (PR #6). All figures are reproducible with commands anchored on `c11ab61` (e.g. `git rev-list --count c11ab61`); the doc lists those commands. Phase 7 is mentioned separately as «documentación», without figures.
- **D-14:** «Qué funcionó y qué no» is **frank, with real examples from `.planning/`**: gap-closure plans (3 in Phase 3, 2 in Phase 5), UAT G-03-2 (gemma4:e2b classified C/Python as languages → `idiomas` field), the approved-prompt sha256 fingerprint rule (D-25 Phase 3), TDD RED+GREEN in one commit because the pre-commit hook runs the full suite, UI reviews kept as improvement lists, the phase 6 browser pass finding 28–36 px chips, etc. Each claim cites its source file.
- **D-15:** Cloud cost = **measured tokens × public price**: measure input/output tokens of a real extraction for the 3 fixtures (system prompt included), multiply by the current public price of **small OpenAI models** (named in the cost table with source URL and date), project to 100 and 10 000 offers/month. Compare with local Ollama (zero marginal cost, hardware/latency trade-off).
- **D-16:** Elsewhere (AI doc prose, examiner Q&A, deck) cloud providers are named **generically** as «compatible con OpenAI»; **Gemini and Groq are not mentioned** (consistent with Phase 6 D-21). OpenAI model names appear only in the cost table.
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Kanban, document library with suggested CV, dashboard, e2e, login are content of the README «Próximos pasos» section, not work for this phase.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRES-01 | Defense deck exists and covers problem, product, architecture, AI usage and demo | §Deck blueprint (slide/time table that sums to 15:00), §Mermaid, §Snippets (D-04 verified lines) |
| PRES-02 | Demo script with timings and a fallback path exists | §Demo script facts (corrected D-08 chain, seed table, filters, mock draft, live-Ollama behaviour, measured timings) |
| PRES-03 | `docs/ia-en-el-proyecto.md` documents AI in development (GSD + Claude Code) and in the product | §AI-doc figures (commands + current outputs), §Token and cost measurement, §Lessons sources |
| PRES-04 | `docs/decisiones.md` records the ADRs for stack and architecture decisions | §ADR source map (12 rows, `decisiones.md` does not exist yet) |
| PRES-05 | Likely examiner questions with prepared answers are documented | §Q&A evidence bank (facts each answer can cite), §Lessons sources |
</phase_requirements>

## Summary

Phase 7 writes no product code, so research is about **evidence**: every number and claim the deliverables will state must be reproducible. This session re-ran every figure against commit `c11ab61` (`c11ab612cbb22f892f0c90b82ec0444990aefec2`), measured real token usage against the local Ollama, validated a screenshot recipe over the running seeded stack, and prototyped the link checker and the Mermaid check. `npm run test` (59 + 467 + 890 = 1416 tests, 35 s) and `npm run typecheck` (6 s) pass on the current HEAD (docs-only commits after `c11ab61`), so the mandatory `<verify>` is cheap.

**Four findings correct or sharpen CONTEXT.md and the plan must not repeat the old wording:** (1) a new application starts in **`guardada`**, not `enviada`, so the demo must set «Estado inicial: Enviada» (or change the state in the detail) **before** adding the round, otherwise the rule never fires; (2) the status the demo ends in is **«Oferta recibida»** (`oferta_recibida`), there is no «oferta» status; (3) the history timeline shows **date only and does not mark automatic transitions**, so «la regla la aplica el servicio» is the speaker's inference from two consecutive entries, not something the UI labels; (4) the mock draft always returns company **«Lumen Analytics»** and location «Madrid» whatever is pasted, so under plan B the form will not show «Nimbo Software». Also: duration is present in **55 of 62** SUMMARY files (not 56), and the sha256 fingerprint of the prompt is **a plan-time check, not an automated test** (the test compares the prompt with `docs/AI-EXTRACTION.md` byte for byte).

**Primary recommendation:** write the deliverables from the evidence tables in this file, embed a small machine-readable «Cifras» block in `docs/ia-en-el-proyecto.md` so a dependency-free Node script can re-check every figure against `git` and `.planning/`, add a `scripts/check-docs.mjs` link/anchor/section checker (needs a `/* global console, process */` header to pass ESLint), and end each plan with `npm run typecheck && npm run test` plus that checker.

## Architectural Responsibility Map

This phase has no runtime capability; the "tiers" are the artifact owners.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deck, demo script, Q&A | `docs/presentacion/*.md` | — | User converts deck to slides himself; Markdown is the source |
| AI-usage figures | `git log` (commit figures) | `.planning/phases/*/*-SUMMARY.md` (durations, plan counts) | Locked verification: figures checked against both |
| ADR log | `docs/decisiones.md` | PROJECT.md Key Decisions / CONTEXT files (sources) | CLAUDE.md makes it the canonical ADR log |
| Screenshots | Automated browser container against the seeded compose stack | `docs/presentacion/capturas/` (PNG) | D-17, reproducible, no repo dependency |
| README «Próximos pasos» | `README.md` | REQUIREMENTS.md v2, PROJECT.md Out of Scope | Backlog already written in those files |
| Doc checks | `scripts/check-docs.mjs` (Node, no deps) | `npm run typecheck && npm run test` | Mandatory verify plus phase-specific checks |

## Standard Stack

No package is added to the repo. Everything below is a one-off tool, used from a throwaway directory or container.

### Core (tools, not dependencies)

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| Playwright image `mcr.microsoft.com/playwright:v1.56.1-noble` | 1.56.1 | Screenshots (D-17) | Already pulled locally and used in the Phase 6 browser pass `[VERIFIED: docker images — mcr.microsoft.com/playwright:v1.56.1-noble 3.58GB]` `[VERIFIED: .planning/phases/06-pulido-de-demo/06-UAT.md:172 «automated Playwright 1.56.1 Chromium against the seeded stack»]` |
| `playwright@1.56.1` npm package installed **inside the container** (`/tmp`) | 1.56.1 | Node API for the image's Chromium | The image ships browsers, not the npm package; install pinned to the image version |
| Node 22 built-ins (`fs`, `child_process`) | 22.23.4 | Link checker, figure checker, duration sum | Zero dependencies `[VERIFIED: node --version → v22.23.4]` |
| `js-tiktoken@1.0.21` (scratch dir only) | 1.0.21 | Count OpenAI `o200k_base` tokens for D-15 | Only way to get an OpenAI-tokenizer count without an API key; not added to the repo |
| `mermaid@11` (container only, optional) | 11.x | `mermaid.parse()` syntax check of the diagrams | Optional automated check (see Validation Architecture) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright container | Claude in Chrome | Not probed this session; the Playwright path is already proven on this stack. Use Claude in Chrome only as a fallback |
| `markdown-link-check` / `remark` | Own 40-line Node script | Adds a dependency; CLAUDE.md forbids unjustified deps |
| `gh pr list --json ...,commits` | `git rev-list` over merge-commit tips | The `gh` query with `commits`/`additions` fails here (see Pitfalls) |

**Installation (inside a throwaway container, never in the repo):**
```bash
docker run -d --name pwshot --network expediente_default -w /tmp mcr.microsoft.com/playwright:v1.56.1-noble sleep 900
docker exec pwshot bash -c 'mkdir -p /out && cd /tmp && npm init -y >/dev/null && npm i playwright@1.56.1 --no-audit --no-fund'
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| playwright | npm | years; latest published 2026-11-05 | ~167M/wk | github.com/microsoft/playwright | [SUS] (reason `too-new`: latest version is 2 days old) | Used **pinned to 1.56.1** (same as the Phase 6 run and the local image), container-only. Planner: add a `checkpoint:human-verify` before the screenshot task, noting the pin |
| js-tiktoken | npm | latest 2025-08-09 | ~12.8M/wk | github.com/dqbd/tiktoken | [OK] | Scratch-dir use only, optional (see D-15 note) |
| mermaid | npm | latest published 2026-11-03 | ~25.7M/wk | github.com/mermaid-js/mermaid | [SUS] (`too-new`) | Optional, container-only syntax check; if used, gate it behind `checkpoint:human-verify` and pin `mermaid@11` |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** playwright, mermaid (both only because the *latest* release is days old; both widely used, official repos, no postinstall). None ends up in `package.json`.

`gsd-tools query package-legitimacy check` was run for all three this session; `gpt-tokenizer` returned SUS (`too-new`) and was not used.

## Architecture Patterns

### Deliverable map

```
docs/
├── presentacion/
│   ├── deck.md                 # ~10 slides: title, bullets, speaker note, time; 2-3 Mermaid blocks
│   ├── demo-script.md          # 5:00 timed script, plan B (mock), plan C (screenshots/video), pre-flight
│   ├── preguntas-tribunal.md   # 15 questions, 2-4 sentence answers
│   └── capturas/               # PNG: list, detail, form-ai, dark, mobile (+ capture recipe/script)
├── ia-en-el-proyecto.md        # AI in development (GSD + Claude Code) + in the product + cost table
└── decisiones.md               # 12 ADRs (does NOT exist yet)  [VERIFIED: ls docs → no decisiones.md]
README.md                       # + «Próximos pasos» + links in «Documentación»
scripts/check-docs.mjs          # optional committed checker (see Validation Architecture)
```

`docs/` is excluded from ESLint and Prettier (`.prettierignore` lines `docs` and `*.md`; `eslint.config.js` `globalIgnores([... "docs/**"])`) so no formatter will rewrite tables or Mermaid `[VERIFIED: .prettierignore, eslint.config.js:6-16]`. The pre-commit hook runs `npx lint-staged` then `npm run typecheck`; the pre-push hook runs `npm run test` `[VERIFIED: .husky/pre-commit, .husky/pre-push]`.

### Deck blueprint (recommendation; times are Claude's discretion under D-01/D-02, sum = 15:00)

| # | Slide | Time | Cum. | Source material |
|---|-------|------|------|-----------------|
| 1 | Portada, idea y problema | 1:00 | 1:00 | `docs/PRODUCT.md` §Problema, §Propuesta |
| 2 | MVP e iteraciones (7 fases, 1 fase = 1 PR) | 1:15 | 2:15 | ROADMAP.md, PR table below |
| 3 | **Demo** | 5:00 | 7:15 | `demo-script.md` |
| 4 | Arquitectura (Mermaid contenedores + secuencia IA) | 1:00 | 8:15 | D-03 |
| 5 | Pods + contracts (snippets D-04) | 1:00 | 9:15 | §Snippets |
| 6 | Formulario + marcas IA | 1:15 | 10:30 | AI-06/07/08 behaviour, `application-edit` pod |
| 7 | Accesibilidad y responsive | 1:00 | 11:30 | DEMO-03/04, 06-UAT (66 matrix cells) |
| 8 | IA en el producto + GSD (bucle sin cifras) | 2:00 | 13:30 | D-05, `docs/AI-EXTRACTION.md` |
| 9 | Retos y aprendizajes | 1:00 | 14:30 | §Lessons sources |
| 10 | Próximos pasos | 0:30 | 15:00 | README «Próximos pasos» |

Whether the 15 min includes questions is not stated in CONTEXT; see Open Questions.

### Pattern 1: Reproducible figures
**What:** every number in `docs/ia-en-el-proyecto.md` sits in one fenced «Cifras» block (`clave: valor`) plus a «Cómo se calculó» list with the exact command. A Node script recomputes the values from `git` and `.planning/` and diffs the block.
**When:** the locked verification «every figure is checked against `git log` and `.planning/`».

### Pattern 2: Snippet with source marker
**What:** each code block on a slide is preceded by `<!-- source: apps/api/src/llm/llm.client.ts#L18-L26 -->`; a check extracts the line range and compares it byte for byte with the fenced block (D-04 «verbatim»).

### Anti-Patterns to Avoid
- **Quoting CONTEXT's old numbers.** «56 of 62» is now **55 of 62**; «`oferta`» is **«Oferta recibida»**.
- **Claiming the UI labels automatic transitions.** It does not (see Demo facts).
- **Claiming a test enforces the sha256.** It does not (see ADR 11).
- **Using `gh pr view --json commits`** for per-phase commit counts: capped at 100 per PR.
- **Naming Gemini/Groq or OpenAI model names outside the cost table** (D-16).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Commit counts per phase | Branch/date heuristics | `git rev-list --count <prevTip>..<tip>` over the PR tips | Deterministic; tips = `^2` of each merge commit on `origin/main` |
| Token counts | `chars / 4` | Ollama `prompt_eval_count`/`eval_count` + `o200k_base` count | Measured, not guessed |
| Screenshots | Manual captures | Playwright script in the pinned image | Reproducible, same viewport every time |
| Link checking | A dependency | `scripts/check-docs.mjs` (below) | 9 internal links today; 40 lines suffice |
| Dark mode toggling in the capture | Click the toggle in each shot | `addInitScript(localStorage 'expediente-theme' = 'dark')` | Verified working; deterministic |

## Findings by open item

### 1. D-08 — initial status, the service rule, how the history renders

- Enum values, verbatim `[VERIFIED: packages/contracts/src/enums.ts:6-14]`: `"guardada", "enviada", "en_entrevistas", "oferta_recibida", "aceptada", "rechazada", "descartada"`. UI labels `[VERIFIED: apps/web/src/common/lib/enum-labels.ts:12-20]`: `guardada: "Guardada"`, `enviada: "Enviada"`, `en_entrevistas: "En entrevistas"`, `oferta_recibida: "Oferta recibida"`. **There is no «oferta» status.**
- A new application starts in **`guardada`**: contract default `[VERIFIED: packages/contracts/src/application.schema.ts:60]` `.extend({ status: applicationStatusSchema.default("guardada") })`; form default `[VERIFIED: apps/web/src/pods/application-edit/application-edit.vm.ts:57]` `status: "guardada",`; the create form has a select labelled **«Estado inicial»** (`tracking-section.tsx:42-46`, only in `mode === "create"`). Verified visually: the AI-marks capture shows «Estado inicial: Guardada» after the autofill (the AI draft never touches the status).
- The rule `[VERIFIED: apps/api/src/applications/applications.service.ts:44-47]`:
  ```ts
  export const INTERVIEW_STATUS_RULE: InterviewStatusRule = {
    from: "enviada",
    to: "en_entrevistas",
  };
  ```
  It is evaluated inside the atomic pipeline update `[VERIFIED: apps/api/src/applications/applications.repository.ts:268]` `const moves = { $eq: ["$status", { $literal: rule.from }] };` and appends `{ status: rule.to, at: now }` to `statusHistory`. **A round added while the status is `guardada` changes nothing.**
- **Demo consequence:** in the form choose «Estado inicial: Enviada» before «Guardar candidatura» (history starts with «Enviada»; `appliedAt` is also set: hint under «Fecha de envío»: «Si la dejas vacía, se rellena sola al pasar a Enviada.»), then «Añadir ronda» in the detail → status becomes «En entrevistas» with no user action → manually «Cambiar estado» → «Oferta recibida». The 5 min script must contain the «Estado inicial» step explicitly.
- **History rendering** `[VERIFIED: apps/web/src/pods/application-detail/components/status-history.tsx:22-55]`: ordered list titled «Historial de estados», newest first (mapper `.reverse()`, `application-detail.mapper.ts:282-285`), first entry tagged «Actual», each entry = status label + date. Date format is **day + short month + year only** (`format.ts:1-8` `day: "numeric", month: "short", year: "numeric"`), so all entries created in the demo show the same date. **Nothing marks an entry as automatic.** Speaker line should rely on sequence: «no he tocado el estado; la regla la aplica el servicio: pasó de Enviada a En entrevistas al añadir la ronda».
- Save navigates to the detail (`application-edit.scene.tsx:21-28`, notice «Candidatura creada.»). Attaching the CV is done in **«Editar»** (CV select in «Documentos» section of the form; the detail's «Documentos» only downloads), and PUT keeps status/history (whitelist).

### 2. D-06 — seed, filters, the fixture, the mock

**Seed (12 applications, 3 documents)** `[VERIFIED: apps/api/src/scripts/seed/seed.plan.ts via tsx buildSeedPlan, and live GET /api/applications on the running stack]`. Final statuses (after the rule ran in the seed): enviada 3, guardada 2, en_entrevistas 3, oferta_recibida 1, aceptada 1, rechazada 1, descartada 1.

| Company | Mode | Seniority | Final status | Rounds | Stack tags |
|---|---|---|---|---|---|
| Harbor Pine Software | híbrido | senior | en_entrevistas | 3 | React, TypeScript, Design systems |
| Tinta y Byte | remoto | mid | guardada | 0 | React, Next.js, TypeScript, GraphQL |
| Mercado Atlas | híbrido | lead | **oferta_recibida** | 3 | React, TypeScript, Liderazgo técnico |
| Brújula Labs | remoto | mid | guardada | 0 | React Native, TypeScript |
| Olivar Cloud | remoto | mid | en_entrevistas | 1 | Vue, React, TypeScript |
| Sendero Datos | híbrido | senior | rechazada | 3 | React, Redux |
| Fundición Digital | presencial | senior | enviada | 0 | React, TypeScript, Design systems |
| Quillon Works | híbrido | mid | en_entrevistas | 1 | Node.js, React, PostgreSQL |
| Cobalto Sistemas | remoto | senior | enviada | 0 | Node.js, React, MongoDB |
| Pajarera Studio | presencial | junior | descartada | 0 | HTML, CSS, JavaScript |
| Kestrel Forge | presencial | mid | aceptada | 1 | Node.js, React, MongoDB |
| Estudio Ámbar | híbrido | mid | enviada | 0 | React, TypeScript |

Neither Nimbo Software nor Lumen Analytics is seeded (comment in `seed.plan.ts` header: «The three offers that are pasted live in the demo ... and the mock draft are deliberately NOT here»). Seed dates are relative to the moment the seed ran (e.g. the seeded round 3 of Harbor Pine shows «10 nov. 2026» on a 7 Nov seed): **re-seed on the morning of the defense** (`docker compose exec app npm run seed -- --reset` destroys everything, including user data).

**Filters verified against the live API** (`GET /api/applications?...`):
- Opening: **«Remoto» + stack «React»** → 3 cards: Tinta y Byte (guardada), Olivar Cloud (en_entrevistas), Cobalto Sistemas (enviada). Stack tags are AND-ed (`applications.query.ts` D-04 comment: «AND over the stored key») and the stack filter chips show the 10 most frequent tags plus «Mostrar todas (15)» (React is first, 10 apps).
- Closing: **status chip «Oferta recibida» only** → seeded 1 (Mercado Atlas) → **2 cards after the demo** (new application on top: default sort «Última actualización» is `updatedAt` desc). Status-only is robust: it does not depend on which tags Ollama proposes.
- Layout fact: at 1280×800 the filter card is ~500 px tall, so the list starts at the fold (see screenshots). Pre-flight: browser zoom ~80–90 % or scroll after filtering.

**`docs/demo/ofertas/remote-senior.txt`**: «Desarrollador/a Frontend Senior · Nimbo Software · Teletrabajo 100% · Contrato indefinido»; «Salario de 45.000 - 55.000 € brutos anuales»; requirements React (5+ years), TypeScript, Vite, Vitest/Testing Library, AWS (S3, CloudFront, Lambda), «Nivel de inglés B2»; «Se valora»: GraphQL, Storybook/design systems, open source. 2,589 chars (the API logs `length: 2588`, normalized).

**Mock extraction** `[VERIFIED: apps/api/src/llm/mock.provider.ts:4-23]` — fixed regardless of input, after `const MOCK_DELAY_MS = 300;`:
`title: "Desarrollador/a Frontend Senior"`, `company: "Lumen Analytics"`, `location: "Madrid"`, `workMode: "remoto"`, `seniority: "senior"`, `contractType: "indefinido"`, `salaryMin: 45000`, `salaryMax: 55000`, `currency: "EUR"`, tags `React`/`TypeScript`/`Vite` (stack), `Testing Library` (nice_to_have), `Inglés B2` (language). `try-extract` with `LLM_PROVIDER=mock`: remote-senior **10 / 12 (misses company, tag:GraphQL)**. **Plan B script line needed:** «el modo simulado devuelve siempre el mismo borrador de ejemplo; por eso aquí pone Lumen Analytics». README already says this («devuelve siempre el mismo borrador de ejemplo, sea cual sea el texto que pegues»).

**Live Ollama on remote-senior** (gemma4:e2b, measured twice this session — raw API call and through the UI, identical results; `try-extract` 11 / 12): title, company «Nimbo Software», workMode remoto, seniority senior, contract indefinido, 45000–55000 EUR, location null (the offer gives none), stack React, TypeScript, Vite, Vitest, Testing Library, AWS, language «Inglés B2». **Misses `GraphQL` (nice_to_have)**; «Se valora» stays empty. The UI banner read «Hemos rellenado 8 campos y añadido 7 etiquetas. Revisálos.» and 8 «IA» marks were present. So D-09's prepared line will probably be used: recommended live correction = add «GraphQL» under «Se valora» (it shows the AI missed it) and/or edit a salary value to show the «IA» mark disappears.

**Timings:** presenter stopwatch, whole flow from «Añadir candidatura» to the filtered list: **13 s with mock, 48 s with Ollama after warm-up** `[VERIFIED: .planning/phases/06-pulido-de-demo/06-UAT.md:92,97]`. This session, extraction alone on the local Ollama: first call after idle 53.9 s, then 13.1 s and 17.8 s; in-process `try-extract`: 40.2 s / 13.9 s / 15.1 s. This supports a warm-up step and a threshold such as «second warm-up extraction > 20 s or any error → mock». Phase 3 on a loaded CPU had timed out at 90 s twice on this fixture `[VERIFIED: 03-09-SUMMARY.md run 1 and 2 tables]`.

### 3. D-11..D-13 — AI-doc figures, commands and current outputs (anchored on `c11ab61`)

All commands were run in this session on a clean worktree at `ce01938` (two docs-only commits after `c11ab61`; anchoring on the SHA makes them independent of that).

| Figure | Command | Output now |
|---|---|---|
| Total commits | `git rev-list --count c11ab61` | **544** |
| Merge commits / non-merge | `git rev-list --merges --count c11ab61` / `--no-merges` | **71** / **473** |
| By type (subject prefix) | `git log --format=%s c11ab61 \| sed -E 's/^([a-z]+)(\([^)]*\))?!?:.*/\1/;t;s/.*/other/' \| sort \| uniq -c \| sort -rn` | docs 289 · feat 86 · chore 78 · test 58 · fix 28 · other 3 · refactor 2 |
| …of which chore merges | `git log --merges --format=%s c11ab61 \| sed -E 's/\(worktree.*//' \| sort \| uniq -c` | 71 × `chore: merge executor worktree` ⇒ real `chore` = 7 |
| The 3 «other» | `git log --format='%h %s' c11ab61 \| grep -vE '^[0-9a-f]+ [a-z]+(\([^)]*\))?!?:'` | `5356cf5 Fix claude credentials`, `2322e9b GSD Setup`, `a618764 First commit` |
| Docs share | 289 / 544 | **53.1 %** of all commits (61.1 % of non-merge) |
| Commits with a `Co-Authored-By` trailer | `git log c11ab61 --format='%H%x00%B%x01'` + regex | **290** |
| Days with commits | `git log --format=%ad --date=short c11ab61 \| sort -u \| wc -l` | **11** (no commits on 2026-11-05) |
| Commits per day (UTC) | `TZ=UTC git log --format=%ad --date=format-local:%Y-%m-%d c11ab61 \| sort \| uniq -c` | 10-27:1 · 10-28:12 · 10-29:60 · 10-30:7 · 10-31:70 · 11-01:141 · 11-02:24 · 11-03:25 · 11-04:56 · 11-06:130 · 11-07:18 |
| First commit | `git log --reverse --format='%h %ad' --date=iso-strict c11ab61 \| head -1` | `a618764 2026-10-27T07:51:30Z` |
| PR #6 merge | `gh pr list --state all --json number,state,headRefName,baseRefName,createdAt,mergedAt,title` | merged `2026-11-07T11:40:29Z` (merge commit `9c70231`, `2026-11-07T11:40:28Z`) |
| Calendar days | 2026-10-27T07:51:30Z → 2026-11-07T11:40:29Z | **11 days 3 h 49 min** elapsed; 12 calendar dates inclusive |
| Plans / summaries | `ls .planning/phases/*/*-PLAN.md \| wc -l` (and `-SUMMARY.md`) | **62 / 62** |
| Plans per phase | same, per directory | P1 6 · P2 12 · P3 12 · P4 4 · P5 11 · P6 17 |
| Gap-closure plans | `grep -l "gap_closure: true" .planning/phases/*/*-PLAN.md` | 03-10, 03-11, 03-12, 05-10, 05-11 |
| Tests | `npm run test` | 59 + 467 + 890 = **1416**, 35 s (contracts 4 files, api 27, web 27) |
| TS/TSX source lines at cut-off (non-test, excl. `routeTree.gen.ts`) | `git ls-tree -r --name-only c11ab61 \| grep -E '^(apps\|packages)/.*\.tsx?$' \| grep -v -E '\.test\.\|\.d\.ts\|routeTree' \| xargs -I{} git show c11ab61:{} \| wc -l` | 15,209 (optional figure) |

**By phase** — range `previousTip..tip`, tips are the `^2` parent of each merge on `origin/main` (`git log --first-parent --format='%h %p' origin/main`); base is `a618764` (First commit, counted separately):

| Phase | Range tip | Commits | docs | feat | chore | test | fix | other | refactor | PR | Merged (UTC) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ec4d6f1` | 80 | 46 | 11 | 12 | 7 | 2 | 2 | – | #1 | 2026-11-03 21:23 |
| 2 | `f4ab8a5` | 73 | 36 | 20 | 12 | 3 | 2 | – | – | #2 | 2026-11-03 21:26 |
| 3 | `6d339fa` | 139 | 76 | 21 | 21 | 14 | 7 | – | – | #3 | 2026-11-03 21:27 |
| 4 | `89ba9ac` | 45 | 26 | 7 | 4 | 5 | 3 | – | – | #4 | 2026-11-03 21:27 |
| 5 | `3575f90` | 86 | 51 | 15 | 11 | 7 | 2 | – | – | #5 | 2026-11-06 09:21 |
| 6 | `c11ab61` | 120 | 54 | 12 | 18 | 22 | 12 | – | 2 | #6 | 2026-11-07 11:40 |

80+73+139+45+86+120 = 543, +1 (First commit) = 544 ✓. The commands are in §Code Examples («Reproduce the commit and PR figures»), ready to embed as the doc's «Cómo se calculó»; the tip SHAs are fixed constants.

**Durations** — `duration:` in the SUMMARY frontmatter, summed with a small Node script over `git show c11ab61:<file>`:

| Figure | Value |
|---|---|
| Summaries with `duration` | **55 of 62** (CONTEXT said 56: recount) |
| Missing | `03-03`, `03-09`, `06-06`, `06-07`, `06-10`, `06-11`, `06-16` |
| Sum | **1512 min = 25.2 h** (formats seen: `25min`, `25 min`, `~25min`, up to `150min`; all parsed) |
| Per phase (min) | P1 240 (6/6) · P2 346 (12/12) · P3 188 (10/12) · P4 162 (4/4) · P5 214 (11/11) · P6 362 (12/17) |

Caveats to state in the doc: durations are the executor's own report per plan (not wall-clock; plans ran in parallel waves with worktrees); `STATE.md` «Performance Metrics» shows `-` for every duration, so SUMMARY frontmatter is the only source. Command: `git grep -h -E '^duration:' c11ab61 -- '.planning/phases/*/*-SUMMARY.md'`.

**PR list** — `gh pr list --state all --limit 50 --json number,title,state,createdAt,mergedAt,headRefName,baseRefName` works (6 PRs, all MERGED, all with `baseRefName` main, created/merged: #1 2026-11-03T21:15→21:23, #2 21:15→21:26, #3 21:15→21:27, #4 21:18→21:27, #5 2026-11-06T09:19→09:21, #6 2026-11-07T11:09→11:40). Branch names: `phase/01-fundaciones`, `phase/02-candidaturas`, `phase/03-autocompletado-ia`, `phase/04-rondas-entrevista`, `phase/05-documentos-s3`, `phase/06-pulido-demo`. Alternative without `gh`: `git log --first-parent --merges --format='%h %cI %s' origin/main`.

### 4. D-15 — token measurement and prices

**Method (no repo change, no dependency):** the providers do not expose usage and `try-extract.ts` prints only time/score, so replay the exact request the Ollama provider builds (model, `think:false`, `options {temperature:0, num_ctx:8192}`, `format = z.toJSONSchema(modelOfferExtractionSchema)`, `messages [system, user]`) against `POST ${LLM_BASE_URL}/api/chat` from a scratch script that imports `EXTRACTION_SYSTEM_PROMPT` and `modelOfferExtractionSchema` from `apps/api/src/offers/extract.service.ts` and `readFixtureText` from the fixtures; read `prompt_eval_count` / `eval_count` from the response. Run with `tsx --conditions=@tfm/source` from `apps/api` and an `.mts` file outside the repo (import `zod` by absolute path). Ollama is up in this devcontainer: `[VERIFIED: curl $LLM_BASE_URL/api/version → {"version":"0.40.13"}; /api/tags lists gemma4:e2b 4.6B Q4_K_M]`.

**Measured with gemma4:e2b (Ollama counts; the JSON-schema `format` is a decoding grammar and is not in `prompt_eval_count`):**

| Fixture | Offer chars | Input tokens (system + offer) | Output tokens | Time |
|---|---|---|---|---|
| remote-senior | 2,589 | 1,004 | 263 | 53.9 s (cold) |
| onsite-junior | 2,101 | 884 | 175 | 13.1 s |
| english-nice-to-have | 2,371 | 922 | 216 | 17.8 s |
| **Average** | | **936.7** | **218** | |

System prompt = 1,264 chars; model-facing JSON Schema = 1,261 chars.

**Re-counted with OpenAI's `o200k_base` tokenizer** (`js-tiktoken@1.0.21`, scratch dir; the same JSON the model produced counts as output): system 359, schema 332 tokens.

| Fixture | Offer | Input w/o schema | Input with schema | Output |
|---|---|---|---|---|
| remote-senior | 566 | 925 | 1,257 | 219 |
| onsite-junior | 454 | 813 | 1,145 | 150 |
| english-nice-to-have | 484 | 843 | 1,175 | 180 |
| **Average** | | **860.3** | **1,192.3** | **183.0** |

Use **1,192 in / 183 out** (with schema) as the conservative cloud figure; state the without-schema figure (860 in) as the lower bound because whether OpenAI bills the strict `json_schema` as input is not stated on its guide `[ASSUMED]` (the structured-outputs guide, fetched 2026-11-07, does not mention schema tokens). Also state: `callStructured` retries once when the output does not parse (`MAX_ATTEMPTS = 2`, `structured-call.ts:4`), so the worst case is 2× the tokens; reasoning tokens of newer models, if enabled, would add to the output `[ASSUMED]`.

**Public prices** — official page `https://developers.openai.com/api/docs/pricing` (301 from `platform.openai.com/docs/pricing`), Standard tier, text, per 1M tokens, **accessed 2026-11-07** `[CITED: developers.openai.com/api/docs/pricing]` (extracted by the fetch tool, rows quoted verbatim: `| gpt-5.4-mini | $0.75 | $4.50 | $0.075 |`, `| gpt-5.4-nano | $0.20 | $1.25 | $0.02 |`, `| gpt-5-mini | $0.25 | $2.00 | $0.025 |`, `| gpt-5-nano | $0.05 | $0.40 | $0.005 |`, `| gpt-4.1-mini | $0.40 | $1.60 | $0.10 |`, `| gpt-4o-mini | $0.15 | $0.60 | $0.075 |`). A web search also showed a newer «luna» tier not labelled mini/nano; left out. Re-fetch the page when writing the doc and refresh the date.

Cost with 1,192.3 in / 183 out per offer (computed):

| Model | $/offer | 100 offers/month | 10,000 offers/month |
|---|---|---|---|
| gpt-5-nano ($0.05 / $0.40) | 0.000133 | $0.013 | $1.33 |
| gpt-4o-mini ($0.15 / $0.60) | 0.000289 | $0.029 | $2.89 |
| gpt-5.4-nano ($0.20 / $1.25) | 0.000467 | $0.047 | $4.67 |
| gpt-5-mini ($0.25 / $2.00) | 0.000664 | $0.066 | $6.64 |
| gpt-4.1-mini ($0.40 / $1.60) | 0.000770 | $0.077 | $7.70 |
| gpt-5.4-mini ($0.75 / $4.50) | 0.001718 | $0.172 | $17.18 |

Local comparison: zero marginal cost; trade-off is latency and hardware. Phase 3 measured gemma4:e2b **on CPU only, 10 cores, 8 GB shared** (timeouts at 90 s on the first runs, `03-09-SUMMARY.md:84-100`), Phase 6 stopwatch 48 s with warm-up, this session 13–54 s; no GPU in this environment (`nvidia-smi` absent in the Ollama container). Cloud would answer in seconds but sends the offer text to a third party (privacy trade-off for a local single-user app).

### 5. D-17 — reproducible screenshots (validated end to end this session)

- **Dark mode:** sidebar «Tema» toggle (`Sistema / Claro / Oscuro`, `theme-toggle.tsx`; inside the Sheet at 360 px). Persisted in `localStorage` key `expediente-theme` with values `system | light | dark` `[VERIFIED: apps/web/src/core/theme/theme.ts:3-9 — export const THEME_STORAGE_KEY = "expediente-theme"; export type ThemePreference = "system" | "light" | "dark";]`; effect: `root.classList.toggle("dark", dark)`. Setting it via `addInitScript` before navigation works (dark capture verified).
- **Routes** `[VERIFIED: apps/web/src/routes/**]`: `/applications` (list; query params are plain repeated keys, e.g. `?status=oferta_recibida`, `?workMode=remoto&tags=React`), `/applications/new`, `/applications/<id>` (detail), `/applications/<id>/edit`, `/documents`. Detail ids are ObjectIds that change on `--reset`: look up by company via `GET /api/applications` (use «Harbor Pine Software», 3 rounds, both documents, 3-entry history).
- **Selectors proven:** `getByLabel("Texto de la oferta")`, `getByRole("button", { name: "Autocompletar con IA" })`, `getByText("Rellenado por la IA")` (8 `sr-only` marks, appears after ~30 s on Ollama), `main` for readiness.
- **Environment recipe:** the stack on the Docker host is reachable from the devcontainer at `http://host.docker.internal:8080` (health `{"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`) and from containers on the compose network `expediente_default` as `http://app:8080`. **A bind mount of a devcontainer path (`-v /tmp/...:/work`, also the workspace path) is resolved by the host daemon and arrives empty**: copy files with `docker cp` instead. **`docker exec` stdout was swallowed in foreground here**: run the script with `docker exec -d` writing to a log file and read it with a second `docker exec ... cat`. Always `docker rm -f` the container afterwards.
- **Captured and visually checked (scratch):** list light 1280×800, list dark 1280×800, list light 360×740, list filtered `?status=oferta_recibida` 1280, detail light 1280 (full page), form with AI marks 1280 (full page, live Ollama, 30.5 s). Nothing was saved (`POST /api/offers/extract` is stateless and no form was submitted).
- For the AI-marks capture prefer a deterministic stack: `LLM_PROVIDER=mock docker compose up -d` (the compose file reads `LLM_PROVIDER`), or accept Ollama and wait up to 90 s (`timeout: 90000`). Under mock the form shows «Lumen Analytics».
- Reference script (committed under `docs/presentacion/capturas/` it is not linted: `docs/**` is ignored):

```js
// capture.mjs — run inside the Playwright 1.56.1 container; BASE defaults to the compose app.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://app:8080";
const browser = await chromium.launch();
async function shot(name, { width, height, theme, path, fullPage = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("expediente-theme", t), theme);
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForSelector("main");
  await page.screenshot({ path: `/out/${name}.png`, fullPage });
  await ctx.close();
}
await shot("lista-claro-1280", { width: 1280, height: 800, theme: "light", path: "/applications" });
await shot("lista-oscuro-1280", { width: 1280, height: 800, theme: "dark", path: "/applications" });
await shot("lista-movil-360", { width: 360, height: 740, theme: "light", path: "/applications" });
await browser.close();
```
(Detail and form shots add the id lookup and the paste/click/wait sequence shown under «Selectors proven».) Existing README image `docs/img/application-list.png` was taken with the same viewport rule (06-UAT.md:75: «1280 × 800, DPR 1, light»).

### 6. D-04 — verified snippets (≤10 lines, verbatim)

`<!-- source: apps/api/src/llm/llm.client.ts#L18-L26 -->` (9 lines) `[VERIFIED: Read apps/api/src/llm/llm.client.ts:18-26]`:
```ts
export interface LlmClient {
  extractStructured<T>(
    system: string,
    input: string,
    schema: z.ZodType<T>,
    options?: LlmCallOptions,
  ): Promise<T>;
  ping(): Promise<boolean>; // used by /api/health
}
```

`<!-- source: apps/web/src/pods/application-list/application-list.mapper.ts#L43-L49 -->` (7 lines) `[VERIFIED: Read application-list.mapper.ts:43-49]`:
```ts
// Only stack tags are offered as filters; the order is the one served (count desc).
export const mapStackTagsFromApiToVm = (
  tags: TagSummary[],
): StackTagOptionVm[] =>
  tags
    .filter((tag) => tag.group === "stack")
    .map((tag) => ({ label: tag.label }));
```
Pair it with the VM that does not derive from the API model: `<!-- source: apps/web/src/pods/application-list/application-list.vm.ts#L20-L22 -->` `export interface StackTagOptionVm {` / `  label: string;` / `}`. Imports show the contracts side: `application-list.mapper.ts:1` `import type { Application, TagSummary } from "@tfm/contracts";`. The mapper at lines 15-37 (`mapApplicationFromApiToVm`) is 23 lines: too long for a slide.

### 7. Link check and Mermaid

**Link checker.** Baseline: `README.md` + `docs/**/*.md` = 6 files, 9 internal links, 0 broken. Prototype (no dependencies; checks relative file links, images, and `#anchors` against GitHub-style heading slugs; skips fenced code and inline code):

```js
/* global console, process */
// scripts/check-docs.mjs — internal link + anchor checker for README.md and docs/**/*.md
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
const root = process.argv[2] ?? process.cwd();
const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
const files = [join(root, "README.md"), ...walk(join(root, "docs"))].filter(existsSync);
const slug = (h) =>
  h.trim().toLowerCase().replace(/[`*~]/g, "").replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
const anchors = (f) => {
  const s = new Set();
  let fence = false;
  for (const l of readFileSync(f, "utf8").split("\n")) {
    if (/^```/.test(l)) fence = !fence;
    const m = !fence && l.match(/^#{1,6}\s+(.*)$/);
    if (m) s.add(slug(m[1]));
  }
  return s;
};
let bad = 0, n = 0;
for (const f of files) {
  let fence = false;
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (/^```/.test(line)) fence = !fence;
    if (fence) return;
    for (const m of line.replace(/`[^`]*`/g, "").matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const t = m[1];
      if (!t || /^(https?:|mailto:)/.test(t)) continue;
      n++;
      const [p, a] = t.split("#");
      const target = p ? resolve(dirname(f), decodeURI(p)) : f;
      if (!existsSync(target)) { bad++; console.log(`BROKEN ${relative(root, f)}:${i + 1} -> ${t}`); continue; }
      if (a && target.endsWith(".md") && !anchors(target).has(a)) { bad++; console.log(`BAD ANCHOR ${relative(root, f)}:${i + 1} -> ${t}`); }
    }
  });
}
console.log(`${files.length} files, ${n} internal links, ${bad} broken`);
process.exit(bad ? 1 : 0);
```
- **Lint pitfall (verified with `eslint --stdin --stdin-filename`):** the same file at `scripts/check-docs.mjs` without the first line fails `no-undef` (`'process' is not defined`, `'console' is not defined`) because `eslint.config.js` applies `globals.node` only to `apps/*/scripts/**/*.mjs` etc.; **with the `/* global console, process */` header it passes `--max-warnings=0`**. Prettier will reformat it on commit (`lint-staged` runs `prettier --write` on `*.{ts,tsx,js,mjs,cjs}`); run `npx prettier --write scripts/check-docs.mjs` before the commit. Alternative with zero repo footprint: keep the checker in the plan's `<verify>` as an inline `node -e`, or generate it into `/tmp` — but a committed script makes the verification reproducible for `/gsd-verify-work`.
- Also check that every PNG referenced exists and is non-empty, and that `docs/presentacion/capturas/` holds ≥ 5 images.

**Mermaid on GitHub.** GitHub renders a fenced block with the `mermaid` language identifier in Markdown files (flowcharts, sequence diagrams, pie charts and more); third-party plugins can error; to check GitHub's Mermaid version put `info` in a `mermaid` block `[CITED: docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams, accessed 2026-11-07]`. The docs do not cover links inside diagrams, accessibility or mobile rendering. **Keep to `flowchart` and `sequenceDiagram` with plain ASCII-safe labels, quote labels with punctuation/parentheses, avoid `click`/links, and keep the loop and architecture diagrams small.** Offline syntax check prototype (verified: two valid blocks → `ok`, a deliberately broken block → `ERR Parse error on line 4`): in the Playwright container, `npm i mermaid@11`, load `node_modules/mermaid/dist/mermaid.min.js` with `page.addScriptTag`, call `await window.mermaid.parse(src)` for each ` ```mermaid ` block of `deck.md`. Parse-OK is necessary, not sufficient for GitHub rendering (that needs one visual look at the pushed PR). The user converts the deck to slides himself, so the Mermaid source must stay readable as text.

### 8. D-18 — ADR source map (`docs/decisiones.md` does not exist; create it)

Format per ADR: context, decision, alternatives, consequences (short). Suggested numbering `ADR-001..012`, order as CONTEXT.

| # | ADR | Sources (read this session) | Notes for the writer |
|---|---|---|---|
| 1 | Monorepo npm workspaces + `@tfm/contracts` | PROJECT.md Key Decisions row 1 (line 67); `01-CONTEXT.md` D-01 (line 19) `apps/web`, `apps/api`, `packages/contracts`; CLAUDE.md «única fuente de verdad»; `docs/ARCHITECTURE.md` §Monorepo | Consequence: web and API never redefine API models |
| 2 | Pods of the course (core/common/layouts/scenes/pods; VM not derived from API model) | CLAUDE.md §Reglas de código; `02-CONTEXT.md` D-12 (referenced from `03-CONTEXT.md:94`); `01-CONTEXT.md` D-14; PROJECT.md line 45 | Cite the snippet pair (§6) |
| 3 | Hono + official `mongodb` driver (no ODM) | PROJECT.md line 68; CLAUDE.md §Stack | «dos colecciones» is the rationale on record |
| 4 | Single-user local app (`ownerId` reserved, always `null`) | REQUIREMENTS.md §Out of Scope line 106; PROJECT.md §Out of Scope; `docs/DOMAIN.md` `ownerId` row | Feeds the multi-user scaling Q&A |
| 5 | Silo (`pgsty/minio`) vs SeaweedFS/RustFS after the end of MinIO CE | **Repo has no rationale** besides PROJECT.md line 69 («Fork mantenido de MinIO, compatible con AWS SDK»), CLAUDE.md, `compose.yml:47` (`image: pgsty/minio:RELEASE.2026-08-04T00-00-00Z`) and the user's brief `gsd/phase-07-discuss.md:25`. External: MinIO «maintenance mode» 2025-12-03 and «no longer maintained», repo archived 2026-02-12; `pgsty/minio` is an independently maintained AGPL fork, docs at silo.pigsty.io `[CITED: vonng.com/en/db/minio-resurrect, accessed 2026-11-07]`; InfoQ (2025-12-28) lists RustFS and SeaweedFS (Apache 2.0) and Garage (AGPLv3) as S3-compatible alternatives `[CITED: infoq.com/news/2025/12/minio-s3-api-alternatives, accessed 2026-11-07]` | The «why Silo over SeaweedFS/RustFS» reasoning (same MinIO API/console, drop-in image, AWS SDK compatibility, course-provided devcontainer service) is **not recorded anywhere** in `.planning/` — treat it as the author's rationale: ask or phrase it as the recorded one («fork mantenido, compatible con el SDK de AWS») |
| 6 | Local Ollama + swappable provider (`LLM_PROVIDER`) | PROJECT.md line 72; REQUIREMENTS AI-02; `03-CONTEXT.md` D-01 (line 21: native `fetch`, no SDKs; mock after 300 ms); README «Cambiar de modelo» | Name cloud only as «compatible con OpenAI» (D-16) |
| 7 | One image + `docker compose` (app, mongo, s3, s3-init, ollama, ollama-init; pinned versions) | `01-CONTEXT.md` D-21 (line 48); REQUIREMENTS FND-08; `compose.yml`; `docs/ARCHITECTURE.md:169`; `06-CONTEXT.md` D-26 (`OLLAMA_KEEP_ALIVE: "30m"`) | |
| 8 | shadcn with the Expediente design system (tokens not regenerated) | `01-CONTEXT.md` D-15 (line 40); `docs/DESIGN.md:3` («Inicializar shadcn con base color `neutral` y **no** regenerar los tokens») | |
| 9 | Own data hooks (`fetch` + `AbortController`), no React Query | PROJECT.md line 73; REQUIREMENTS §Out of Scope line 111; `docs/ARCHITECTURE.md:149`; STATE.md Phase 2 («hooks de lista, detalle y formulario con abort y respuestas obsoletas ignoradas» is in PROJECT.md line 73) | Basis for Q&A «por qué no React Query» |
| 10 | AI draft never persists; only fills empty fields | PROJECT.md line 71; `03-CONTEXT.md` D-04 (line 24), D-11 amended (line 33), D-13, D-17 (line 40: marks are session state; reversibility «costly») | |
| 11 | Literal system prompt, fingerprint approved by the user | PROJECT.md line 76; `03-CONTEXT.md` D-25 (line 59, three amendments); `docs/AI-EXTRACTION.md` §Prompt de sistema | **Accuracy:** `extract.routes.test.ts:123` is «hands the model the system prompt of docs/AI-EXTRACTION.md byte for byte»; **no test or code contains the sha256**. The fingerprint is a plan-time check (command in `.planning/quick/261101-qh3-…/261101-qh3-PLAN.md:160`). Reproduced now: sha256 of `EXTRACTION_SYSTEM_PROMPT` = `deeed8088ec0f8480e34124b85a98e1e02db6169e3411c1b30ab92bab23ad526` (matches D-25 and PROJECT.md) |
| 12 | File type by magic bytes + extension, no library | PROJECT.md line 81; `05-CONTEXT.md` D-02 (line 20: `%PDF-`, ZIP `PK\x03\x04` + `word/document.xml`, 415 `UNSUPPORTED_FILE_TYPE`, `mimeType` from the detected signature) | |

### 9. D-14 — «qué funcionó y qué no»: concrete sources

| Example | Source (path:line / command) | What it shows |
|---|---|---|
| Gap-closure plans, Phase 3 (3) | `grep -l "gap_closure: true" .planning/phases/*/*-PLAN.md` → `03-10`, `03-11`, `03-12`; objectives at `03-10-PLAN.md:81-84` (language group guard + `idioma` alias), `03-11-PLAN.md:57-60` (placeholders per tag group), `03-12-PLAN.md:87-90` (fold the panel after a successful analysis) | UAT found real-offer issues the unit tests did not |
| Gap-closure plans, Phase 5 (2) | `05-10-PLAN.md:66`, `05-11-PLAN.md:66` | The same visual gap (native file button in the upload dialog) took **two** plans: the first fix did not close it |
| UAT G-03-2 | `git show 0ab0e24:.planning/phases/03-autocompletado-con-ia/03-UAT.md` lines 22-47 («C and Python are being labeled as languages rather than tech stack»; tested with a real NVIDIA offer); PROJECT.md line 77; `03-10-SUMMARY.md` (synthetic offer rerun, Python/C → stack) | The current `03-UAT.md` keeps only the latest round, older text lives in git history |
| Prompt fingerprint rule | `03-CONTEXT.md:59` (D-25); sha256 reproduced above | Process control for model/prompt changes (a check at plan time, not a test) |
| Model too slow on CPU | `03-09-SUMMARY.md:71,84-100` (Run 1: three 90 s timeouts; Run 2: remote-senior 90.0 s timeout, 48.9 s, 16.7 s; `onsite-junior` 8/10; D-25 decision: keep gemma4:e2b, add two rule lines) | Honest «what didn't work»; later phases got 13–54 s (§D-06 timings) |
| TDD RED+GREEN in one commit | `02-04-SUMMARY.md:72-74` (§«TDD Gate Compliance»); `grep -l "TDD Gate Compliance" .planning/phases/*/*-SUMMARY.md \| wc -l` → **35**; STATE.md Phase 2 line | The pre-commit/pre-push hooks run typecheck/tests, so a RED-only commit would be rejected |
| UI reviews kept as improvement lists | STATE.md lines 71, 79, 101: Phase 1 16/24 (`01-UI-REVIEW.md`), Phase 5 19/24 (`05-UI-REVIEW.md`), Phase 6 19/24 (`06-UI-REVIEW.md`); Phase 3 20/24 with top 3 fixes applied in quick 261101-qh3 | Reviews as backlog, not as blockers |
| Phase 6 browser pass: 28–36 px chips | `06-UAT.md:172-180` (findings 1-6: status buttons 36 px, stack chips 28 px, «Quitar» 24×24, Sheet close 16×16, link 24 px; re-run 66 cells, 0 under 44 px); PROJECT.md line 85 | Automated browser found what unit tests and axe could not |
| Delegation note | `06-UAT.md:172` and `06-17-SUMMARY.md:217`: the browser pass was run by an automated Playwright, delegated by the user; the timed demo by the user's stopwatch | Be honest about who measured what |
| GSD worktree merges | 71 merge commits `chore: merge executor worktree` (§3); STATE.md line 94 (`.DS_Store` blocked worktree merges; GSD install path hard-coded to `/workspaces/TFM`) | Tooling friction inflates `chore` and noise |
| Missing metrics | 7 of 62 SUMMARY lack `duration`; STATE.md metrics show `-` | The tool did not aggregate time; figures were rebuilt from frontmatter |
| Schedule | ROADMAP targets 29 Oct / 31 Oct / 2 Nov / 3 Nov / 5 Nov / 7 Nov / 8 Nov vs completed 10-29, 10-31, 11-01, 11-03, 11-06, 11-07 (ROADMAP lines 15-21) | P1–P4 on or ahead; P5 one day late; P6 on target |
| Open advisory findings | `04-REVIEW-DISPOSITION.md`, `05-REVIEW-DISPOSITION.md`, `06-REVIEW-DISPOSITION.md` (WR/IN lists), STATE.md blockers | Known limits to cite in «qué cambiarías» |

Planning artifacts per phase that evidence the GSD loop (D-05 diagram): `*-CONTEXT.md` (discuss), `*-RESEARCH.md`/`*-PATTERNS.md`/`*-PLAN.md` (plan), `*-SUMMARY.md` (execute), `*-VERIFICATION.md`/`*-UAT.md`/`*-VALIDATION.md` (verify), `*-REVIEW.md`/`*-SECURITY.md`/`*-UI-REVIEW.md` (review/security), PRs (ship). 4 quick tasks under `.planning/quick/`.

## Common Pitfalls

### Pitfall 1: The demo never triggers the automatic rule
**What goes wrong:** the new application is saved as «Guardada» (default); adding a round changes nothing; the planned «la regla la aplica el servicio» moment fails live.
**Why:** rule `from: "enviada"` only (`applications.service.ts:44-47`).
**Avoid:** script step «Estado inicial → Enviada» before saving (or «Cambiar estado → Enviada» in the detail). Add a verification note: after the round, the badge reads «En entrevistas» with two history entries below «Actual».

### Pitfall 2: Wrong status name in the script
**What goes wrong:** the script says «oferta»; the select/chip says «Oferta recibida».
**Avoid:** always «Oferta recibida» (`oferta_recibida`).

### Pitfall 3: Mock draft contradicts the pasted offer
**What goes wrong:** plan B shows «Lumen Analytics» / «Madrid» for a Nimbo Software offer; the audience may think the AI is wrong.
**Avoid:** the prepared plan B line (README wording) and, in the checklist, a «what you will see» row for each provider.

### Pitfall 4: Stale or incorrect figures
**What goes wrong:** 56 vs 55 durations; counting after `c11ab61` (HEAD already has 546 commits and will gain Phase 7 commits); using `gh` commit counts capped at 100.
**Avoid:** every command anchored on `c11ab61`; the doc states the anchor; the checker recomputes.

### Pitfall 5: `gh pr list` GraphQL limit
**What goes wrong:** `gh pr list --json ...,additions,deletions,changedFiles,commits` → `GraphQL: This query requests up to 505,050 possible nodes which exceeds the maximum limit of 500,000.`
**Avoid:** request only `number,title,state,createdAt,mergedAt,headRefName,baseRefName`. `gh pr view N --json commits` is capped at 100 (PR #3 and #6 show 100), so do not use it for counts.

### Pitfall 6: Claiming the sha256 is enforced by a test
**Avoid:** say «una comprobación al planificar y un test que compara el prompt del código con `docs/AI-EXTRACTION.md` byte a byte».

### Pitfall 7: ESLint breaks on a root-level `.mjs` script
**Avoid:** `/* global console, process */` header (verified) or place under `apps/web/scripts/` (already covered by the Node globals).

### Pitfall 8: Bind mounts and `docker exec` output in this sandbox
**Avoid:** `docker cp` in/out, `docker exec -d` with a log file, then `docker rm -f` (see §5).

### Pitfall 9: Seed dates and `--reset`
**Avoid:** seed dates are relative to the seed run; reseed the morning of 9 Nov; `--reset` wipes all applications/documents (README warns); do not run it on a stack with data the user cares about without asking.

### Pitfall 10: Mentioning excluded providers or model names
**Avoid:** `grep -n -i -E 'gemini|groq'` over the new docs must return nothing; `gpt-` names only in the cost table (D-16).

### Pitfall 11: Wrong branch
**Avoid:** the working copy is on `phase/06-pulido-demo` while ROADMAP names `phase/07-documentacion-defensa`; branches are created by hand (`.planning/config.json` `git.branching_strategy: "none"`). The planner/executor must create the Phase 7 branch before committing; this research did not touch branches.

## Code Examples

### Reproduce the commit and PR figures (ready to embed as «Cómo se calculó»)
```bash
CUT=c11ab61
git rev-list --count $CUT                                   # 544
git rev-list --merges --count $CUT                          # 71
git log --format=%s $CUT | sed -E 's/^([a-z]+)(\([^)]*\))?!?:.*/\1/;t;s/.*/other/' | sort | uniq -c | sort -rn
git log --format=%ad --date=short $CUT | sort -u | wc -l   # 11 days with commits
prev=a618764
for tip in ec4d6f1 f4ab8a5 6d339fa 89ba9ac 3575f90 c11ab61; do
  echo "$tip $(git rev-list --count $prev..$tip)"; prev=$tip
done                                                         # 80 73 139 45 86 120
gh pr list --state all --limit 50 --json number,title,state,createdAt,mergedAt,headRefName,baseRefName
git grep -h -E '^duration:' $CUT -- '.planning/phases/*/*-SUMMARY.md' | wc -l   # 55
```

### Sum durations (dependency-free, anchored)
```js
/* global console, process */
import { execFileSync } from "node:child_process";
const ref = process.argv[2] ?? "c11ab61";
const files = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, ".planning/phases"], { encoding: "utf8" })
  .split("\n").filter((f) => /\/\d\d-\d\d-SUMMARY\.md$/.test(f));
let total = 0, withDuration = 0; const missing = [];
for (const f of files) {
  const fm = execFileSync("git", ["show", `${ref}:${f}`], { encoding: "utf8" }).split("\n---")[0];
  const m = fm.match(/^duration:\s*~?(\d+(?:\.\d+)?)\s*min/m);
  if (!m) { missing.push(f); continue; }
  total += Number(m[1]); withDuration++;
}
console.log({ summaries: files.length, withDuration, missing: missing.length, totalMin: total });
```
(Verified output of exactly this script on `c11ab61`: `{ summaries: 62, withDuration: 55, missing: 7, totalMin: 1512 }`.)

### Token measurement (scratch, outside the repo)
```ts
// measure-tokens.mts — run from apps/api: npx tsx --conditions=@tfm/source /path/measure-tokens.mts
import { z } from "/workspaces/lemoncode-tfm-expediente/node_modules/zod/index.js";
import { EXTRACTION_SYSTEM_PROMPT, modelOfferExtractionSchema } from ".../apps/api/src/offers/extract.service.ts";
import { OFFER_FIXTURES, readFixtureText } from ".../apps/api/src/offers/__fixtures__/fixtures.ts";
for (const f of OFFER_FIXTURES) {
  const res = await fetch(`${process.env.LLM_BASE_URL}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.LLM_MODEL, stream: false, think: false,
      options: { temperature: 0, num_ctx: 8192 }, format: z.toJSONSchema(modelOfferExtractionSchema),
      messages: [{ role: "system", content: EXTRACTION_SYSTEM_PROMPT }, { role: "user", content: readFixtureText(f.name) }] }) });
  const j = await res.json();
  console.log(f.name, j.prompt_eval_count, j.eval_count);
}
```
(Import `zod` by absolute path: the scratch directory has no `node_modules`.)

## State of the Art

| Old approach | Current approach | When | Impact |
|---|---|---|---|
| MinIO community edition as local S3 | `pgsty/minio` fork (Silo) | MinIO «maintenance mode» 2025-12-03; archived 2026-02-12 `[CITED]` | Basis of ADR 5 |
| `platform.openai.com/docs/pricing` | `developers.openai.com/api/docs/pricing` (301) | seen 2026-11-07 | Cite the new URL |
| OpenAI small models of the 4.x family | `gpt-5.4-nano`/`-mini`, `gpt-5-nano`/`-mini` rows on the pricing page | page of 2026-11-07 | Name 4–6 models in the cost table |

**Deprecated/outdated:** CONTEXT's «56 of 62» durations and «oferta» status wording.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenAI may count a strict `response_format: json_schema` as input tokens (~332 extra with `o200k_base`); the guide fetched does not say | §4 token measurement | Cloud cost cell off by ≤ ~28 % on input; mitigated by showing both bounds |
| A2 | Reasoning tokens of newer small models, if enabled, add to output tokens and cost | §4 | Cost table understated for reasoning-enabled models; add «sin razonamiento» footnote |
| A3 | The rationale «why Silo over SeaweedFS/RustFS» (same MinIO API and console, drop-in image, SDK compatibility) is the author's, not recorded in `.planning/` | §8 ADR 5 | ADR 5 «decision» text would invent a reason; ask the user or word it only with the recorded rationale |
| A4 | The 15 min may or may not include questions from the examiners | §Deck blueprint | Slide times could be too tight/loose |
| A5 | GitHub's Mermaid version supports the chosen `flowchart`/`sequenceDiagram` syntax (parse-checked with mermaid 11 only) | §7 | Diagram shows as an error block in GitHub; check in the PR preview, or use `info` block |
| A6 | OpenAI price table cells were extracted by the fetch tool, not read by hand | §4 prices | Re-open the page when writing the doc; refresh the access date |

## Open Questions (RESOLVED)

1. **Does the 15-minute budget include the examiners' questions?**
   - Known: bases require 15 min total, 5 of live demo.
   - Unclear: Q&A time. Recommendation: plan 15:00 of talk and keep `preguntas-tribunal.md` for the Q&A.
   - **RESOLVED (explicit planning assumption, author not asked during discuss):** 15:00 is the talk including the 5:00 demo and **excludes** the examiners' questions; `preguntas-tribunal.md` covers the Q&A. The deck plan (07-05) states the assumption in «Cómo usar este guion» and its end-of-phase `<human-check>` (07-05 Task 2) asks the author to confirm it. If questions turn out to be inside the 15 minutes, the author shortens slides 4-10 and re-checks with `node scripts/check-docs.mjs --deck --deck-total=m:ss` (the checker supports another total).
2. **Silo vs SeaweedFS/RustFS rationale** (A3). Recommendation: the planner adds a short `checkpoint:human-verify` asking the author to confirm/complete ADR 5's «decision» and «alternatives» lines; meanwhile write it from the recorded facts.
   - **RESOLVED:** 07-01 writes ADR-005 from the recorded rationale («fork mantenido de MinIO, compatible con el SDK de AWS») plus the cited external facts only. Before ADR-005 is cited (answer 15 of the Q&A) and before the phase gate, 07-06 Task 1 is a `checkpoint:decision` with `gate="blocking-human"` and no `auto_select`: the author keeps ADR-005 as written or dictates his own reason, which is added to ADR-005 as his. A decision checkpoint instead of `checkpoint:human-verify` because `.planning/config.json` sets `workflow.human_verify_mode: end-of-phase` (no mid-flight human-verify tasks), and what the ADR records is the author's choice, not a check of finished work.
3. **Demo fixture under mock needs no change**, but should the script offer the «Lumen Analytics» explanation inline or in plan B only? Recommendation: plan B only plus the pre-flight «what you will see» table.
   - **RESOLVED (as recommended):** the explanation lives only on the plan B side: the «Plan B (mock)» cell of step 3 of the «Guion» table (07-04 Task 1), the `## Qué verás según el proveedor` table and the `## Plan B` section (07-04 Task 2). The main «Qué dices» line of the live path does not mention it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | verify, scripts | ✓ | v22.23.4 | — |
| `git` full history (`c11ab61`, `origin/main`) | figures | ✓ | 544 commits at cut-off, 550 on `origin/main` | — |
| `gh` (authenticated as `adetorresrivera`) | PR list | ✓ | — | `git log --first-parent --merges origin/main` |
| Docker (host socket) + compose stack `expediente` (app, mongo, s3, ollama; seeded 12 apps) | screenshots, demo facts | ✓ healthy, `host.docker.internal:8080` | `tfm-app:0.1.0` | start with `docker compose up -d` |
| Playwright image `mcr.microsoft.com/playwright:v1.56.1-noble` | screenshots | ✓ local | 1.56.1 | Claude in Chrome (not probed) |
| Ollama + `gemma4:e2b` (devcontainer and compose) | token measurement, live capture | ✓ | 0.40.13 / 0.40.3 | `LLM_PROVIDER=mock` |
| npm registry (ad hoc installs in a scratch dir/container) | `js-tiktoken`, `mermaid`, `playwright` | ✓ | — | skip optional checks |
| GPU | local latency | ✗ (CPU only) | — | state it in the doc |

**Missing dependencies with no fallback:** none.

## Validation Architecture

Nyquist validation is enabled (`.planning/config.json` `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 for the existing suite; Node scripts (no framework) for doc checks |
| Config file | per workspace; none needed for the doc checks |
| Quick run command | `node scripts/check-docs.mjs` (links, anchors, images, required sections) |
| Full suite command | `npm run typecheck && npm run test` (≈ 6 s + 35 s here) — **mandatory last step of every plan** |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRES-01 | Deck has ≥ 10 slides, each with title, bullets, speaker note, time; times sum to 15:00; demo slide = 5:00; ≥ 2 Mermaid blocks (architecture, sequence) + 1 GSD loop; snippets match source | script | `node scripts/check-docs.mjs --deck` (headings `## Diapositiva N`, `**Tiempo:** m:ss`, count ` ```mermaid `, snippet markers `<!-- source: path#La-Lb -->` compared byte for byte) | ❌ Wave 0 |
| PRES-01 | Mermaid syntax valid | optional tool | parse each block with `mermaid.parse()` in the Playwright container | ❌ optional |
| PRES-02 | Demo script step table sums to 5:00; every step has a «Plan B (mock)» and «Plan C» cell; pre-flight checklist has `docker compose up`, `seed`, warm-up, zoom, light mode; states the «Estado inicial: Enviada» step and «Oferta recibida» | script (regex over the table) | `node scripts/check-docs.mjs --demo` | ❌ Wave 0 |
| PRES-03 | Figures equal `git`/`.planning` recomputation; headings for desarrollo (GSD + Claude Code), producto (LlmClient, salida estructurada, local vs cloud, coste), qué funcionó / qué no | script | `node scripts/check-figures.mjs` compares the «Cifras» block with: `git rev-list --count c11ab61`, type counts, per-phase counts, days with commits, calendar days, summaries with `duration` and their sum, plans per phase, `gh pr list` (skipped with a warning when `gh` is unavailable) | ❌ Wave 0 |
| PRES-03 | Cost table uses measured tokens × price; cites URL and date | grep | `grep -E 'developers.openai.com/api/docs/pricing' docs/ia-en-el-proyecto.md` and a date `2026-11-` | ❌ Wave 0 |
| PRES-04 | 12 ADRs, each with Contexto / Decisión / Alternativas / Consecuencias | script | count `^## ADR-` = 12 and the four sub-headings per ADR | ❌ Wave 0 |
| PRES-05 | 15 questions with answers of 2–4 sentences; contains the 6 seed questions | script | count `^### ` = 15; sentence count per answer in 2..4 | ❌ Wave 0 |
| All | Internal links and anchors resolve; images exist | script | `node scripts/check-docs.mjs` (baseline 6 files, 9 links, 0 broken) | ❌ Wave 0 (prototype above) |
| All | Voice and prohibitions: no emoji, no `!` in Spanish prose, no `Gemini`/`Groq`, `gpt-` only inside the cost table | grep | `grep -rn -i -E 'gemini\|groq' docs/presentacion docs/ia-en-el-proyecto.md docs/decisiones.md` must be empty; emoji regex `\p{Extended_Pictographic}` via `node -e` | ❌ Wave 0 |
| Screenshots | ≥ 5 PNG referenced from the docs exist, non-empty; viewports as recorded (1280 light/dark, 360) | script | PNG header width read (bytes 16–23) equals 1280 or 360 | ❌ Wave 0 |
| README | «Próximos pasos» exists with the five backlog items; «Documentación» links to the new docs | script | heading + links in `check-docs.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/check-docs.mjs` (seconds) + `npm run typecheck`.
- **Per wave merge:** `npm run typecheck && npm run test` + `node scripts/check-figures.mjs`.
- **Phase gate:** full suite green, all doc checks green, one visual check of Mermaid in the PR preview, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `scripts/check-docs.mjs` (header `/* global console, process */`, then `npx prettier --write`): links/anchors/images/sections.
- [ ] `scripts/check-figures.mjs` (or one script with flags): figure recomputation, snippet byte-compare.
- [ ] `docs/presentacion/capturas/capture.mjs` (not linted): screenshot recipe.
- No new test framework; no new dependency.

## Security Domain

`security_enforcement` is enabled (ASVS level 1, block on high). The phase changes no runtime code, so most categories do not apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication / V3 Session / V4 Access control | no | no product code; mention that login is out of scope in the docs |
| V5 Input Validation | no | unchanged |
| V6 Cryptography | no | unchanged |
| V8 Data protection (docs hygiene) | yes | No real keys or personal data in docs or screenshots; seed data is invented; never paste the user's real offers; keep `LLM_API_KEY` only in `.env` |
| V14 Configuration | yes | Docs must not suggest committing `.env`; `minioadmin` credentials are documented as dev-only (README) |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets or personal data in screenshots/docs | Information disclosure | Capture only the seeded stack; review PNGs before commit; grep docs for `sk-`, `LLM_API_KEY=` with a value |
| Running the Playwright container against a non-local URL | Spoofing/tampering | Network `expediente_default` only; `BASE` is the local app |
| Slopsquatted tool packages | Supply chain | Pin versions (`playwright@1.56.1`, `mermaid@11`), container/scratch only, `package-legitimacy` run (flagged `too-new` only), human-verify checkpoint, never in `package.json` |
| `--reset` on the user's data | Tampering (data loss) | State the warning in the pre-flight checklist; never run it as part of automated checks |
| Logging the offer text | Information disclosure | The extract service logs length and duration only (`extract.service.ts` «The only log line carries the text length and the duration»); the docs must say so, not contradict it |

## Project Constraints (from CLAUDE.md)

- Docs and UI-facing text in **Spanish, DS voice** (tuteo, short sentences, no exclamations, no emojis); code, identifiers, commits and file names in English, except the user-named Spanish docs (`ia-en-el-proyecto.md`, `decisiones.md`, `preguntas-tribunal.md`, `docs/presentacion/`, `capturas/`).
- If a task contradicts `docs/PRODUCT.md`, `DOMAIN.md`, `ARCHITECTURE.md`, `DESIGN.md` or `AI-EXTRACTION.md`: stop and ask. Do not improvise.
- Stack changes need an ADR in `docs/decisiones.md` (this phase creates the file).
- No `any`; **no new dependencies without justification in the plan SUMMARY**; secrets only in `.env`, `.env.example` up to date.
- Every plan ends with `<verify>` running at least `npm run typecheck && npm run test`.
- Git: one branch per phase (`phase/NN-nombre`), atomic Conventional Commits, one PR per phase via `/gsd-ship`, never push to `main`. Never log the full offer text.
- `.claude/CLAUDE.md` adds: follow GSD workflow for any repo edit; responsive from 360 px, keyboard-only, AA contrast (relevant to slide 7 claims).
- No project skills found (`.claude/skills`, `.agents/skills` absent).

## Sources

### Primary (HIGH confidence)
- Repository files read this session (paths and line ranges cited inline): `packages/contracts/src/enums.ts`, `application.schema.ts`; `apps/api/src/applications/applications.service.ts`, `applications.repository.ts`, `applications.query.ts`; `apps/api/src/llm/{llm.client,mock.provider,ollama.provider,openai.provider,structured-call}.ts`; `apps/api/src/offers/{extract.service,extract.routes.test}.ts` and fixtures; `apps/api/src/scripts/{seed/seed.plan.ts,try-extract.ts}`; `apps/web/src/pods/application-{list,detail,edit}/…`, `common/lib/{enum-labels,format}.ts`, `core/theme/theme.ts`; `compose.yml`, `README.md`, `docs/*.md`, `.planning/**`.
- Commands run: `git rev-list/log/ls-tree/grep`, `gh pr list`, `npm run test`, `npm run typecheck`, `npm run try-extract -w @tfm/api` (ollama and mock), Ollama `/api/chat` token replay, Playwright 1.56.1 captures, ESLint/Prettier stdin checks, `gsd-tools query package-legitimacy check`.

### Secondary (MEDIUM confidence)
- `https://developers.openai.com/api/docs/pricing` — accessed 2026-11-07 (rows quoted in §4).
- `https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams` — accessed 2026-11-07.
- `https://vonng.com/en/db/minio-resurrect/` — accessed 2026-11-07 (MinIO maintenance mode 2025-12-03, archived 2026-02-12; `pgsty/minio` AGPL fork; docs at silo.pigsty.io).
- `https://www.infoq.com/news/2025/12/minio-s3-api-alternatives/` — accessed 2026-11-07 (RustFS, SeaweedFS, Garage as alternatives; maintenance-mode quote).

### Tertiary (LOW confidence)
- `https://developers.openai.com/api/docs/guides/structured-outputs` — fetched; silent on schema token billing (basis of A1).

## Metadata

**Confidence breakdown:**
- Standard stack / tooling: HIGH — every tool ran in this environment.
- Repo facts and figures: HIGH — re-run against `c11ab61`.
- Architecture (deliverable structure, deck timing): MEDIUM — recommendation within the user's discretion.
- Cloud cost: MEDIUM — measured tokens, cited prices, estimated tokenizer mapping (A1, A2).
- ADR 5 rationale: LOW/MEDIUM — not recorded in the repo (A3).

**Research date:** 2026-11-07
**Valid until:** 2026-11-09 (defense date); figures stay valid as long as the cut-off SHA is `c11ab61`; OpenAI prices should be re-fetched when the doc is written.
