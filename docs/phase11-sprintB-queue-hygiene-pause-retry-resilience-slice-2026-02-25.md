# Phase 11 Sprint B - Queue Hygiene Pause Retry Resilience Slice (2026-02-25)

## Scope
Improve pause reliability during queue hygiene operations by adding transient-failure retries.

## Implementation
1) Pause retry engine in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--pause-retry-count=<n>` (default `1`)
  - `--pause-retry-delay-ms=<ms>` (default `250`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_COUNT=1`
    - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_DELAY_MS=250`
  - behavior:
    - retries transient pause failures (`network`, `408`, `425`, `429`, `5xx`)
    - no retry on non-transient failure classes
  - summary metadata:
    - `filters.pauseRetryCount`
    - `filters.pauseRetryDelayMs`
    - `pause.retry` stats

2) Resilient stale cleanup preset
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic42.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic42`
    - aggregate `smoke:extension` now includes `epic42`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic42.mjs`
3) `npm run smoke:extension:epic42`
4) `npm run smoke:extension`

## Notes
- Retries are intentionally bounded; use batch controls and min-age controls together for safest large cleanups.
