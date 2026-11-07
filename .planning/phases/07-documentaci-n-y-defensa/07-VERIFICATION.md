---
phase: 07-documentaci-n-y-defensa
verified: 2026-11-07T17:00:00Z
status: human_needed
score: 7/7 must-haves verified
covered_files:
  - ".planning/phases/07-documentaci-n-y-defensa/07-01-PLAN.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-01-SUMMARY.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-02-PLAN.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-02-SUMMARY.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-03-PLAN.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-03-SUMMARY.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-04-PLAN.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-04-SUMMARY.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-05-PLAN.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-05-SUMMARY.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-06-PLAN.md"
  - ".planning/phases/07-documentaci-n-y-defensa/07-06-SUMMARY.md"
  - "README.md"
  - "docs/decisiones.md"
  - "docs/ia-en-el-proyecto.md"
  - "docs/presentacion/capturas/capture.mjs"
  - "docs/presentacion/deck.md"
  - "docs/presentacion/demo-script.md"
  - "docs/presentacion/mermaid-check.mjs"
  - "docs/presentacion/preguntas-tribunal.md"
  - "scripts/browser-tools.sh"
  - "scripts/check-docs.mjs"
  - "scripts/check-figures.mjs"
covered_digest: "v4:sha256:f6844b9c2df01e9f5252e5f797962d4db658188e04ae350793b49a1770cfd6c1"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Timed rehearsal of docs/presentacion/demo-script.md over a fresh `docker compose exec app npm run seed -- --reset`, with a stopwatch, once with Ollama and once with LLM_PROVIDER=mock"
    expected: "The 10 steps fit in 5:00 including talking; the second warm-up extraction is under 20 s (otherwise start in mock, as the checklist says)"
    why_human: "Human timing on the presenter's own machine; the 5:00 is a sum of budgets, not a measurement"
  - test: "Record the plan C video following the script (night before the defense) and keep it on the laptop and a USB"
    expected: "A per-step video exists outside the repository (it is not committed by design, D-10)"
    why_human: "Recorded by the author; the demo-script plan C column points to «Vídeo, paso N» for steps 2, 8, 9, 10"
  - test: "Open deck.md and ia-en-el-proyecto.md in the PR file view after /gsd-ship 7"
    expected: "The 3 Mermaid diagrams of the deck and the diagram(s) of the AI doc render on GitHub"
    why_human: "GitHub's renderer is not checkable locally; only a parse check ran (MERMAID OK, 3 diagramas)"
  - test: "Confirm that the 15:00 of the deck excludes the examiners' questions"
    expected: "Author confirms; otherwise shorten slides 4-10 and re-run `node scripts/check-docs.mjs --deck --deck-total=m:ss`"
    why_human: "The bases do not say; resolved as a planning assumption (RESEARCH Open Question 1)"
  - test: "Look once at the five PNGs in docs/presentacion/capturas/ and read «Qué funcionó y qué no» in docs/ia-en-el-proyecto.md as the author"
    expected: "No personal data or wrong UI in the images; the lessons read as the author's own account"
    why_human: "Visual judgement and authorship are the author's. The verifier looked at lista-claro-1280.png and formulario-ia-claro-1280.png: correct, no personal data"
  - test: "Decide on review WR-01 (demo script says «unos segundos» for Ollama; see Gaps Summary)"
    expected: "Either reword demo-script.md line 44 to match ADR-006 or accept the wording knowingly"
    why_human: "Wording choice with an examiner-visible inconsistency; not a goal failure"
---

# Phase 7: Documentación y defensa Verification Report

