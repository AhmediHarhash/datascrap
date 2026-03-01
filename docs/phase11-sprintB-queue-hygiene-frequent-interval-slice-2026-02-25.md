# Phase 11 Sprint B - Queue Hygiene Frequent Interval Slice (2026-02-25)

## Scope
Provide direct controls for identifying and pausing high-frequency interval schedules (commonly 30/60 minute churn).

## Implementation
1) Interval filter support
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--interval-lte=<minutes>` filter
  - filter behavior:
    - applies to `interval` schedules only
    - matches schedules where `intervalMinutes <= interval-lte`

2) Frequent schedule presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:frequent:control-api`
  - `queue:hygiene:pause:frequent:dry-run:control-api`
  - `queue:hygiene:pause:frequent:apply:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic33.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic33`
    - aggregate `smoke:extension` includes `epic33`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic33.mjs`
3) `npm run smoke:extension:epic33`
4) `npm run smoke:extension`

## Notes
- Default frequent preset uses `--interval-lte=60`.
- Combine with `--job-type=monitor.page.diff` for targeted monitor-frequency cleanup.
