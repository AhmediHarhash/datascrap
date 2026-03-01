# Phase 11 Sprint B - Queue Hygiene Resume Schema-Version Validation Slice (2026-02-26)

## Scope
Protect resume workflows against incompatible checkpoint artifact revisions by validating schema version before scan continuation.

## Implementation
1) Resume schema-version validation in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-validate-schema-version=<bool>`
  - `--scan-resume-schema-version-mismatch-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_SCHEMA_VERSION=true`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SCHEMA_VERSION_MISMATCH_BEHAVIOR=restart`
- behavior:
  - validates resume payload `schemaVersion` against expected checkpoint schema (`1`)
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source mismatch marker (`*_schema_version_mismatch`)
  - paging/checkpoint/summary metadata includes:
    - `resumeSchemaVersionExpected`
    - `resumeSchemaVersion`
    - `resumeSchemaVersionValidated`
    - `resumeSchemaVersionMismatch`
    - `resumeSchemaVersionMismatchBehavior`

2) Checkpoint payload schema metadata
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- changed:
  - checkpoint sidecar payload now emits top-level `schemaVersion: 1`

3) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin schema-version validation controls explicitly

4) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

5) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic57.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic57`
    - aggregate `smoke:extension` now includes `epic57`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic57.mjs`
3) `npm run smoke:extension:epic57`
4) `npm run smoke:extension`

## Notes
- This guard is intentionally restart-tolerant by default to preserve operator continuity during gradual schema evolution.
- Strict mode remains available when operators require deterministic resume compatibility.