**Phase Goal:** As the presenter, I want the deck, demo script and supporting documents ready, so that I can defend the project on 9 Nov 2026 with a fallback path if something fails.
**Verified:** 2026-11-07
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PRES-01: a defense deck exists and covers problem, product, architecture, AI usage and demo | ✓ VERIFIED | `docs/presentacion/deck.md` (215 lines), 11 slides: 1 problem, 2 MVP and iterations, 3 demo, 4 architecture (Mermaid + `LlmClient` snippet), 5 pods and contracts, 6 form and IA marks (screenshot), 7 a11y/responsive, 8 AI in the product (sequence diagram), 9 GSD and Claude Code, 10 challenges and lessons, 11 next steps. Each slide has bullets, speaker note and `Tiempo`. Times sum to 15:00 (1:00+1:15+5:00+1:00+1:00+1:15+1:00+1:00+1:00+1:00+0:30). `check-docs.mjs --all` run by me: `DOCS OK`, 11 files, 116 internal links, 0 problems. The `<!-- source -->` snippets are compared byte for byte by `--deck` (re-run in the 07-06 gate G13). |
| 2 | SC2 / PRES-02: demo script with timings, including a fallback (`LLM_PROVIDER=mock`) for each step that can fail | ✓ VERIFIED | `docs/presentacion/demo-script.md`: table of 10 steps with `Tiempo` (30+20+50+40+20+35+35+20+30+20 = 300 s = 5:00), and a «Plan B (mock)» and a «Plan C» cell on every row (no empty cell). Plan B section defines mock start (`LLM_PROVIDER=mock docker compose up --build -d`), the prepared line, how to return to Ollama. Pre-flight checklist decides the provider before going live (D-07) with the 20 s threshold. UI labels cited (Pegar oferta, Autocompletar con IA, Añadir ronda, Cambiar estado, Limpiar filtros, Historial de estados, Estado inicial, …) all exist in `apps/web/src`. Seed names used in steps 1 and 9 (Tinta y Byte, Olivar Cloud, Cobalto Sistemas, Mercado Atlas, Harbor Pine) exist in `seed.plan.ts`; mock draft «Lumen Analytics» exists in `mock.provider.ts`. Fixtures `remote-senior.txt` and `onsite-junior.txt` exist in `docs/demo/ofertas/`. Caveat on the Ollama wording: see WR-01 in Gaps Summary. |
| 3 | SC3 / PRES-03: `docs/ia-en-el-proyecto.md` explains AI use in development (GSD + Claude Code) and inside the product | ✓ VERIFIED | 205 lines. Sections: «Cómo se usó la IA en el desarrollo» (GSD cycle, author's role), «Cifras» (73 values at cut `c11ab61`), «Cómo se calculó», «Qué funcionó y qué no», «La IA dentro del producto», «Coste: local frente a la nube». I ran `node scripts/check-figures.mjs` (`FIGURES OK (72 cifras)`) and `--tests` (`FIGURES OK (73 cifras)`): the figures are recomputed from git and `.planning/`, not copied from the SUMMARY. |
| 4 | SC4 / PRES-04: `docs/decisiones.md` records the ADRs for the stack and architecture decisions | ✓ VERIFIED | 283 lines, ADR-001..ADR-012 present in order, each with `### Contexto`, `### Decisión`, `### Alternativas`, `### Consecuencias` and a `Fuentes:` line (grep of headings). `check-docs.mjs --adr` prints `DOCS OK`. Stack facts agree with code: `compose.yml` pins `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`, `ollama/ollama:0.40.3`, `mongo:8.0.32`. ADR-005 carries only the recorded rationale, as the author answered «as-written» at the 07-06 Task 1 checkpoint (recorded in 07-06-SUMMARY). |
| 5 | SC5 / PRES-05: likely examiner questions are documented with prepared answers | ✓ VERIFIED | `docs/presentacion/preguntas-tribunal.md`: 15 questions `### 1.`..`### 15.`, each answer 2-4 sentences ending with a link to an ADR or AI-doc section (links resolve under `--all`). Covers backend choice, hallucination, React Query, multiuser, AI cost, what-I'd-change, local vs cloud, contract sync, pods, a11y, testing a non-deterministic model, who wrote the code, prompt change, upload validation, Silo vs MinIO. Figures (1192/183 tokens, 1,33-17,18 USD, 290 of 544, 55 de 62) come from named source blocks and pass `check-figures.mjs --prose`. |
| 6 | The deck's 15:00 and the demo's 5:00 are internally consistent (deck slide 3 = 5:00 = demo script total) and the demo links to the deck | ✓ VERIFIED | Arithmetic above; slide 3 note links `demo-script.md`; five captures referenced by both documents exist and link-check passes. PNG headers: lista claro/oscuro 1280x800, móvil 360x740, detalle 1280x1863, formulario 1280x2486. |
| 7 | Docs-only phase: no product, manifest or compose change, no video committed, README gains links and «Próximos pasos» | ✓ VERIFIED | `git diff --name-only c11ab61 HEAD -- apps packages compose.yml Dockerfile .env.example package.json package-lock.json` is empty; `git ls-files` for mp4/webm/mov/mkv is empty; README has «Próximos pasos» and the five defense documents; `--readme` part of `--all` passes. |

**Score:** 7/7 truths verified (0 present, behavior-unverified: the phase is documentation; the timing of the demo is routed to human verification below, not counted as a behavior truth)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/presentacion/deck.md` | 11-slide deck, 15:00, 3 Mermaid, 2 snippets | ✓ VERIFIED | Substantive, linked from README and the Q&A/demo; no placeholder or TBD/FIXME markers |
| `docs/presentacion/demo-script.md` | 5:00 timed script, plan B and C | ✓ VERIFIED | See truth 2 |
| `docs/presentacion/preguntas-tribunal.md` | 15 Q&A | ✓ VERIFIED | See truth 5 |
| `docs/ia-en-el-proyecto.md` | AI-use document | ✓ VERIFIED | See truth 3 |
| `docs/decisiones.md` | 12 ADRs | ✓ VERIFIED | See truth 4 |
| `docs/presentacion/capturas/*.png` (5) | Plan C captures | ✓ VERIFIED | All five exist, valid widths; I viewed two of them and they match the UI strings the script cites |
| `scripts/check-docs.mjs`, `scripts/check-figures.mjs`, `scripts/browser-tools.sh`, `mermaid-check.mjs`, `capture.mjs` | Dev-only checkers | ✓ VERIFIED | `--self-test` prints `SELF-TEST OK (28 casos)`; `check-docs --all` and `check-figures` exit 0 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| deck.md | demo-script.md, ia-en-el-proyecto.md | relative links | WIRED | Resolved by `check-docs --all` (0 broken, 0 bad anchors) |
| demo-script.md | capturas/*.png | Plan C column and list | WIRED | All five files exist |
| preguntas-tribunal.md | decisiones.md anchors, AI-doc anchors | relative links | WIRED | Anchors use GitHub slugs, checked |
| README.md | five defense documents | «Documentación» | WIRED | `--readme` passes |
| docs figures | git history | `check-figures.mjs` | WIRED | Recomputed from `c11ab61` |

### Data-Flow Trace (Level 4)

Not applicable: no component renders dynamic data in this phase. The equivalent check is that figures in prose trace to the recomputed «Cifras» block: confirmed by `check-figures.mjs --prose` on the deck and the Q&A (they pass; WR-03 below notes the rule is weaker than described).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Links, anchors, voice, per-document contracts | `node scripts/check-docs.mjs --all` | `DOCS OK`, 116 links, 0 problems | ✓ PASS |
| Checker rejects bad input | `node scripts/check-docs.mjs --self-test` | `SELF-TEST OK (28 casos)` | ✓ PASS |
| ADR contract | `node scripts/check-docs.mjs --adr` | `DOCS OK` | ✓ PASS |
| Figures recompute | `node scripts/check-figures.mjs` and `--tests` | `FIGURES OK (72 / 73 cifras)` | ✓ PASS |
| No product change | `git diff --name-only c11ab61 HEAD -- apps packages compose.yml ...` | empty | ✓ PASS |
| No video tracked | `git ls-files -- '*.mp4' ...` | empty | ✓ PASS |

Not re-run by me (per instructions): `npm run typecheck/test/lint`, the Mermaid parse, the browser container. The 07-06 gate G09/G13/G16 record exit 0 for them; I treat those as the executor's claim, supported by the zero product diff.

### Probe Execution

Step 7c: no `probe-*.sh` declared by the phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PRES-01 | 07-03, 07-05, 07-06 | Defense deck covers problem, product, architecture, AI usage, demo | ✓ SATISFIED | Truth 1 |
| PRES-02 | 07-03, 07-04, 07-06 | Demo script with timings and a fallback path | ✓ SATISFIED | Truth 2 (WR-01 wording caveat) |
| PRES-03 | 07-02, 07-06 | `docs/ia-en-el-proyecto.md` | ✓ SATISFIED | Truth 3 |
| PRES-04 | 07-01, 07-06 | ADRs in `docs/decisiones.md` | ✓ SATISFIED | Truth 4 |
| PRES-05 | 07-06 | Examiner Q&A | ✓ SATISFIED | Truth 5 |

All five IDs in ROADMAP/REQUIREMENTS appear in at least one PLAN `requirements:` field and in the SUMMARY `requirements-completed` lists. No orphaned requirement: REQUIREMENTS.md maps exactly PRES-01..05 to Phase 7. Note: the REQUIREMENTS.md checkboxes and traceability table still say `Pending`; they should be flipped by the orchestrator at phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | `TBD`/`FIXME`/`XXX` grep over the six documents and three scripts | none | No debt markers |
| `docs/presentacion/demo-script.md` | 44 | «Tarda unos segundos en CPU» | Warning | Contradicts ADR-006 (see WR-01) |

### Assessment of review WR-01 (the fallback-path concern)

The review says the 20 s plan B gate would send the author to mock every time because Phase 6 UAT measured 48 s. I checked the sources and that reading is partly wrong:

- The 48 s in `06-UAT.md` (test 6) is the stopwatch time of the **whole flow** (paste, autofill, review, save, round, CV, status, filter), not the extraction. The same flow with mock took 13 s, so the non-extraction part is roughly 13 s and Ollama extraction after warm-up is about 35 s at the most in that run.
- `07-RESEARCH.md:231` measured extraction alone on the local Ollama: first call after idle 53.9 s, then 13.1 s and 17.8 s; 07-04-PLAN.md:99 states «13-18 s warm, up to 54 s cold». The 20 s threshold is calibrated to the warm figure and is reasonable: a cold or loaded model fails the gate and the author starts in mock, which is exactly the pre-flight intent (D-07).
- The step 3 budget of 0:50 holds for a warm 13-18 s extraction.

What remains true: «Tarda unos segundos en CPU» understates a 13-18 s warm extraction and contradicts ADR-006 («de decenas de segundos a más de un minuto»), and an examiner reading both can notice. It was written that way on purpose (07-04-PLAN.md:173 forbids seconds figures in that table because the `check-figures` rules do not cover them). Classification: WARNING on wording, not a failure of the fallback path. The fallback path exists, is decided before going live, has a prepared line, a return path and a per-step plan C. Suggested one-line fix: in `demo-script.md:44` write «Tarda decenas de segundos en CPU» (matches ADR-006 and passes the no-seconds rule). Secondary, advisory: the script says what to do when a live extraction fails («el modelo no responde a tiempo») but not how long to wait before declaring it failed; the API timeout is 90 s (`LLM_TIMEOUT_MS`), so a hung request can burn most of the 0:50 budget. A rule like «si a los 30 s no hay borrador, di la frase y pasa a la captura» would close it.

### Other review findings (all open, none blocks the goal)

- WR-02 to WR-05 and IN-01 to IN-08 concern the dev-only checkers and small overstatements. I confirmed WR-05 by running the scripts: the default `check-figures.mjs` prints `SKIP tests` and then `FIGURES OK (72 cifras)` with exit 0, while `ia-en-el-proyecto.md:31` says every line is recomputed with that command. None of them makes a defense document wrong today; the figures pass with `--tests`. IN-05 (chips «28 y 36 px» mix two controls; `98e5c63` alone did not reach 44 px) is examiner-visible in slide 7 and Q&A 10 and is worth a one-line fix.

### Human Verification Required

1. **Timed rehearsal.** Test: run the script with a stopwatch over a fresh seed, with Ollama warm and with mock. Expected: fits 5:00; second warm-up under 20 s or start in mock. Why human: the 5:00 is a sum of budgets.
2. **Plan C video.** Test: record it following «Grabar el vídeo», keep it on the laptop and a USB. Expected: exists outside the repo. Why human: recorded by the author, deliberately not committed.
3. **GitHub Mermaid render.** Test: open `deck.md` and `ia-en-el-proyecto.md` in the PR file view. Expected: diagrams render. Why human: GitHub's renderer.
4. **15:00 excludes examiner questions.** Test: author confirms. Expected: yes, or shorten slides 4-10 and re-run `--deck --deck-total=m:ss`. Why human: the bases do not say.
5. **Captures and authorship.** Test: look at the five PNGs; read «Qué funcionó y qué no» as the author. Expected: nothing personal or wrong; lessons read as his own. Why human: judgement and authorship.
6. **WR-01 wording.** Test: decide on «unos segundos» in `demo-script.md:44`. Expected: reworded to match ADR-006 or accepted knowingly. Why human: author's call on examiner-visible wording.

### Gaps Summary

No must-have failed. All five roadmap success criteria and the two supporting truths are met by artifacts that exist, are substantive, are linked and are recomputed by scripts I re-ran. The phase is documentation-only, and the product diff since `c11ab61` is empty. Status is `human_needed` solely because six items require the author (rehearsal timing, plan C video, GitHub render, the 15:00 assumption, visual/authorship read, WR-01 wording). There is one non-blocking warning: WR-01 (demo script says «unos segundos» for Ollama, contradicting ADR-006). The reviewer's claim that the 20 s gate will always trigger mock is not supported, because the 48 s figure is the whole demo flow and warm extraction was measured at 13-18 s.

---

_Verified: 2026-11-07_
_Verifier: Claude (gsd-verifier)_
