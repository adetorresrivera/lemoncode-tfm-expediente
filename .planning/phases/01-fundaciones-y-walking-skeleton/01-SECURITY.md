---
phase: "01"
slug: "fundaciones-y-walking-skeleton"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-29"
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (`<threat_model>` in each PLAN.md). Verified against code by `gsd-security-auditor` (ASVS 1, block_on high).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → app :8080 | Untrusted HTTP requests reach Hono; same origin in production | paths, bodies |
| app → mongo / s3 / ollama | Internal services on the compose network with operator-controlled config | credentials, offer data |
| host → compose published ports | Only 127.0.0.1:8080 (app) and 127.0.0.1:9001 (Silo console) are published | admin console access |
| repo/image → secrets | `.env` with real keys must never reach git history or image layers | API keys |
| developer workstation → git history | Code enters history through the hooks unless deliberately bypassed | source code |
| client → API input (future routes) | Bodies and queries parsed with `@tfm/contracts` | user input |
| API → LLM provider | Outbound calls to an operator-configured endpoint, optionally with a bearer key | offer text, bearer key |
| API response → browser | JSON parsed with a contracts schema before use | API data |
| user → rendered DOM | User data rendered by React | text, URLs |
| npx shadcn CLI → repo | Generator downloads registry files and may edit manifests | build-time code |
| localStorage → theme store | Stored values are user/extension controlled | theme preference |
| documentation → operator | README instructions shape how the stack is exposed | credentials guidance |
| Ollama registry → ollama-data volume | Model weights pulled from ollama.com at first start | model weights |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Information disclosure | `apps/api/src/app.ts` onError | high | mitigate | Unknown errors answer 500 `INTERNAL_ERROR`; only `err.message` logged (`app.ts:79-127`); test `app.test.ts:179` | closed |
| T-01-02 | Information disclosure | `apps/api/src/config.ts` loadConfig | high | mitigate | Error lists issue paths and messages only (`config.ts:59-64`); test `config.test.ts:45` | closed |
| T-01-03 | Denial of service | `/api/health` probes | medium | mitigate | 2.5 s cap, parallel, no retries (`app.ts:19-56`); S3 `maxAttempts 1`; Mongo 3 s timeouts; test `app.test.ts:66` | closed |
| T-01-04 | Elevation of privilege | Dockerfile runtime stage | high | mitigate | `USER node`, `--chown=node:node`, node-only HEALTHCHECK (`Dockerfile:30-40`); smoke asserts uid 1000 (`compose-smoke.sh:91-93`) | closed |
| T-01-05 | Elevation of privilege | compose.yml published ports | high | mitigate | Only `127.0.0.1:8080` and `127.0.0.1:9001` published (`compose.yml:8,54`) | closed |
| T-01-06 | Tampering | serveStatic SPA hosting | medium | mitigate | Absolute fixed root, `allowPercentInPath` off (`app.ts:62`), in-memory index fallback; 5 traversal tests `app.test.ts:236-273` | closed |
| T-01-07 | Information disclosure | .gitignore / .dockerignore | high | mitigate | `.env`, `.env.*` ignored except `.env.example` (`.gitignore:5-7`, `.dockerignore:13-15`); `LLM_API_KEY=` empty; test `config.test.ts:101` | closed |
| T-01-08 | Spoofing | cross-origin access to the API | low | accept | No CORS middleware; Vite proxy in dev | closed |
| T-01-09 | Tampering | LLM_BASE_URL (SSRF) | low | accept | Value only from operator env; ping paths fixed | closed |
| T-01-10 | Tampering | .husky hooks | low | accept | `--no-verify` bypass accepted; single-developer repo | closed |
| T-01-11 | Tampering | lint-staged auto-fix | low | accept | Mechanical rewrites, visible in the diff | closed |
| T-01-12 | Tampering | `application.schema.ts` sourceUrl | high | mitigate | `z.url({ protocol: /^https?$/ })` (`application.schema.ts:36-39`); test rejects `javascript:` | closed |
| T-01-13 | Denial of service | contract string/array bounds | medium | mitigate | Bounds in contracts schemas; tests for title, tags, offerText, label, extraction text, size | closed |
| T-01-14 | Information disclosure | `openai.provider.ts` bearer key | high | mitigate | Key only in Authorization header; no logging; test `llm.client.test.ts:138` | closed |
| T-01-15 | Information disclosure | provider extractStructured input | medium | mitigate | No console/logger calls in `apps/api/src/llm/*` | closed |
| T-01-16 | Denial of service | provider ping | low | mitigate | `AbortSignal.timeout(2000)` in both providers; tests `llm.client.test.ts:77,125` | closed |
| T-01-17 | Tampering | `core/http/http-client.ts` | medium | mitigate | Success and error bodies validated with contracts schemas (`http-client.ts:82-94`) | closed |
| T-01-18 | Information disclosure | http-client error mapping | low | mitigate | Only contract code/message reach the UI; test `http-client.test.ts:86-94` | closed |
| T-01-19 | Tampering | React rendering (XSS) | low | accept | No `dangerouslySetInnerHTML`/`innerHTML`/`eval` in `apps/web/src`; sourceUrl limited to http/https | closed |
| T-01-20 | Tampering | shadcn CLI (supply chain) | high | mitigate | CLI used via `npx` only; no `shadcn`/`cn` in manifests or lockfile; local `cn` helper | closed |
| T-01-21 | Tampering | theme store reading localStorage | low | mitigate | `isThemePreference` guard, try/catch on read and write (`theme.ts:9-45`) | closed |
| T-01-22 | Tampering | inline pre-hydration script | low | accept | Static first-party script, no user input, only toggles a class | closed |
| T-01-23 | Information disclosure | README credentials guidance | medium | mitigate | README states loopback-only ports, `minioadmin` local-only, never commit `.env` (`README.md:31-36,106`) | closed |
| T-01-24 | Denial of service | model pull blocking the app | medium | mitigate | App depends only on mongo, s3, s3-init (`compose.yml:23-30`); smoke checks health before ollama-init | closed |
| T-01-25 | Tampering | model weights from Ollama registry | low | accept | Pinned `ollama/ollama:0.40.3`, official tag over HTTPS | closed |
| T-01-SC | Tampering | npm installs and pulled images (plans 01–06) | high | mitigate | Exact pins matching the lockfile, `npm ci --ignore-scripts`, pinned image tags | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Audit observations (non-blocking)

