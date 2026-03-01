# Phase 11 Sprint B - Queue Hygiene Resume Source Validation Slice (2026-02-26)

## Scope
Prevent cross-environment resume misuse by validating resume artifact `apiBaseUrl` against the active run target.

## Implementation
1) Resume source validation in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-validate-api-base=<bool>`
  - `--scan-resume-api-base-mismatch-behavior=<error|restart>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_API_BASE=true`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISMATCH_BEHAVIOR=error`
- behavior:
  - compares normalized resume artifact `apiBaseUrl` with active `API_BASE_URL`
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source mismatch markers (`*_api_base_mismatch`)
  - paging/checkpoint/summary metadata includes:
    - `resumeApiBaseUrl`
    - `resumeApiBaseMismatch`
    - validation flags/behavior

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin API-base validation controls explicitly

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic54.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic54`
    - aggregate `smoke:extension` now includes `epic54`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic54.mjs`
3) `npm run smoke:extension:epic54`
4) `npm run smoke:extension`

## Notes
- This guard helps avoid accidental resume reuse across staging/prod targets when sidecars are copied between environments.
- `restart` mode remains available for operators who prefer continuity over strict source enforcement.
