# Phase 11 Sprint B - Queue Hygiene Resume Size Guard Slice (2026-02-26)

## Scope
Prevent oversized resume artifacts from being loaded/parsing into memory during queue-hygiene auto-resume operations.

## Implementation
1) Resume artifact-size guard in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-max-bytes=<n>`
  - `--scan-resume-size-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_BYTES=0`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SIZE_BEHAVIOR=restart`
- behavior:
  - when enabled (`max-bytes > 0`), checks resume file size before reading/parsing
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source marker (`*_oversized`)
  - paging/checkpoint/summary metadata includes:
    - `resumeMaxBytes`
    - `resumeSizeBehavior`
    - `resumeOversized`
    - `resumeSizeBytes`
    - `resumeSizeLimitBytes`

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin:
    - `--scan-resume-max-bytes=1048576`
    - `--scan-resume-size-behavior=restart`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic60.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic60`
    - aggregate `smoke:extension` now includes `epic60`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic60.mjs`
3) `npm run smoke:extension:epic60`
4) `npm run smoke:extension`

## Notes
- Guard is disabled by default (`max-bytes=0`) for backward compatibility.
- Recommended production setting is a bounded cap (for example `1MB`) with `restart` behavior.
