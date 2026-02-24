# Phase 11 Sprint A - E2E Gate Command Slice (2026-02-24)

## Scope
Make extension e2e validation operable as first-class release gates without manual environment setup:
- add cross-platform hardening wrappers for extension e2e flags
- expose local, Railway, and full release variants
- update readiness/release runbooks to use the new command paths

## Implementation
1) Hardening wrapper runner
- Added:
  - `scripts/run-hardening-with-flags.mjs`
- Behavior:
  - `--target=local` runs `scripts/local-hardening-pass.mjs`
  - `--target=railway` runs `scripts/hardening-railway.mjs`
  - always sets `RUN_EXTENSION_E2E=true`
  - optional `--maps` sets `RUN_EXTENSION_E2E_MAPS=true`

2) Package scripts
- Updated:
  - `package.json`
- Added command variants:
  - `test:local:hardening:e2e`
  - `test:local:hardening:e2e:maps`
  - `hardening:railway:e2e`
  - `hardening:railway:e2e:maps`
  - `release:full:e2e`
  - `release:full:e2e:maps`

3) Playbook/readiness docs
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/production-test-readiness-2026-02-23.md`
- Added explicit one-command paths for e2e-enabled hardening and release gates.

4) CI hardening workflow
- Added:
  - `.github/workflows/extension-hardening.yml`
- Behavior:
  - PR trigger for extension/core/scripts/docs/package changes
  - workflow_dispatch with optional `run_maps` input
  - runs `test:local:hardening:e2e` and optional `:maps`
  - uploads `dist/e2e` artifacts

## Validation
1) `npm run test:local:hardening:e2e` -> pass
2) `npm run test:local:hardening:e2e:maps` -> pass
3) Workflow wiring added:
- `.github/workflows/extension-hardening.yml`

## Notes
- Maps e2e remains network-dependent; use non-maps e2e gate when network stability is limited.
- Existing non-e2e gates (`test:local:hardening`, `hardening:railway`, `release:full`) remain unchanged.
