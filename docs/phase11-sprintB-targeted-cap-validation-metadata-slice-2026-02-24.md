# Phase 11 Sprint B - Targeted Cap Validation + Metadata Slice (2026-02-24)

## Scope
Harden targeted-result e2e contracts to prevent silent cap drift:
- fail fast on invalid target cap inputs (`wrapper`, env, CI dispatch)
- enforce exact target-hit on deterministic fixture e2e
- emit dedicated targeted metadata artifact for CI triage

## Implementation
1) Strict wrapper argument validation
- Updated:
  - `scripts/run-hardening-with-flags.mjs`
- Added:
  - strict parser for `--target-results=<n>` (`1..500`, integer only)
  - explicit error when `--target-results` is supplied without `--targeted`
  - invalid values now fail command early instead of being ignored

2) Local hardening env validation + summary reporting
- Updated:
  - `scripts/local-hardening-pass.mjs`
- Added:
  - strict parse for `E2E_TARGET_RESULTS` when targeted variant is enabled
  - summary field:
    - `extensionE2ETargetResults` (effective cap; default `12` when no override)

3) Targeted e2e runtime hardening
- Updated:
  - `scripts/e2e-extension-targeted-results.mjs`
- Added:
  - strict parse for `E2E_TARGET_RESULTS` with clear range errors
  - exact-hit assertion:
    - `finalRowCount === expectedRowCount`
  - metadata artifact:
    - `dist/e2e/e2e-targeted-meta.json`
  - extra result payload fields:
    - `targetResultsSource`
    - `targetResultsRaw`
    - `expectedRowCount`

4) CI dispatch validation
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added step:
  - `Validate Targeted Results Input`
  - runs `node scripts/validate-targeted-results-input.mjs` before targeted hardening

5) Validation utility script
- Added:
  - `scripts/validate-targeted-results-input.mjs`
- Behavior:
  - validates `TARGETED_RESULTS_INPUT`/`E2E_TARGET_RESULTS` integer range (`1..500`)
  - exits non-zero on invalid values

6) Smoke contract expansion
- Added:
  - `scripts/smoke-extension-epic28.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic28`
    - aggregate `smoke:extension` now includes `epic28`

## Validation
1) `node --check scripts/run-hardening-with-flags.mjs`
2) `node --check scripts/local-hardening-pass.mjs`
3) `node --check scripts/e2e-extension-targeted-results.mjs`
4) `node --check scripts/validate-targeted-results-input.mjs`
5) `node --check scripts/smoke-extension-epic28.mjs`
6) `npm run smoke:extension:epic28`
7) `npm run smoke:extension`
8) `npm run test:local:hardening:e2e:targeted -- --target-results=25`

## Notes
- This slice converts targeted cap settings from best-effort behavior to explicit contract checks.
- The metadata artifact helps quickly verify cap intent vs observed row count in CI.
