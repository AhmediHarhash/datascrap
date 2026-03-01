# Phase 11 Sprint B - Queue Hygiene Resume Future Timestamp Guard Slice (2026-02-26)

## Scope
Prevent resume continuation from checkpoints whose `generatedAt` is too far in the future because of clock skew or artifact corruption.

## Implementation
1) Resume future-timestamp guard in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-max-future-minutes=<n>`
  - `--scan-resume-future-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_FUTURE_MINUTES=0`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FUTURE_BEHAVIOR=restart`
- behavior:
  - when enabled (`max-future > 0`), compares resume `generatedAt` against current wall-clock
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source marker (`*_future`)
  - paging/checkpoint/summary metadata includes:
    - `resumeFuture`
    - `resumeFutureMinutes`
    - `resumeFutureBehavior`
    - `resumeMaxFutureMinutes`

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin future-skew guard controls explicitly

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic58.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic58`
    - aggregate `smoke:extension` now includes `epic58`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic58.mjs`
3) `npm run smoke:extension:epic58`
4) `npm run smoke:extension`

## Notes
- Guard is disabled by default (`max-future=0`) for backward compatibility.
- Recommended production setting is a bounded tolerance (for example `30-60` minutes) with `restart` behavior.
