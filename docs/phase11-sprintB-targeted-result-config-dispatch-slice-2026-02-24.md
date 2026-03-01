# Phase 11 Sprint B - Targeted Result Config Dispatch Slice (2026-02-24)

## Scope
Make targeted-result e2e cap configurable across local wrappers and CI dispatch:
- local/railway wrappers accept target cap argument
- workflow dispatch can provide targeted cap input
- e2e runtime receives cap via `E2E_TARGET_RESULTS`

## Implementation
1) Wrapper argument support
- Updated:
  - `scripts/run-hardening-with-flags.mjs`
- Added:
  - `--target-results=<n>` parsing (bounded to `1..500`)
  - when `--targeted` is active, wrapper now sets:
    - `RUN_EXTENSION_E2E_TARGETED=true`
    - optional `E2E_TARGET_RESULTS=<n>`

2) CI dispatch targeted cap input
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added:
  - `workflow_dispatch` input: `targeted_results` (string, default `"12"`)
  - targeted run step exports:
    - `E2E_TARGET_RESULTS: ${{ inputs.targeted_results }}`

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic27.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic27`
    - aggregate `smoke:extension` now includes `epic27`

4) Docs updates
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/production-test-readiness-2026-02-23.md`
  - `docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md`
- Added explicit examples for custom target caps (e.g. `--target-results=120`).

## Validation
1) `node --check scripts/run-hardening-with-flags.mjs`
2) `node --check scripts/smoke-extension-epic27.mjs`
3) `npm run smoke:extension:epic27`
4) `npm run e2e:extension:targeted` (default cap)
5) `npm run test:local:hardening:e2e:targeted -- --target-results=25`
6) `npm run smoke:extension`

## Notes
- This keeps targeted e2e deterministic while enabling broader cap-size coverage in CI manual dispatch.
