# Phase 11 Sprint B - Queue Hygiene Resume API-Base Presence Slice (2026-02-26)

## Scope
Prevent source-blind resume continuation from checkpoint artifacts that omit `apiBaseUrl` metadata.

## Implementation
1) Resume API-base presence guard in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-require-api-base=<bool>`
  - `--scan-resume-api-base-missing-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE=false`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR=restart`
- behavior:
  - when enabled and API-base validation is on, missing resume `apiBaseUrl` is treated as guarded condition
  - handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - source marker:
    - `*_api_base_missing`
  - metadata includes:
    - `resumeApiBaseRequired`
    - `resumeApiBaseMissing`
    - `resumeApiBaseMissingBehavior`

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin:
    - `--scan-resume-require-api-base=true`
    - `--scan-resume-api-base-missing-behavior=error`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic62.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic62`
    - aggregate `smoke:extension` now includes `epic62`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic62.mjs`
3) `npm run smoke:extension:epic62`
4) `npm run smoke:extension`

## Notes
- Guard is opt-in (`scan-resume-require-api-base=false` by default) to preserve existing compatibility.
- Recommended unattended production policy is `require=true` with `missing-behavior=error` to avoid resuming from weakly-identified artifacts.
