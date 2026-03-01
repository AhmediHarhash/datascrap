# Phase 11 Sprint B - Queue Hygiene Atomic Artifact Write Slice (2026-02-26)

## Scope
Harden queue hygiene artifact durability by switching checkpoint/output JSON writes to atomic temp-file rename semantics.

## Implementation
1) Atomic write helper in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `writeTextFileAtomic(targetPath, contents)`
- behavior:
  - writes artifact payload to same-directory temp file first
  - promotes temp file with rename to final path
  - includes fallback replacement path for platform-specific rename edge cases
  - temp artifact cleanup on failures

2) Atomic writes applied to artifact outputs
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- changed:
  - checkpoint sidecar writes now use atomic helper
  - summary output-file writes now use atomic helper

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic53.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic53`
    - aggregate `smoke:extension` now includes `epic53`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic53.mjs`
3) `npm run smoke:extension:epic53`
4) `npm run smoke:extension`

## Notes
- Atomic writes reduce risk of half-written JSON artifacts during process interruption or host restarts.
- Existing output overwrite/timestamp semantics remain unchanged.
