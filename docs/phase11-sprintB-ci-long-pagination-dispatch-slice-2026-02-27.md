# Phase 11 Sprint B - CI Long Pagination Dispatch Slice (2026-02-27)

## Scope
Expose the long-pagination e2e hardening variant in GitHub Actions manual dispatch, with bounded input validation and dedicated artifacts.

## Implementation
1) Workflow dispatch + gating
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added:
  - `workflow_dispatch` input: `run_long_pagination`
  - `workflow_dispatch` input: `long_total_rows` (`300..5000`)
  - `workflow_dispatch` input: `long_batch_size` (`1..24`)
  - conditional step:
    - `Run Local Hardening (E2E long pagination)`
    - runs `npm run test:local:hardening:e2e:long-pagination`

2) Input validation
- Added:
  - `scripts/validate-long-pagination-input.mjs`
- Behavior:
  - validates `long_total_rows` and `long_batch_size` ranges
  - fails fast on invalid dispatch values before e2e execution

3) CI artifacts
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added:
  - `Upload E2E Artifacts (long pagination)`
  - artifact name includes dispatch values:
    - `extension-e2e-artifacts-long-pagination-${{ inputs.long_total_rows }}r-${{ inputs.long_batch_size }}b`
  - artifact path:
    - `dist/e2e/e2e-long-pagination-*`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic71.mjs`
- Updated:
  - `package.json`
    - added `smoke:extension:epic71`
    - aggregate `smoke:extension` now includes `epic71`

## Validation
1) `node --check scripts/validate-long-pagination-input.mjs`
2) `node --check scripts/smoke-extension-epic71.mjs`
3) `npm run smoke:extension:epic71`
4) `npm run smoke:extension`

## Notes
- This slice only wires dispatch/gating/artifacts in CI; runtime continuation behavior remains covered by the long-pagination e2e gate added in slice 57.
