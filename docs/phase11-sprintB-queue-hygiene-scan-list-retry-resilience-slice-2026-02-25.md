# Phase 11 Sprint B - Queue Hygiene Scan List Retry Resilience Slice (2026-02-25)

## Scope
Improve scan-all reliability by retrying transient failures while paging `/api/schedules`.

## Implementation
1) List page retry engine in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--list-retry-count=<n>` (default `1`)
  - `--list-retry-delay-ms=<ms>` (default `250`)
  - `--list-retry-backoff-factor=<n>` (default `1.5`)
  - `--list-retry-jitter-ms=<ms>` (default `100`)
  - `--list-request-timeout-ms=<ms>` (default `15000`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_COUNT=1`
    - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_DELAY_MS=250`
    - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_BACKOFF_FACTOR=1.5`
    - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_JITTER_MS=100`
    - `CONTROL_API_SCHEDULE_HYGIENE_LIST_REQUEST_TIMEOUT_MS=15000`
  - behavior:
    - retries transient list-page failures (`network`, `408`, `425`, `429`, `5xx`)
    - no retry on non-transient failure classes
  - summary metadata:
    - `filters.listRetry*`
    - `paging.retry` stats

2) Resilient checkpoint/resume presets
- Updated:
  - `package.json`
- Updated commands:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api`
  - both now include list retry controls (`--list-retry-count=3 --list-retry-delay-ms=500`)

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic45.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic45`
    - aggregate `smoke:extension` now includes `epic45`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic45.mjs`
3) `npm run smoke:extension:epic45`
4) `npm run smoke:extension`

## Notes
- List retries are bounded and independent from pause retries.
- For long scans, use list retries + resume checkpoints together for best resilience.
