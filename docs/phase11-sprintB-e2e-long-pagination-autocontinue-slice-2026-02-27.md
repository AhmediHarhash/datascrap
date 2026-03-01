# Phase 11 Sprint B - Long Pagination E2E Auto-Continue Slice (2026-02-27)

## Scope
Add a deterministic end-to-end gate that validates autonomous list extraction can continue through very long pagination runs and exceed legacy row ceilings in a single run.

## Implementation
1) Long pagination Playwright e2e
- Added:
  - `scripts/e2e-extension-long-pagination.mjs`
- behavior:
  - starts a local deterministic fixture site with many rows and a load-more button
  - enforces >220 expected rounds so segmented auto-continue is exercised
  - runs an explicit exhaustive command through quick-flow:
    - `extract all results from <url> until no more across whole website`
  - validates:
    - completed terminal state
    - row count is greater than 120
    - full fixture rows are extracted
    - segmented continuation evidence (`autoContinueSegmentsUsed > 0`)
    - hard-cap auto-resume configuration appears in runtime event payload
  - writes artifacts:
    - `dist/e2e/e2e-long-pagination-sidepanel.png`
    - `dist/e2e/e2e-long-pagination-target-page.png`
    - `dist/e2e/e2e-long-pagination-result.json`
    - `dist/e2e/e2e-long-pagination-meta.json`
    - `dist/e2e/e2e-long-pagination-error.txt` (failure path)

2) Hardening wrapper support
- Updated:
  - `scripts/run-hardening-with-flags.mjs`
  - `scripts/local-hardening-pass.mjs`
- changes:
  - new wrapper flag: `--long-pagination`
  - new env toggle: `RUN_EXTENSION_E2E_LONG_PAGINATION=true`
  - optional env overrides:
    - `E2E_LONG_TOTAL_ROWS`
    - `E2E_LONG_BATCH_SIZE`

3) Package script wiring
- Updated:
  - `package.json`
- added:
  - `e2e:extension:long-pagination`
  - `test:local:hardening:e2e:long-pagination`
  - `hardening:railway:e2e:long-pagination`
  - `release:full:e2e:long-pagination`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic70.mjs`
- Updated:
  - `package.json`
    - `smoke:extension:epic70`
    - aggregate `smoke:extension` now includes `epic70`

## Validation
1) `node --check scripts/e2e-extension-long-pagination.mjs`
2) `node --check scripts/run-hardening-with-flags.mjs`
3) `node --check scripts/local-hardening-pass.mjs`
4) `node --check scripts/smoke-extension-epic70.mjs`
5) `npm run smoke:extension:epic70`
6) `npm run smoke:extension`

## Notes
- This gate is fixture-backed and avoids external site variability while still exercising runtime continuation logic under long pagination pressure.
