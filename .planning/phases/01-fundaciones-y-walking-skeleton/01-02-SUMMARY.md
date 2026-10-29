---
phase: 01-fundaciones-y-walking-skeleton
plan: 02
subsystem: infra
tags: [eslint, prettier, husky, lint-staged, typescript-eslint, quality-gate]

requires:
  - phase: 01-fundaciones-y-walking-skeleton
    provides: "plan 01-01 monorepo, pinned toolchain in the lockfile, lint/format/typecheck/test scripts"
provides:
  - "ESLint 10 flat config (typescript-eslint, react-hooks, react-refresh) with no-explicit-any and inline type imports as errors"
  - "Prettier config and ignore list that leave foreign tooling, generated files and the DS stylesheet untouched"
  - "Husky pre-commit: lint-staged then workspace typecheck; pre-push: full test suite"
affects: [01-03, 01-04, 01-05, 01-06, all later phases]

actuals:
  tokens: 5200 # chars/4 over the realized diff (config + hooks + reformat), package-lock.json excluded
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "lint-staged auto-fixes (eslint --fix, prettier --write) before tsc runs in the same pre-commit"
    - "eslint --no-warn-ignored so staging an ignored generated file never trips --max-warnings=0"

key-files:
  created:
    - eslint.config.js
    - .prettierrc.json
    - .prettierignore
    - .lintstagedrc.json
    - .husky/pre-commit
    - .husky/pre-push
  modified:
    - apps/api/src/app.test.ts
    - apps/api/src/app.ts
    - apps/api/src/config.test.ts
    - apps/api/src/config.ts
    - apps/api/src/db/mongo.ts
    - apps/api/src/errors.ts
    - apps/api/src/llm/llm.client.ts
    - apps/api/src/llm/ollama.provider.ts
    - apps/api/src/main.ts
    - apps/api/src/storage/s3.ts
    - packages/contracts/src/error.schema.test.ts
    - compose.yml

key-decisions:
  - "D-04 typecheck placement overridden by the user on 2026-10-28: typecheck runs in .husky/pre-commit after lint-staged (FND-09 and ROADMAP SC1 literally); pre-push runs the full npm run test"
  - "lint-staged runs eslint with --no-warn-ignored (deviation from RESEARCH Pattern 10) so staging apps/web/src/routeTree.gen.ts cannot fail --max-warnings=0"
  - "apps/web/src/styles.css is in .prettierignore so the DS stylesheet stays byte-identical to docs/design/expediente.css"

patterns-established:
  - "Format problems are repaired inside the commit (prettier --write), type and lint errors reject it"

requirements-completed: [FND-09, FND-01]

duration: 25min
completed: 2026-10-29
status: complete
plan_head_before: d4143d96bb5dccc7720dfdb769f06ca6fcba57af
plan_head_after: ca0d6716740ba6246c3de3d4b475a5a729208a0c
---

# Phase 1 Plan 02: Quality gate Summary

**ESLint 10 flat config and Prettier clean over the whole repo, with a Husky pre-commit that rejects explicit any (lint-staged) and type errors (tsc) and a pre-push that runs the full test suite**

## Performance

- **Duration:** ~25 min (most of it the 4 min `npm ci` in the fresh worktree)
- **Tasks:** 2
- **Files:** 6 created, 12 modified

## Accomplishments

- `npm run lint` (`eslint . --max-warnings=0`) and `npm run format:check` pass over the repo while ignoring `.claude`, `.planning`, `gsd`, `.devcontainer`, `docs`, `dist`, `coverage`, `node_modules`, the lockfile, `routeTree.gen.ts` and `styles.css`. A piped `export const probe: any = 1;` is rejected by ESLint.
- `.husky/pre-commit` = `npx lint-staged` then `npm run typecheck`; `.husky/pre-push` = `npm run test`. The two hook files and `.lintstagedrc.json` were themselves committed through the hooks, which passed.
- Both rejections proven with the plan's probe sequence, leaving HEAD and the tree untouched.

## Task Commits

1. **Task 1: ESLint flat config and Prettier pass over the whole repo** - `17096a0` (chore)
2. **Task 2: Husky pre-commit and pre-push** - `ca0d671` (chore)

## Plan 01-01 files reformatted or lint-fixed

