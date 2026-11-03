---
phase: 01-fundaciones-y-walking-skeleton
reviewed: 2026-10-29T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/api/src/app.test.ts
  - apps/api/src/llm/llm.client.test.ts
  - apps/web/src/layouts/app-layout.test.tsx
  - apps/web/src/layouts/app-layout.tsx
  - apps/web/vite.config.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 1: Code Review Report (incremental re-review)

**Reviewed:** 2026-10-29
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Incremental re-review of the changes since `b578856`: a path-traversal regression test for the static root, ping-timeout tests for the Ollama and OpenAI providers, a mobile header reorder (menu button before the wordmark) with focus-return and order tests, and `server.host: true` in the Vite config.

No blockers. The layout change is correct. The Radix Sheet is portaled, so the `header.firstElementChild` assertion is sound, and the `text-*`/`bg-*` classes use DS tokens only. Two warnings: the traversal test cannot fail for some regressions, and the Vite dev server now listens on every interface unconditionally.

## Warnings

### WR-01: Traversal test has no positive control and can pass vacuously

**File:** `apps/api/src/app.test.ts:262-273`
**Issue:** The test only asserts `body not.toContain(secretMarker)`. Nothing proves the harness can detect a leak. Nothing proves the encoded variants actually reach `serveStatic` and get resolved against the temp root. If `serveStatic` or `createApp` answered 404 or the SPA fallback for every path (for example after a root misconfiguration), the test would still pass. The comment "Each variant survives WHATWG normalisation" is also never asserted. Two variants are not traversal at all after one decode (`/%252e%252e%252f...` decodes to the literal `%2e%2e%2f...`), so they only guard against double-decoding. That is fine as intent, but it is undocumented. The suite also has no case for an unencoded `../` request, which WHATWG normalises away before reaching the handler.
**Fix:** Add a control that proves the secret is reachable only when it is inside the root. For example, write a `visible.txt` inside `servedDist` and assert that `/visible.txt` returns its content. Also assert the status/content-type is either 404 or `text/html` for every traversal path:
```ts
const res = await createApp({ ...allUp, webDistDir: servedDist }).request(path);
const text = await res.text();
expect(text).not.toContain(secretMarker);
expect([200, 404]).toContain(res.status);
if (res.status === 200) expect(res.headers.get("content-type")).toContain("text/html");
```

### WR-02: `server.host: true` exposes the Vite dev server on all interfaces unconditionally

**File:** `apps/web/vite.config.ts:17`
**Issue:** `host: true` binds to `0.0.0.0` for every developer and every run, not just inside the devcontainer. On a laptop on a shared network (such as a demo venue on 9 Nov), the dev server is reachable by other hosts. That includes the `/api` proxy to the local API, source maps and the HMR socket. The change has no comment or ADR note explaining why it is needed (presumably devcontainer port forwarding). The CLAUDE.md rule says to ask before changing the stack or infra. Vite's `allowedHosts` default still protects against DNS rebinding, but LAN exposure remains.
**Fix:** Gate it on the container environment, or document it:
```ts
server: {
  // Needed so the devcontainer's forwarded port reaches Vite; keep loopback elsewhere.
  host: process.env.REMOTE_CONTAINERS === "true" || process.env.CODESPACES === "true" ? true : "localhost",
```
Alternatively, use a `VITE_DEV_HOST` variable (documented in `.env.example`), or add a comment explaining the choice.

## Info

### IN-01: Redundant second assertion in the header-order test

**File:** `apps/web/src/layouts/app-layout.test.tsx:100-103`
**Issue:** `header.firstElementChild === trigger` already implies the wordmark comes later, unless the wordmark is the trigger, which cannot happen. The `compareDocumentPosition` check adds nothing. `getByText("Expediente")` is also coupled to the header containing exactly one match.
**Fix:** Drop the `compareDocumentPosition` block, or replace the first-child assertion with it so only one ordering assertion exists.

### IN-02: Duplicated ping-timeout tests and a magic 2500 coupled to `app.ts`

**File:** `apps/api/src/llm/llm.client.test.ts:77-88, 125-136`
**Issue:** The two tests are nearly identical, and the 2500 literal duplicates the default `probe` timeout in `apps/api/src/app.ts:19`. The providers hardcode 2000 independently. The test only checks the `AbortSignal.timeout` argument, not that a hung `fetch` actually resolves `false`.
**Fix:** Use `it.each([ollamaConfig, openaiConfig])`, and export a shared `PING_TIMEOUT_MS` constant used by the providers, the `probe` default and the tests.

### IN-03: Outer `beforeEach` fixture is redundant in the nested traversal suite

**File:** `apps/api/src/app.test.ts:236-258`
**Issue:** The nested `describe` inherits the parent `beforeEach`/`afterEach`, which create and remove an unused `dist` temp dir for each traversal case. This is harmless churn, but it hides which root is actually served.
**Fix:** Move the traversal suite out of the "static hosting" describe, or make its intent explicit with a comment.

---

_Reviewed: 2026-10-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
