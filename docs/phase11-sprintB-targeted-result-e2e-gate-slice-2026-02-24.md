# Phase 11 Sprint B - Targeted Result E2E Gate Slice (2026-02-24)

## Scope
Add an automated e2e gate proving intent-based result caps work in real quick-flow runs:
- command example: `extract 12 results from <url>`
- assert capped completion behavior from the UI/runtime path
- wire this variant into local/railway/release and CI dispatch

## Implementation
1) Targeted result Playwright e2e
- Added:
  - `scripts/e2e-extension-targeted-results.mjs`
- Behavior:
  - starts a local deterministic fixture website with many repeated search cards
  - opens extension sidepanel, runs targeted command via intent quick-flow
  - waits for terminal status and table history update
  - asserts:
    - completed state reached
    - row count > 0 and `<= target`
    - list-autodetect strategy evidence appears in log output
  - writes artifacts:
    - `dist/e2e/e2e-targeted-sidepanel.png`
    - `dist/e2e/e2e-targeted-target-page.png`
    - `dist/e2e/e2e-targeted-result.json`
    - `dist/e2e/e2e-targeted-error.txt` (failure path)

2) Hardening wrappers and scripts
- Updated:
  - `scripts/run-hardening-with-flags.mjs`
  - `scripts/local-hardening-pass.mjs`
  - `package.json`
- Added support:
  - wrapper flag: `--targeted`
  - env flag: `RUN_EXTENSION_E2E_TARGETED=true`
  - commands:
    - `e2e:extension:targeted`
    - `test:local:hardening:e2e:targeted`
    - `hardening:railway:e2e:targeted`
    - `release:full:e2e:targeted`

3) CI workflow dispatch + artifacts
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added:
  - `workflow_dispatch` input: `run_targeted`
  - conditional targeted hardening step
  - targeted artifact upload:
    - `extension-e2e-artifacts-targeted`
    - `dist/e2e/e2e-targeted-*`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic26.mjs`
- Updated:
  - `package.json`
    - `smoke:extension:epic26`
    - aggregate `smoke:extension` includes `epic26`

5) Playbook/readiness updates
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/production-test-readiness-2026-02-23.md`
  - `docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md`

## Validation
1) `node --check scripts/e2e-extension-targeted-results.mjs`
2) `npm run e2e:extension:targeted`
3) `npm run smoke:extension:epic26`
4) `npm run smoke:extension`

## Notes
- Fixture-hosted e2e avoids external website variability and keeps row-cap assertions deterministic.
