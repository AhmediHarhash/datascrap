# Phase 11 Sprint B - Queue Hygiene Report Artifact Hardening Slice (2026-02-25)

## Scope
Harden queue hygiene report artifacts with immutable filename and overwrite controls for reliable ops history.

## Implementation
1) Output artifact hardening in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--output-timestamp=true|false` (default `false`)
  - `--output-overwrite=true|false` (default `true`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_TIMESTAMP=false`
    - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_OVERWRITE=true`
  - output behavior:
    - timestamp suffix insertion before extension when enabled
    - overwrite guard with explicit failure when disabled and file exists
  - summary metadata additions:
    - `runId`
    - `startedAt`
    - `generatedAt`
    - `durationMs`

2) Dated report presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:report:dated:control-api`
  - `queue:hygiene:pause:near-duplicates:batched:report:dated:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic39.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic39`
    - aggregate `smoke:extension` now includes `epic39`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic39.mjs`
3) `npm run smoke:extension:epic39`
4) `npm run smoke:extension`

## Notes
- Dated report presets use:
  - `--output-timestamp=true`
  - `--output-overwrite=false`
- This keeps queue hygiene artifacts immutable by default.
