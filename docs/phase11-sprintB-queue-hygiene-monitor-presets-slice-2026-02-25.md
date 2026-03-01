# Phase 11 Sprint B - Queue Hygiene Monitor Presets Slice (2026-02-25)

## Scope
Add monitor-focused queue hygiene command presets so noisy `monitor.page.diff` schedules can be isolated and paused fast.

## Implementation
1) Package command presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:monitor:control-api`
  - `queue:hygiene:pause:monitor:dry-run:control-api`
  - `queue:hygiene:pause:monitor:apply:control-api`

2) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
- Added monitor-only command examples.

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic32.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic32`
    - aggregate `smoke:extension` includes `epic32`

## Validation
1) `node --check scripts/smoke-extension-epic32.mjs`
2) `npm run smoke:extension:epic32`
3) `npm run smoke:extension`

## Notes
- These are command-level presets; underlying script behavior remains unchanged (`--job-type=monitor.page.diff` filter).
