# Phase 11 Sprint B - Queue Hygiene Scan Checkpoint Sidecar Slice (2026-02-25)

## Scope
Add lightweight checkpoint sidecar persistence for scan runs, separate from full report output files.

## Implementation
1) Scan checkpoint sidecar in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-checkpoint-file=<path>`
  - `--scan-checkpoint-every-pages=<n>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_CHECKPOINT_FILE` (optional)
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_CHECKPOINT_EVERY_PAGES=1`
  - behavior:
    - writes lightweight checkpoint payload with `paging.nextCursor` during scan progress
    - final checkpoint flush occurs at scan end
  - summary metadata:
    - `filters.scanCheckpointFile`
    - `filters.scanCheckpointEveryPages`
    - `summary.scanCheckpointFile`

2) Sidecar-focused presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:sidecar:control-api`
- Updated:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api` now also writes sidecar cursor file
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api` now resumes from sidecar cursor file

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic48.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic48`
    - aggregate `smoke:extension` now includes `epic48`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic48.mjs`
3) `npm run smoke:extension:epic48`
4) `npm run smoke:extension`

## Notes
- Sidecar checkpoints reduce output size and improve resume ergonomics for long scans.
- Full report output remains optional and independent from checkpoint sidecar writes.
