---
phase: "07"
slug: "documentaci-n-y-defensa"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-07"
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| docs → public repository | Everything written in this phase is pushed to GitHub and read by the examiners | Documentation, screenshots (public) |
| checker → developer trust | A check that passes on bad input would certify a wrong document | Check verdicts |
| scratch script → local Ollama | The token measurement sends the three committed fixtures to the devcontainer's Ollama only | Anonymized fixtures (public) |
| web price page → doc | Prices come from an external page and end up in a public document | Public prices |
| npm registry → throwaway container | `playwright@1.56.1` and `mermaid@11.17.2` are downloaded and run inside the container | Third-party code |
| container → compose network | The browser container reaches the app and nothing else | Seeded application data |
| script → presenter's machine | The checklist tells the presenter to run commands that can delete data | Local database |
| deck, README and answers → examiners | Every claim, figure and snippet can be checked against the repository | Documentation (public) |
| phase branch → main | The PR must carry only documentation and dev-only scripts | Repository contents |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Information disclosure | `docs/decisiones.md`, phase docs | medium | mitigate | `scripts/check-docs.mjs` fails on `sk-…`, `AKIA…` and `LLM_API_KEY=<value>`; `--all` prints `DOCS OK` | closed |
| T-07-02 | Repudiation | ADR-005 rationale | low | mitigate | ADR-005 states only the recorded rationale («Este registro no añade más razones…»); the author replied «as-written» at 07-06 Task 1 | closed |
| T-07-03 | Tampering | `scripts/check-docs.mjs` false green | medium | mitigate | `--self-test` breaks each rule once: `SELF-TEST OK (28 casos)` | closed |
| T-07-04 | Information disclosure | `measure-tokens.mts` (scratch) | low | mitigate | Scratch script outside the repo, removed (0 files, 0 tracked); printed fixture names and counts only (07-02 SUMMARY) | closed |
| T-07-05 | Spoofing | price source | low | mitigate | `docs/ia-en-el-proyecto.md` cites the official `developers.openai.com/api/docs/pricing` page with its access date | closed |
| T-07-06 | Repudiation | figures of the AI doc | medium | mitigate | `scripts/check-figures.mjs` recomputes every key and cost cell: `FIGURES OK (72 cifras)`, 73 with `--tests` | closed |
| T-07-07 | Spoofing | `capture.mjs` target URL | low | mitigate | `BASE` is `http://app:8080` on the compose network; `scripts/browser-tools.sh` checks `/api/health` first | closed |
| T-07-08 | Information disclosure | committed PNGs | medium | mitigate | Seeded, invented data only (executor review in 07-03 SUMMARY); the author's visual check of the five PNGs is carried to the phase UAT | closed |
| T-07-09 | Tampering | the user's database | medium | mitigate | `capture.mjs` only reads and navigates (no save, no upload); 12 applications before and after (07-03 SUMMARY); the runner never calls `--reset` | closed |
| T-07-10 | Denial of service | leftover container | low | mitigate | `trap` with `docker rm -f` in the runner; no `expediente-browser` container remains | closed |
| T-07-11 | Tampering (data loss) | `npm run seed -- --reset` in the checklist | medium | mitigate | `docs/presentacion/demo-script.md` marks the reset as erasing everything, for the presenter alone; no executor ran it | closed |
| T-07-12 | Information disclosure | pasted offer and documents | low | mitigate | The demo script uses only the committed fixtures `docs/demo/ofertas/onsite-junior.txt` and `remote-senior.txt` and the seeded documents | closed |
| T-07-13 | Repudiation | claims about the UI | low | mitigate | 07-04 Task 1 check (`GUION OK 10 300`) matches every label against `apps/web/src`; the automatic transition is explained from the history entries | closed |
| T-07-14 | Tampering | code snippets on slides | low | mitigate | Source markers byte-compared by `check-docs.mjs --deck`: `DOCS OK` | closed |
| T-07-15 | Repudiation | figures and claims on slides | low | mitigate | `check-figures.mjs --prose docs/presentacion/deck.md`: `FIGURES OK` | closed |
| T-07-16 | Information disclosure | captures embedded in the deck | low | mitigate | The deck embeds only three of the five reviewed 07-03 captures | closed |
| T-07-17 | Repudiation | examiner answers | low | mitigate | `check-docs.mjs --qa` and `check-figures.mjs --prose docs/presentacion/preguntas-tribunal.md` pass | closed |
| T-07-18 | Information disclosure | README additions | low | mitigate | `git diff --numstat c11ab61 HEAD -- README.md` is `16 0` (additions only); `--all` secret rule passes | closed |
| T-07-19 | Tampering | product code and manifests | medium | mitigate | No file under `apps`, `packages`, `compose.yml`, `Dockerfile`, `.env.example` or a manifest changed since `c11ab61`; no video tracked | closed |
| T-07-20 | Repudiation | ADR-005 rationale and answer 15 | low | mitigate | Blocking `checkpoint:decision` answered «as-written», recorded verbatim in 07-06 SUMMARY; ADR-005 unchanged (no `Motivo del autor:`) | closed |
| T-07-SC | Tampering | npm installs (`js-tiktoken@1.0.21`, `playwright@1.56.1`, `mermaid@11.17.2`) | high | mitigate | Human package check approved («Approved», 07-03 Task 1); exact pins; `--ignore-scripts`; scratch or container only; no manifest changed since `c11ab61`; both dependency-justification sections present (07-02, 07-03) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

T-07-SC is one row for the six plan entries: 07-01, 07-04, 07-05 and 07-06 declared it `accept` (no install), 07-02 and 07-03 `mitigate`. The no-manifest-change evidence covers all six.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-SC (07-01, 07-04, 07-05, 07-06) | These plans install nothing; the risk is accepted at plan time and the gate proves no manifest changed | plan author (plan time) | 2026-11-07 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-07 | 21 | 21 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep depth) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-07
