# Phase 11 Sprint B - Queue Hygiene Pause Guardrail Slice (2026-02-25)

## Scope
Prevent accidental mass-pausing of schedules by adding a default pause cap and explicit override path.

## Implementation
1) Pause guardrail in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--max-pause=<n>` (default `25`)
  - `--force-pause-over-limit=true|false` (default `false`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_MAX_PAUSE=25`
    - `CONTROL_API_SCHEDULE_HYGIENE_FORCE_PAUSE_OVER_LIMIT=false`
  - apply-mode behavior:
    - when matched pause targets exceed cap and force is not set, command exits with guardrail block
  - output summary additions:
    - `filters.maxPause`
    - `filters.forcePauseOverLimit`
    - `pauseGuardrail` metadata
    - `blockedByGuardrail` pause state

2) Force-apply presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:pause:apply:force:control-api`
  - `queue:hygiene:pause:duplicates:force:control-api`
  - `queue:hygiene:pause:near-duplicates:force:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic36.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic36`
    - aggregate `smoke:extension` now includes `epic36`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic36.mjs`
3) `npm run smoke:extension:epic36`
4) `npm run smoke:extension`

## Notes
- Default apply behavior is intentionally conservative for production safety.
- Use force-apply variants only after validating dry-run output.
