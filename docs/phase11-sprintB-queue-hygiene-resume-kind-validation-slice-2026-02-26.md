# Phase 11 Sprint B - Queue Hygiene Resume Kind Validation Slice (2026-02-26)

## Scope
Prevent invalid resume artifacts from being used when files are copied/repurposed across queue-hygiene workflows.

## Implementation
1) Resume kind validation in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-validate-kind=<bool>`
  - `--scan-resume-kind-mismatch-behavior=<error|restart>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_KIND=true`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_KIND_MISMATCH_BEHAVIOR=error`
- behavior:
  - validates resume payload `kind` against expected `queue_hygiene_scan_checkpoint`
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source mismatch marker (`*_kind_mismatch`)
  - paging/checkpoint/summary metadata includes:
    - `resumeKind`
    - `resumeKindValidated`
    - `resumeKindMismatch`
    - `resumeKindMismatchBehavior`

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin resume kind-validation controls explicitly

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic56.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic56`
    - aggregate `smoke:extension` now includes `epic56`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic56.mjs`
3) `npm run smoke:extension:epic56`
4) `npm run smoke:extension`

## Notes
- This guard catches resume files that are structurally valid JSON but not queue-hygiene checkpoint artifacts.
- `restart` mode remains available when operators prefer availability over strict resume-file enforcement.
