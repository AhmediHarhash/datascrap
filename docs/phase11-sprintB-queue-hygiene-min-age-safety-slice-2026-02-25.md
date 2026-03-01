# Phase 11 Sprint B - Queue Hygiene Min-Age Safety Slice (2026-02-25)

## Scope
Add age-based safety filtering so queue hygiene pause operations can avoid touching freshly-created schedules.

## Implementation
1) Min-age safety filter in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--min-age-minutes=<n>` (default `0`)
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_MIN_AGE_MINUTES=0`
  - filter behavior:
    - when set, only schedules older than threshold are eligible
    - invalid/unknown created timestamps are excluded for safety
  - summary metadata:
    - `filters.minAgeMinutes`

2) Stale near-duplicate presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:stale:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:dry-run:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic41.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic41`
    - aggregate `smoke:extension` now includes `epic41`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic41.mjs`
3) `npm run smoke:extension:epic41`
4) `npm run smoke:extension`

## Notes
- Recommended starting threshold for production cleanup: `--min-age-minutes=180`.
