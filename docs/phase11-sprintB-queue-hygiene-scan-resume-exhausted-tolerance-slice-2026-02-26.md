# Phase 11 Sprint B - Queue Hygiene Scan Resume Exhausted Tolerance Slice (2026-02-26)

## Scope
Harden scan resume behavior so automation loops do not fail when a checkpoint file represents a fully exhausted scan.

## Implementation
1) Resume tolerance control in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-allow-exhausted=<bool>`
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED=true`
- behavior:
  - when resume file has paging metadata with `hasMore=false` and no cursor, resume no longer hard-fails by default
  - resume source is tagged as `resume_file_exhausted`
  - strict mode remains available via `--scan-resume-allow-exhausted=false`
- telemetry:
  - paging metadata includes `resumeAllowExhausted` and `resumeExhausted`
  - summary/checkpoint filters include `scanResumeAllowExhausted` and `scanResumeExhausted`

2) Preset updates
- Updated:
  - `package.json`
- Updated:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api`
    - now pins `--scan-resume-allow-exhausted=true`
- Added:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:strict:report:redacted:control-api`
    - strict resume cursor requirement (`--scan-resume-allow-exhausted=false`)

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic49.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic49`
    - aggregate `smoke:extension` now includes `epic49`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic49.mjs`
3) `npm run smoke:extension:epic49`
4) `npm run smoke:extension`

## Notes
- This reduces false-failure noise in recurring queue-hygiene automation that uses checkpoint sidecars.
- Strict mode remains available for incident/debug sessions where cursor presence is mandatory.
