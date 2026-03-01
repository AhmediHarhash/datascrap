# Phase 11 Sprint B - Queue Hygiene Scan Resume Freshness Guard Slice (2026-02-26)

## Scope
Prevent stale checkpoint resumes from silently driving queue hygiene actions by adding explicit resume freshness controls.

## Implementation
1) Resume freshness guard in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-max-age-minutes=<n>`
  - `--scan-resume-stale-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_AGE_MINUTES=0`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_STALE_BEHAVIOR=restart`
- behavior:
  - when max-age is enabled and resume artifact is stale:
    - `restart`: ignore stale cursor and restart scan from page 1
    - `error`: fail fast before scanning
  - missing `generatedAt` is treated as stale when max-age is enabled
- telemetry:
  - resume source markers include stale variants (`checkpoint_file_auto_stale`, `resume_file_stale`)
  - paging/checkpoint/summary metadata includes:
    - resume age (`resumeAgeMinutes`)
    - resume timestamp (`resumeGeneratedAt`)
    - stale flag/reason (`resumeStale`, `resumeStaleReason`)
    - stale behavior + max-age policy

2) Preset updates
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
    - pins a freshness bound (`--scan-resume-max-age-minutes=720`) with restart behavior

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic52.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic52`
    - aggregate `smoke:extension` now includes `epic52`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic52.mjs`
3) `npm run smoke:extension:epic52`
4) `npm run smoke:extension`

## Notes
- This keeps queue hygiene automation fresher by default when operators choose a max-age policy.
- Existing flows remain compatible when max-age is left at `0` (disabled).