- Prettier only (line wrapping): `apps/api/src/app.ts`, `app.test.ts`, `config.ts`, `config.test.ts`, `db/mongo.ts`, `errors.ts`, `llm/llm.client.ts`, `llm/ollama.provider.ts`, `main.ts`, `storage/s3.ts`, `packages/contracts/src/error.schema.test.ts`, `compose.yml` (one healthcheck `test` line wrapped).
- ESLint fix: `apps/api/src/app.test.ts` line 5, `import { Hono }` became `import { type Hono }` (type-only use, `consistent-type-imports`). No eslint-disable comment was added and `no-explicit-any` is never silenced.
- No change to `packages/contracts/src/error.schema.ts`, `index.ts`, tsconfig files, `package.json`, or the web files.

## Hook probe results

- **Lint probe** (`apps/api/src/hook-probe.ts` with `export const probe: any = 1;`): `git commit` rejected by lint-staged, `@typescript-eslint/no-explicit-any` at 1:21, `husky - pre-commit script failed (code 1)`; lint-staged restored the original state, no commit created. HEAD unchanged (`ca0d671`), probe unstaged and deleted.
- **Type probe** (`export const probe: number = "uno";`): eslint and prettier passed, the typecheck line failed with `src/hook-probe.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'`, `husky - pre-commit script failed (code 2)`; no commit created. HEAD unchanged, probe unstaged and deleted.
- Final `npm run typecheck && npm run test && npm run lint && npm run format:check` exits 0 (6 contracts tests and 23 api tests pass; web has no test script yet).
- The pre-push hook was not exercised by a real `git push` (no remote action from a worktree agent); its content (`npm run test`) is the same command that passes above.
- The ignored-file edge (`routeTree.gen.ts`) is covered by `--no-warn-ignored` in `.lintstagedrc.json` (acceptance grep passes); the file does not exist until plan 01-04, so it was not staged in a live probe.

## Decisions Made

- D-04 override (typecheck at pre-commit, tests at pre-push) approved by the user on 2026-10-28 at plan-check; the rest of D-04 is delivered as decided.
- No dependency added: every tool (eslint, typescript-eslint, prettier, husky, lint-staged, plugins) was already pinned in the lockfile by plan 01-01.

## Deviations from Plan

**1. [Rule 3 - Blocking] Hook probes run as plain steps instead of one `bash -c` command**
- **Found during:** Task 2 (probes)
- **Issue:** the worktree isolation guard of this agent harness refuses any `bash -c '... git ...'` compound command, so the plan's two single-command probes could not be launched verbatim.
- **Fix:** executed the same sequence step by step with plain commands (assert empty index and absent probe file, write probe, `git add`, `git commit`, `git reset -q -- file`, delete file, assert HEAD equals the snapshot). Same assertions, same outcome.
- **Files modified:** none
- **Commit:** none

**Total deviations:** 1 (blocking, tooling only). **Impact:** none on deliverables.

## Issues Encountered

- `core.hooksPath` pointed at the absolute `/workspaces/TFM/.husky/_` when this worktree started; `npm ci` (`prepare` = `husky`) reset it to the relative `.husky/_` the plan expects. That value lives in the repository-wide git config, so it applies to the main checkout and every worktree.
- `.husky/_` is generated by `husky` on install and git-ignored by Husky itself; a fresh clone needs `npm install` (the `prepare` script) to activate the hooks.
- Typecheck at commit sees the working tree, not only the staged files, as noted in the plan Assumptions.

## Known Stubs

None.

## Threat Flags

None. T-01-10 and T-01-11 accepted as planned; T-01-SC mitigated (no install).

## Next Phase Readiness

- Plans 01-03 to 01-06 commit through the hooks; each plan's `npm run lint && npm run format:check` stays green.
- Plan 01-04 must keep `apps/web/src/styles.css` byte-identical to `docs/design/expediente.css` (Prettier ignores it) and generated shadcn files under `apps/web/src/common/components/ui/` need `prettier --write` (the ESLint override for react-refresh is already in place there).
- Routes under `apps/web/src/routes/` may export `Route` next to the component without a lint warning.

## Self-Check: PASSED

- Files exist: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.husky/pre-commit`, `.husky/pre-push`.
- Commits `17096a0` and `ca0d671` are ancestors of HEAD.
- Acceptance criteria re-run for both tasks: all pass; `apps/api/src/hook-probe.ts` does not exist; working tree clean before this SUMMARY.

---

_Phase: 01-fundaciones-y-walking-skeleton_
_Completed: 2026-10-29_