- T-01-13: `notes.max(5000)` and `company.max(120)` exist in code but no test asserts them, although the plan says all bounds are asserted.
- `WEB_DIST_DIR` set in env is used as given (`main.ts:24-25`) rather than resolved to an absolute path. The default is absolute and `.env.example` documents an absolute path.
- Code-review findings WR-05, WR-06 and WR-08 were considered as context and do not reopen any threat.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-08 | Same-origin in production, Vite proxy in dev; browsers block cross-origin reads by default | Plan 01-01 threat model | 2026-10-28 |
| AR-02 | T-01-09 | LLM_BASE_URL comes only from operator-controlled env, never from request data | Plan 01-01 threat model | 2026-10-28 |
| AR-03 | T-01-10 | Hook bypass possible; single-developer repo and plan verifies re-run lint, format and typecheck | Plan 01-02 threat model | 2026-10-28 |
| AR-04 | T-01-11 | Auto-fix changes are mechanical and visible in the commit diff | Plan 01-02 threat model | 2026-10-28 |
| AR-05 | T-01-19 | React escapes text; no raw HTML rendering; sourceUrl protocols restricted | Plan 01-04 threat model | 2026-10-28 |
| AR-06 | T-01-22 | Static first-party inline script, no CSP configured in this phase | Plan 01-05 threat model | 2026-10-28 |
| AR-07 | T-01-25 | Official pinned image pulls the official tag over HTTPS; no further verification available | Plan 01-06 threat model | 2026-10-28 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-29 | 26 | 26 | 0 | gsd-security-auditor (via /gsd-execute-phase verify:post) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-29
