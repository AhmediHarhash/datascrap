# Phase 11 Sprint B - Queue Hygiene Resume Filter Validation Slice (2026-02-26)

## Scope
Prevent stale-cursor resume mistakes when operators change queue-hygiene filter intent between runs.

## Implementation
1) Resume filter validation in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-validate-filters=<bool>`
  - `--scan-resume-filter-mismatch-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_FILTERS=true`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILTER_MISMATCH_BEHAVIOR=restart`
- behavior:
  - compares normalized active filter snapshot with resume artifact filter snapshot
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source marker for mismatch (`*_filter_mismatch`)
  - paging/checkpoint/summary metadata includes:
    - `resumeFilterValidated`
    - `resumeFilterMismatch`
    - `resumeFilterMismatchBehavior`
    - `resumeFilterMismatchFields`

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin resume filter-validation controls explicitly

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic55.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic55`
    - aggregate `smoke:extension` now includes `epic55`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic55.mjs`
3) `npm run smoke:extension:epic55`
4) `npm run smoke:extension`

## Notes
- This guard prevents subtle resume cross-intent mistakes where changed filters could otherwise continue from an unrelated cursor.
- `restart` remains default to keep hands-off flows progressing when operator intent has legitimately changed.
