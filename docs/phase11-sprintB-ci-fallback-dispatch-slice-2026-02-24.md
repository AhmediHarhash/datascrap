# Phase 11 Sprint B - CI Fallback Dispatch Slice (2026-02-24)

## Scope
Extend the Extension Hardening workflow to run fallback-transition e2e from manual dispatch and lock this contract with smoke checks.

## Implementation
1) Workflow dispatch extension
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added:
  - `workflow_dispatch` boolean input: `run_fallback`
  - conditional fallback step:
    - `Run Local Hardening (E2E fallback)`
    - executes `npm run test:local:hardening:e2e:fallback`

2) CI contract smoke
- Added:
  - `scripts/smoke-extension-epic20.mjs`
- Verifies:
  - workflow includes `run_fallback` input + fallback execution step
  - package scripts include fallback hardening/release variants

3) Script wiring
- Updated:
  - `package.json`
- Added:
  - `smoke:extension:epic20`
  - inclusion in aggregate `smoke:extension`

4) Docs alignment
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/production-test-readiness-2026-02-23.md`
  - `docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md`

## Validation
1) `npm run smoke:extension:epic20`
2) `npm run smoke:extension`

## Notes
- PR required check remains unchanged (`local-hardening-e2e`); fallback e2e is opt-in via `workflow_dispatch`.
