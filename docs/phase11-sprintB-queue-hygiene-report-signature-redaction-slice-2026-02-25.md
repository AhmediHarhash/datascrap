# Phase 11 Sprint B - Queue Hygiene Report Signature Redaction Slice (2026-02-25)

## Scope
Add signature-redaction controls so queue hygiene report artifacts are safer to share across broader teams.

## Implementation
1) Signature redaction in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--redact-signatures=true|false` (default `false`)
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_REDACT_SIGNATURES=false`
  - behavior:
    - when enabled, `signature` fields are hashed and exposed as `sha256:<prefix>`
    - applies to schedule signatures and duplicate-group signatures
  - summary metadata:
    - `filters.redactSignatures`
    - `duplicates.signaturesRedacted`

2) Redacted report presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic40.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic40`
    - aggregate `smoke:extension` now includes `epic40`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic40.mjs`
3) `npm run smoke:extension:epic40`
4) `npm run smoke:extension`

## Notes
- Use redacted report presets before sharing hygiene artifacts outside trusted ops channels.
- Redaction hashes signatures only; schedule IDs/names remain visible for operational actions.
