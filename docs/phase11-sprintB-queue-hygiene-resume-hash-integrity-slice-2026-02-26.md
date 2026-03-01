# Phase 11 Sprint B - Queue Hygiene Resume Hash Integrity Slice (2026-02-26)

## Scope
Protect resume workflows by verifying checkpoint artifact integrity against an expected SHA-256 before parsing and cursor reuse.

## Implementation
1) Resume hash-integrity guard in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-sha256=<sha256>`
  - `--scan-resume-hash-behavior=<restart|error>`
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256` (optional)
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR=restart`
- behavior:
  - when expected hash is provided, computes resume file SHA-256 before JSON parse
  - mismatch handling:
    - `error`: fail fast before scan execution
    - `restart`: ignore resume cursor and restart scan safely
- telemetry:
  - resume source marker (`*_hash_mismatch`)
  - paging/checkpoint/summary metadata includes:
    - `resumeHashExpected`
    - `resumeHashActual`
    - `resumeHashMismatch`
    - `resumeHashBehavior`

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin:
    - `--scan-resume-hash-behavior=restart`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic61.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic61`
    - aggregate `smoke:extension` now includes `epic61`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic61.mjs`
3) `npm run smoke:extension:epic61`
4) `npm run smoke:extension`

## Notes
- Hash validation is opt-in and only enforced when `--scan-resume-sha256` (or env equivalent) is provided.
- Recommended behavior is `restart` for unattended ops so invalid artifacts never block full recovery.
