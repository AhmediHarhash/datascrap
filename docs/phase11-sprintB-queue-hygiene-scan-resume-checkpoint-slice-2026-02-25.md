# Phase 11 Sprint B - Queue Hygiene Scan Resume Checkpoint Slice (2026-02-25)

## Scope
Allow scan-all hygiene runs to continue from prior pagination checkpoints instead of restarting at page 1.

## Implementation
1) Scan resume/checkpoint support in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-file=<path>`
  - `--scan-start-cursor-created-at=<iso>`
  - `--scan-start-cursor-id=<uuid>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILE` (optional)
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_CREATED_AT` (optional)
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_ID` (optional)
  - behavior:
    - loads `paging.nextCursor` from a prior report file for resume
    - supports explicit start cursor override via flags/env
    - includes resume metadata in summary paging/filters

2) Resume/checkpoint command presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic44.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic44`
    - aggregate `smoke:extension` now includes `epic44`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic44.mjs`
3) `npm run smoke:extension:epic44`
4) `npm run smoke:extension`

## Notes
- Resume mode requires a prior report where `paging.nextCursor` exists.
- Explicit cursor flags/env override resume-file cursor when both are provided.
