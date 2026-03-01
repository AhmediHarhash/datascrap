# Phase 11 Sprint B - Queue Hygiene Report Output Slice (2026-02-25)

## Scope
Add file-based report output to queue hygiene runs so operators can persist run artifacts for audit and handoff.

## Implementation
1) Report output in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--output-file=<path>`
  - `--output-compact=true|false` (default `false`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_FILE`
    - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_COMPACT=false`
  - output behavior:
    - writes summary JSON to configured path
    - auto-creates parent directories
    - records resolved output path in `summary.outputFile`

2) Report presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:report:control-api`
  - `queue:hygiene:pause:near-duplicates:batched:report:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic38.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic38`
    - aggregate `smoke:extension` now includes `epic38`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic38.mjs`
3) `npm run smoke:extension:epic38`
4) `npm run smoke:extension`

## Notes
- Report presets are designed for near-duplicate cleanup operations.
- Use dry-run report first before apply report.
