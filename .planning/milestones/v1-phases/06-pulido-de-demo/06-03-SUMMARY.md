---
phase: 06-pulido-de-demo
plan: 03
subsystem: api-fixtures
tags: [fixtures, demo, build, docker]
status: complete
requires: []
provides:
  - docs/demo/ofertas/ as the single home of the three demo offers
  - build excludes keeping fixtures and try-extract out of dist
affects: [06-16 docs rewording, 06-02 plan test using OFFER_FIXTURES]
tech-stack:
  added: []
  patterns: [fixture loader resolved relative to import.meta.url]
key-files:
  created: []
  modified:
    - apps/api/src/offers/__fixtures__/fixtures.ts
    - apps/api/src/scripts/try-extract.ts
    - apps/api/tsconfig.build.json
  moved:
    - docs/demo/ofertas/remote-senior.txt
    - docs/demo/ofertas/onsite-junior.txt
    - docs/demo/ofertas/english-nice-to-have.txt
key-decisions:
  - 'Spanish folder name docs/demo/ofertas is the D-09 exception to the CLAUDE.md English file-name rule, confirmed by the user on 2026-11-06; the .txt names inside stay English'
  - 'Fixtures and try-extract.ts excluded from tsconfig.build.json because docs/ is not in the Docker build context (RESEARCH Pitfall 2)'
requirements-completed: [DEMO-01, DEMO-05]
duration: 6 min
completed: 2026-11-06
commits: 1
plan_head_before: b5291beef861f609f52c6a08598f0d3b9d0ea042
plan_head_after: 318372c9388670c96bd9327da55f711b6626042c
actuals:
  tokens: 1500
  tasks: 1
  commits: 1
coverage:
  - deliverable: 'Three demo offers moved to docs/demo/ofertas and read there by fixtures.ts and try-extract.ts'
    human_judgment: false
    verification:
      - kind: test
        ref: 'npm run test -w @tfm/api -- src/offers (4 files, 113 tests pass)'
        status: pass
  - deliverable: 'dist excludes fixtures and try-extract'
    human_judgment: false
    verification:
      - kind: command
        ref: 'rm -rf apps/api/dist && npm run build -w @tfm/api && test -f dist/main.js && test ! -e dist/offers/__fixtures__/fixtures.js && test ! -e dist/scripts/try-extract.js'
        status: pass
---

# Phase 6 Plan 03: Demo offers home Summary

The three demo offers now live only in `docs/demo/ofertas/` (moved with `git mv`, bytes unchanged, 100% rename), and the fixture loader, its tests and `try-extract.ts` read them there, while `tsconfig.build.json` keeps all fixture code out of `dist`.

## Accomplishments

- Moved `remote-senior.txt`, `onsite-junior.txt`, `english-nice-to-have.txt` from `apps/api/src/offers/__fixtures__/` to `docs/demo/ofertas/`.
- `readFixtureText` in `fixtures.ts` resolves `../../../../../docs/demo/ofertas/<file>` from `import.meta.url`, with a comment stating the folder is the single source of truth, also pasted live in the demo. `try-extract.ts` header names the folder.
- `tsconfig.build.json` excludes `src/offers/__fixtures__/**` and `src/scripts/try-extract.ts`; a clean rebuild yields `dist/main.js` and neither `dist/offers/__fixtures__/fixtures.js` nor `dist/scripts/try-extract.js`.
- The Spanish folder name is the D-09 exception confirmed by the user on 2026-11-06.

## Verification

- `npm run test -w @tfm/api -- src/offers`: 4 files, 113 tests pass.
- Clean API build and dist existence checks: pass.
- `npm run typecheck && npm run test`: contracts 57, api 407, web 615 tests pass; typecheck clean.
- All four acceptance criteria: pass.

## Deviations from Plan

None - plan executed exactly as written. (`npm ci` was run in the worktree to get local packages; `package.json` and lockfile unchanged. Prettier reformatted the new `new URL(...)` call in `fixtures.ts`.)

## Known Stubs

None.

## Threat Flags

None. No new dependencies; no package installed (T-06-SC).

## Next

Docs and requirement wording that mention the folder are written in 06-16.

## Self-Check: PASSED

- docs/demo/ofertas/{remote-senior,onsite-junior,english-nice-to-have}.txt present; old paths absent.
- Commit 318372c is an ancestor of HEAD.
