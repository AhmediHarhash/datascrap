# Phase 11 Sprint B - Queue Hygiene Scan Resume Exhausted Behavior Slice (2026-02-26)

## Scope
Prevent unintended full re-scans when resume checkpoints are already exhausted by introducing explicit exhausted-resume behavior control.

## Implementation
1) Exhausted-resume behavior control in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-exhausted-behavior=<noop|restart>`
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR=noop`
- behavior:
  - when resume file resolves as exhausted (`hasMore=false`, no cursor), default behavior now no-ops scan list fetches
  - optional restart behavior can re-scan from page 1 explicitly
- telemetry:
  - paging metadata includes `resumeExhaustedBehavior` and `resumeExhaustedNoop`
  - checkpoint + summary filters include `scanResumeExhaustedBehavior`

2) Preset updates
- Updated:
  - `package.json`
- Updated:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api`
    - now pins `--scan-resume-exhausted-behavior=noop`
- Added:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:restart:report:redacted:control-api`
    - explicit `--scan-resume-exhausted-behavior=restart`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic50.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic50`
    - aggregate `smoke:extension` now includes `epic50`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic50.mjs`
3) `npm run smoke:extension:epic50`
4) `npm run smoke:extension`

## Notes
- `noop` is safer for recurring automation loops and prevents unnecessary queue churn when checkpoints are complete.
- `restart` remains available for intentional periodic full sweeps.
