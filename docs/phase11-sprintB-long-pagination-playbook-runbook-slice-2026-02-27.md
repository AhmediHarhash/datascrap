# Phase 11 Sprint B - Long Pagination Playbook Runbook Slice (2026-02-27)

## Scope
Document the long-pagination e2e hardening variant consistently across local, release, and readiness runbooks.

## Implementation
1) Local hardening playbook updates
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
- Added:
  - `test:local:hardening:e2e:long-pagination`
  - `hardening:railway:e2e:long-pagination`
  - direct e2e command listing (`e2e:extension:long-pagination`)
  - env/runbook controls:
    - `RUN_EXTENSION_E2E_LONG_PAGINATION=true`
    - `E2E_LONG_TOTAL_ROWS`
    - `E2E_LONG_BATCH_SIZE`
  - CI dispatch guidance for:
    - `run_long_pagination`
    - `long_total_rows`
    - `long_batch_size`
    - long-pagination artifact naming

2) Release playbook updates
- Updated:
  - `docs/extension-release-playbook-2026-02-23.md`
- Added:
  - `release:full:e2e:long-pagination`
  - CI manual-dispatch runbook details for long-pagination variant and input limits
  - long-pagination artifact naming guidance

3) Production readiness updates
- Updated:
  - `docs/production-test-readiness-2026-02-23.md`
- Added:
  - verified-command matrix entries for long-pagination local/railway/release/e2e commands
  - CI dispatch and artifact expectations for long-pagination variant

4) E2E gate slice documentation extension
- Updated:
  - `docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md`
- Added:
  - `--long-pagination` wrapper flag and corresponding env behavior
  - long-pagination package command variants
  - workflow dispatch + validation + artifact details

5) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic72.mjs`
- Updated:
  - `package.json`
    - added `smoke:extension:epic72`
    - aggregate `smoke:extension` now includes `epic72`

## Validation
1) `node --check scripts/smoke-extension-epic72.mjs`
2) `npm run smoke:extension:epic72`
3) `npm run smoke:extension`

## Notes
- This slice is documentation/runbook hardening only; no runtime extraction behavior changed.
