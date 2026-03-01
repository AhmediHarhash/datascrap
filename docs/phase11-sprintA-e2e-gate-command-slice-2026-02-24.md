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
  - optional `--fallback` sets `RUN_EXTENSION_E2E_FALLBACK=true`
  - optional `--targeted` sets `RUN_EXTENSION_E2E_TARGETED=true`
  - optional `--long-pagination` sets `RUN_EXTENSION_E2E_LONG_PAGINATION=true`
  - optional `--target-results=<n>` sets `E2E_TARGET_RESULTS=<n>` (targeted e2e cap)

2) Package scripts
- Updated:
  - `package.json`
- Added command variants:
  - `test:local:hardening:e2e`
  - `test:local:hardening:e2e:maps`
  - `test:local:hardening:e2e:fallback`
  - `test:local:hardening:e2e:targeted`
  - `test:local:hardening:e2e:long-pagination`
  - `hardening:railway:e2e`
  - `hardening:railway:e2e:maps`
  - `hardening:railway:e2e:fallback`
  - `hardening:railway:e2e:targeted`
  - `hardening:railway:e2e:long-pagination`
  - `release:full:e2e`
  - `release:full:e2e:maps`
  - `release:full:e2e:fallback`
  - `release:full:e2e:targeted`
  - `release:full:e2e:long-pagination`

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
  - workflow_dispatch with optional `run_maps`, `run_fallback`, and `fallback_command` inputs
- workflow_dispatch with optional `run_targeted` input
- workflow_dispatch with optional `run_long_pagination` input
- workflow_dispatch with optional `targeted_results` input
- workflow_dispatch with optional `long_total_rows` / `long_batch_size` inputs
- workflow targeted path validates `targeted_results` (`1..500`) before run
- workflow long-pagination path validates `long_total_rows` (`300..5000`) and `long_batch_size` (`1..24`) before run
- runs `test:local:hardening:e2e` and optional `:maps` / `:fallback` / `:targeted` / `:long-pagination`
- uploads `dist/e2e` artifacts (targeted variant name includes cap: `extension-e2e-artifacts-targeted-<targeted_results>`)
- uploads long-pagination artifacts with input-tagged suffix:
  - `extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b`

## Validation
1) `npm run test:local:hardening:e2e` -> pass
2) `npm run test:local:hardening:e2e:maps` -> pass
3) Workflow wiring added:
- `.github/workflows/extension-hardening.yml`

## Notes
- Maps e2e remains network-dependent; use non-maps e2e gate when network stability is limited.
- Existing non-e2e gates (`test:local:hardening`, `hardening:railway`, `release:full`) remain unchanged.
