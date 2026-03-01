# Phase 11 Sprint B - Queue Hygiene Duplicate Signature Slice (2026-02-25)

## Scope
Add duplicate schedule detection/remediation so recurring queue churn from repeated schedules can be cleaned up safely.

## Implementation
1) Duplicate signature detection in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--duplicates-only=true|false` filter mode
  - `--dedupe-keep=oldest|newest` strategy
  - duplicate signature model:
    - `targetJobType + scheduleKind + cadence(interval/cron+timezone) + maxAttempts + normalized targetPayload`
  - duplicate summary metadata in output:
    - groups count
    - duplicate schedule count
    - pause candidate count
  - pause action behavior in duplicate-only mode:
    - pauses only duplicate extras
    - keeps one schedule per group based on `dedupe-keep`

2) Duplicate command presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:duplicates:control-api`
  - `queue:hygiene:pause:duplicates:dry-run:control-api`
  - `queue:hygiene:pause:duplicates:apply:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic34.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic34`
    - aggregate `smoke:extension` now includes `epic34`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic34.mjs`
3) `npm run smoke:extension:epic34`
4) `npm run smoke:extension`

## Notes
- Duplicate cleanup is deterministic:
  - default keeps oldest schedule in each duplicate group.
- To keep newest schedule instead:
  - append `--dedupe-keep=newest`.
