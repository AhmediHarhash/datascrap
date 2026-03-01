# Phase 11 Sprint B - Navigate-Cycle E2E Loop-Guard Slice (2026-02-28)

## Scope
Add a deterministic end-to-end gate that validates autonomous list extraction can navigate paginated results exhaustively, exceed legacy row ceilings, and stop safely when next-link URLs begin cycling.

## Implementation
1) Navigate cycle Playwright e2e
- Added:
  - `scripts/e2e-extension-navigate-cycle.mjs`
- behavior:
  - starts a local deterministic paginated fixture (`/search?page=n`) with `#fixture-next` links
  - final page points back to page 1 to create a controlled navigation cycle
  - runs quick-flow command:
    - `extract all results from <url> until no more across whole website`
  - validates:
    - completed terminal state
    - row count exceeds 120
    - total rows match full fixture coverage
    - termination reason is exactly `next_link_cycle`
    - event log includes cycle token and emits navigation coverage count
  - writes artifacts:
    - `dist/e2e/e2e-navigate-cycle-sidepanel.png`
    - `dist/e2e/e2e-navigate-cycle-target-page.png`
    - `dist/e2e/e2e-navigate-cycle-result.json`
    - `dist/e2e/e2e-navigate-cycle-meta.json`
    - `dist/e2e/e2e-navigate-cycle-error.txt` (failure path)

2) Hardening wrapper support
- Updated:
  - `scripts/run-hardening-with-flags.mjs`
  - `scripts/local-hardening-pass.mjs`
- changes:
  - new wrapper flag: `--navigate-cycle`
  - new env toggle: `RUN_EXTENSION_E2E_NAVIGATE_CYCLE=true`
  - local hardening summary now reports `extensionE2ENavigateCycle`

3) Package script wiring
- Updated:
  - `package.json`
- added:
  - `e2e:extension:navigate-cycle`
  - `test:local:hardening:e2e:navigate-cycle`
  - `hardening:railway:e2e:navigate-cycle`
  - `release:full:e2e:navigate-cycle`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic73.mjs`
- Updated:
  - `package.json`
    - `smoke:extension:epic73`
    - aggregate `smoke:extension` now includes `epic73`

## Validation
1) `node --check scripts/e2e-extension-navigate-cycle.mjs`
2) `node --check scripts/run-hardening-with-flags.mjs`
3) `node --check scripts/local-hardening-pass.mjs`
4) `node --check scripts/smoke-extension-epic73.mjs`
5) `npm run smoke:extension:epic73`
6) `npm run smoke:extension`

## Notes
- This gate is fixture-backed and deterministic, so loop-termination behavior is validated without relying on external site variability.
