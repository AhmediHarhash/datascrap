# Phase 11 Sprint B - Queue Hygiene Scan Resume-From-Checkpoint Auto Slice (2026-02-26)

## Scope
Reduce manual resume configuration by allowing scan resume to auto-use checkpoint sidecar files when explicit resume files are not provided.

## Implementation
1) Auto-resume-from-checkpoint in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-from-checkpoint=<bool>`
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT=true`
- behavior:
  - explicit `--scan-resume-file` still has highest priority
  - when explicit resume file is omitted and checkpoint path is configured, resume source auto-falls back to checkpoint sidecar
  - missing checkpoint sidecar now reports non-fatal source `checkpoint_file_missing` (fresh scan start)
- telemetry:
  - resume source markers:
    - `checkpoint_file_auto`
    - `checkpoint_file_auto_exhausted`
    - `checkpoint_file_missing`
  - paging/checkpoint/summary metadata includes `scanResumeFromCheckpoint` / `resumeFromCheckpoint`

2) Preset updates
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
    - checkpoint sidecar + auto-resume orchestration

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic51.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic51`
    - aggregate `smoke:extension` now includes `epic51`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic51.mjs`
3) `npm run smoke:extension:epic51`
4) `npm run smoke:extension`

## Notes
- This lowers operational friction for long-running queue hygiene tasks by allowing one checkpoint file to power both progress writes and future resumes.
- Explicit resume file usage remains supported for strict/operator-controlled flows.
