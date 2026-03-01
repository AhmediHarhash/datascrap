# Phase 11 Sprint B - Queue Hygiene Pause Batching Slice (2026-02-25)

## Scope
Add chunked pause execution so intentional large queue hygiene operations run in controlled batches.

## Implementation
1) Pause batching controls in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--pause-batch-size=<n>` (default `20`)
  - `--pause-batch-delay-ms=<ms>` (default `0`)
  - `--continue-on-pause-error=true|false` (default `true`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_SIZE=20`
    - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_DELAY_MS=0`
    - `CONTROL_API_SCHEDULE_HYGIENE_CONTINUE_ON_PAUSE_ERROR=true`
  - pause summary now includes:
    - batch metadata (`batches`)
    - halt metadata (`haltedOnFailure`)

2) Batched command presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:pause:apply:batched:control-api`
  - `queue:hygiene:pause:duplicates:batched:control-api`
  - `queue:hygiene:pause:near-duplicates:batched:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic37.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic37`
    - aggregate `smoke:extension` now includes `epic37`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic37.mjs`
3) `npm run smoke:extension:epic37`
4) `npm run smoke:extension`

## Notes
- Batched presets include force-guardrail override intentionally, for planned bulk cleanup windows.
- Use dry-run presets before any batched apply.
